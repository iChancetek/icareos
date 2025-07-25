
"use client";

import { useState, useEffect, useRef, useCallback }from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Bot, Loader2, Mic, StopCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { askISkylar } from '@/ai/flows/iskylar-assistant-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

  const recognitionRef = useRef<any>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const startListening = useCallback(() => {
    if (recognitionRef.current && sessionStartedRef.current) {
      console.log("Attempting to start listening...");
      try {
        setSessionState('listening');
        recognitionRef.current.start();
      } catch (e) {
        // This error ("already started") is common if the browser's implementation calls onend and then we call start() again.
        // It's generally safe to ignore.
        console.log("Recognition start was suppressed, likely already active:", e);
      }
    }
  }, []);


  const stopSpeechAndRecognition = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      recognitionRef.current.abort(); // Use abort for immediate stop
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
    // This effect ensures everything is cleaned up when the component unmounts.
    return () => {
      cleanupSession();
    };
  }, [cleanupSession]);

  const processUserSpeech = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      // If transcript is empty, just get ready to listen again.
      startListening();
      return;
    }

    // Voice command to end session
    if (transcript.trim().toLowerCase().includes("end session") || transcript.trim().toLowerCase().includes("end conversation")) {
        handleEndSession();
        return;
    }
    
    setSessionState('processing');
    setUserTranscript(transcript);

    try {
      const response = await askISkylar({ question: transcript });
      setAiResponse(response.answer);
      speak(response.answer);
    } catch (error) {
      console.error("Error with iSkylar flow:", error);
      const errorMessage = "I'm sorry, I'm having a little trouble connecting right now. Let's try again in a moment.";
      setAiResponse(errorMessage);
      speak(errorMessage); 
    }
  }, [startListening]); // handleEndSession is defined later, so it's not a dependency here

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
        setUserTranscript(''); // Clear user transcript after iSkylar responds
        // Directly call startListening to ensure the mic turns back on reliably.
        startListening();
    };
    
    utteranceRef.current = utterance;
    // Cancel any previous speech to be safe
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };


  const initializeSpeechRecognition = useCallback(() => {
    if (!SpeechRecognition) {
      toast({
        title: "Browser Not Supported",
        description: "Your browser does not support the Web Speech API for voice recognition.",
        variant: "destructive",
        duration: 8000
      });
      return;
    }
    if(recognitionRef.current) {
        return; // Already initialized
    }

    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    recognition.continuous = false; // Process after each pause
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log("Recognition started");
      setSessionState('listening');
    };
    
    recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        
        // Update live transcript for user feedback
        if (interimTranscript || finalTranscript) {
          setUserTranscript(finalTranscript || interimTranscript);
        }

        if (finalTranscript) {
            console.log("Final transcript:", finalTranscript);
            // Stop listening explicitly to prevent it from continuing while we process
            recognition.stop(); 
            processUserSpeech(finalTranscript);
        }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // This is a common occurrence, the onend handler will take care of restarting.
      } else if (event.error === 'not-allowed') {
        setHasMicPermission(false);
        setSessionStarted(false); // End session if permission is revoked
        toast({ title: "Permission Denied", description: "Microphone access was denied. The session has ended.", variant: "destructive" });
      } else {
        toast({ title: "Voice Recognition Error", description: `An error occurred: ${event.error}`, variant: "destructive" });
        setSessionState('idle');
      }
    };

    recognition.onend = () => {
      console.log("Recognition ended. Current session state:", sessionStateRef.current);
       // Only restart listening if the session is still active and we are not in the middle of processing or speaking.
      if (sessionStartedRef.current && sessionStateRef.current !== 'processing' && sessionStateRef.current !== 'speaking') {
        startListening();
      }
    };
  }, [toast, processUserSpeech, startListening]);

  // Refs to hold the current state for use inside callbacks that might have stale closures
  const sessionStateRef = useRef(sessionState);
  useEffect(() => {
    sessionStateRef.current = sessionState;
  }, [sessionState]);

  const sessionStartedRef = useRef(sessionStarted);
  useEffect(() => {
    sessionStartedRef.current = sessionStarted;
  }, [sessionStarted]);


  const handleStartSession = async () => {
    if (hasMicPermission === false) {
      toast({ title: "Microphone Required", description: "Please enable microphone permissions in your browser settings.", variant: "destructive" });
      return;
    }
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasMicPermission(true);
        stream.getTracks().forEach(track => track.stop());

        setSessionStarted(true);
        setUserTranscript('');
        setAiResponse('');
        const welcomeMessage = `Hi ${user?.displayName?.split(' ')[0] || 'there'}. I'm iSkylar. How are you feeling today?`;
        
        initializeSpeechRecognition();

        // Wait for voices to be loaded by browser
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                speak(welcomeMessage);
            };
        } else {
            speak(welcomeMessage);
        }

    } catch (error) {
        console.error("Error getting mic permission:", error);
        setHasMicPermission(false);
        toast({ title: "Microphone Access Denied", description: "Please enable microphone access to talk with iSkylar.", variant: "destructive"});
    }
  };

  const handleEndSession = () => {
    const goodbyeMessage = "Take care. I’m here whenever you need me.";
    setSessionStarted(false); // This will prevent listening loop from restarting
    cleanupSession();
    setUserTranscript('');
    setAiResponse(goodbyeMessage);
    
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(goodbyeMessage);
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
        
        window.speechSynthesis.cancel(); // Cancel any ongoing speech
        window.speechSynthesis.speak(utterance);
    }
    setSessionState('idle');
  };
  
  const getSessionIndicatorText = () => {
    if (!sessionStarted) return 'Click ‘Start Session’ to begin.';
    switch (sessionState) {
        case 'listening':
            return 'Listening...';
        case 'processing':
            return 'iSkylar is thinking...';
        case 'speaking':
            return 'iSkylar is speaking...';
        default:
             return 'I am ready to listen.';
    }
  }
  
  const getVisualizer = () => {
    let animationClass = '';
    let icon = <Mic className="h-12 w-12 text-slate-400" />;

    switch(sessionState) {
        case 'listening':
            animationClass = 'animate-pulse-strong';
            icon = <Mic className="h-12 w-12 text-green-300" />;
            break;
        case 'processing':
            animationClass = 'animate-spin';
            icon = <Loader2 className="h-12 w-12" />;
            break;
        case 'speaking':
            animationClass = 'animate-pulse-gentle';
            icon = <Bot className="h-12 w-12 text-purple-300" />;
            break;
        default: 
            icon = <Mic className="h-12 w-12 text-slate-400" />;
            break;
    }

    return (
         <div className="relative">
            <div className={`absolute -inset-4 rounded-full bg-purple-400/50 blur-xl ${animationClass}`}></div>
            <div 
                className="relative flex items-center justify-center h-24 w-24 rounded-full bg-purple-500/30 shadow-lg"
              >
                {icon}
            </div>
        </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full flex-col text-white">
      <main className="flex flex-1 flex-col items-center justify-center text-center p-4">
        {sessionStarted ? (
          <div className="flex flex-col items-center justify-between h-full w-full max-w-4xl">
            <div className="w-full h-1/3 space-y-2">
               <h2 className="text-xl font-medium text-slate-300">iSkylar says:</h2>
               <p className="text-lg text-slate-100 min-h-[6rem]">{aiResponse}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center gap-4 my-4">
                {getVisualizer()}
                <p className="text-slate-300 h-6">{getSessionIndicatorText()}</p>
            </div>

            <div className="w-full h-1/3 space-y-2 flex flex-col justify-end">
               <h2 className="text-xl font-medium text-slate-300">You said:</h2>
               <p className="text-lg text-slate-100 min-h-[6rem]">{userTranscript}</p>
               <Button 
                    onClick={handleEndSession}
                    variant="destructive"
                    className="mt-4 mx-auto"
                >
                  <StopCircle className="mr-2 h-5 w-5"/> End Session
               </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/80">
              <Bot className="h-12 w-12 text-purple-300" />
            </div>
            <h1 className="text-6xl font-bold">iSkylar</h1>
            <p className="mt-2 text-xl text-slate-300">Your AI Voice Therapist</p>
            
            {hasMicPermission === false && (
                <Alert variant="destructive" className="mt-6 max-w-sm text-left">
                  <Mic className="h-4 w-4" />
                  <AlertTitle>Microphone Access Denied</AlertTitle>
                  <AlertDescription>
                    Please enable microphone permissions in your browser to talk with iSkylar.
                  </AlertDescription>
                </Alert>
            )}

            <Button
              onClick={handleStartSession}
              className="mt-10 rounded-lg bg-purple-500 px-12 py-6 text-lg font-semibold text-white shadow-lg hover:bg-purple-600 focus-visible:ring-purple-400"
              disabled={hasMicPermission === false}
            >
              Start Session
            </Button>
            <p className="mt-4 text-sm text-slate-400">{getSessionIndicatorText()}</p>
          </>
        )}
      </main>
    </div>
  );
}

    
