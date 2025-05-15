
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, StopCircle, Save, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { summarizeConsultation } from '@/ai/flows/summarize-consultation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { sendDataToHubSpot } from '@/services/hubspotService';
import type { Consultation } from '@/types';

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
  
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);

  const processingSteps = ["Transcribing Audio...", "Generating Summary...", "Finalizing..."];
  const [currentStepMessage, setCurrentStepMessage] = useState("");

  useEffect(() => {
    const getMicPermission = async () => {
      console.log("Attempting to get microphone permission...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        console.log("Microphone permission granted.");
        stream.getTracks().forEach(track => track.stop()); // Release mic immediately after permission check
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setHasMicPermission(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings and refresh the page.',
          duration: 7000,
        });
      } finally {
        setIsPermissionChecked(true);
        console.log("Microphone permission check complete. Has permission:", hasMicPermission);
      }
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      getMicPermission();
    } else {
      console.error("Audio recording not supported or permissions blocked by browser settings.");
      setHasMicPermission(false);
      setIsPermissionChecked(true);
      toast({
        variant: 'destructive',
        title: 'Unsupported Browser or Settings',
        description: 'Audio recording is not supported or microphone permissions are blocked in your browser.',
        duration: 7000,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]); // hasMicPermission removed, toast is stable


  const handleStartRecording = async () => {
    console.log("handleStartRecording called. Has mic permission:", hasMicPermission, "Permission checked:", isPermissionChecked);
    if (!patientName.trim()) {
      toast({ title: "Patient Name Required", description: "Please enter the patient's name before recording.", variant: "destructive" });
      return;
    }
    if (!hasMicPermission || !isPermissionChecked) {
      toast({ title: "Microphone Access Required", description: "Please enable microphone permissions and try again.", variant: "destructive" });
      return;
    }
    let stream: MediaStream | null = null;
    try {
      console.log("Requesting media stream for recording...");
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Media stream obtained for recording:", stream);

      audioChunksRef.current = [];
      setAudioDataUri(null); 

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      console.log("MediaRecorder instance created:", mediaRecorderRef.current);


      mediaRecorderRef.current.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log("MediaRecorder ondataavailable: chunk received, size:", event.data.size, "total chunks:", audioChunksRef.current.length);
        } else {
          console.log("MediaRecorder ondataavailable: received empty chunk.");
        }
      };

      mediaRecorderRef.current.onerror = (event: Event) => {
        const mediaRecorderErrorEvent = event as MediaRecorderErrorEvent;
        const errorDetails = mediaRecorderErrorEvent.error;
        console.error("MediaRecorder error event:", event, "DOMException:", errorDetails);
        
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
            console.log("Recording stream tracks stopped due to MediaRecorder error.");
        }
      };

      mediaRecorderRef.current.onstop = () => {
        console.log("MediaRecorder onstop event fired. Total chunks recorded:", audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log("Audio blob created, size:", audioBlob.size, "type:", audioBlob.type);
        
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
            console.log("Recording stream tracks stopped. No audio data recorded.");
          }
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioDataUri(base64Audio);
          console.log("Audio converted to Data URI, length:", base64Audio.length);
          setRecordingState('idle');
          setProgress(100); 
          setCurrentStepMessage("Recording complete. Ready to save.");
          toast({ title: "Recording Stopped", description: `Recorded ${Math.round(audioBlob.size / 1024)} KB` });
        };
        reader.onerror = (error) => {
            console.error("FileReader error when converting blob to Data URI:", error);
            toast({ title: "Processing Error", description: "Could not process recorded audio data.", variant: "destructive" });
            setRecordingState('error');
            setCurrentStepMessage("Error processing audio.");
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            console.log("Recording stream tracks stopped after successful recording stop.");
        }
      };

      mediaRecorderRef.current.start();
      console.log("MediaRecorder started.");
      setRecordingState('recording');
      setProgress(0); 
      setCurrentStepMessage("Recording in progress... Speak clearly.");
      toast({ title: "Recording Started" });
    } catch (err: any) {
      console.error("Error in handleStartRecording (getUserMedia or MediaRecorder.start):", err);
      toast({ title: "Recording Setup Error", description: `Could not start recording: ${err.message || 'Unknown error'}. Please ensure microphone is connected and permissions are granted.`, variant: "destructive" });
      setRecordingState('error');
      setCurrentStepMessage(`Failed to start recording: ${err.message || 'Unknown error'}`);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        console.log("Recording stream tracks stopped due to error in handleStartRecording.");
      }
    }
  };

  const handleStopRecording = () => {
    console.log("handleStopRecording called.");
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log("MediaRecorder.stop() called.");
    } else {
      console.log("MediaRecorder not active or not available to stop.");
    }
  };

  const handleSaveConsultation = async () => {
    console.log("handleSaveConsultation called. audioDataUri present:", !!audioDataUri);
     if (!patientName.trim()) {
      toast({ title: "Patient Name Required", description: "Please enter the patient's name before saving.", variant: "destructive" });
      return;
    }
    if (!audioDataUri) {
      toast({ title: "No Audio", description: "Please record audio before saving.", variant: "destructive" });
      return;
    }
    setRecordingState('processing');
    setProgress(0);
    
    try {
      setCurrentStepMessage(processingSteps[0]); // Transcribing
      console.log("Sending audio for transcription, Data URI length:", audioDataUri.length);
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') {
        console.error("Transcription service did not return a valid transcript object or transcription string.", transcriptionResult);
        throw new Error("Transcription service did not return a valid transcript.");
      }
       if (transcriptionResult.transcription.trim() === "") {
        console.log("Transcription result is an empty string.");
        toast({ title: "Transcription Result", description: "Transcription is empty. The audio might have been silent or too short.", variant: "default" });
      }
      setProgress(33);
      const transcript = transcriptionResult.transcription;
      console.log("Transcription received:", transcript.substring(0,100) + "...");


      setCurrentStepMessage(processingSteps[1]); // Summarizing
      console.log("Sending transcript for summarization.");
      const summaryResult = await summarizeConsultation({ transcript });
      if (!summaryResult || typeof summaryResult.summary !== 'string') { 
        console.error("Summarization service did not return a valid summary object or summary string.", summaryResult);
        throw new Error("Summarization service did not return a valid summary.");
      }
      setProgress(66);
      const summary = summaryResult.summary;
      console.log("Summary received:", summary.substring(0,100) + "...");

      setCurrentStepMessage(processingSteps[2]); // Finalizing
      console.log("Finalizing consultation save...");
      
      const newConsultationId = Math.random().toString(36).substring(2, 9); // Slightly longer ID
      const consultationToSave: Consultation = {
        id: newConsultationId,
        patientName: patientName,
        date: new Date().toISOString(),
        status: 'Completed', 
        transcript: transcript,
        summary: summary,
        audioDataUri: audioDataUri, // Save audioDataUri for playback
      };
      
      console.log("Attempting to send data to HubSpot placeholder:", consultationToSave);
      await sendDataToHubSpot(consultationToSave, audioDataUri); 

      await new Promise(resolve => setTimeout(resolve, 1000)); 
      setProgress(100);

      setRecordingState('success');
      setCurrentStepMessage("Consultation processed successfully!");
      toast({ title: "Success", description: "Consultation processed and saved." });

      console.log("New consultation ID generated:", newConsultationId, "Navigating...");
      
      localStorage.setItem(`consultation-${newConsultationId}-patientName`, patientName);
      localStorage.setItem(`consultation-${newConsultationId}-transcript`, transcript);
      localStorage.setItem(`consultation-${newConsultationId}-summary`, summary);
      localStorage.setItem(`consultation-${newConsultationId}-date`, consultationToSave.date);
      if (audioDataUri) {
        localStorage.setItem(`consultation-${newConsultationId}-audioDataUri`, audioDataUri);
      }


      setTimeout(() => router.push(`/dashboard/consultations/${newConsultationId}`), 1500);

    } catch (error) {
      console.error("Processing error details during save/AI calls:", error);
      setRecordingState('error');
      let description = "An unknown error occurred during AI processing.";
      if (error instanceof Error) {
        description = error.message;
      } else if (typeof error === 'string') {
        description = error;
      } else if (error && typeof (error as any).toString === 'function') {
        description = (error as any).toString();
      }
      
      const detailedMessage = `Failed during: ${currentStepMessage}. Details: ${description}`;
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
              disabled={recordingState === 'processing' || recordingState === 'recording' || !patientName.trim()}
            >
              <Save className="mr-2 h-5 w-5" />
              Save Consultation
            </Button>
          )}
          {(recordingState === 'error' || (recordingState === 'idle' && audioDataUri && !patientName.trim())) && ( // Show Try Again if error OR if audio recorded but no patient name
             <Button 
                size="lg" 
                onClick={() => { 
                    console.log("Try Again button clicked. Resetting state.");
                    setRecordingState('idle'); 
                    setProgress(0); 
                    setCurrentStepMessage(''); 
                    setAudioDataUri(null);
                    audioChunksRef.current = [];
                    // Don't reset patientName here, user might want to keep it
                    if (!hasMicPermission && isPermissionChecked) {
                       toast({
                          variant: 'destructive',
                          title: 'Microphone Access Still Denied',
                          description: 'Please enable microphone permissions in your browser settings and refresh if necessary.',
                          duration: 7000,
                        });
                    } else if (hasMicPermission && isPermissionChecked && patientName.trim()) {
                        toast({
                            title: 'Ready to Record',
                            description: 'You can now try recording again.',
                            variant: 'default'
                        });
                    } else if (!patientName.trim()) {
                       toast({ title: "Patient Name Required", description: "Please enter the patient's name.", variant: "destructive" });
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
