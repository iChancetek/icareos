"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Bot, Loader2, Mic, StopCircle, BrainCircuit, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { askISkylar } from '@/ai/flows/iskylar-assistant-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';
import { WaveformOrb } from '@/components/ui/WaveformOrb';
import { AgentPipelineTracker, AgentStep } from '@/components/ui/AgentPipelineTracker';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Check for SpeechRecognition API
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

type SessionState = 'idle' | 'listening' | 'processing' | 'speaking';

export default function ISkylarPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const [pipelineSteps, setPipelineSteps] = useState<AgentStep[]>([
    { name: "Orchestrator", shortName: "OC", status: "pending" },
    { name: "Intake Agent", shortName: "IA", status: "pending" },
    { name: "Safety Layer", shortName: "SL", status: "pending" }
  ]);

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const startListening = useCallback(() => {
    if (recognitionRef.current && sessionStartedRef.current) {
      console.log("Attempting to start listening...");
      try {
        setSessionState('listening');
        recognitionRef.current.start();
      } catch (e) {
        console.log("Recognition start was suppressed, likely already active:", e);
      }
    }
  }, []);

  const stopSpeechAndRecognition = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    setSessionState('idle');
  }, []);

  const cleanupSession = useCallback(() => {
    stopSpeechAndRecognition();
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onstart = null;
      recognitionRef.current = null;
    }
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current = null;
    }
  }, [stopSpeechAndRecognition]);

  useEffect(() => {
    return () => {
      cleanupSession();
    };
  }, [cleanupSession]);

  const processUserSpeech = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      startListening();
      return;
    }

    if (transcript.trim().toLowerCase().includes("end session") || transcript.trim().toLowerCase().includes("end conversation")) {
      handleEndSession();
      return;
    }

    setSessionState('processing');
    setUserTranscript(transcript);

    // Reset and start pipeline tracking
    setPipelineSteps([
      { name: "Orchestrator", shortName: "OC", status: "running" },
      { name: "Intake Agent", shortName: "IA", status: "pending" },
      { name: "Safety Layer", shortName: "SL", status: "pending" }
    ]);

    try {
      // Simulate pipeline progression for visual effect
      setTimeout(() => {
        setPipelineSteps(prev => prev.map(s => s.name === "Orchestrator" ? { ...s, status: "done" } : s.name === "Intake Agent" ? { ...s, status: "running" } : s));
      }, 1200);

      const response = await askISkylar({ question: transcript });

      setPipelineSteps(prev => prev.map(s => s.name === "Intake Agent" ? { ...s, status: "done" } : s.name === "Safety Layer" ? { ...s, status: "done" } : s));

      setAiResponse(response.answer);
      if (response.answer) speak(response.answer);
    } catch (error) {
      console.error("Error with iSkylar flow:", error);
      setPipelineSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "error" } : s));
      const errorMessage = "I'm sorry, I'm having a little trouble connecting right now. Let's try again in a moment.";
      setAiResponse(errorMessage);
      speak(errorMessage);
    }
  }, [startListening]);

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      toast({ title: "TTS Not Supported", description: "Your browser doesn't support speech synthesis.", variant: "destructive" });
      setSessionState('idle');
      return;
    }

    setSessionState('speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') && v.lang.startsWith('en')) ||
      voices.find(v => v.lang.startsWith('en-US') && v.name.includes('Google')) ||
      voices.find(v => v.lang.startsWith('en-US')) ||
      voices.find(v => v.default);

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.pitch = 1.1;
    utterance.rate = 1;

    utterance.onend = () => {
      console.log("iSkylar finished speaking. Restarting recognition loop.");
      setUserTranscript('');
      startListening();
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const initializeSpeechRecognition = useCallback(() => {
    if (!SpeechRecognition) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support voice recognition.",
        variant: "destructive",
      });
      return;
    }
    if (recognitionRef.current) return;

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (interimTranscript || finalTranscript) {
        setUserTranscript(finalTranscript || interimTranscript);
      }
      if (finalTranscript) {
        recognition.stop();
        processUserSpeech(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        setHasMicPermission(false);
        setSessionStarted(false);
        toast({ title: "Permission Denied", description: "Microphone access was denied.", variant: "destructive" });
      }
    };

    recognition.onend = () => {
      if (sessionStartedRef.current && sessionStateRef.current !== 'processing' && sessionStateRef.current !== 'speaking') {
        startListening();
      }
    };
  }, [toast, processUserSpeech, startListening]);

  const sessionStateRef = useRef(sessionState);
  useEffect(() => { sessionStateRef.current = sessionState; }, [sessionState]);

  const sessionStartedRef = useRef(sessionStarted);
  useEffect(() => { sessionStartedRef.current = sessionStarted; }, [sessionStarted]);

  const handleStartSession = async () => {
    if (hasMicPermission === false) {
      toast({ title: "Microphone Required", description: "Please enable microphone permissions.", variant: "destructive" });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      stream.getTracks().forEach(track => track.stop());

      setSessionStarted(true);
      setUserTranscript('');
      setAiResponse('');
      const welcomeMessage = `Hi ${user?.displayName?.split(' ')[0] || 'there'}. I'm iSkylar, your clinical intake orchestrator. How can I help you today?`;

      initializeSpeechRecognition();

      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => speak(welcomeMessage);
      } else {
        speak(welcomeMessage);
      }
    } catch (error) {
      setHasMicPermission(false);
    }
  };

  const handleEndSession = () => {
    const goodbyeMessage = "Session complete. Records updated. Take care.";
    setSessionStarted(false);
    cleanupSession();
    setUserTranscript('');
    setAiResponse(goodbyeMessage);
    setSessionState('idle');

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(goodbyeMessage);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-transparent transition-colors duration-500">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/10 dark:bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] rounded-full" />
      </div>

      <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
        <Link href="/dashboard/iscribe">
          <Button variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500/80">Orchestrator Online</span>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {!sessionStarted ? (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center text-center space-y-8 py-20"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/10 dark:bg-purple-500/20 blur-3xl rounded-full scale-150" />
                <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-2xl transition-all duration-500 hover:scale-105">
                  <Bot className="h-14 w-14 text-purple-600 dark:text-purple-400" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-6xl font-black tracking-tighter sm:text-7xl bg-clip-text text-transparent bg-gradient-to-br from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-slate-400">
                  iSkylar<span className="text-purple-500">.</span>
                </h1>
                <p className="text-xl text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Conversational Intake Orchestrator. Goal-driven clinical data extraction powered by LangGraph.
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 pt-8">
                <Button
                  onClick={handleStartSession}
                  className="h-16 px-12 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-lg font-bold text-white shadow-[0_0_40px_-10px_rgba(147,51,234,0.4)] hover:shadow-[0_0_50px_-5px_rgba(147,51,234,0.6)] hover:scale-105 transition-all"
                  disabled={hasMicPermission === false}
                >
                  Start Clinical Intake
                </Button>

                <div className="flex items-center gap-6 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5"><Mic className="h-3 w-3" /> Voice Enabled</span>
                  <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5"><BrainCircuit className="h-3 w-3" /> LangGraph Core</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="session"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch"
            >
              <div className="lg:col-span-8 flex flex-col space-y-6">
                <div className="glass-xl rounded-3xl p-8 space-y-8 flex-1 min-h-[500px] flex flex-col transition-all duration-500">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2 opacity-50 dark:opacity-40">
                      <Bot className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">iSkylar Response</span>
                    </div>
                    <p className="text-2xl font-medium leading-normal text-slate-800 dark:text-slate-100 italic">
                      "{aiResponse || "Listening for your input..."}"
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-12">
                    <WaveformOrb
                      state={
                        sessionState === 'listening' ? 'recording' :
                          sessionState === 'processing' ? 'processing' :
                            sessionState === 'speaking' ? 'idle' : 'idle'
                      }
                      size={180}
                    />
                  </div>

                  <div className="space-y-4 pt-8 border-t border-slate-200 dark:border-white/5 transition-colors">
                    <div className="flex items-center gap-2 opacity-50 dark:opacity-40">
                      <Mic className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900 dark:text-slate-100">Medical Transcription</span>
                    </div>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                      {userTranscript || "Waiting for speech..."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleEndSession}
                    variant="ghost"
                    className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/5 dark:hover:bg-red-400/10 rounded-xl"
                  >
                    <StopCircle className="mr-2 h-4 w-4" /> Cancel Intake
                  </Button>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-600 tracking-tighter">
                    SESSION_ID: {Math.random().toString(36).substring(7).toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-6">
                <div className="glass-xl rounded-3xl p-6 space-y-6 transition-all duration-500">
                  <div className="flex items-center gap-2 mb-2">
                    <BrainCircuit className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h2 className="font-bold text-sm uppercase tracking-wider text-slate-900 dark:text-slate-200">Orchestration Steps</h2>
                  </div>

                  <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-white/5">
                    <AgentPipelineTracker steps={pipelineSteps} />
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-200 dark:border-white/5 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-500 font-bold uppercase">Current Goal</span>
                      <span className="bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 px-2 py-0.5 rounded-full font-bold">INTAKE</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-500 font-bold uppercase">Patient ID</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300">#PX-9921</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-500 font-bold uppercase">Safety Override</span>
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-500 font-bold"><ShieldCheck className="h-3 w-3" /> SECURE</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 transition-all">
                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 leading-none">Pro-Tip</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 leading-relaxed italic">
                    "Speak clearly at a normal conversational pace. I can extract symptoms, duration, and severity automatically."
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style jsx global>{`
        .glass-morphism {
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </div>
  );
}
