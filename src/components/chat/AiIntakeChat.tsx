"use client";

import { useState } from "react";
import { Send, Bot, AlertTriangle } from "lucide-react";

interface AiMessage {
    role: "user" | "ai";
    content: string;
    toolsCalled?: string[];
    isEscalated?: boolean;
}

export default function AiIntakeChat() {
    const [messages, setMessages] = useState<AiMessage[]>([
        { role: "ai", content: "Hello! I am the MediScribe Intake Assistant. How can I help you today?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [threadId, setThreadId] = useState<string | null>(null);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: AiMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/ai-native/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage.content,
                    threadId: threadId,
                    context: { goal: "intake" }
                }),
            });

            const data = await res.json();

            if (data.threadId) {
                setThreadId(data.threadId);
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: data.response,
                    toolsCalled: data.toolsCalled,
                    isEscalated: data.isEscalated
                },
            ]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                { role: "ai", content: "I'm having trouble connecting to the Orchestrator. Please try again." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-2xl shadow-sm bg-white overflow-hidden">
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white flex items-center space-x-3">
                <Bot className="h-6 w-6" />
                <div>
                    <h2 className="font-semibold text-lg">MediScribe AI Intake</h2>
                    <p className="text-xs text-blue-100 opacity-90">Goal-Driven Intelligent Orchestrator</p>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                            className={`max-w-[80%] p-3 rounded-2xl shadow-sm ${msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-none"
                                    : "bg-white border text-gray-800 rounded-bl-none"
                                }`}
                        >
                            <p className="whitespace-pre-wrap text-sm">{msg.content}</p>

                            {/* Tool Indicators */}
                            {msg.toolsCalled && msg.toolsCalled.length > 0 && (
                                <div className="mt-2 text-xs text-gray-400 border-t pt-2 flex items-center gap-1">
                                    <span className="font-mono bg-gray-100 rounded px-1">
                                        [Tools executed: {msg.toolsCalled.join(", ")}]
                                    </span>
                                </div>
                            )}

                            {/* Escalation Warning */}
                            {msg.isEscalated && (
                                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded flex items-center gap-1 border border-red-100">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>This session has been routed to a human clinician for review.</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border p-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-2 items-center">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        placeholder="Describe your symptoms or ask a question..."
                        className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm bg-gray-50"
                    />
                    <button
                        onClick={sendMessage}
                        disabled={isLoading || !input.trim()}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Send className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
