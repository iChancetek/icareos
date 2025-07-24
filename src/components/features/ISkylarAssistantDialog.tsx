
"use client";

import type { Dispatch, SetStateAction } from 'react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, User, Loader2, AlertTriangle, Mic, StopCircle, Volume2 } from 'lucide-react'; 
import { askISkylar } from '@/ai/flows/iskylar-assistant-flow';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';
import { transcribeAudio } from '@/ai/flows/transcribe-audio';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface Message {
  id: string;
  type: 'user' | 'assistant';
  text: string;
  error?: boolean;
}

interface ISkylarAssistantDialogProps {
  isOpen: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

export default function ISkylarAssistantDialog({ isOpen, onOpenChange }: ISkylarAssistantDialogProps) {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation]);

  useEffect(() => {
    // Initial greeting when dialog opens and conversation is empty
    if (isOpen && conversation.length === 0) {
      handleAssistantResponse("Hello! I'm iSkylar. How can I help you with MediScribe or your personal wellness today?");
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isPermissionChecked) {
      checkMicPermission();
    }
    return () => {
      // Cleanup on unmount or close
      stopAllActivity();
    };
  }, [isOpen, isPermissionChecked]);
  
  const checkMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasMicPermission(true);
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      setHasMicPermission(false);
      console.error("Microphone permission denied:", error);
    } finally {
      setIsPermissionChecked(true);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoadingResponse) return;

    const userMessage: Message = { id: 'user-' + Date.now(), type: 'user', text };
    setConversation((prev) => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoadingResponse(true);

    try {
      const result = await askISkylar({ question: userMessage.text });
      handleAssistantResponse(result.answer);
    } catch (error) {
      handleAssistantError("I'm sorry, I couldn't process your request at the moment. Please try again later.");
    }
  };

  const handleAssistantResponse = async (text: string) => {
    const assistantMessage: Message = { id: 'assistant-' + Date.now(), type: 'assistant', text };
    setConversation(prev => [...prev, assistantMessage]);
    
    try {
      const { audioDataUri } = await textToSpeech({ text });
      if (audioDataUri && audioPlayerRef.current) {
        setIsPlayingAudio(true);
        audioPlayerRef.current.src = audioDataUri;
        await audioPlayerRef.current.play();
      }
    } catch (error) {
      console.error("Error generating or playing TTS audio:", error);
      toast({ title: "Audio Error", description: "Could not play iSkylar's response.", variant: "destructive" });
    } finally {
      setIsLoadingResponse(false);
    }
  };

  const handleAssistantError = (text: string) => {
      const errorMessage: Message = { id: 'error-' + Date.now(), type: 'assistant', text, error: true };
      setConversation((prev) => [...prev, errorMessage]);
      setIsLoadingResponse(false);
      toast({ title: "Error", description: "Could not connect to iSkylar.", variant: "destructive" });
  };
  
  const stopAllActivity = () => {
      if (isRecording && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      if (isPlayingAudio && audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = "";
      }
      setIsRecording(false);
      setIsPlayingAudio(false);
  };
  
  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
    } else {
       if (!hasMicPermission) {
        toast({ title: "Microphone Access Denied", description: "Please enable microphone permissions in your browser.", variant: "destructive" });
        return;
      }
      stopAllActivity();
      audioChunksRef.current = [];

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => audioChunksRef.current.push(event.data);
        recorder.onstop = async () => {
          setIsRecording(false);
          setIsLoadingResponse(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const audioDataUri = reader.result as string;
            try {
              const { transcription } = await transcribeAudio({ audioDataUri });
              if (transcription.trim()) {
                await handleSendMessage(transcription);
              } else {
                 toast({ title: "No speech detected", description: "Please try speaking again.", variant: "default" });
                 setIsLoadingResponse(false);
              }
            } catch (error) {
              console.error("Transcription error:", error);
              handleAssistantError("Sorry, I had trouble understanding what you said. Could you please try again?");
            }
          };
          stream.getTracks().forEach(track => track.stop());
        };
        recorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error("Error starting recording:", error);
        toast({ title: "Recording Error", description: "Could not start microphone.", variant: "destructive" });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) stopAllActivity();
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[525px] flex flex-col h-[70vh] max-h-[700px] min-h-[400px]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center text-xl">
            <Bot className="mr-2 h-6 w-6 text-primary" />
            Chat with iSkylar
          </DialogTitle>
          <DialogDescription className="text-sm">
            Ask about MediScribe features or your personal wellness.
          </DialogDescription>
        </DialogHeader>
        
        {!isPermissionChecked && isOpen ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <Loader2 className="h-5 w-5 animate-spin mr-2"/> Checking permissions...
          </div>
        ) : !hasMicPermission && isOpen ? (
           <div className="flex-1 flex items-center justify-center p-4">
              <Alert variant="destructive" className="w-full max-w-md">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Microphone Access Denied</AlertTitle>
                <AlertDescription>
                  iSkylar needs microphone access for voice chat. Please enable it in your browser settings.
                </AlertDescription>
              </Alert>
           </div>
        ) : (
          <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
            <div className="space-y-4">
              {conversation.map((msg) => (
                <div key={msg.id} className={`flex items-end gap-2 ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'assistant' && (
                    <Avatar className="h-8 w-8 self-start border border-primary/30">
                      <AvatarFallback className="flex items-center justify-center bg-primary/10">
                        <Bot className="h-5 w-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] rounded-xl px-4 py-2.5 shadow-sm text-sm ${
                    msg.type === 'user' ? 'bg-primary text-primary-foreground rounded-br-none'
                    : msg.error ? 'bg-destructive/10 text-destructive-foreground border border-destructive/30 rounded-bl-none'
                    : 'bg-muted text-muted-foreground rounded-bl-none'}`}>
                    {msg.error && <AlertTriangle className="inline mr-2 h-4 w-4" />}
                    {msg.text}
                  </div>
                  {msg.type === 'user' && (
                    <Avatar className="h-8 w-8 self-start border">
                      <AvatarFallback><User size={18}/></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isLoadingResponse && !isPlayingAudio && (
                <div className="flex items-center justify-start gap-2">
                  <Avatar className="h-8 w-8 self-start border border-primary/30"><AvatarFallback className="bg-primary/10"><Bot className="h-5 w-5 text-primary" /></AvatarFallback></Avatar>
                  <div className="max-w-[75%] rounded-xl px-4 py-3 shadow-sm bg-muted text-muted-foreground rounded-bl-none"><Loader2 className="h-5 w-5 animate-spin" /></div>
                </div>
              )}
               {isPlayingAudio && (
                  <div className="flex items-center justify-start gap-2">
                     <Avatar className="h-8 w-8 self-start border border-primary/30"><AvatarFallback className="bg-primary/10"><Bot className="h-5 w-5 text-primary" /></AvatarFallback></Avatar>
                     <div className="max-w-[75%] rounded-xl px-4 py-3 shadow-sm bg-muted text-muted-foreground rounded-bl-none flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-primary animate-pulse" />
                        <span>Speaking...</span>
                     </div>
                  </div>
               )}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="p-4 border-t">
          <div className="flex w-full items-center space-x-2">
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              onClick={handleToggleRecording}
              disabled={!hasMicPermission || isLoadingResponse}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Input
              id="iskylar-question"
              placeholder="Type or speak..."
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') { handleSendMessage(currentQuestion); }}}
              disabled={isLoadingResponse || isRecording}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => handleSendMessage(currentQuestion)}
              disabled={isLoadingResponse || isRecording || !currentQuestion.trim()}
              aria-label="Send question"
            >
              {isLoadingResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
        <audio ref={audioPlayerRef} onEnded={() => setIsPlayingAudio(false)} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
