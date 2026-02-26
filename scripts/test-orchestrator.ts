/**
* test-orchestrator.ts
* 
* A simple script to verify the StateGraph compiles and can trace a user goal.
* Run with: npx tsx scripts/test-orchestrator.ts
*/

import { orchestratorGraph } from "../src/ai-native/core/orchestratorGraph.ts";
import { HumanMessage } from "@langchain/core/messages";

async function run() {
    console.log("🚀 Starting Orchestrator Test...\n");

    const inputs = {
        messages: [new HumanMessage("I have a transcript from a general patient visit. Please run NLP extraction on this: 'The patient is a 45 year old male presenting with acute chest pain and shortness of breath for 2 days. He has a history of hypertension.'")],
        currentGoal: "process_transcript",
        context: { patientId: "12345" }
    };

    console.log("📤 Sending Initial Input:", inputs.messages[0].content);

    try {
        const config = { configurable: { thread_id: "test-thread-1" } };

        // We stream the events to see the graph working step-by-step
        for await (const event of await orchestratorGraph.stream(inputs, config)) {
            for (const [node, state] of Object.entries(event)) {
                console.log(`\n===========================================`);
                console.log(`🔄 Node Reached: [${node}]`);
                if ((state as any).messages && (state as any).messages.length > 0) {
                    const lastMessage = (state as any).messages[(state as any).messages.length - 1];
                    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
                        console.log(`🛠️ Triggering Tools:`, lastMessage.tool_calls.map((t: any) => t.name).join(", "));
                    } else if (lastMessage.content) {
                        console.log(`💬 Output:`, lastMessage.content);
                    } else if (lastMessage.name) {
                        console.log(`✅ Tool [${lastMessage.name}] Returned:`, lastMessage.content);
                    }
                }
            }
        }

        console.log("\n✅ Test Completed Successfully!");
    } catch (error) {
        console.error("❌ Test Failed:", error);
    }
}

run();
