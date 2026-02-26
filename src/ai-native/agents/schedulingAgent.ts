import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * SchedulingAgent
 * 
 * Takes risk level and urgency from the Intake/Risk agents to balance the caseload,
 * proposing optimized appointment slots.
 */
export const schedulingTool = tool(
    async ({ patientId, riskLevel, preferredDate, isHomeCare }) => {
        console.log(`[SchedulingAgent] Finding slot for Patient: ${patientId} (Risk: ${riskLevel})`);

        await new Promise((resolve) => setTimeout(resolve, 500));

        // Urgency rules
        let proposedDate = new Date();
        if (riskLevel === "critical" || riskLevel === "high") {
            // Schedule within 24 hours
            proposedDate.setHours(proposedDate.getHours() + Math.random() * 24);
        } else {
            // Schedule within 1-2 weeks
            proposedDate.setDate(proposedDate.getDate() + Math.random() * 14);
        }

        const proposedSlot = proposedDate.toISOString();

        return {
            status: "SLOT_PROPOSED",
            proposedSlot,
            priorityWeighting: riskLevel === "critical" ? 100 : riskLevel === "high" ? 75 : 30,
            caseloadWarning: Math.random() > 0.8 ? "Clinician near capacity for this week." : null,
            routeOptimization: isHomeCare ? "Optimized for Route B (Morning cluster)." : "N/A - Clinic visit"
        };
    },
    {
        name: "schedule_appointment",
        description: "Schedules a patient appointment using risk-adjusted priority weighting and caseload balancing.",
        schema: z.object({
            patientId: z.string(),
            riskLevel: z.enum(["low", "medium", "high", "critical"]).describe("The clinical risk urgency dictating how fast they must be seen."),
            preferredDate: z.string().optional().describe("ISO date string of patient preference"),
            isHomeCare: z.boolean().optional().default(false).describe("Whether this requires homebound route optimization.")
        })
    }
);
