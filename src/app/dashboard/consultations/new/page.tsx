
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
          duration: 7000, // Longer duration for important messages
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      setAudioDataUri(null); // Reset previous recording

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          setAudioDataUri(base64Audio);
          setRecordingState('idle');
          setProgress(100); // Mark recording as complete
          setCurrentStepMessage("Recording complete. Ready to save.");
          toast({ title: "Recording Stopped" });
        };
        stream.getTracks().forEach(track => track.stop()); // Stop the media stream tracks
      };

      mediaRecorderRef.current.start();
      setRecordingState('recording');
      setProgress(0); 
      setCurrentStepMessage("Recording in progress...");
      toast({ title: "Recording Started", description: "Speak clearly for best results." });
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({ title: "Recording Error", description: "Could not start recording. Please ensure microphone is connected and permissions are granted.", variant: "destructive" });
      setRecordingState('error');
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
      setCurrentStepMessage(processingSteps[0]);
      const transcriptionResult = await transcribeAudio({ audioDataUri });
      if (!transcriptionResult || !transcriptionResult.transcription) {
        throw new Error("Transcription service did not return a transcript.");
      }
      setProgress(33);
      const transcript = transcriptionResult.transcription;

      setCurrentStepMessage(processingSteps[1]);
      const summaryResult = await summarizeConsultation({ transcript });
      if (!summaryResult || !summaryResult.summary) {
        throw new Error("Summarization service did not return a summary.");
      }
      setProgress(66);
      // const summary = summaryResult.summary; // summary variable is not used further in this mock.

      setCurrentStepMessage(processingSteps[2]);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate final save process
      setProgress(100);

      setRecordingState('success');
      setCurrentStepMessage("Consultation processed successfully!");
      toast({ title: "Success", description: "Consultation processed and saved." });

      const newConsultationId = Math.random().toString(36).substring(7); 
      // Navigate, detail page will use mock data for new ID.
      // In a real app, transcript/summary would be persisted.
      setTimeout(() => router.push(`/dashboard/consultations/${newConsultationId}`), 1500);

    } catch (error: any) {
      console.error("Processing error:", error);
      setRecordingState('error');
      const errorMessage = error.message || "Could not process the consultation.";
      setCurrentStepMessage(errorMessage);
      toast({ title: "Processing Error", description: errorMessage, variant: "destructive" });
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
