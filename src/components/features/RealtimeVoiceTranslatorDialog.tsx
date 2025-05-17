
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
import { Loader2, Mic, StopCircle, Volume2, AlertTriangle, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { translateText } from '@/ai/flows/translate-text-flow';
import { Progress } from '@/components/ui/progress';

interface RealtimeVoiceTranslatorDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

type ProcessingStep = "idle" | "transcribing" | "translating" | "speaking";
type RecordingLanguage = "English" | "Spanish";

export default function RealtimeVoiceTranslatorDialog({ isOpen, onOpenChange }: RealtimeVoiceTranslatorDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [currentRecordingLang, setCurrentRecordingLang] = useState<RecordingLanguage | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [translatedText, setTranslatedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>("idle");
  const [speakingLanguage, setSpeakingLanguage] = useState<string | null>(null);

  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && !isPermissionChecked) {
      const getMicPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setHasMicPermission(true);
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.error('Error accessing microphone:', error);
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
     // Cleanup TTS when dialog closes or isRecording/isProcessing changes
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setSpeakingLanguage(null);
      }
    };
  }, [isOpen, isPermissionChecked, toast]);


  const handleStartStopRecording = async (inputLang: RecordingLanguage) => {
    if (isRecording) { // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        console.log("MediaRecorder.stop() called.");
      }
      setIsRecording(false);
      // onstop will handle processing
    } else { // Start recording
      if (!hasMicPermission || !isPermissionChecked) {
        toast({ title: "Microphone Access Required", description: "Please enable microphone permissions.", variant: "destructive" });
        return;
      }
      if (isProcessing || speakingLanguage) {
        toast({ title: "Busy", description: "Please wait for the current action to complete.", variant: "default" });
        return;
      }

      setTranscribedText("");
      setTranslatedText("");
      setCurrentRecordingLang(inputLang);
      audioChunksRef.current = [];
      let stream: MediaStream | null = null;

      try {
        console.log("Requesting media stream for recording...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Media stream obtained.");

        const MimeTypes = [
          'audio/mp4',
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm',
          'audio/aac',
        ];
        let selectedMimeType = '';
        for (const type of MimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            console.log("Selected MediaRecorder mimeType will be:", selectedMimeType);
            break;
          }
        }
        if (!selectedMimeType) {
            console.log("No preferred mimeType supported, trying browser default for MediaRecorder.");
        }
        
        try {
            mediaRecorderRef.current = selectedMimeType
            ? new MediaRecorder(stream, { mimeType: selectedMimeType })
            : new MediaRecorder(stream);
            console.log("MediaRecorder instance created with effective mimeType:", mediaRecorderRef.current.mimeType);
        } catch (recorderError) {
            console.error("Error instantiating MediaRecorder:", recorderError);
            toast({ title: "Recording Error", description: `Could not initialize audio recorder: ${(recorderError as Error).message}. Your browser might not support the required audio formats.`, variant: "destructive", duration: 7000 });
            setIsRecording(false);
            if (stream) stream.getTracks().forEach(track => track.stop());
            return;
        }


        mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
            console.log("MediaRecorder ondataavailable: chunk received, size:", event.data.size, "total chunks:", audioChunksRef.current.length);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          console.log("MediaRecorder onstop event. Stream tracks:", stream?.getTracks());
          if (stream) stream.getTracks().forEach(track => track.stop());
          console.log("Stream tracks stopped in onstop.");
          
          const actualMimeType = mediaRecorderRef.current?.mimeType || (selectedMimeType || 'audio/webm');
          console.log("Creating Blob with mimeType:", actualMimeType, "Number of chunks:", audioChunksRef.current.length);

          if (audioChunksRef.current.length === 0) {
            toast({ title: "No Audio Recorded", description: "No audio data chunks were captured. Please try speaking again.", variant: "default" });
            setIsRecording(false); // Ensure isRecording is false
            setCurrentRecordingLang(null);
            return;
          }
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          
          if (audioBlob.size === 0) {
            toast({ title: "No Audio Recorded", description: "Recorded audio is empty. Please try speaking again.", variant: "default" });
            setIsRecording(false); // Ensure isRecording is false
            setCurrentRecordingLang(null);
            return;
          }
          const audioDataUri = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(audioBlob);
          });
          await processAudio(audioDataUri, inputLang);
        };
        
        mediaRecorderRef.current.onerror = (event: Event) => {
            const mediaRecorderErrorEvent = event as MediaRecorderErrorEvent;
            const errorDetails = mediaRecorderErrorEvent.error;
            console.error("MediaRecorder error event:", event, "DOMException:", errorDetails);
            const errorMessage = errorDetails?.name || errorDetails?.message || 'Unknown recording error';
            toast({ title: "Recording Error", description: `An error occurred during recording: ${errorMessage}. Please ensure microphone is working.`, variant: "destructive", duration: 7000 });
            setIsRecording(false);
            if (stream) stream.getTracks().forEach(track => track.stop());
            setCurrentRecordingLang(null);
        };

        mediaRecorderRef.current.start();
        console.log("MediaRecorder started.");
        setIsRecording(true);
        toast({ title: `Recording in ${inputLang}...`, description: "Click the button again to stop." });

      } catch (err) {
        console.error("Error starting recording (getUserMedia or MediaRecorder setup):", err);
        toast({ title: "Could Not Start Recording", description: `Please check microphone permissions. Error: ${(err as Error).message}`, variant: "destructive" });
        setIsRecording(false);
        if (stream) stream.getTracks().forEach(track => track.stop());
        setCurrentRecordingLang(null);
      }
    }
  };

  const processAudio = async (audioDataUri: string, sourceLang: RecordingLanguage) => {
    setIsProcessing(true);
    const targetLang = sourceLang === 'English' ? 'Spanish' : 'English';

    try {
      // 1. Transcribe
      setProcessingStep("transcribing");
      console.log("Sending audio for transcription. Source lang hint:", sourceLang);
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') {
         throw new Error("Transcription service returned invalid or no data.");
      }
      const originalTranscript = transcriptionResult.transcription;
      setTranscribedText(originalTranscript);
      toast({ title: "Transcription Complete", description: `Source: ${sourceLang}`});

      if (!originalTranscript.trim()) {
         toast({ title: "Empty Transcription", description: "No speech detected in the audio."});
         setIsProcessing(false);
         setProcessingStep("idle");
         setCurrentRecordingLang(null);
         return;
      }

      // 2. Translate
      setProcessingStep("translating");
      console.log(`Translating from ${sourceLang} to ${targetLang}. Text: "${originalTranscript.substring(0, 50)}..."`);
      const translationResult = await translateText({ text: originalTranscript, targetLanguage: targetLang });
      if (!translationResult || typeof translationResult.translatedText !== 'string') {
        throw new Error("Translation service returned invalid or no data.");
      }
      const finalText = translationResult.translatedText;
      setTranslatedText(finalText);
      toast({ title: "Translation Complete", description: `To: ${targetLang}`});

      // 3. Speak
      setProcessingStep("speaking");
      await playTTS(finalText, targetLang);
      
    } catch (error) {
      console.error("Error in processing chain:", error);
      toast({ title: "Processing Error", description: (error as Error).message || "An unknown error occurred.", variant: "destructive" });
      setTranscribedText(""); // Clear texts on error
      setTranslatedText("");
    } finally {
      setIsProcessing(false);
      setProcessingStep("idle");
      setCurrentRecordingLang(null); // Reset current recording language after processing
    }
  };

  const playTTS = async (text: string, lang: RecordingLanguage) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ title: "TTS Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
      return;
    }
    if (!text.trim()) {
      setSpeakingLanguage(null); 
      return;
    }
    
    setSpeakingLanguage(lang); 

    return new Promise<void>((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'English' ? 'en-US' : 'es-ES';
      // Add a small delay before speaking on some browsers to ensure everything is ready
      setTimeout(() => {
        utterance.onend = () => {
          setSpeakingLanguage(null);
          resolve();
        };
        utterance.onerror = (event) => {
          console.error("Speech synthesis error", event);
          toast({ title: "TTS Error", description: `Could not play the audio in ${lang}. Error: ${event.error}`, variant: "destructive" });
          setSpeakingLanguage(null);
          reject(event.error || new Error("TTS failed"));
        };
        window.speechSynthesis.cancel(); 
        window.speechSynthesis.speak(utterance);
      }, 100); // 100ms delay
    });
  };

  const getProgressValue = () => {
    if (!isProcessing) return 0;
    switch (processingStep) {
      case "transcribing": return 33;
      case "translating": return 66;
      case "speaking": return 100;
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
        !!speakingLanguage 
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
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          console.log("Dialog closed, MediaRecorder stopped.");
        }
        audioChunksRef.current = [];
        setIsRecording(false);
        setCurrentRecordingLang(null);
        setIsProcessing(false);
        setProcessingStep("idle");
        setTranscribedText("");
        setTranslatedText("");
        if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();
        setSpeakingLanguage(null);
        // Only reset permission checked if it was false to allow re-check, or if permission was never granted
        if (!isPermissionChecked || !hasMicPermission) {
            setIsPermissionChecked(false);
        }
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl flex flex-col h-[80vh] max-h-[800px] min-h-[500px]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center text-xl">
            <Languages className="mr-2 h-6 w-6 text-primary" />
            Real-time Voice Translator
          </DialogTitle>
          <DialogDescription className="text-sm">
            Speak in English or Spanish. The app will transcribe, translate, and speak it in the other language.
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

        {isPermissionChecked && hasMicPermission && isOpen && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              {renderMicButton("English", "Speak in English")}
              {renderMicButton("Spanish", "Speak in Spanish")}
            </div>

            {(isProcessing || transcribedText || translatedText) && (
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={getProgressValue()} className="w-full h-2" />
                    <p className="text-sm text-center text-muted-foreground capitalize">
                      {processingStep === "idle" ? "Waiting..." : `${processingStep}...`}
                      {speakingLanguage && ` (${speakingLanguage})`}
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
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      Translation ({currentRecordingLang === 'English' ? 'Spanish' : 'English'}):
                      {speakingLanguage === (currentRecordingLang === 'English' ? 'Spanish' : 'English') && <Volume2 className="inline-block ml-2 h-4 w-4 text-primary animate-pulse" />}
                    </h3>
                    <p className="p-3 bg-primary/10 rounded-md border border-primary/30 whitespace-pre-wrap text-sm">{translatedText}</p>
                  </div>
                )}
              </div>
            )}
            { !isProcessing && !transcribedText && !translatedText &&
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
