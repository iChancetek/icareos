

"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Mic, StopCircle, AlertTriangle, Languages, Play, FileText, Save, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { translateText } from '@/ai/flows/translate-text-flow';
import { summarizeIScribe } from '@/ai/flows/summarize-iscribe';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import type { TranslationLanguage } from '@/types';
import { useRouter } from 'next/navigation';

interface RealtimeVoiceTranslatorDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

type ProcessingStep = "idle" | "transcribing" | "translating" | "summarizing" | "saving" | "completed";

export default function RealtimeVoiceTranslatorDialog({ isOpen, onOpenChange }: RealtimeVoiceTranslatorDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingLang, setCurrentRecordingLang] = useState<TranslationLanguage | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [summaryText, setSummaryText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);
  
  const [isManuallyPlayingTTS, setIsManuallyPlayingTTS] = useState(false);

  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  
  const { saveTranslation } = useAuth();
  const router = useRouter();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const effectiveMimeTypeRef = useRef<string>('');
  const { toast } = useToast();
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);


  useEffect(() => {
    if (isOpen && !isPermissionChecked) {
      const getMicPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setHasMicPermission(true);
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          setHasMicPermission(false);
          toast({
            variant: 'destructive',
            title: 'Microphone Access Denied',
            description: 'Please enable microphone permissions in your browser settings and reopen the translator.',
            duration: 7000,
          });
        } finally {
          setIsPermissionChecked(true);
        }
      };
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getMicPermission();
      } else {
        setHasMicPermission(false);
        setIsPermissionChecked(true);
         toast({
            variant: 'destructive',
            title: 'Audio Recording Not Supported',
            description: 'Your browser does not support audio recording or permissions are blocked.',
            duration: 7000,
          });
      }
    }
    
    return () => {
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        window.speechSynthesis.cancel();
      }
       if (utteranceRef.current) utteranceRef.current.onend = null;
      setIsManuallyPlayingTTS(false);
    };
  }, [isOpen, isPermissionChecked, toast]);

  const resetState = () => {
     if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop(); 
      }
      audioChunksRef.current = [];
      effectiveMimeTypeRef.current = '';
      setIsRecording(false);
      setCurrentRecordingLang(null);
      setIsProcessing(false);
      setProcessingStep("idle");
      setTranscribedText("");
      setTranslatedText("");
      setSummaryText("");
      setAudioDataUri(null);
      setSessionSaved(false);

      if (typeof window !== 'undefined' && window.speechSynthesis) { 
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
              window.speechSynthesis.cancel();
          }
      }
      if (utteranceRef.current) utteranceRef.current.onend = null;
      setIsManuallyPlayingTTS(false);
  }

  const handleStartStopRecording = async (inputLang: TranslationLanguage) => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      if (!hasMicPermission) {
        toast({ title: "Microphone Access Required", description: "Please enable microphone permissions and try again.", variant: "destructive" });
        return;
      }
      if (isProcessing || isManuallyPlayingTTS) {
        toast({ title: "Busy", description: "Please wait for the current action to complete.", variant: "default" });
        return;
      }

      resetState();
      setCurrentRecordingLang(inputLang);
      let stream: MediaStream | null = null;

      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const MimeTypes = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/aac'];
        let selectedMimeType = '';
        for (const type of MimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }
        
        try {
            mediaRecorderRef.current = selectedMimeType
            ? new MediaRecorder(stream, { mimeType: selectedMimeType })
            : new MediaRecorder(stream); 
            effectiveMimeTypeRef.current = mediaRecorderRef.current.mimeType;
        } catch (recorderError) {
            const errorMessage = (recorderError as Error).message || "Unknown recorder initialization error.";
            toast({ title: "Recording Error", description: `Could not initialize audio recorder: ${errorMessage}.`, variant: "destructive", duration: 7000 });
            if (stream) stream.getTracks().forEach(track => track.stop());
            return;
        }

        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = async () => {
          if (stream) stream.getTracks().forEach(track => track.stop());
          const actualMimeType = effectiveMimeTypeRef.current || (selectedMimeType || 'audio/webm');

          if (audioChunksRef.current.length === 0) {
            toast({ title: "No Audio Recorded", description: "No audio data chunks were captured. Please try speaking again.", variant: "default" });
            resetState();
            return;
          }
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          
          if (audioBlob.size < 1000) { 
            toast({ title: "Recording Too Short", description: "Recorded audio is very short or possibly silent. Please try speaking for a longer duration.", variant: "default", duration: 5000 });
            resetState();
            return;
          }
          
          let currentAudioDataUri: string;
          try {
            currentAudioDataUri = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => reject(new Error("Could not process recorded audio data. FileReader failed."));
              reader.readAsDataURL(audioBlob);
            });
            setAudioDataUri(currentAudioDataUri);
          } catch (fileReaderError) {
             toast({ title: "Audio Processing Error", description: (fileReaderError as Error).message, variant: "destructive" });
             resetState();
             return;
          }

          await processAudio(currentAudioDataUri, inputLang);
        };
        
        mediaRecorderRef.current.onerror = (event: Event) => {
            const mediaRecorderErrorEvent = event as MediaRecorderErrorEvent;
            const errorDetails = mediaRecorderErrorEvent.error;
            const errorMessage = errorDetails?.name || errorDetails?.message || 'Unknown recording error';
            toast({ title: "Recording Error", description: `An error occurred during recording: ${errorMessage}.`, variant: "destructive", duration: 7000 });
            resetState();
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        toast({ title: `Recording in ${inputLang}...`, description: "Click the button again to stop." });

      } catch (err) {
        toast({ title: "Could Not Start Recording", description: `Please check microphone permissions. Error: ${(err as Error).message}`, variant: "destructive" });
        if (stream) stream.getTracks().forEach(track => track.stop());
        resetState();
      }
    }
  };

  const processAudio = async (uri: string, sourceLang: TranslationLanguage) => {
    setIsProcessing(true);
    setTranscribedText(""); 
    setTranslatedText("");  
    setSummaryText(""); 
    setSessionSaved(false);
    const targetLang = sourceLang === 'English' ? 'Spanish' : 'English';

    let originalTranscript = "";

    try {
      setProcessingStep("transcribing");
      const transcriptionResult = await transcribeAudio({ audioDataUri: uri });
      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') throw new Error(`Transcription service returned invalid data.`);
      originalTranscript = transcriptionResult.transcription;
      setTranscribedText(originalTranscript);
      toast({ title: "Transcription Complete"});

      if (!originalTranscript.trim()) {
         toast({ title: "Empty Transcription", description: "No speech detected in the audio."});
         throw new Error("Empty transcription result."); 
      }

      setProcessingStep("translating");
      const translationResult = await translateText({ text: originalTranscript, targetLanguage: targetLang });
      if (!translationResult || typeof translationResult.translatedText !== 'string') throw new Error(`Translation service returned invalid data.`);
      setTranslatedText(translationResult.translatedText);
      toast({ title: "Translation Complete" });
      
      setProcessingStep("summarizing");
      const summaryResult = await summarizeIScribe({ transcript: originalTranscript });
      if (!summaryResult || typeof summaryResult.summary !== 'string') throw new Error(`Summarization service returned invalid data.`);
      setSummaryText(summaryResult.summary);
      toast({ title: "Summary Complete" });

      setProcessingStep("completed"); 
      
    } catch (error: any) {
      const detailedErrorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI processing.";
      toast({ 
        title: "Processing Error", 
        description: `Operation failed during: ${processingStep}. Details: ${detailedErrorMessage}`, 
        variant: "destructive",
        duration: 9000 
      });
      setProcessingStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

    const handleSaveSession = async () => {
    if (!audioDataUri || !transcribedText || !translatedText || !summaryText || !currentRecordingLang) {
        toast({ title: "Cannot Save", description: "Not enough data to save the session.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    setProcessingStep("saving");

    try {
        const newTranslation = {
            date: new Date().toISOString(),
            sourceLanguage: currentRecordingLang,
            targetLanguage: currentRecordingLang === 'English' ? 'Spanish' : 'English' as TranslationLanguage,
            sourceTranscript: transcribedText,
            translatedText: translatedText,
            summary: summaryText,
            audioDataUri: audioDataUri,
        };

        const newId = await saveTranslation(newTranslation);
        if (newId) {
            toast({
                title: "Session Saved",
                description: "Your translation has been saved to 'My Recordings'.",
            });
            setSessionSaved(true);
        } else {
            throw new Error("Failed to get a new ID from the save operation.");
        }
    } catch (error) {
        console.error("Error saving translation session:", error);
        toast({ title: "Save Failed", description: "Could not save the translation session. Please try again.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
        setProcessingStep("completed");
    }
    };


  // Utility function to play TTS, returns a Promise
  const playTTSSound = (text: string, lang: TranslationLanguage): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        toast({ title: "TTS Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
        reject(new Error("TTSNotSupported"));
        return;
      }
      if (!text.trim()) {
        resolve();
        return;
      }

      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      if (utteranceRef.current) utteranceRef.current.onend = null;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'English' ? 'en-US' : 'es-ES';
      utteranceRef.current = utterance;
      
      ttsTimeoutRef.current = setTimeout(() => {
        window.speechSynthesis.cancel(); 
        reject(new Error("TTSPlaybackTimeout"));
      }, 20000);

      utterance.onend = () => {
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        resolve();
      };

      utterance.onerror = (event) => {
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        let errorMsg = `Could not play the audio in ${lang}. Error: ${event.error}`;
        toast({ title: "TTS Error", description: errorMsg, variant: "destructive" });
        reject(new Error(typeof event.error === 'string' ? event.error : "TTSPlaybackError")); 
      };
      
      setTimeout(() => window.speechSynthesis.speak(utterance), 100);
    });
  };

  const handleManualPlayTTS = async () => {
    if (!translatedText || isManuallyPlayingTTS || isProcessing || isRecording) return;

    const targetLanguageToSpeak = currentRecordingLang === 'English' ? 'Spanish' : 'English';
    setIsManuallyPlayingTTS(true);
    try {
      await playTTSSound(translatedText, targetLanguageToSpeak);
    } catch (error) {
      console.error("Error during manual TTS playback:", error);
    } finally {
      setIsManuallyPlayingTTS(false);
    }
  };

  const handleStopManualTTS = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsManuallyPlayingTTS(false);
  };


  const getProgressValue = () => {
    if (!isProcessing) return 0;
    switch (processingStep) {
      case "transcribing": return 25;
      case "translating": return 50;
      case "summarizing": return 75;
      case "saving": return 90;
      case "completed": return 100;
      default: return 0;
    }
  };

  const renderMicButton = (lang: TranslationLanguage, label: string) => (
    <Button
      size="lg"
      variant={isRecording && currentRecordingLang === lang ? "destructive" : "default"}
      onClick={() => handleStartStopRecording(lang)}
      disabled={
        (!isOpen || !hasMicPermission) || 
        (isRecording && currentRecordingLang !== lang) || 
        isProcessing || 
        isManuallyPlayingTTS
      }
      className="w-full h-16 text-lg flex-col gap-1 shadow-md"
    >
      {isRecording && currentRecordingLang === lang ? <StopCircle className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
      <span>{isRecording && currentRecordingLang === lang ? `Stop Recording (${lang})` : label}</span>
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) { 
        resetState();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl flex flex-col h-[85vh] max-h-[900px] min-h-[500px]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center text-xl">
            <Languages className="mr-2 h-6 w-6 text-primary" />
            Real-time Voice Translator
          </DialogTitle>
          <DialogDescription className="text-sm">
            Speak in English or Spanish. The app will transcribe, translate, and summarize. You can then save the session.
          </DialogDescription>
        </DialogHeader>

        {!isPermissionChecked && isOpen && (
          <div className="p-4 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Checking microphone permissions...
          </div>
        )}

        {isPermissionChecked && !hasMicPermission && isOpen && (
          <Alert variant="destructive" className="m-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Microphone Access Denied</AlertTitle>
            <AlertDescription>
              Please enable microphone permissions in your browser settings for this site and reopen the translator.
            </AlertDescription>
          </Alert>
        )}

        {hasMicPermission && isOpen && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {renderMicButton("English", "Speak in English")}
              {renderMicButton("Spanish", "Speak in Spanish")}
            </div>

            {(isProcessing || transcribedText || translatedText || summaryText) && (
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={getProgressValue()} className="w-full h-2" />
                    <p className="text-sm text-center text-muted-foreground capitalize">
                      {processingStep === "idle" ? "Waiting..." : `${processingStep}...`}
                    </p>
                  </div>
                )}

                {transcribedText && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Your words ({currentRecordingLang || "Source"}):
                    </h3>
                    <p className="p-3 bg-muted/50 rounded-md border whitespace-pre-wrap text-sm">{transcribedText}</p>
                  </div>
                )}

                {translatedText && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Translation ({currentRecordingLang === 'English' ? 'Spanish' : 'English'}):
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={isManuallyPlayingTTS ? handleStopManualTTS : handleManualPlayTTS}
                        disabled={!translatedText || isProcessing || isRecording}
                        className="shadow-sm"
                      >
                         {isManuallyPlayingTTS ? <StopCircle className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                         {isManuallyPlayingTTS ? 'Stop' : 'Play'}
                      </Button>
                    </div>
                    <p className="p-3 bg-primary/10 rounded-md border border-primary/30 whitespace-pre-wrap text-sm">{translatedText}</p>
                  </div>
                )}

                {summaryText && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                       <FileText className="mr-2 h-4 w-4" /> AI Summary (of original):
                    </h3>
                    <p className="p-3 bg-accent/10 rounded-md border border-accent/30 whitespace-pre-wrap text-sm">{summaryText}</p>
                  </div>
                )}
                 {processingStep === 'completed' && audioDataUri && (
                    <div className="pt-4 text-center">
                        {sessionSaved ? (
                             <div className="flex items-center justify-center gap-2 text-green-600">
                                <CheckCircle className="h-5 w-5" />
                                <p>Session saved successfully!</p>
                            </div>
                        ) : (
                            <Button onClick={handleSaveSession} disabled={isProcessing}>
                                <Save className="mr-2 h-4 w-4"/>
                                Save Session
                            </Button>
                        )}
                    </div>
                )}
              </div>
            )}
            { !isProcessing && !transcribedText && !translatedText && !summaryText &&
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Click a button above to start translating.</p>
              </div>
            }
          </>
        )}
         <DialogFooter className="p-4 border-t mt-auto">
            <p className="text-xs text-muted-foreground text-center w-full">
                Ensure your microphone is enabled and speak clearly. Processing times may vary.
            </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Define MediaRecorderErrorEvent if not available globally (e.g., in older TS lib versions)
interface MediaRecorderErrorEvent extends Event {
  readonly error: DOMException;
}

// Define BlobEvent if not available globally
interface BlobEvent extends Event {
  readonly data: Blob;
  readonly timecode: number;
}
