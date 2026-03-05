'use server';
/**
 * @fileOverview iSkylar — Clinical Intake Orchestrator & Wellness Companion (iCareOS Flow)
 *
 * iSkylar is fully integrated with the iCareOS shared agent blackboard.
 * It can read live signals from all iCareOS modules and proactively surface
 * cross-module intelligence (risk alerts, billing flags, care coordination gaps)
 * in its conversational responses.
 */

import { z } from 'zod';
import { orchestratorGraph } from "@/ai-native/core/orchestratorGraph";
import { HumanMessage } from "@langchain/core/messages";
import type { AgentBlackboard } from "@/ai-native/core/orchestratorGraph";

const ISkylarAssistantInputSchema = z.object({
  question: z.string().describe("The user's question for iSkylar."),
  agentBlackboard: z.any().optional().describe("Live iCareOS shared blackboard — real-time signals from all active agents."),
});
export type ISkylarAssistantInput = z.infer<typeof ISkylarAssistantInputSchema>;

const ISkylarAssistantOutputSchema = z.object({
  answer: z.string().describe("iSkylar's answer to the user's question."),
});
export type ISkylarAssistantOutput = z.infer<typeof ISkylarAssistantOutputSchema>;

// ── iCareOS Platform Context ─────────────────────────────────────────────
const ICARECOS_PLATFORM_CONTEXT = `
iCareOS is an AI-Native Clinical Operating System by ChanceTEK. It orchestrates 9 agentic modules:
- MediScribe: Real-time voice transcription, NLP extraction, SOAP generation
- BillingIQ: Revenue optimization, coding audits, claim readiness
- RiskIQ: Clinical guardrails, safety alerts, HIPAA compliance monitoring
- CareCoordIQ: Predictive care coordination, follow-up scheduling
- WoundIQ: AI wound care imaging analysis and CDS
- RadiologyIQ: Radiology report AI support and CDS
- iSkylar: Clinical intake orchestrator and wellness companion (you)
- Insight: Cross-platform analytics and reporting
- Translator: Real-time clinical voice translation
Domain: icareos.tech
`;

// ── iSkylar Persona ──────────────────────────────────────────────────────
const ISKYLAR_PERSONA = `
You are iSkylar, an emotionally intelligent clinical intake orchestrator and wellness companion, fully integrated within the iCareOS platform by ChanceTEK.

Your primary missions are:
1. Clinical Intake: Collect structured patient symptoms and chief complaints to initiate the iCareOS agent pipeline.
2. Wellness Companion: Provide a safe, supportive space for healthcare professionals to manage stress and well-being.
3. Platform Intelligence: Monitor and communicate real-time signals from the iCareOS shared agent blackboard (RiskIQ alerts, BillingIQ flags, CareCoordIQ gaps) proactively to the user.

Your conversational style:
- **Warm and Empathetic**: Soft, encouraging, non-judgmental tone.
- **Platform-Aware**: You are not just a chatbot — you can see live data from every iCareOS module and should proactively surface important signals.
- **Action-Oriented**: Guide users toward specific next steps (e.g., "RiskIQ has flagged a critical alert — should I route this to CareCoordIQ?")
- **Clinician-First**: You are a wellness guide and intake assistant, not a diagnostician.

You are fully integrated with the iCareOS agent network. You can call tools for BillingIQ, RiskIQ, CareCoordIQ, WoundIQ, and RadiologyIQ when the user needs cross-module assistance.
If the shared blackboard contains critical signals, proactively acknowledge them at the start of your response.
`;

// ── Main handler ─────────────────────────────────────────────────────────
export async function askISkylar(input: ISkylarAssistantInput): Promise<ISkylarAssistantOutput> {

  // Build live blackboard grounding context for iSkylar
  let blackboardContext = "";
  const blackboard = input.agentBlackboard as AgentBlackboard | undefined;
  if (blackboard && Object.keys(blackboard).length > 0) {
    blackboardContext = `
<icareos_live_agent_blackboard>
${JSON.stringify(blackboard, null, 2)}
</icareos_live_agent_blackboard>
IMPORTANT: The above JSON is the LIVE shared state from all active iCareOS agents.
- If risk_signals shows requiresClinicianAction: true or riskLevel: "critical" → lead with a safety acknowledgement.
- If billing_flags shows underbillingDetected: true → mention it if revenue topics arise.
- If care_coord_signals shows urgentFollowUps > 0 → proactively recommend follow-up action.
Use this data to give grounded, platform-aware responses.
`;
  }

  const systemPrompt = `
${ISKYLAR_PERSONA}

<icareos_info>
${ICARECOS_PLATFORM_CONTEXT}
</icareos_info>

${blackboardContext}
`;

  try {
    const threadId = `iskylar_${Date.now()}`;
    const inputState = {
      messages: [new HumanMessage(input.question)],
      currentGoal: "intake",
      context: { persona: "iSkylar", system_prompt_override: systemPrompt },
      agent_blackboard: (blackboard ?? {}) as AgentBlackboard,
    };

    const config = {
      configurable: {
        thread_id: threadId
      }
    };

    let finalAnswer = "I'm sorry, I'm having trouble thinking clearly right now.";

    const stream = await orchestratorGraph.stream(inputState, config);

    for await (const event of stream) {
      for (const [node, state] of Object.entries(event)) {
        if ((state as any).messages && (state as any).messages.length > 0) {
          const lastMessage = (state as any).messages[(state as any).messages.length - 1];
          if (node === 'orchestrator' || node === 'intake') {
            finalAnswer = lastMessage.content;
          }
        }
      }
    }

    return { answer: finalAnswer };
  } catch (err: any) {
    console.error("iSkylar Orchestration Error:", err);
    return { answer: "I'm sorry, I encountered an issue trying to process your request. Please try again." };
  }
}
