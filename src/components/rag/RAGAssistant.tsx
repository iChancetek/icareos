"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot,
    X,
    Mic,
    Send,
    Sparkles,
    ChevronUp,
    Volume2,
    VolumeX,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RAGAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [messages, setMessages] = useState<{ role: "user" | "bot"; content: string }[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!query.trim()) return;

        const userMessage = query;
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setQuery("");
        setIsTyping(true);

        try {
            const response = await fetch("/api/ai/assistant", {
                method: "POST",
                body: JSON.stringify({ query: userMessage }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Server responded with ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error("No reader available");

            let botContent = "";
            setMessages(prev => [...prev, { role: "bot", content: "" }]);

            const decoder = new TextDecoder();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                botContent += chunk;

                setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content = botContent;
                    return newMessages;
                });
            }

            // Voice Playback if enabled
            if (isSpeechEnabled) {
                playTTS(botContent);
            }

        } catch (error) {
            console.error("Assistant error:", error);
            setMessages(prev => [...prev, { role: "bot", content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    const playTTS = async (text: string) => {
        try {
            const response = await fetch("/api/tts", {
                method: "POST",
                body: JSON.stringify({ text }),
            });
            if (!response.ok) throw new Error("TTS request failed");

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        } catch (error) {
            console.error("TTS playback error:", error);
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false);
            // Logic to stop STT and trigger handleSend
        } else {
            setIsRecording(true);
            // Logic to start STT
            // For demo purposes, we'll simulate a voice input
            setTimeout(() => {
                setQuery("Tell me about MediScribe's A2A system.");
                setIsRecording(false);
            }, 2000);
        }
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-[100]">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="absolute bottom-20 right-0 w-[350px] md:w-[400px] h-[500px] bg-card border border-border/50 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col backdrop-blur-xl"
                        >
                            {/* Header */}
                            <div className="p-4 bg-primary/5 border-b border-border/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                                        <Bot className="w-6 h-6 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">MediScribe AI</h3>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">RAG Assistant + Voice</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}>
                                        {isSpeechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                                {messages.length === 0 && (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                                        <Sparkles className="w-8 h-8 text-primary/40" />
                                        <p className="text-sm text-muted-foreground">
                                            Ask me anything about MediScribe, SOAP generation, or our agentic architecture.
                                        </p>
                                    </div>
                                )}
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.role === "user"
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-muted text-foreground rounded-tl-none border border-border/50"
                                            }`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted p-2 rounded-2xl rounded-tl-none flex items-center gap-1">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            <span className="text-[10px] uppercase font-bold text-muted-foreground pr-2">Neural Processing...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <form onSubmit={handleSend} className="p-4 bg-background border-t border-border/50 flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={`rounded-xl transition-all ${isRecording ? "bg-red-500/10 text-red-500 animate-pulse" : "hover:bg-primary/10"}`}
                                    onClick={toggleRecording}
                                >
                                    <Mic className="h-5 w-5" />
                                </Button>
                                <Input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ask MediScribe AI..."
                                    className="flex-1 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-primary"
                                />
                                <Button type="submit" size="icon" className="rounded-xl shadow-lg shadow-primary/10 transition-transform active:scale-95">
                                    <Send className="h-4 w-4" />
                                </Button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Floating Toggle Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    title="Ask MediScribe AI"
                    className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 relative group overflow-hidden ${isOpen ? "bg-card border border-border" : "bg-primary"
                        }`}
                >
                    <div className="absolute inset-0 bg-primary/20 dark:bg-primary/40 blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isOpen ? (
                        <ChevronDown className="w-6 h-6 text-foreground" />
                    ) : (
                        <Bot className="w-6 h-6 text-primary-foreground drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
                    )}
                </motion.button>
            </div>

            <style jsx>{`
        .waveform {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 12px;
        }
        .bar {
          width: 2px;
          height: 100%;
          background: currentColor;
          animation: wave 1s infinite ease-in-out;
        }
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
      `}</style>
        </>
    );
}

function ChevronDown(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    )
}
