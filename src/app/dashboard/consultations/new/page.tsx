
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mic, StopCircle, Save, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { summarizeConsultation } from '@/ai/flows/summarize-consultation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export default function NewConsultationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [progress, setProgress] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioDataUri, setAudioDataUri] = useState<string | null>(null);
  
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);

  const processingSteps = ["Transcribing Audio...", "Generating Summary...", "Finalizing..."];
  const [currentStepMessage, setCurrentStepMessage] = useState("");

  useEffect(() => {
    const getMicPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        stream.getTracks().forEach(track => track.stop()); // Release mic immediately after permission check
      } catch (error) {
        console.error('Error accessing microphone:', error);
        setHasMicPermission(false);
        toast({
          variant: 'destructive',
          title: 'Microphone Access Denied',
          description: 'Please enable microphone permissions in your browser settings to use this feature.',
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
        title: 'Unsupported Browser',
        description: 'Audio recording is not supported in this browser or permissions are blocked.',
        duration: 7000,
      });
    }
  }, [toast]);


  const handleStartRecording = async () => {
    if (!hasMicPermission || !isPermissionChecked) {
      toast({ title: "Microphone Access Required", description: "Please enable microphone permissions and try again.", variant: "destructive" });
      return;
    }
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      setAudioDataUri(null);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        const mediaRecorderError = event instanceof ErrorEvent ? event.error : (event as any)?.error;
        const errorMessage = mediaRecorderError?.name || mediaRecorderError?.message || 'Unknown recording error';
        
        toast({
          title: "Recording Error",
          description: `An error occurred with the recorder: ${errorMessage}. Please ensure your microphone is working.`,
          variant: "destructive",
        });
        setRecordingState('error');
        setCurrentStepMessage(`Recording failed: ${errorMessage}`);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size === 0) {
          toast({
            title: "Recording Failed",
            description: "No audio was recorded. Please try again and ensure your microphone is working and you speak for a few seconds.",
            variant: "destructive",
          });
          setRecordingState('idle'); // Or 'error' if preferred
          setCurrentStepMessage("No audio data recorded.");
          setAudioDataUri(null);
          setProgress(0);
           if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioDataUri(base64Audio);
          setRecordingState('idle');
          setProgress(100); 
          setCurrentStepMessage("Recording complete. Ready to save.");
          toast({ title: "Recording Stopped", description: `Recorded ${Math.round(audioBlob.size / 1024)} KB` });
        };
        reader.onerror = () => {
            console.error("FileReader error");
            toast({ title: "Processing Error", description: "Could not process recorded audio data.", variant: "destructive" });
            setRecordingState('error');
            setCurrentStepMessage("Error processing audio.");
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();
      setRecordingState('recording');
      setProgress(0); 
      setCurrentStepMessage("Recording in progress... Speak clearly.");
      toast({ title: "Recording Started" });
    } catch (err: any) {
      console.error("Error starting recording:", err);
      toast({ title: "Recording Error", description: `Could not start recording: ${err.message || 'Unknown error'}. Please ensure microphone is connected and permissions are granted.`, variant: "destructive" });
      setRecordingState('error');
      setCurrentStepMessage(`Failed to start recording: ${err.message || 'Unknown error'}`);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSaveConsultation = async () => {
    if (!audioDataUri) {
      toast({ title: "No Audio", description: "Please record audio before saving.", variant: "destructive" });
      return;
    }
    setRecordingState('processing');
    setProgress(0);
    
    try {
      setCurrentStepMessage(processingSteps[0]); // Transcribing
      console.log("Sending audio for transcription, size:", audioDataUri.length);
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      if (!transcriptionResult || typeof transcriptionResult.transcription !== 'string') { // Check for string specifically
        throw new Error("Transcription service did not return a valid transcript.");
      }
       if (transcriptionResult.transcription.trim() === "") {
        toast({ title: "Transcription Result", description: "Transcription is empty. The audio might have been silent or too short.", variant: "default" });
        // Consider if this is an error state or just an outcome
      }
      setProgress(33);
      const transcript = transcriptionResult.transcription;
      console.log("Transcription received:", transcript.substring(0,100) + "...");


      setCurrentStepMessage(processingSteps[1]); // Summarizing
      console.log("Sending transcript for summarization.");
      const summaryResult = await summarizeConsultation({ transcript });
      if (!summaryResult || typeof summaryResult.summary !== 'string') { // Check for string
        throw new Error("Summarization service did not return a valid summary.");
      }
      setProgress(66);
      const summary = summaryResult.summary;
      console.log("Summary received:", summary.substring(0,100) + "...");


      setCurrentStepMessage(processingSteps[2]); // Finalizing
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      setProgress(100);

      setRecordingState('success');
      setCurrentStepMessage("Consultation processed successfully!");
      toast({ title: "Success", description: "Consultation processed and saved." });

      const newConsultationId = Math.random().toString(36).substring(7); 
      // In a real app, transcript/summary would be persisted along with the new ID
      // For this demo, we navigate to a detail page that will use mock data for the ID.
      // You would pass the actual transcript and summary to the new page or a data store.
      setTimeout(() => router.push(`/dashboard/consultations/${newConsultationId}`), 1500);

    } catch (error) {
      console.error("Processing error details:", error);
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
          <div className="p-6 bg-accent rounded-full animate-pulse-slow-shadow">
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
                MediSummarize needs microphone access to record audio. Please enable it in your browser settings and refresh the page.
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
              disabled={!isPermissionChecked || !hasMicPermission || recordingState === 'recording'}
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
              disabled={recordingState === 'processing' || recordingState === 'recording'}
            >
              <Save className="mr-2 h-5 w-5" />
              Save Consultation
            </Button>
          )}
          {(recordingState === 'error') && (
             <Button 
                size="lg" 
                onClick={() => { 
                    setRecordingState('idle'); 
                    setProgress(0); 
                    setCurrentStepMessage(''); 
                    setAudioDataUri(null);
                    // Re-check permissions or prompt user if needed, though initial check should persist
                    if (!hasMicPermission && isPermissionChecked) {
                       toast({
                          variant: 'destructive',
                          title: 'Microphone Access Still Denied',
                          description: 'Please enable microphone permissions in your browser settings.',
                          duration: 7000,
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

