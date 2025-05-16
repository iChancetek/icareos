
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
import { Bot, Send, User, Loader2, AlertTriangle } from 'lucide-react';
import { askISkylar } from '@/ai/flows/iskylar-assistant-flow';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


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
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [conversation]);

  useEffect(() => {
    // Add initial greeting from iSkylar when dialog opens and conversation is empty
    if (isOpen && conversation.length === 0) {
      setConversation([
        {
          id: 'greeting-' + Date.now(),
          type: 'assistant',
          text: "Hello! I'm iSkylar. How can I help you with MediSummarize or ChanceTEK LLC today?",
        },
      ]);
    }
  }, [isOpen, conversation.length]);

  const handleSendMessage = async () => {
    if (!currentQuestion.trim() || isLoadingResponse) return;

    const userMessage: Message = {
      id: 'user-' + Date.now(),
      type: 'user',
      text: currentQuestion,
    };
    setConversation((prev) => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoadingResponse(true);

    try {
      const result = await askISkylar({ question: userMessage.text });
      const assistantMessage: Message = {
        id: 'assistant-' + Date.now(),
        type: 'assistant',
        text: result.answer,
      };
      setConversation((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling iSkylar flow:", error);
      const errorMessage: Message = {
        id: 'error-' + Date.now(),
        type: 'assistant',
        text: "I'm sorry, I couldn't process your request at the moment. Please try again later.",
        error: true,
      };
      setConversation((prev) => [...prev, errorMessage]);
      toast({
        title: "Error",
        description: "Could not connect to iSkylar. Please check your connection or try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingResponse(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] flex flex-col h-[70vh] max-h-[700px] min-h-[400px]">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center text-xl">
            <Bot className="mr-2 h-6 w-6 text-primary" />
            Chat with iSkylar
          </DialogTitle>
          <DialogDescription className="text-sm">
            Ask about MediSummarize features or ChanceTEK LLC.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollAreaRef}>
          <div className="space-y-4">
            {conversation.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${
                  msg.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.type === 'assistant' && (
                  <Avatar className="h-8 w-8 self-start border border-primary/30">
                    <AvatarImage src="https://placehold.co/40x40/7c3aed/ffffff.png?text=iS" alt="iSkylar" data-ai-hint="bot avatar" />
                    <AvatarFallback>iS</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 shadow-sm text-sm ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : msg.error 
                        ? 'bg-destructive/10 text-destructive-foreground border border-destructive/30 rounded-bl-none'
                        : 'bg-muted text-muted-foreground rounded-bl-none'
                  }`}
                >
                  {msg.error && <AlertTriangle className="inline mr-2 h-4 w-4" />}
                  {msg.text}
                </div>
                 {msg.type === 'user' && (
                  <Avatar className="h-8 w-8 self-start border">
                    <AvatarImage src="" alt="User" data-ai-hint="user icon" />
                    <AvatarFallback><User size={18}/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoadingResponse && (
              <div className="flex items-center justify-start gap-2">
                <Avatar className="h-8 w-8 self-start border border-primary/30">
                    <AvatarImage src="https://placehold.co/40x40/7c3aed/ffffff.png?text=iS" alt="iSkylar" data-ai-hint="bot avatar" />
                    <AvatarFallback>iS</AvatarFallback>
                </Avatar>
                <div className="max-w-[75%] rounded-xl px-4 py-3 shadow-sm bg-muted text-muted-foreground rounded-bl-none">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 border-t">
          <div className="flex w-full items-center space-x-2">
            <Input
              id="iskylar-question"
              placeholder="Type your question here..."
              value={currentQuestion}
              onChange={(e) => setCurrentQuestion(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isLoadingResponse}
              className="flex-1"
              autoComplete="off"
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSendMessage}
              disabled={isLoadingResponse || !currentQuestion.trim()}
              aria-label="Send question"
            >
              {isLoadingResponse ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
