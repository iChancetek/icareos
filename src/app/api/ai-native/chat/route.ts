import { NextRequest, NextResponse } from "next/server";
import { orchestratorGraph } from "@/ai-native/core/orchestratorGraph";
import { HumanMessage } from "@langchain/core/messages";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, threadId, context = {} } = body;

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const inputState = {
            messages: [new HumanMessage(message)],
            currentGoal: context.goal || "triage",
            context: context
        };

        const config = {
            configurable: {
                thread_id: threadId || `session_${Date.now()}`
            }
        };

        // For V1 of the component, we await the final state instead of streaming 
        // to simplify the React component implementation.
        let finalResponse = "I'm processing that for you...";
        let toolsCalled: string[] = [];
        let escalationAlert = null;

        const stream = await orchestratorGraph.stream(inputState, config);

        for await (const event of stream) {
            for (const [node, state] of Object.entries(event)) {

                if (state && (state as any).escalationRequired) {
                    escalationAlert = (state as any).escalationReason;
                }

                if ((state as any).messages && (state as any).messages.length > 0) {
                    const lastMessage = (state as any).messages[(state as any).messages.length - 1];

                    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                        toolsCalled.push(...lastMessage.tool_calls.map((t: any) => t.name));
                    } else if (node === 'orchestrator' || node === 'intake') {
                        finalResponse = lastMessage.content;
                    }
                }
            }
        }

        return NextResponse.json({
            response: finalResponse,
            toolsCalled: Array.from(new Set(toolsCalled)),
            threadId: config.configurable.thread_id,
            isEscalated: !!escalationAlert,
            escalationReason: escalationAlert,
        });

    } catch (error: any) {
        console.error("[AiChatAPI] Error processing request:", error);
        return NextResponse.json({ error: "Failed to process chat request." }, { status: 500 });
    }
}
