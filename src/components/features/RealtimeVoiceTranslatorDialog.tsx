
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
  const [speakingLanguage, setSpeakingLanguage] = useState<RecordingLanguage | null>(null);

  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const effectiveMimeTypeRef = useRef<string>('');
  const { toast } = useToast();

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
    // Cleanup TTS when component unmounts or dialog closes
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
        console.log("RealtimeVoiceTranslator: Unmounting/closing, cancelling any active speech.");
        window.speechSynthesis.cancel();
        setSpeakingLanguage(null); 
      }
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
        if (!isPermissionChecked) setIsPermissionChecked(false); // Re-trigger permission check on next open
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
        console.log("RealtimeVoiceTranslator: Requesting media stream for recording...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("RealtimeVoiceTranslator: Media stream obtained:", stream);

        const MimeTypes = [
          'audio/mp4', // Often preferred by Safari/iOS
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm', // General fallback
          'audio/aac', 
        ];
        let selectedMimeType = '';
        for (const type of MimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            console.log("RealtimeVoiceTranslator: MediaRecorder.isTypeSupported is true for:", type);
            break;
          }
           console.log("RealtimeVoiceTranslator: MediaRecorder.isTypeSupported is false for:", type);
        }
        
        if (!selectedMimeType && MediaRecorder.isTypeSupported('')) { // Try browser default if no preferred type found
             console.log("RealtimeVoiceTranslator: No preferred mimeType supported by MediaRecorder.isTypeSupported, trying browser default (empty string).");
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
            : new MediaRecorder(stream); // Let browser pick if selectedMimeType is empty string
            effectiveMimeTypeRef.current = mediaRecorderRef.current.mimeType;
            console.log("RealtimeVoiceTranslator: MediaRecorder instance created with effective mimeType:", effectiveMimeTypeRef.current);
        } catch (recorderError) {
            console.error("RealtimeVoiceTranslator: Error instantiating MediaRecorder:", recorderError);
            const errorMessage = (recorderError as Error).message || "Unknown recorder initialization error.";
            toast({ title: "Recording Error", description: `Could not initialize audio recorder: ${errorMessage}. Your browser might not support the required audio formats.`, variant: "destructive", duration: 7000 });
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
          // Ensure stream is stopped in onstop to release mic
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log("RealtimeVoiceTranslator: Stream tracks stopped in onstop.");
          }
          
          const actualMimeType = effectiveMimeTypeRef.current || (selectedMimeType || 'audio/webm'); // Fallback if ref wasn't set
          console.log("RealtimeVoiceTranslator: Creating Blob with actual mimeType:", actualMimeType, "Number of chunks:", audioChunksRef.current.length);

          if (audioChunksRef.current.length === 0) {
            toast({ title: "No Audio Recorded", description: "No audio data chunks were captured. Please try speaking again.", variant: "default" });
            setIsRecording(false); // Reset recording state
            setCurrentRecordingLang(null); // Reset language context
            return;
          }
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
          console.log("RealtimeVoiceTranslator: Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);
          
          if (audioBlob.size < 1000) { // Check for very small blobs (e.g., less than 1KB)
            toast({ title: "Recording Too Short", description: "Recorded audio is very short or possibly silent. Please try speaking for a longer duration.", variant: "default", duration: 5000 });
            setIsRecording(false); // Reset recording state
            setCurrentRecordingLang(null); // Reset language context
            setTranscribedText(""); // Clear any previous text
            setTranslatedText("");
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
            toast({ title: "Recording Error", description: `An error occurred during recording: ${errorMessage}. Please ensure microphone is working.`, variant: "destructive", duration: 7000 });
            setIsRecording(false);
            if (stream) stream.getTracks().forEach(track => track.stop());
            setCurrentRecordingLang(null); // Reset language context
        };

        mediaRecorderRef.current.start();
        console.log("RealtimeVoiceTranslator: MediaRecorder started for", inputLang);
        setIsRecording(true);
        toast({ title: `Recording in ${inputLang}...`, description: "Click the button again to stop." });

      } catch (err) {
        console.error("RealtimeVoiceTranslator: Error starting recording (getUserMedia or MediaRecorder setup):", err);
        toast({ title: "Could Not Start Recording", description: `Please check microphone permissions. Error: ${(err as Error).message}`, variant: "destructive" });
        setIsRecording(false);
        if (stream) { // Ensure stream tracks are stopped if stream was obtained before error
            stream.getTracks().forEach(track => track.stop());
            console.log("RealtimeVoiceTranslator: Stream tracks stopped due to error in handleStartStopRecording.");
        }
        setCurrentRecordingLang(null); // Reset language context
      }
    }
  };

  const processAudio = async (audioDataUri: string, sourceLang: RecordingLanguage) => {
    setIsProcessing(true);
    const targetLang = sourceLang === 'English' ? 'Spanish' : 'English';
    console.log(`RealtimeVoiceTranslator: Starting processAudio. Source: ${sourceLang}, Target: ${targetLang}.`);

    try {
      setProcessingStep("transcribing");
      console.log("RealtimeVoiceTranslator: Sending audio for transcription...");
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      
      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') {
        console.error("RealtimeVoiceTranslator: Invalid transcription result from AI flow.", transcriptionResult);
        throw new Error(`Transcription service returned invalid data. Received: ${JSON.stringify(transcriptionResult)}`);
      }
      
      const originalTranscript = transcriptionResult.transcription;
      setTranscribedText(originalTranscript);
      toast({ title: "Transcription Complete", description: `Source: ${sourceLang}`});
      console.log("RealtimeVoiceTranslator: Transcription complete:", originalTranscript.substring(0,100));

      if (!originalTranscript.trim()) {
         toast({ title: "Empty Transcription", description: "No speech detected in the audio. Please try speaking clearly."});
         setProcessingStep("idle"); 
         setIsProcessing(false); 
         setCurrentRecordingLang(null); 
         return; 
      }

      setProcessingStep("translating");
      console.log(`RealtimeVoiceTranslator: Translating from ${sourceLang} to ${targetLang}. Text: "${originalTranscript.substring(0, 50)}..."`);
      const translationResult = await translateText({ text: originalTranscript, targetLanguage: targetLang });

      if (!translationResult || typeof translationResult.translatedText !== 'string') {
        console.error("RealtimeVoiceTranslator: Invalid translation result from AI flow.", translationResult);
        throw new Error(`Translation service returned invalid data. Received: ${JSON.stringify(translationResult)}`);
      }
      const finalText = translationResult.translatedText;
      setTranslatedText(finalText);
      toast({ title: "Translation Complete", description: `To: ${targetLang}`});
      console.log("RealtimeVoiceTranslator: Translation complete:", finalText.substring(0,100));

      setProcessingStep("speaking");
      console.log("RealtimeVoiceTranslator: Attempting to speak translated text in", targetLang);
      await playTTS(finalText, targetLang);
      console.log("RealtimeVoiceTranslator: TTS playback attempt finished or skipped.");
      
    } catch (error: any) {
      console.error("RealtimeVoiceTranslator: Error in processing chain (transcribe/translate/speak):", error);
      let detailedErrorMessage = "An unknown error occurred during AI processing.";
      if (error instanceof Error) {
        detailedErrorMessage = error.message;
      } else if (typeof error === 'string') {
        detailedErrorMessage = error;
      } else if (error && typeof (error as any).toString === 'function') {
        detailedErrorMessage = (error as any).toString();
      }
      
      if (detailedErrorMessage.toLowerCase().includes("unknown error") || detailedErrorMessage.toLowerCase().includes("unknown transcription error")) {
          detailedErrorMessage = "The AI service could not process the audio. This might be due to the audio format/quality or a temporary service issue. Please try again.";
      } else if (detailedErrorMessage.toLowerCase().includes("invalid response") || detailedErrorMessage.toLowerCase().includes("invalid data")) {
          detailedErrorMessage = "The AI service returned an unexpected response. Please try again.";
      }

      toast({ 
        title: "Processing Error", 
        description: `Operation failed during: ${processingStep}. Details: ${detailedErrorMessage}`, 
        variant: "destructive",
        duration: 9000 
      });
      setTranscribedText(""); 
      setTranslatedText("");
    } finally {
      setIsProcessing(false);
      setProcessingStep("idle");
      setCurrentRecordingLang(null); 
      console.log("RealtimeVoiceTranslator: processAudio finished and states reset.");
    }
  };

 const playTTS = async (text: string, lang: RecordingLanguage): Promise<void> => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ title: "TTS Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
      return Promise.resolve();
    }
    
    setSpeakingLanguage(lang); 
    console.log(`RealtimeVoiceTranslator: playTTS called. Lang: ${lang}, Text: "${text.substring(0,30)}..."`);

    return new Promise<void>((resolve) => {
      if (!text.trim()) {
        console.log("RealtimeVoiceTranslator: TTS skipped, text is empty.");
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'English' ? 'en-US' : 'es-ES';
      
      // Log available voices for debugging if needed
      // const availableVoices = window.speechSynthesis.getVoices();
      // console.log("RealtimeVoiceTranslator: Available TTS voices:", availableVoices.map(v => ({name: v.name, lang: v.lang })));

      let ttsTimedOut = false;
      const ttsTimeoutDuration = 20000; // 20 seconds timeout for speech

      const timeoutId = setTimeout(() => {
        ttsTimedOut = true;
        console.warn(`RealtimeVoiceTranslator: TTS timed out for lang: ${lang} after ${ttsTimeoutDuration}ms. Cancelling speech.`);
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel(); 
        }
        resolve(); 
      }, ttsTimeoutDuration);

      utterance.onend = () => {
        clearTimeout(timeoutId);
        if (ttsTimedOut) return; 
        console.log("RealtimeVoiceTranslator: TTS 'onend' event fired for lang:", lang);
        resolve();
      };

      utterance.onerror = (event) => {
        clearTimeout(timeoutId);
        if (ttsTimedOut) return; 
        console.error("RealtimeVoiceTranslator: Speech synthesis 'onerror' event:", event);
        let errorMsg = `Could not play the audio in ${lang}.`;
        if (event.error) {
          errorMsg += ` Error: ${event.error}`;
        }
        toast({ title: "TTS Error", description: errorMsg, variant: "destructive" });
        resolve(); 
      };
      
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                console.log("RealtimeVoiceTranslator: Cancelling existing speech before new utterance.");
                window.speechSynthesis.cancel();
            }
            
            setTimeout(() => { // Small delay might help some browsers queue correctly
                if (ttsTimedOut) {
                    console.log("RealtimeVoiceTranslator: Speak call skipped, TTS already timed out.");
                    return;
                }
                console.log("RealtimeVoiceTranslator: Calling speechSynthesis.speak() for lang:", utterance.lang);
                window.speechSynthesis.speak(utterance);
            }, 100);
        } else {
            console.error("RealtimeVoiceTranslator: window.speechSynthesis not available at speak call.");
            resolve(); // Can't speak, resolve to unblock
        }
      } catch (e) {
        clearTimeout(timeoutId);
        console.error("RealtimeVoiceTranslator: Exception during speechSynthesis.speak() setup:", e);
        toast({ title: "TTS Playback Failed", description: `An unexpected error occurred trying to play audio.`, variant: "destructive" });
        resolve(); 
      }
    }).finally(() => {
        console.log(`RealtimeVoiceTranslator: playTTS promise finally block for lang ${lang}. Resetting speakingLanguage.`);
        setSpeakingLanguage(null);
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

        if (typeof window !== 'undefined' && window.speechSynthesis) { 
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
                console.log("RealtimeVoiceTranslator: Speech synthesis cancelled on dialog close.");
            }
        }
        setSpeakingLanguage(null); 
        
        // Reset permission check if it was not granted, to re-check next time dialog opens.
        if (isPermissionChecked && !hasMicPermission) {
            setIsPermissionChecked(false); 
            console.log("RealtimeVoiceTranslator: Resetting permission check status because permission was not granted.");
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

            {(isProcessing || transcribedText || translatedText) && (
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {isProcessing && (
                  <div className="space-y-2">
                    <Progress value={getProgressValue()} className="w-full h-2" />
                    <p className="text-sm text-center text-muted-foreground capitalize">
                      {processingStep === "idle" ? "Waiting..." : `${processingStep}...`}
                      {speakingLanguage && ` (Playing In ${speakingLanguage})`}
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
