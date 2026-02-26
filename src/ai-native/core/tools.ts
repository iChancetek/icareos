import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runNLPAgent } from "@/agents/nlpAgent";
import { runSOAPAgent } from "@/agents/soapAgent";
import { runRiskAgent } from "@/agents/riskAgent";
import { runBillingAgent } from "@/agents/billingAgent";
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
  async ({ transcript, assessment, entities }) => {
    return await runRiskAgent(transcript, assessment, entities);
  },
  {
    name: "assess_clinical_risk",
    description: "Evaluates the clinical severity and calculates a risk score based on the transcript and SOAP assessment.",
    schema: z.object({
      transcript: z.string(),
      assessment: z.string(),
      entities: z.any().optional().describe("Entities extracted by the NLP tool.")
    })
  }
);

export const billingTool = tool(
  async ({ soapNode, icdCodes, specialty }) => {
    return await runBillingAgent(soapNode, icdCodes, specialty);
  },
  {
    name: "generate_billing_codes",
    description: "Generates appropriate CPT billing codes based on the SOAP note and extracted ICD codes.",
    schema: z.object({
      soapNode: z.any().describe("The generated SOAP note structure."),
      icdCodes: z.array(z.string()).optional(),
      specialty: z.string().optional()
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
export const allClinicalTools = [nlpTool, soapTool, riskTool, billingTool, complianceTool, eligibilityTool, schedulingTool, retrieveGuidelinesTool, woundCareTool, radiologySupportTool];
