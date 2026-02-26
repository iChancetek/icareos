import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * RAGService Tool
 * 
 * Embeds Enterprise knowledge for grounding:
 * - Clinical Guidelines
 * - Insurance Policies
 * - Homebound Criteria
 * - State Regulations
 */
export const retrieveGuidelinesTool = tool(
    async ({ queryType, medicalCondition, stateContext }) => {
        console.log(`[RAGService] Retrieving guidelines for: [${queryType}] ${medicalCondition || ""} in ${stateContext || "Default"}`);

        // Simulated Vector Database Retrieval
        await new Promise((resolve) => setTimeout(resolve, 600));

        if (queryType === "homebound") {
            return `CMS Homebound Criteria: The patient must be confined to the home, meaning leaving home requires a considerable and taxing effort. They must need the aid of supportive devices, special transportation, or the assistance of another person to leave their residence, or have a condition such that leaving home is medically contraindicated.`;
        }

        if (queryType === "clinical" && medicalCondition) {
            return `Standard Care Guideline for ${medicalCondition}: Require vitals check, symptom progression history, and review of active medications prior to triage level assignment. Low threshold for ER referral if shortness of breath or radiating chest pain is present.`;
        }

        if (queryType === "insurance") {
            return `General Policy: Specialized scans (MRI, CT) require prior authorization. First-line therapies (e.g. physical therapy, standard NSAIDs) must be documented as failed before higher-tier interventions are approved.`;
        }

        return "No specific guidelines retrieved. Proceed with standard medical reasoning.";
    },
    {
        name: "retrieve_clinical_guidelines",
        description: "Queries the corporate RAG vector database for clinical protocols, homecare criteria, and insurance policy guidelines.",
        schema: z.object({
            queryType: z.enum(["clinical", "homebound", "insurance", "state_regulation"]).describe("The category of knowledge being retrieved."),
            medicalCondition: z.string().optional().describe("The specific condition or symptom to lookup clinical guidelines for."),
            stateContext: z.string().optional().describe("The relevant US state for regulatory checks.")
        })
    }
);
