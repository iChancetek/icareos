"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Mic, StopCircle, Save, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
// import { transcribeAudio, TranscribeAudioInput } from '@/ai/flows/transcribe-audio';
// import { summarizeConsultation, SummarizeConsultationInput } from '@/ai/flows/summarize-consultation';

type RecordingState = 'idle' | 'recording' | 'processing' | 'success' | 'error';

export default function NewConsultationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [progress, setProgress] = useState(0);
  const [patientName, setPatientName] = useState(''); // Example: get patient name
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const processingSteps = ["Transcribing Audio...", "Generating Summary...", "Finalizing..."];
  const [currentStepMessage, setCurrentStepMessage] = useState("");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartRecording = () => {
    setRecordingState('recording');
    setProgress(0);
    setCurrentStepMessage("Recording in progress...");
    // Simulate recording progress
    let currentProgress = 0;
    timerRef.current = setInterval(() => {
      currentProgress += 10;
      if (currentProgress <= 100) {
        setProgress(currentProgress);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        // Auto-stop after certain duration for demo
        // handleStopRecording(); 
      }
    }, 500); // Update progress every 0.5s
    toast({ title: "Recording Started", description: "Speak clearly for best results." });
  };

  const handleStopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState('idle'); // Go back to idle to allow save
    setProgress(100); // Mark as fully recorded
    setCurrentStepMessage("Recording stopped. Ready to save.");
    toast({ title: "Recording Stopped" });
  };

  const handleSaveConsultation = async () => {
    setRecordingState('processing');
    setProgress(0);
    
    // Simulate AI processing
    try {
      // Step 1: Simulate transcription
      setCurrentStepMessage(processingSteps[0]);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setProgress(33);
      const mockTranscript = "Patient presented with symptoms of cough and fever. Doctor recommended rest and hydration. Follow up in three days if symptoms persist.";

      // Step 2: Simulate summarization
      setCurrentStepMessage(processingSteps[1]);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setProgress(66);
      const mockSummary = "Cough and fever. Recommended rest, hydration. Follow-up in 3 days if no improvement.";

      // Step 3: Finalizing
      setCurrentStepMessage(processingSteps[2]);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(100);

      setRecordingState('success');
      setCurrentStepMessage("Consultation saved successfully!");
      toast({ title: "Success", description: "Consultation processed and saved." });

      // In a real app, you would save to Firestore and get an ID
      const newConsultationId = Math.random().toString(36).substring(7); 
      setTimeout(() => router.push(`/dashboard/consultations/${newConsultationId}`), 1500);

    } catch (error) {
      console.error("Processing error:", error);
      setRecordingState('error');
      setCurrentStepMessage("Error processing consultation.");
      toast({ title: "Error", description: "Could not process the consultation.", variant: "destructive" });
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
          {recordingState === 'idle' && (
            <Button size="lg" onClick={handleStartRecording} className="w-full sm:w-auto shadow-md">
              <Mic className="mr-2 h-5 w-5" />
              Start Recording
            </Button>
          )}
          {recordingState === 'recording' && (
            <Button size="lg" variant="destructive" onClick={handleStopRecording} className="w-full sm:w-auto shadow-md">
              <StopCircle className="mr-2 h-5 w-5" />
              Stop Recording
            </Button>
          )}
          {(recordingState === 'idle' && progress === 100) && ( // Show save only after stopping
            <Button size="lg" onClick={handleSaveConsultation} className="w-full sm:w-auto shadow-md">
              <Save className="mr-2 h-5 w-5" />
              Save Consultation
            </Button>
          )}
          {(recordingState === 'error') && (
             <Button size="lg" onClick={() => { setRecordingState('idle'); setProgress(0); setCurrentStepMessage(''); }} className="w-full sm:w-auto shadow-md">
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
