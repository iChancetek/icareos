
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, StopCircle, Save, Loader2, AlertTriangle, CheckCircle, LanguagesIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { summarizeConsultation } from '@/ai/flows/summarize-consultation';
import { translateText } from '@/ai/flows/translate-text-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendDataToHubSpot } from '@/services/hubspotService';
import type { Consultation } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export default function NewConsultationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [progress, setProgress] = useState(0);
  const [patientName, setPatientName] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  const effectiveMimeTypeRef = useRef<string>(''); // To store the actual mimeType used
  
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);

  const processingSteps = ["Transcribing Audio...", "Translating Transcript (Optional)...", "Generating Summary...", "Finalizing..."];
  const [currentStepMessage, setCurrentStepMessage] = useState("");
  const [targetTranslationLanguage, setTargetTranslationLanguage] = useState<string>('none');


  useEffect(() => {
    const getMicPermission = async () => {
      console.log("NewConsultation: Attempting to get microphone permission...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        console.log("NewConsultation: Microphone permission granted.");
        stream.getTracks().forEach(track => track.stop()); // Release mic immediately
      } catch (error) {
        console.error('NewConsultation: Error accessing microphone:', error);
        setHasMicPermission(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings and refresh the page.',
          duration: 7000,
        });
      } finally {
        setIsPermissionChecked(true);
        console.log("NewConsultation: Microphone permission check complete. Has permission:", hasMicPermission);
      }
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      if (!isPermissionChecked) { // Only check if not already checked
        getMicPermission();
      }
    } else {
      console.error("NewConsultation: Audio recording not supported or permissions blocked.");
      setHasMicPermission(false);
      setIsPermissionChecked(true); // Mark as checked even if not supported
      toast({
        variant: 'destructive',
        title: 'Unsupported Browser or Settings',
        description: 'Audio recording is not supported or microphone permissions are blocked.',
        duration: 7000,
      });
    }
  }, [isPermissionChecked, toast]); // Re-run if isPermissionChecked changes (e.g. dialog reopens)


  const handleStartRecording = async () => {
    console.log("NewConsultation: handleStartRecording. Has mic permission:", hasMicPermission, "Permission checked:", isPermissionChecked);
    if (!patientName.trim()) {
      toast({ title: "Patient Name Required", description: "Please enter the patient's name before recording.", variant: "destructive" });
      return;
    }
    if (!isPermissionChecked || !hasMicPermission) {
      toast({ title: "Microphone Access Required", description: "Please enable microphone permissions and try again.", variant: "destructive" });
      // Optionally try to re-request permission
      if (!isPermissionChecked) setIsPermissionChecked(false); // Trigger useEffect to re-check
      return;
    }
    let stream: MediaStream | null = null;
    try {
      console.log("NewConsultation: Requesting media stream for recording...");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("NewConsultation: Media stream obtained:", stream);

      audioChunksRef.current = [];
      setAudioDataUri(null); 

      const MimeTypes = [
          'audio/mp4', // Often preferred by Safari/iOS
          'audio/webm;codecs=opus',
          'audio/ogg;codecs=opus',
          'audio/webm',
          'audio/aac',
      ];
      let selectedMimeType = '';
      for (const type of MimeTypes) {
          if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            console.log("NewConsultation: MediaRecorder.isTypeSupported is true for:", type);
            break;
          }
          console.log("NewConsultation: MediaRecorder.isTypeSupported is false for:", type);
      }
      if (!selectedMimeType) {
          console.log("NewConsultation: No preferred mimeType supported, trying browser default for MediaRecorder.");
      }
      
      try {
          mediaRecorderRef.current = selectedMimeType
          ? new MediaRecorder(stream, { mimeType: selectedMimeType })
          : new MediaRecorder(stream); // Let browser pick if none are explicitly supported
          effectiveMimeTypeRef.current = mediaRecorderRef.current.mimeType;
          console.log("NewConsultation: MediaRecorder instance created with effective mimeType:", effectiveMimeTypeRef.current);
      } catch (recorderError) {
          console.error("NewConsultation: Error instantiating MediaRecorder:", recorderError);
          const errorMessage = (recorderError as Error).message || "Unknown recorder initialization error.";
          toast({ title: "Recording Error", description: `Could not initialize audio recorder: ${errorMessage}. Your browser might not support the required audio formats.`, variant: "destructive", duration: 7000 });
          if (stream) stream.getTracks().forEach(track => track.stop());
          setRecordingState('error');
          setCurrentStepMessage(`Recorder init failed: ${errorMessage}`);
          return;
      }


      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("NewConsultation: MediaRecorder ondataavailable: chunk received, size:", event.data.size, "total chunks:", audioChunksRef.current.length);
        } else {
          console.log("NewConsultation: MediaRecorder ondataavailable: received empty chunk.");
        }
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        const mediaRecorderErrorEvent = event as MediaRecorderErrorEvent;
        const errorDetails = mediaRecorderErrorEvent.error;
        console.error("NewConsultation: MediaRecorder error event:", event, "DOMException:", errorDetails);
        
        const errorMessage = errorDetails?.name || errorDetails?.message || 'Unknown recording error';
        
        toast({
          title: "Recording Error",
          description: `An error occurred with the recorder: ${errorMessage}. Please ensure your microphone is working.`,
          variant: "destructive",
        });
        setRecordingState('error');
        setCurrentStepMessage(`Recording failed: ${errorMessage}`);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log("NewConsultation: Recording stream tracks stopped due to MediaRecorder error.");
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("NewConsultation: MediaRecorder onstop event fired. Total chunks recorded:", audioChunksRef.current.length);
        
        const actualMimeType = effectiveMimeTypeRef.current || (selectedMimeType || 'audio/webm'); // Fallback if ref wasn't set
        console.log("NewConsultation: Creating Blob with actual mimeType:", actualMimeType, "Number of chunks:", audioChunksRef.current.length);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMimeType });
        console.log("NewConsultation: Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);
        
        if (audioBlob.size === 0) {
          toast({
            title: "Recording Failed",
            description: "No audio was recorded. Please try again and ensure your microphone is working and you speak for a few seconds.",
            variant: "destructive",
          });
          setRecordingState('idle');
          setCurrentStepMessage("No audio data recorded.");
          setAudioDataUri(null);
          setProgress(0);
           if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log("NewConsultation: Recording stream tracks stopped. No audio data recorded.");
          }
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioDataUri(base64Audio);
          console.log("NewConsultation: Audio converted to Data URI, length (first 100 chars):", base64Audio.substring(0,100));
          setRecordingState('idle');
          setProgress(100); 
          setCurrentStepMessage("Recording complete. Ready to save.");
          toast({ title: "Recording Stopped", description: `Recorded ${Math.round(audioBlob.size / 1024)} KB of ${actualMimeType}` });
        };
        reader.onerror = (error) => {
            console.error("NewConsultation: FileReader error when converting blob to Data URI:", error);
            toast({ title: "Processing Error", description: "Could not process recorded audio data.", variant: "destructive" });
            setRecordingState('error');
            setCurrentStepMessage("Error processing audio.");
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log("NewConsultation: Recording stream tracks stopped after successful recording stop.");
        }
      };

      mediaRecorderRef.current.start();
      console.log("NewConsultation: MediaRecorder started.");
      setRecordingState('recording');
      setProgress(0); 
      setCurrentStepMessage("Recording in progress... Speak clearly.");
      toast({ title: "Recording Started" });
    } catch (err: any) {
      console.error("NewConsultation: Error in handleStartRecording (getUserMedia or MediaRecorder.start):", err);
      toast({ title: "Recording Setup Error", description: `Could not start recording: ${err.message || 'Unknown error'}. Please ensure microphone is connected and permissions are granted.`, variant: "destructive" });
      setRecordingState('error');
      setCurrentStepMessage(`Failed to start recording: ${err.message || 'Unknown error'}`);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        console.log("NewConsultation: Recording stream tracks stopped due to error in handleStartRecording.");
      }
    }
  };

  const handleStopRecording = () => {
    console.log("NewConsultation: handleStopRecording called.");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // This will trigger the 'onstop' handler
      console.log("NewConsultation: MediaRecorder.stop() called.");
    } else {
      console.log("NewConsultation: MediaRecorder not active or not available to stop.");
      // If it's not recording but we think it should be, reset UI
      if (recordingState === 'recording') {
        setRecordingState('idle');
        setCurrentStepMessage("Recording stopped unexpectedly.");
        toast({ title: "Recording Stopped", description: "Recorder was not active.", variant: "default"});
      }
    }
  };

  const handleSaveConsultation = async () => {
    console.log("NewConsultation: handleSaveConsultation called. audioDataUri present:", !!audioDataUri);
     if (!patientName.trim()) {
      toast({ title: "Patient Name Required", description: "Please enter the patient's name before saving.", variant: "destructive" });
      return;
    }
    if (!audioDataUri) {
      toast({ title: "No Audio", description: "Please record audio before saving.", variant: "destructive" });
      return;
    }
    if (!audioDataUri.startsWith('data:audio/')) {
      toast({ title: "Invalid Audio Data", description: "The recorded audio data is not in a recognized format. Please try recording again.", variant: "destructive" });
      console.error("NewConsultation: Invalid audioDataUri format:", audioDataUri.substring(0, 50));
      setRecordingState('error');
      setCurrentStepMessage("Invalid audio data format.");
      return;
    }
    setRecordingState('processing');
    setProgress(0);
    
    let transcript = "";
    let summary = "";
    let translatedTranscript: string | undefined = undefined;
    let finalTranslationLanguage: string | undefined = undefined;

    try {
      // Step 1: Transcribe Audio
      setCurrentStepMessage(processingSteps[0]); 
      console.log("NewConsultation: Sending audio for transcription, Data URI (first 100 chars):", audioDataUri.substring(0,100));
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') {
        console.error("NewConsultation: Transcription service did not return a valid transcript object or transcription string.", transcriptionResult);
        throw new Error("Transcription service did not return a valid transcript.");
      }
      if (transcriptionResult.transcription.trim() === "") {
        console.log("NewConsultation: Transcription result is an empty string.");
        toast({ title: "Transcription Result", description: "Transcription is empty. The audio might have been silent or too short.", variant: "default" });
      }
      transcript = transcriptionResult.transcription;
      console.log("NewConsultation: Transcription received:", transcript.substring(0,100) + "...");
      setProgress(25);

      // Step 2: Translate Transcript (Optional)
      if (targetTranslationLanguage !== 'none' && transcript.trim()) {
        setCurrentStepMessage(processingSteps[1]); 
        console.log(`NewConsultation: Translating transcript to ${targetTranslationLanguage}.`);
        const translationResult = await translateText({ text: transcript, targetLanguage: targetTranslationLanguage });
        if (!translationResult || typeof translationResult.translatedText !== 'string') {
          console.error("NewConsultation: Translation service did not return a valid translated text.", translationResult);
          toast({ title: "Translation Warning", description: `Could not translate transcript to ${targetTranslationLanguage}. Proceeding without it.`, variant: "default" });
        } else {
          translatedTranscript = translationResult.translatedText;
          finalTranslationLanguage = targetTranslationLanguage;
          console.log(`NewConsultation: Translated transcript to ${targetTranslationLanguage}:`, (translatedTranscript || "").substring(0,100) + "...");
        }
      } else {
        console.log("NewConsultation: Skipping transcript translation step.");
      }
      setProgress(50);

      // Step 3: Generate Summary (from original transcript)
      setCurrentStepMessage(processingSteps[2]); 
      console.log("NewConsultation: Sending original transcript for summarization.");
      const summaryResult = await summarizeConsultation({ transcript }); // Summarize original transcript
      if (!summaryResult || typeof summaryResult.summary !== 'string') { 
        console.error("NewConsultation: Summarization service did not return a valid summary object or summary string.", summaryResult);
        throw new Error("Summarization service did not return a valid summary.");
      }
      summary = summaryResult.summary;
      console.log("NewConsultation: Summary received:", summary.substring(0,100) + "...");
      setProgress(75);

      // Step 4: Finalize
      setCurrentStepMessage(processingSteps[3]); 
      console.log("NewConsultation: Finalizing consultation save...");
      
      const newConsultationId = Math.random().toString(36).substring(2, 9); 
      const consultationToSave: Consultation = {
        id: newConsultationId,
        patientName: patientName,
        date: new Date().toISOString(),
        status: 'Completed', 
        transcript: transcript,
        summary: summary,
        audioDataUri: audioDataUri,
        translatedTranscript: translatedTranscript,
        translatedTranscriptLanguage: finalTranslationLanguage,
      };
      
      console.log("NewConsultation: Attempting to send data to HubSpot placeholder:", consultationToSave);
      await sendDataToHubSpot(consultationToSave, audioDataUri); 

      await new Promise(resolve => setTimeout(resolve, 500)); 
      setProgress(100);

      setRecordingState('success');
      setCurrentStepMessage("Consultation processed successfully!");
      toast({ title: "Success", description: "Consultation processed and saved." });

      console.log("NewConsultation: New consultation ID generated:", newConsultationId, "Navigating...");
      
      localStorage.setItem(`consultation-${newConsultationId}-patientName`, patientName);
      localStorage.setItem(`consultation-${newConsultationId}-transcript`, transcript);
      localStorage.setItem(`consultation-${newConsultationId}-summary`, summary);
      localStorage.setItem(`consultation-${newConsultationId}-date`, consultationToSave.date);
      if (audioDataUri) {
        localStorage.setItem(`consultation-${newConsultationId}-audioDataUri`, audioDataUri);
      }
      if (translatedTranscript && finalTranslationLanguage) {
        localStorage.setItem(`consultation-${newConsultationId}-translatedTranscript`, translatedTranscript);
        localStorage.setItem(`consultation-${newConsultationId}-translatedTranscriptLanguage`, finalTranslationLanguage);
      }


      setTimeout(() => router.push(`/dashboard/consultations/${newConsultationId}`), 1500);

    } catch (error) {
      console.error("NewConsultation: Processing error details during save/AI calls:", error);
      setRecordingState('error');
      let description = "An unknown error occurred during AI processing.";
      if (error instanceof Error) {
        description = error.message;
      } else if (typeof error === 'string') {
        description = error;
      } else if (error && typeof (error as any).toString === 'function') {
        description = (error as any).toString();
      }
      
      const detailedMessage = `Failed during: ${currentStepMessage || 'unknown step'}. Details: ${description}`;
      setCurrentStepMessage(detailedMessage);
      toast({ 
        title: "Processing Error", 
        description: detailedMessage, 
        variant: "destructive",
        duration: 7000 
      });
    }
  };

  const renderIcon = () => {
    switch (recordingState) {
      case 'recording':
        return <Mic className="h-16 w-16 text-red-500 animate-pulse" />;
      case 'processing':
        return <Loader2 className="h-16 w-16 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-16 w-16 text-destructive" />;
      default:
        return <Mic className="h-16 w-16 text-primary" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">New Consultation</CardTitle>
          <CardDescription>Record audio for transcription and summarization.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-8 py-10">
          <div className="w-full max-w-md space-y-2">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input 
              id="patientName" 
              placeholder="Enter patient's full name" 
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              disabled={recordingState === 'recording' || recordingState === 'processing'}
              className="text-base"
            />
          </div>

          <div className="p-6 bg-accent/30 rounded-full animate-pulse-slow-shadow">
            {renderIcon()}
          </div>
          
          {(!isPermissionChecked && recordingState === 'idle') && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Checking microphone permissions...</span>
            </div>
          )}

          {(isPermissionChecked && !hasMicPermission && recordingState === 'idle') && (
            <Alert variant="destructive" className="w-full max-w-md">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Microphone Access Denied</AlertTitle>
              <AlertDescription>
                MediSummarize needs microphone access. Please enable it in your browser settings and refresh.
              </AlertDescription>
            </Alert>
          )}

          {(recordingState === 'recording' || recordingState === 'processing') && (
            <div className="w-full px-4">
              <Progress value={progress} className="w-full h-3" />
              <p className="text-center mt-2 text-sm text-muted-foreground">{currentStepMessage || 'Processing...'}</p>
            </div>
          )}

          {recordingState === 'success' && (
             <p className="text-center text-lg text-green-600 font-medium">{currentStepMessage}</p>
          )}
           {recordingState === 'error' && (
             <p className="text-center text-lg text-destructive font-medium">{currentStepMessage}</p>
          )}

          {(recordingState === 'idle' && audioDataUri) && (
            <div className="w-full max-w-md space-y-2 mt-4">
              <Label htmlFor="translate-language">Translate Transcript to (Optional)</Label>
              <Select 
                value={targetTranslationLanguage} 
                onValueChange={setTargetTranslationLanguage}
                disabled={recordingState !== 'idle'}
              >
                <SelectTrigger id="translate-language" className="w-full">
                  <LanguagesIcon className="mr-2 h-4 w-4 opacity-70" />
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Keep Original)</SelectItem>
                  <SelectItem value="English">English</SelectItem>
                  <SelectItem value="Spanish">Spanish</SelectItem>
                  <SelectItem value="French">French</SelectItem>
                  <SelectItem value="German">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pt-6 border-t">
          {recordingState === 'idle' && !audioDataUri && (
            <Button 
              size="lg" 
              onClick={handleStartRecording} 
              className="w-full sm:w-auto shadow-md"
              disabled={!isPermissionChecked || !hasMicPermission || recordingState === 'recording' || !patientName.trim()}
            >
              <Mic className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          )}
          {recordingState === 'recording' && (
            <Button 
              size="lg" 
              variant="destructive" 
              onClick={handleStopRecording} 
              className="w-full sm:w-auto shadow-md"
            >
              <StopCircle className="mr-2 h-5 w-5" />
              Stop Recording
            </Button>
          )}
          {(recordingState === 'idle' && audioDataUri) && ( 
            <Button 
              size="lg" 
              onClick={handleSaveConsultation} 
              className="w-full sm:w-auto shadow-md"
              disabled={recordingState === 'processing' || recordingState === 'recording' || !patientName.trim() || !audioDataUri}
            >
              <Save className="mr-2 h-5 w-5" />
              Save Consultation
            </Button>
          )}
          {(recordingState === 'error' || (recordingState === 'idle' && audioDataUri && !patientName.trim())) && ( 
             <Button 
                size="lg" 
                onClick={() => { 
                    console.log("NewConsultation: Try Again button clicked. Resetting state.");
                    setRecordingState('idle'); 
                    setProgress(0); 
                    setCurrentStepMessage(''); 
                    setAudioDataUri(null);
                    audioChunksRef.current = [];
                    effectiveMimeTypeRef.current = '';
                    setTargetTranslationLanguage('none');
                    // Do not reset patientName here
                    if (!isPermissionChecked || !hasMicPermission) { // Re-prompt if permission was denied/not checked
                       setIsPermissionChecked(false); // This will trigger useEffect to re-check
                       toast({
                          variant: 'destructive',
                          title: 'Microphone Access Issue',
                          description: 'Please ensure microphone permissions are enabled in your browser settings. Re-checking now.',
                          duration: 7000,
                        });
                    } else if (!patientName.trim()) {
                       toast({ title: "Patient Name Required", description: "Please enter the patient's name.", variant: "destructive" });
                    } else {
                        toast({
                            title: 'Ready',
                            description: 'You can try recording again.',
                            variant: 'default'
                        });
                    }
                }} 
                className="w-full sm:w-auto shadow-md"
              >
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>
      <style jsx>{`
        .animate-pulse-slow-shadow {
          animation: pulse-shadow 2s infinite ease-in-out;
        }
        @keyframes pulse-shadow {
          0%, 100% { box-shadow: 0 0 0 0px hsl(var(--primary) / 0.3); }
          50% { box-shadow: 0 0 0 15px hsl(var(--primary) / 0); }
        }
      `}</style>
    </div>
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
