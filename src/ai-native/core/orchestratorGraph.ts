import { StateGraph, Annotation, messagesStateReducer, START, END } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { allClinicalTools } from "./tools";
import { intakeNode } from "../agents/intakeAgent";
import { SafetyService } from "../../services/safetyService";

// ── Agent Blackboard types ────────────────────────────────────────────────
/**
 * AgentBlackboard is a shared memory space visible to all iCareOS agents and iSkylar.
 * Every agent writes its results here; every other agent can read from it.
 * This enables true agent-to-agent (agent2agent) communication.
 */
export interface AgentBlackboard {
    // Written by RiskIQ
    risk_signals?: {
        riskLevel?: "low" | "medium" | "high" | "critical";
        activeAlerts?: number;
        complianceScore?: number;
        requiresClinicianAction?: boolean;
        lastUpdated?: string;
        alertSummaries?: string[];
    };

    // Written by BillingIQ
    billing_flags?: {
        underbillingDetected?: boolean;
        totalRevenueDelta?: number;
        claimReadyCount?: number;
        codeAccuracy?: number;
        lastUpdated?: string;
        notes?: string[];
    };

    // Written by CareCoordIQ
    care_coord_signals?: {
        urgentFollowUps?: number;
        predictedNoShows?: number;
        engagementScore?: number;
        topCareGaps?: string[];
        lastUpdated?: string;
    };

    // Written by MediScribe (NLP + SOAP)
    mediscribe_output?: {
        icdCodes?: string[];
        soapSummary?: string;
        specialty?: string;
        transcriptConfidence?: number;
        lastUpdated?: string;
    };

    // Written by WoundIQ / RadiologyIQ
    imaging_signals?: {
        woundRisk?: string;
        radiologyFlags?: string[];
        lastUpdated?: string;
    };

    // Written by iSkylar — intake signals
    intake_signals?: {
        patientSentiment?: string;
        chiefComplaint?: string;
        reportedSymptoms?: string[];
        lastUpdated?: string;
    };
}

// ── Orchestrator Global State ────────────────────────────────────────────
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
    }),

    /**
     * Shared Blackboard — the agent-to-agent communication channel.
     * All agents can read and write key sections of this shared state.
     * iSkylar reads the full blackboard to ground its conversational context.
     */
    agent_blackboard: Annotation<AgentBlackboard>({
        reducer: (curr, next) => deepMergeBlackboard(curr, next),
        default: () => ({}),
    }),
});

/** Deep merge strategy: recursively merge blackboard sections so agent writes don't clobber each other */
function deepMergeBlackboard(curr: AgentBlackboard, next: AgentBlackboard): AgentBlackboard {
    const merged = { ...curr };
    for (const key of Object.keys(next) as (keyof AgentBlackboard)[]) {
        if (next[key] !== undefined) {
            merged[key] = { ...(curr[key] as any ?? {}), ...(next[key] as any) } as any;
        }
    }
    return merged;
}

// ── Orchestrator System Prompt ───────────────────────────────────────────
const ORCHESTRATOR_SYSTEM_PROMPT = `
You are the iCareOS Central Orchestrator Agent — the AI brain coordinating all iCareOS modules.
Your job is to determine the user's intent and invoke the appropriate clinical tools to fulfill the goal.

You manage the following specialized agents, all of which share a Shared Blackboard:
- MediScribe: Transcription, NLP extraction, SOAP generation
- BillingIQ: Revenue optimization, coding audits, claim readiness
- RiskIQ: Clinical guardrails, safety alerts, compliance monitoring
- CareCoordIQ: Predictive care coordination, follow-up scheduling
- WoundIQ + RadiologyIQ: Multimodal clinical imaging decision support
- iSkylar: Clinical intake orchestrator and wellness companion (reads the full blackboard)

Agent-to-Agent Communication Protocol:
- All agents write their results to the shared blackboard via state updates.
- Before invoking any tool, check the agent_blackboard context for signals already written by other agents.
- If RiskIQ has already flagged a critical risk, skip redundant analysis and escalate immediately.
- If BillingIQ has already detected underbilling, include that in your response context.
- If CareCoordIQ has already flagged urgent follow-ups, prioritize those in your reasoning.

When the conversation is purely intake (collecting symptoms), yield to the intake agent.
When enough clinical data is present, use your tools to analyze the context.
Return the final result when the goal is complete.
If the system flags escalation, explicitly tell the user a physician will review their case.
`;

// ── Orchestrator Node ────────────────────────────────────────────────────
export async function orchestratorNode(state: typeof OrchestratorStateAnnotation.State) {
    const model = new ChatOpenAI({
        modelName: "gpt-5.4",
        temperature: 0.1,
        maxCompletionTokens: 1000,
    }).bindTools(allClinicalTools);

    let systemPrompt = ORCHESTRATOR_SYSTEM_PROMPT;

    // Inject the live blackboard into the orchestrator system prompt
    const blackboard = state.agent_blackboard;
    if (blackboard && Object.keys(blackboard).length > 0) {
        systemPrompt += `\n\n[SHARED AGENT BLACKBOARD — current state across all iCareOS modules]:\n${JSON.stringify(blackboard, null, 2)}`;
    }

    if (state.escalationRequired) {
        systemPrompt += `\n\n[CRITICAL ALERT]: The Safety Governance Layer has escalated this session. Reason: ${state.escalationReason}. You MUST NOT make any autonomous clinical decisions from this point. Instruct the patient that a human clinician will review the file immediately.`;
    }

    // Also inject any iSkylar persona override from context
    if (state.context?.system_prompt_override) {
        systemPrompt = state.context.system_prompt_override + `\n\n${systemPrompt}`;
    }

    const messages = [
        { role: "system", content: systemPrompt },
        ...state.messages,
    ];

    const response = await model.invoke(messages);
    return { messages: [response] };
}

// ── Routing ──────────────────────────────────────────────────────────────
function routeOrchestrator(state: typeof OrchestratorStateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];

    if (state.escalationRequired) return END;

    if (lastMessage && "tool_calls" in lastMessage && (lastMessage as any).tool_calls?.length > 0) {
        return "tools";
    }

    if (state.currentGoal === "intake") {
        return "intake";
    }

    return END;
}

// ── Safety Check Node ────────────────────────────────────────────────────
async function safetyCheckNode(state: typeof OrchestratorStateAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];

    let requiresEscalation = false;
    let reason = null;
    const blackboardUpdate: AgentBlackboard = {};

    if (lastMessage && lastMessage.content) {
        const contentStr = typeof lastMessage.content === "string"
            ? lastMessage.content
            : JSON.stringify(lastMessage.content);

        if (contentStr.includes('"riskLevel":"critical"') || contentStr.includes("Critical clinical risk")) {
            const evaluation = SafetyService.evaluateEscalationRisk("RiskAgent", "critical", 0.9);
            requiresEscalation = evaluation.requiresEscalation;
            reason = evaluation.reason || "Critical Risk Override";

            // Write to the shared blackboard — this is now visible to all other agents
            blackboardUpdate.risk_signals = {
                riskLevel: "critical",
                requiresClinicianAction: true,
                lastUpdated: new Date().toISOString(),
                alertSummaries: ["Critical clinical risk escalated by Safety Layer."],
            };
        }
    }

    return {
        escalationRequired: requiresEscalation,
        escalationReason: reason,
        agent_blackboard: blackboardUpdate,
    };
}

// ── Graph ────────────────────────────────────────────────────────────────
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
    .addEdge("safety_check", "orchestrator")
    .addEdge("intake", "orchestrator");

export const orchestratorGraph = builder.compile();
