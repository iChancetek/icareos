
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
import { Loader2, Mic, StopCircle, Volume2, AlertTriangle, Languages, Play, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { translateText } from '@/ai/flows/translate-text-flow';
import { summarizeConsultation } from '@/ai/flows/summarize-consultation'; // Added
import { Progress } from '@/components/ui/progress';

interface RealtimeVoiceTranslatorDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

type ProcessingStep = "idle" | "transcribing" | "translating" | "summarizing" | "completed";
type RecordingLanguage = "English" | "Spanish";

export default function RealtimeVoiceTranslatorDialog({ isOpen, onOpenChange }: RealtimeVoiceTranslatorDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingLang, setCurrentRecordingLang] = useState<RecordingLanguage | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [summaryText, setSummaryText] = useState<string>(""); // Added for summary
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  
  const [isManuallyPlayingTTS, setIsManuallyPlayingTTS] = useState(false);

  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const effectiveMimeTypeRef = useRef<string>('');
  const { toast } = useToast();
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && !isPermissionChecked) {
      const getMicPermission = async () => {
        console.log("RealtimeVoiceTranslator: Attempting to get microphone permission...");
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setHasMicPermission(true);
          console.log("RealtimeVoiceTranslator: Microphone permission granted.");
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.error('RealtimeVoiceTranslator: Error accessing microphone:', error);
          setHasMicPermission(false);
          toast({
            variant: 'destructive',
            title: 'Microphone Access Denied',
            description: 'Please enable microphone permissions in your browser settings and reopen the translator.',
            duration: 7000,
          });
        } finally {
          setIsPermissionChecked(true);
           console.log("RealtimeVoiceTranslator: Microphone permission check complete. Has permission:", hasMicPermission);
        }
      };
      if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        getMicPermission();
      } else {
        console.error("RealtimeVoiceTranslator: Audio recording not supported or permissions blocked.");
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
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        console.log("RealtimeVoiceTranslator: Unmounting/closing, cancelling any active speech.");
        window.speechSynthesis.cancel();
      }
      setIsManuallyPlayingTTS(false);
    };
  }, [isOpen, isPermissionChecked, toast, hasMicPermission]);


  const handleStartStopRecording = async (inputLang: RecordingLanguage) => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        console.log("RealtimeVoiceTranslator: MediaRecorder.stop() called.");
      } else {
         console.log("RealtimeVoiceTranslator: Stop called but MediaRecorder not in recording state.");
      }
      setIsRecording(false);
    } else {
      if (!hasMicPermission || !isPermissionChecked) {
        toast({ title: "Microphone Access Required", description: "Please enable microphone permissions and try again.", variant: "destructive" });
        if (!isPermissionChecked) setIsPermissionChecked(false); 
        return;
      }
      if (isProcessing || isManuallyPlayingTTS) {
        toast({ title: "Busy", description: "Please wait for the current action to complete.", variant: "default" });
        return;
      }

      setTranscribedText("");
      setTranslatedText("");
      setSummaryText(""); // Clear previous summary
      setCurrentRecordingLang(inputLang);
      audioChunksRef.current = [];
      let stream: MediaStream | null = null;

      try {
        console.log("RealtimeVoiceTranslator: Requesting media stream for recording...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("RealtimeVoiceTranslator: Media stream obtained:", stream);

        const MimeTypes = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/aac'];
        let selectedMimeType = '';
        for (const type of MimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            console.log("RealtimeVoiceTranslator: MediaRecorder.isTypeSupported is true for:", type);
            break;
          }
           console.log("RealtimeVoiceTranslator: MediaRecorder.isTypeSupported is false for:", type);
        }
        
        if (!selectedMimeType && MediaRecorder.isTypeSupported('')) { 
             console.log("RealtimeVoiceTranslator: No preferred mimeType supported, trying browser default (empty string).");
             selectedMimeType = '';
        } else if (!selectedMimeType) {
            console.error("RealtimeVoiceTranslator: No supported MIME type found for MediaRecorder after checking preferred and default.");
            toast({ title: "Recording Error", description: "Your browser does not support any suitable audio recording formats.", variant: "destructive", duration: 7000 });
            if (stream) stream.getTracks().forEach(track => track.stop());
            return;
        }
        
        try {
            mediaRecorderRef.current = selectedMimeType
            ? new MediaRecorder(stream, { mimeType: selectedMimeType })
            : new MediaRecorder(stream); 
            effectiveMimeTypeRef.current = mediaRecorderRef.current.mimeType;
            console.log("RealtimeVoiceTranslator: MediaRecorder instance created with effective mimeType:", effectiveMimeTypeRef.current);
        } catch (recorderError) {
            console.error("RealtimeVoiceTranslator: Error instantiating MediaRecorder:", recorderError);
            const errorMessage = (recorderError as Error).message || "Unknown recorder initialization error.";
            toast({ title: "Recording Error", description: `Could not initialize audio recorder: ${errorMessage}.`, variant: "destructive", duration: 7000 });
            if (stream) stream.getTracks().forEach(track => track.stop());
            return;
        }

        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            console.log("RealtimeVoiceTranslator: MediaRecorder ondataavailable: chunk received, size:", event.data.size, "total chunks:", audioChunksRef.current.length);
          } else {
            console.log("RealtimeVoiceTranslator: MediaRecorder ondataavailable: received empty chunk.");
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          console.log("RealtimeVoiceTranslator: MediaRecorder onstop event. Total chunks:", audioChunksRef.current.length);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log("RealtimeVoiceTranslator: Stream tracks stopped in onstop.");
          }
          
          const actualMimeType = effectiveMimeTypeRef.current || (selectedMimeType || 'audio/webm');
          console.log("RealtimeVoiceTranslator: Creating Blob with actual mimeType:", actualMimeType, "Number of chunks:", audioChunksRef.current.length);

          if (audioChunksRef.current.length === 0) {
            toast({ title: "No Audio Recorded", description: "No audio data chunks were captured. Please try speaking again.", variant: "default" });
            setIsRecording(false);
            setCurrentRecordingLang(null);
            return;
          }
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          console.log("RealtimeVoiceTranslator: Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);
          
          if (audioBlob.size < 1000) { 
            toast({ title: "Recording Too Short", description: "Recorded audio is very short or possibly silent. Please try speaking for a longer duration.", variant: "default", duration: 5000 });
            setIsRecording(false);
            setCurrentRecordingLang(null);
            setTranscribedText("");
            setTranslatedText("");
            setSummaryText("");
            return;
          }
          
          let audioDataUri: string;
          try {
            audioDataUri = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = (error) => {
                  console.error("RealtimeVoiceTranslator: FileReader error converting blob to Data URI:", error);
                  reject(new Error("Could not process recorded audio data. FileReader failed."));
              }
              reader.readAsDataURL(audioBlob);
            });
          } catch (fileReaderError) {
             toast({ title: "Audio Processing Error", description: (fileReaderError as Error).message, variant: "destructive" });
             setIsRecording(false);
             setCurrentRecordingLang(null);
             return;
          }

          await processAudio(audioDataUri, inputLang);
        };
        
        mediaRecorderRef.current.onerror = (event: Event) => {
            const mediaRecorderErrorEvent = event as MediaRecorderErrorEvent;
            const errorDetails = mediaRecorderErrorEvent.error;
            console.error("RealtimeVoiceTranslator: MediaRecorder error event:", event, "DOMException:", errorDetails);
            const errorMessage = errorDetails?.name || errorDetails?.message || 'Unknown recording error';
            toast({ title: "Recording Error", description: `An error occurred during recording: ${errorMessage}.`, variant: "destructive", duration: 7000 });
            setIsRecording(false);
            if (stream) stream.getTracks().forEach(track => track.stop());
            setCurrentRecordingLang(null);
        };

        mediaRecorderRef.current.start();
        console.log("RealtimeVoiceTranslator: MediaRecorder started for", inputLang);
        setIsRecording(true);
        toast({ title: `Recording in ${inputLang}...`, description: "Click the button again to stop." });

      } catch (err) {
        console.error("RealtimeVoiceTranslator: Error starting recording (getUserMedia or MediaRecorder setup):", err);
        toast({ title: "Could Not Start Recording", description: `Please check microphone permissions. Error: ${(err as Error).message}`, variant: "destructive" });
        setIsRecording(false);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log("RealtimeVoiceTranslator: Stream tracks stopped due to error in handleStartStopRecording.");
        }
        setCurrentRecordingLang(null);
      }
    }
  };

  const processAudio = async (audioDataUri: string, sourceLang: RecordingLanguage) => {
    setIsProcessing(true);
    setTranscribedText(""); 
    setTranslatedText("");  
    setSummaryText(""); // Clear previous summary
    const targetLang = sourceLang === 'English' ? 'Spanish' : 'English';
    console.log(`RealtimeVoiceTranslator: Starting processAudio. Source: ${sourceLang}, Target: ${targetLang}.`);

    let originalTranscript = "";

    try {
      setProcessingStep("transcribing");
      console.log("RealtimeVoiceTranslator: Sending audio for transcription...");
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      
      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') {
        console.error("RealtimeVoiceTranslator: Invalid transcription result from AI flow.", transcriptionResult);
        throw new Error(`Transcription service returned invalid data.`);
      }
      
      originalTranscript = transcriptionResult.transcription;
      setTranscribedText(originalTranscript);
      toast({ title: "Transcription Complete", description: `Source: ${sourceLang}`});
      console.log("RealtimeVoiceTranslator: Transcription complete:", originalTranscript.substring(0,100));

      if (!originalTranscript.trim()) {
         toast({ title: "Empty Transcription", description: "No speech detected in the audio."});
         throw new Error("Empty transcription result."); 
      }

      setProcessingStep("translating");
      console.log(`RealtimeVoiceTranslator: Translating from ${sourceLang} to ${targetLang}. Text: "${originalTranscript.substring(0, 50)}..."`);
      const translationResult = await translateText({ text: originalTranscript, targetLanguage: targetLang });

      if (!translationResult || typeof translationResult.translatedText !== 'string') {
        console.error("RealtimeVoiceTranslator: Invalid translation result from AI flow.", translationResult);
        throw new Error(`Translation service returned invalid data.`);
      }
      const finalText = translationResult.translatedText;
      setTranslatedText(finalText);
      toast({ title: "Translation Complete", description: `To: ${targetLang}`});
      console.log("RealtimeVoiceTranslator: Translation complete:", finalText.substring(0,100));
      
      // Summarization Step
      setProcessingStep("summarizing");
      console.log(`RealtimeVoiceTranslator: Summarizing original transcript. Text: "${originalTranscript.substring(0, 50)}..."`);
      const summaryResult = await summarizeConsultation({ transcript: originalTranscript });
      if (!summaryResult || typeof summaryResult.summary !== 'string') {
        console.error("RealtimeVoiceTranslator: Invalid summary result from AI flow.", summaryResult);
        throw new Error(`Summarization service returned invalid data.`);
      }
      setSummaryText(summaryResult.summary);
      toast({ title: "Summary Complete" });
      console.log("RealtimeVoiceTranslator: Summary complete:", summaryResult.summary.substring(0,100));

      setProcessingStep("completed"); 
      
    } catch (error: any) {
      console.error("RealtimeVoiceTranslator: Error in processing chain (transcribe/translate/summarize):", error);
      let detailedErrorMessage = "An unknown error occurred during AI processing.";
      if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else if (typeof error === 'string') {
        detailedErrorMessage = error;
      }
      
      toast({ 
        title: "Processing Error", 
        description: `Operation failed during: ${processingStep}. Details: ${detailedErrorMessage}`, 
        variant: "destructive",
        duration: 9000 
      });
      if (processingStep === "transcribing" || error.message === "Empty transcription result.") {
        setTranscribedText("");
        setTranslatedText("");
        setSummaryText("");
      } else if (processingStep === "translating") {
        setTranslatedText("");
        setSummaryText("");
      } else if (processingStep === "summarizing") {
        setSummaryText("");
      }
    } finally {
      console.log("RealtimeVoiceTranslator: processAudio finally block. Resetting processing states.");
      setIsProcessing(false);
      setProcessingStep("idle"); 
      // currentRecordingLang is reset by startStop or close, or if it didn't complete
      if (processingStep !== "completed") { 
        setCurrentRecordingLang(null);
      }
    }
  };

  // Utility function to play TTS, returns a Promise
  const playTTSSound = (text: string, lang: RecordingLanguage): Promise<void> => {
    console.log(`RealtimeVoiceTranslator: playTTSSound. Lang: ${lang}, Text: "${text.substring(0, 30)}..."`);
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        toast({ title: "TTS Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
        reject(new Error("TTSNotSupported"));
        return;
      }
      if (!text.trim()) {
        console.log("RealtimeVoiceTranslator: TTS skipped, text is empty.");
        resolve();
        return;
      }

      // Cancel any previous speech and clear existing timeout
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            console.log("RealtimeVoiceTranslator: Cancelling existing/pending speech before new utterance.");
            window.speechSynthesis.cancel();
        }
      }
      if (ttsTimeoutRef.current) {
        clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'English' ? 'en-US' : 'es-ES';
      
      const ttsTimeoutDuration = 20000; // 20 seconds
      ttsTimeoutRef.current = setTimeout(() => {
        console.warn(`RealtimeVoiceTranslator: TTS playback timed out for lang: ${lang} after ${ttsTimeoutDuration}ms. Cancelling speech.`);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel(); 
        }
        ttsTimeoutRef.current = null;
        reject(new Error("TTSPlaybackTimeout"));
      }, ttsTimeoutDuration);

      utterance.onend = () => {
        console.log("RealtimeVoiceTranslator: TTS 'onend' event fired for lang:", lang);
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
        resolve();
      };

      utterance.onerror = (event) => {
        console.error("RealtimeVoiceTranslator: Speech synthesis 'onerror' event:", event);
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
        let errorMsg = `Could not play the audio in ${lang}.`;
        if (event.error && typeof event.error === 'string') { // DOMError has 'name' typically
            errorMsg += ` Error: ${event.error}`;
        } else if (event.error && typeof (event.error as any).name === 'string'){
            errorMsg += ` Error: ${(event.error as any).name}`;
        }
        toast({ title: "TTS Error", description: errorMsg, variant: "destructive" });
        reject(new Error(typeof event.error === 'string' ? event.error : "TTSPlaybackError")); 
      };
      
      try {
         console.log("RealtimeVoiceTranslator: Calling speechSynthesis.speak() for lang:", utterance.lang);
         window.speechSynthesis.speak(utterance);
      } catch (e: any) {
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        ttsTimeoutRef.current = null;
        console.error("RealtimeVoiceTranslator: Exception during speechSynthesis.speak() setup/call:", e);
        toast({ title: "TTS Playback Failed", description: `An unexpected error occurred trying to play audio. Error: ${e.message || String(e)}`, variant: "destructive" });
        reject(e); 
      }
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
      // Toast for specific TTS errors is handled within playTTSSound or its caller.
    } finally {
      setIsManuallyPlayingTTS(false);
    }
  };

  const handleStopManualTTS = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }
    setIsManuallyPlayingTTS(false);
  };


  const getProgressValue = () => {
    if (!isProcessing) return 0;
    switch (processingStep) {
      case "transcribing": return 25;
      case "translating": return 50;
      case "summarizing": return 75;
      case "completed": return 100;
      default: return 0;
    }
  };

  const renderMicButton = (lang: RecordingLanguage, label: string) => (
    <Button
      size="lg"
      variant={isRecording && currentRecordingLang === lang ? "destructive" : "default"}
      onClick={() => handleStartStopRecording(lang)}
      disabled={
        (!isOpen || !isPermissionChecked || !hasMicPermission) || 
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
        console.log("RealtimeVoiceTranslator: Dialog closing...");
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop(); 
          console.log("RealtimeVoiceTranslator: Dialog closed, MediaRecorder.stop() called.");
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

        if (typeof window !== 'undefined' && window.speechSynthesis) { 
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
                console.log("RealtimeVoiceTranslator: Speech synthesis cancelled on dialog close.");
            }
        }
        if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
        setIsManuallyPlayingTTS(false); 
        
        if (isPermissionChecked && !hasMicPermission && !isOpen) { 
            setIsPermissionChecked(false); 
            console.log("RealtimeVoiceTranslator: Resetting permission check status on dialog close because permission was not granted.");
        }
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
            Speak in English or Spanish. The app will transcribe, translate, and summarize. Tap play to hear the translation.
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
              Please enable microphone permissions in your browser settings for this site and reopen the translator. You might need to refresh the page after enabling.
            </AlertDescription>
          </Alert>
        )}

        {isPermissionChecked && hasMicPermission && isOpen && (
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
                        {isManuallyPlayingTTS ? (
                          <>
                            <StopCircle className="mr-2 h-4 w-4" /> Stop
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" /> Play
                          </>
                        )}
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

    