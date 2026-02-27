import { StateGraph, Annotation, messagesStateReducer, START, END } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { allClinicalTools } from "./tools";
import { intakeNode } from "../agents/intakeAgent";
import { SafetyService } from "../../services/safetyService";

// Define the Orchestrator's Global State
export const OrchestratorStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    currentGoal: Annotation<string>({
        reducer: (curr, next) => next || curr,
        default: () => "triage",
    }),
    context: Annotation<Record<string, any>>({
        reducer: (curr, next) => ({ ...curr, ...next }),
        default: () => ({}),
    }),
    escalationRequired: Annotation<boolean>({
        reducer: (curr, next) => next || curr,
        default: () => false,
    }),
    escalationReason: Annotation<string | null>({
        reducer: (curr, next) => next || curr,
        default: () => null,
    })
});

const ORCHESTRATOR_SYSTEM_PROMPT = `
You are the MediScribe Central Orchestrator Agent. Your job is to determine the user's intent and invoke the appropriate clinical tools or specialized agents to fulfill the goal.
You are the AI brain. The database and UI are just support systems for you.

When the conversation is purely an intake (collecting symptoms), you should yield to the conversational flow.
When enough clinical data (transcripts, symptoms) is present, use your tools (nlpTool, soapTool, riskTool, etc.) to analyze the context.
Return the final result to the user when the goal is complete. If the system flags an escalation, explicitly tell the user a physician will review their case.
`;

export async function orchestratorNode(state: typeof OrchestratorStateAnnotation.State) {
    const model = new ChatOpenAI({
        modelName: "gpt-5.2",
        temperature: 0.1,
        maxCompletionTokens: 1000,
    }).bindTools(allClinicalTools);

    let systemPrompt = ORCHESTRATOR_SYSTEM_PROMPT;
    if (state.escalationRequired) {
        systemPrompt += `\n[CRITICAL ALERT]: The Safety Governance Layer has escalated this session. Reason: ${state.escalationReason}. You MUST NOT make any autonomous clinical decisions from this point. Instruct the patient that a human clinician will review the file immediately.`;
    }

    const messages = [
        { role: "system", content: systemPrompt },
        ...state.messages,
    ];

    const response = await model.invoke(messages);
    return { messages: [response] };
}

// Check if we need to call a tool, go to intake, or end to user
function routeOrchestrator(state: typeof OrchestratorStateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];

    if (state.escalationRequired) {
        // Stop autonomous looping if escalated, force return to user
        return END;
    }

    // Explicit tool call request by the LLM
    if (lastMessage && "tool_calls" in lastMessage && (lastMessage as any).tool_calls?.length > 0) {
        return "tools";
    }

    // Goal-based routing: if the goal is purely intake, yield to the intake agent node next
    if (state.currentGoal === "intake") {
        return "intake";
    }

    // Otherwise return to user
    return END;
}

/**
 * Safety Check Node
 * Acts as an interceptor after tools execute but before the Orchestrator receives the output.
 */
async function safetyCheckNode(state: typeof OrchestratorStateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];

    let requiresEscalation = false;
    let reason = null;

    if (lastMessage && lastMessage.content) {
        const contentStr = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);

        // Mocking the parse layer for demonstration:
        if (contentStr.includes('"riskLevel":"critical"') || contentStr.includes("Critical clinical risk")) {
            const evaluation = SafetyService.evaluateEscalationRisk("RiskAgent", "critical", 0.9);
            requiresEscalation = evaluation.requiresEscalation;
            reason = evaluation.reason || "Critical Risk Override";
        }
    }

    return {
        escalationRequired: requiresEscalation,
        escalationReason: reason
    };
}

// Build the LangGraph
const builder = new StateGraph(OrchestratorStateAnnotation)
    .addNode("orchestrator", orchestratorNode)
    .addNode("intake", intakeNode)
    .addNode("tools", new ToolNode(allClinicalTools))
    .addNode("safety_check", safetyCheckNode)

    .addEdge(START, "orchestrator")
    .addConditionalEdges("orchestrator", routeOrchestrator, {
        tools: "tools",
        intake: "intake",
        [END]: END,
    })
    .addEdge("tools", "safety_check")
    // Intercept tool outputs with the safety layer
    .addEdge("safety_check", "orchestrator")

    // When intake responds, it yields back to the orchestrator to decide if intake is complete
    .addEdge("intake", "orchestrator");

// Compile the graph with memory (optional Checkpointer can be passed here)
export const orchestratorGraph = builder.compile();
