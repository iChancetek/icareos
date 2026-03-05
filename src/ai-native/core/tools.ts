import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runNLPAgent } from "@/agents/nlpAgent";
import { runSOAPAgent } from "@/agents/soapAgent";
import { riskIQAgent } from "@/agents/riskIQAgent";
import { billingIQAgent } from "@/agents/billingIQAgent";
import { careCoordAgent } from "@/agents/careCoordAgent";
import { runComplianceAgent } from "@/agents/complianceAgent";
import { eligibilityTool } from "../agents/eligibilityAgent";
import { schedulingTool } from "../agents/schedulingAgent";
import { retrieveGuidelinesTool } from "./ragKnowledge";

// ==========================================
// iCareOS Clinical Tools — Agent2Agent Enabled
//
// Each tool writes its results to the shared
// AgentBlackboard so that every other agent
// (including iSkylar) can read them.
// ==========================================

/**
 * NLP Tool — extracts ICD codes, entities, symptoms.
 * Writes to: agent_blackboard.mediscribe_output
 */
export const nlpTool = tool(
  async ({ transcript, patientContext }) => {
    const result = await runNLPAgent(transcript, patientContext);
    // Serialize for blackboard write
    const blackboardEntry = {
      mediscribe_output: {
        icdCodes: result?.icdCodes ?? [],
        transcriptConfidence: result?.confidence ?? 0,
        lastUpdated: new Date().toISOString(),
      }
    };
    return JSON.stringify({ result, _blackboard: blackboardEntry });
  },
  {
    name: "run_nlp_extraction",
    description: "Extracts medical entities, symptoms, and ICD codes from a raw medical transcript. Writes results to the shared agent blackboard.",
    schema: z.object({
      transcript: z.string().describe("The raw text transcript of the clinical encounter."),
      patientContext: z.string().optional().describe("Optional patient history context.")
    })
  }
);

/**
 * SOAP Tool — generates structured SOAP note.
 * Writes to: agent_blackboard.mediscribe_output
 */
export const soapTool = tool(
  async ({ transcript, specialty, patientContext }) => {
    const result = await runSOAPAgent(transcript, specialty, patientContext);
    const blackboardEntry = {
      mediscribe_output: {
        soapSummary: result?.assessment ?? "",
        specialty: specialty ?? "general",
        lastUpdated: new Date().toISOString(),
      }
    };
    return JSON.stringify({ result, _blackboard: blackboardEntry });
  },
  {
    name: "generate_soap_note",
    description: "Generates a structured SOAP note from the clinical transcript. Writes the assessment summary to the shared agent blackboard.",
    schema: z.object({
      transcript: z.string(),
      specialty: z.string().optional().default("general"),
      patientContext: z.string().optional()
    })
  }
);

/**
 * RiskIQ Tool — clinical safety evaluation.
 * Writes to: agent_blackboard.risk_signals
 */
export const riskTool = tool(
  async ({ session }) => {
    const result = await riskIQAgent.evaluate(session);
    const blackboardEntry = {
      risk_signals: {
        riskLevel: session.riskLevel,
        activeAlerts: result.alerts.length,
        complianceScore: result.complianceStatus.hipaaCompliant ? 100 : 60,
        requiresClinicianAction: result.alerts.some(a => a.requiresClinicianAction),
        alertSummaries: result.alerts.map(a => a.message),
        lastUpdated: new Date().toISOString(),
      }
    };
    return JSON.stringify({ result, _blackboard: blackboardEntry });
  },
  {
    name: "assess_clinical_risk_and_compliance",
    description: "Evaluates clinical severity and compliance. Writes risk signals to the shared agent blackboard so other agents (BillingIQ, CareCoordIQ, iSkylar) can react.",
    schema: z.object({
      session: z.any().describe("The iScribe session object.")
    })
  }
);

/**
 * BillingIQ Tool — revenue optimization.
 * Writes to: agent_blackboard.billing_flags
 */
export const billingTool = tool(
  async ({ session }) => {
    const result = await billingIQAgent.run(session);
    const blackboardEntry = {
      billing_flags: {
        underbillingDetected: result.underbillingFlag,
        totalRevenueDelta: result.estimatedRevenueDelta,
        claimReadyCount: result.claimReady ? 1 : 0,
        codeAccuracy: result.codeAccuracy,
        notes: result.notes,
        lastUpdated: new Date().toISOString(),
      }
    };
    return JSON.stringify({ result, _blackboard: blackboardEntry });
  },
  {
    name: "generate_billing_codes_and_audit",
    description: "Performs a CPT coding audit and checks claim readiness. Writes billing flags to the shared agent blackboard so RiskIQ and iSkylar can access them.",
    schema: z.object({
      session: z.any().describe("The iScribe session object.")
    })
  }
);

/**
 * CareCoordIQ Tool — predictive care coordination.
 * Writes to: agent_blackboard.care_coord_signals
 */
export const careCoordTool = tool(
  async ({ session }) => {
    const result = await careCoordAgent.plan(session);
    const blackboardEntry = {
      care_coord_signals: {
        urgentFollowUps: result.followUpPrediction.followUpUrgency === "urgent" || result.followUpPrediction.followUpUrgency === "immediate" ? 1 : 0,
        topCareGaps: result.followUpPrediction.careGaps,
        lastUpdated: new Date().toISOString(),
      }
    };
    return JSON.stringify({ result, _blackboard: blackboardEntry });
  },
  {
    name: "predict_care_coordination",
    description: "Predicts patient follow-up intervals, no-show risks, and care gaps. Writes signals to the shared agent blackboard so all other iCareOS agents are aware.",
    schema: z.object({
      session: z.any().describe("The iScribe session object.")
    })
  }
);

/**
 * Compliance Tool — HIPAA and regulatory compliance check.
 */
export const complianceTool = tool(
  async ({ soapNode, riskLevel, entities }) => {
    return await runComplianceAgent(soapNode, riskLevel, entities);
  },
  {
    name: "run_compliance_check",
    description: "Checks SOAP notes against medical compliance guidelines based on the risk level.",
    schema: z.object({
      soapNode: z.any(),
      riskLevel: z.enum(["low", "medium", "high", "critical"]),
      entities: z.any().optional()
    })
  }
);

// ==========================================
// Multimodal CDS Agents
// ==========================================
import { woundCareTool } from "../agents/woundCareAgent";
import { radiologySupportTool } from "../agents/radiologySupportAgent";

// Full tool registry — all tools visible to the Orchestrator and iSkylar
export const allClinicalTools = [
  nlpTool,
  soapTool,
  riskTool,
  billingTool,
  complianceTool,
  careCoordTool,
  eligibilityTool,
  schedulingTool,
  retrieveGuidelinesTool,
  woundCareTool,
  radiologySupportTool,
];
