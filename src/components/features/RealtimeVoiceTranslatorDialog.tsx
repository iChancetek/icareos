
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
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.speaking) {
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
        if (!isPermissionChecked) setIsPermissionChecked(false); 
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
            console.log("RealtimeVoiceTranslator: MediaRecorder.isTypeSupported is true for:", type);
            break;
          }
           console.log("RealtimeVoiceTranslator: MediaRecorder.isTypeSupported is false for:", type);
        }
        if (!selectedMimeType && MediaRecorder.isTypeSupported('')) { 
             console.log("RealtimeVoiceTranslator: No preferred mimeType supported, trying browser default for MediaRecorder.");
             selectedMimeType = ''; 
        } else if (!selectedMimeType) {
            console.error("RealtimeVoiceTranslator: No supported MIME type found for MediaRecorder.");
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
          console.log("RealtimeVoiceTranslator: MediaRecorder onstop event. Total chunks:", audioChunksRef.current.length, "Stream tracks:", stream?.getTracks().map(t=>t.readyState));
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
    const targetLang = sourceLang === 'English' ? 'Spanish' : 'English';
    console.log(`RealtimeVoiceTranslator: Starting processAudio. Source: ${sourceLang}, Target: ${targetLang}. Audio URI length: ${audioDataUri.length}`);

    try {
      setProcessingStep("transcribing");
      console.log("RealtimeVoiceTranslator: Sending audio for transcription...");
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      console.log("RealtimeVoiceTranslator: Transcription result from AI flow:", transcriptionResult);

      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') {
        console.error("RealtimeVoiceTranslator: Invalid transcription result from AI flow.", transcriptionResult);
        throw new Error(`Transcription service returned invalid or no data. Received: ${JSON.stringify(transcriptionResult)}`);
      }
      
      const originalTranscript = transcriptionResult.transcription;
      setTranscribedText(originalTranscript);
      toast({ title: "Transcription Complete", description: `Source: ${sourceLang}`});
      console.log("RealtimeVoiceTranslator: Transcription complete:", originalTranscript.substring(0,100));


      if (!originalTranscript.trim()) {
         toast({ title: "Empty Transcription", description: "No speech detected in the audio. Please try speaking clearly."});
         // Skip further processing but ensure states are reset correctly in finally
         setProcessingStep("idle"); // Move to idle early
         setIsProcessing(false); // Allow buttons to re-enable
         setCurrentRecordingLang(null); // Clear current recording context
         return; // Exit early
      }

      setProcessingStep("translating");
      console.log(`RealtimeVoiceTranslator: Translating from ${sourceLang} to ${targetLang}. Text: "${originalTranscript.substring(0, 50)}..."`);
      const translationResult = await translateText({ text: originalTranscript, targetLanguage: targetLang });
      console.log("RealtimeVoiceTranslator: Translation result from AI flow:", translationResult);

      if (!translationResult || typeof translationResult.translatedText !== 'string') {
        console.error("RealtimeVoiceTranslator: Invalid translation result from AI flow.", translationResult);
        throw new Error(`Translation service returned invalid or no data. Received: ${JSON.stringify(translationResult)}`);
      }
      const finalText = translationResult.translatedText;
      setTranslatedText(finalText);
      toast({ title: "Translation Complete", description: `To: ${targetLang}`});
      console.log("RealtimeVoiceTranslator: Translation complete:", finalText.substring(0,100));

      setProcessingStep("speaking");
      console.log("RealtimeVoiceTranslator: Attempting to speak translated text in", targetLang);
      await playTTS(finalText, targetLang);
      console.log("RealtimeVoiceTranslator: TTS playback finished or skipped.");
      
    } catch (error) {
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
      console.log("RealtimeVoiceTranslator: processAudio finished.");
    }
  };

 const playTTS = async (text: string, lang: RecordingLanguage) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ title: "TTS Not Supported", description: "Your browser does not support text-to-speech.", variant: "destructive" });
      return;
    }

    // Log available voices for debugging, especially on iOS
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length === 0) {
        // On some browsers (like Safari iOS), getVoices() is async and might be empty on first call.
        // It might populate after a short delay or after the first speak attempt.
        console.warn("RealtimeVoiceTranslator: getVoices() returned empty array initially. TTS might use default voice or lang attribute.");
    } else {
        console.log("RealtimeVoiceTranslator: Available TTS voices at playTTS call:", availableVoices.length, availableVoices.map(v => ({name: v.name, lang: v.lang, default: v.default, localService: v.localService })));
    }

    setSpeakingLanguage(lang); 

    return new Promise<void>((resolve) => {
      if (!text.trim()) {
        console.log("RealtimeVoiceTranslator: TTS skipped, text is empty.");
        setSpeakingLanguage(null); 
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'English' ? 'en-US' : 'es-ES';
      // utterance.rate = 0.9; // Optional: slightly slower rate for clarity
      // utterance.pitch = 1;   // Optional: default pitch

      console.log(`RealtimeVoiceTranslator: TTS Utterance prepared. Text: "${text.substring(0,50)}...", Lang: ${utterance.lang}`);

      utterance.onend = () => {
        console.log("RealtimeVoiceTranslator: TTS ended for lang:", lang);
        setSpeakingLanguage(null);
        resolve();
      };
      utterance.onerror = (event) => {
        console.error("RealtimeVoiceTranslator: Speech synthesis error event:", event);
        let errorMsg = `Could not play the audio in ${lang}.`;
        if (event.error) {
          errorMsg += ` Error: ${event.error}`;
        }
        toast({ title: "TTS Error", description: errorMsg, variant: "destructive" });
        setSpeakingLanguage(null);
        resolve(); 
      };
      
      try {
        // It's good practice to cancel any ongoing speech before starting a new one.
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            console.log("RealtimeVoiceTranslator: Cancelling existing speech before new utterance.");
            window.speechSynthesis.cancel();
        }
        
        // Adding a small delay, sometimes helps with race conditions on mobile
        setTimeout(() => {
            console.log("RealtimeVoiceTranslator: Calling speechSynthesis.speak() for lang:", utterance.lang);
            window.speechSynthesis.speak(utterance);
        }, 100);

      } catch (e) {
        console.error("RealtimeVoiceTranslator: Exception during speechSynthesis.speak() setup:", e);
        toast({ title: "TTS Playback Failed", description: `An unexpected error occurred trying to play audio.`, variant: "destructive" });
        setSpeakingLanguage(null);
        resolve(); 
      }
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
        
        if (!isPermissionChecked || !hasMicPermission) {
            setIsPermissionChecked(false); 
            console.log("RealtimeVoiceTranslator: Resetting permission check status for next open.");
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
                      {speakingLanguage && ` (Playing in ${speakingLanguage})`}
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

interface MediaRecorderErrorEvent extends Event {
  readonly error: DOMException;
}

interface BlobEvent extends Event {
  readonly data: Blob;
  readonly timecode: number;
}
