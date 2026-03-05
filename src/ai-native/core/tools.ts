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
// AI-Native Tool Exports (Enhance, not replace)
// We wrap our existing hardcoded agents into dynamic tools
// that the Orchestrator can call at will.
// ==========================================

export const nlpTool = tool(
  async ({ transcript, patientContext }) => {
    return await runNLPAgent(transcript, patientContext);
  },
  {
    name: "run_nlp_extraction",
    description: "Extracts medical entities, symptoms, and ICD codes from a raw medical transcript.",
    schema: z.object({
      transcript: z.string().describe("The raw text transcript of the clinical encounter."),
      patientContext: z.string().optional().describe("Optional context about the patient history.")
    })
  }
);

export const soapTool = tool(
  async ({ transcript, specialty, patientContext }) => {
    return await runSOAPAgent(transcript, specialty, patientContext);
  },
  {
    name: "generate_soap_note",
    description: "Generates a structured SOAP (Subjective, Objective, Assessment, Plan) note from the clinical transcript.",
    schema: z.object({
      transcript: z.string(),
      specialty: z.string().optional().default("general"),
      patientContext: z.string().optional()
    })
  }
);

export const riskTool = tool(
  async ({ session }) => {
    return await riskIQAgent.evaluate(session);
  },
  {
    name: "assess_clinical_risk_and_compliance",
    description: "Evaluates the clinical severity, calculates a risk score, and generates compliance alerts based on the session transcript and NLP extraction.",
    schema: z.object({
      session: z.any().describe("The iScribe session object containing transcript, assessment, and metadata.")
    })
  }
);

export const billingTool = tool(
  async ({ session }) => {
    return await billingIQAgent.run(session);
  },
  {
    name: "generate_billing_codes_and_audit",
    description: "Generates appropriate CPT billing codes, performs a coding audit, and checks claim readiness based on the session.",
    schema: z.object({
      session: z.any().describe("The iScribe session object.")
    })
  }
);

export const careCoordTool = tool(
  async ({ session }) => {
    return await careCoordAgent.plan(session);
  },
  {
    name: "predict_care_coordination",
    description: "Predicts patient follow-up intervals, no-show risks, and care gaps based on the clinical session.",
    schema: z.object({
      session: z.any().describe("The iScribe session object.")
    })
  }
);

export const complianceTool = tool(
  async ({ soapNode, riskLevel, entities }) => {
    return await runComplianceAgent(soapNode, riskLevel, entities);
  },
  {
    name: "run_compliance_check",
    description: "Checks the SOAP note against medical compliance guidelines based on the determined risk level.",
    schema: z.object({
      soapNode: z.any(),
      riskLevel: z.enum(["low", "medium", "high", "critical"]),
      entities: z.any().optional()
    })
  }
);

// ==========================================
// Multimodal CDS Agents (Phase 7)
// ==========================================
import { woundCareTool } from "../agents/woundCareAgent";
import { radiologySupportTool } from "../agents/radiologySupportAgent";

// Array of all available tools for the Orchestrator to bind
export const allClinicalTools = [nlpTool, soapTool, riskTool, billingTool, complianceTool, careCoordTool, eligibilityTool, schedulingTool, retrieveGuidelinesTool, woundCareTool, radiologySupportTool];
