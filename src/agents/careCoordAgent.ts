/**
 * CareCoordIQ Agent
 * iCareOS Predictive Care Coordination Agent
 *
 * Analyzes MediScribe sessions to predict follow-up intervals,
 * no-show risk, and engagement actions for each patient.
 */

import type { IScribe } from "@/types";

export interface FollowUpPrediction {
    patientName: string;
    sessionId: string;
    recommendedFollowUpDays: number;
    followUpUrgency: "routine" | "soon" | "urgent" | "immediate";
    noShowRiskScore: number; // 0-1
    engagementActions: string[];
    careGaps: string[];
    estimatedFollowUpDate: string; // ISO date string
}

export interface CareCoordPlan {
    sessionId: string;
    patientName: string;
    followUpPrediction: FollowUpPrediction;
    integratedModules: string[];
    notes: string[];
    agentVersion: string;
}

export class CareCoordAgent {
    private readonly agentVersion = "CareCoordIQ-1.0 · iCareOS";

    /**
     * Generate a care coordination plan for a single session.
     */
    async plan(session: IScribe): Promise<CareCoordPlan> {
        const notes: string[] = [];
        const engagementActions: string[] = [];
        const careGaps: string[] = [];
        let recommendedFollowUpDays = 30;
        let followUpUrgency: FollowUpPrediction["followUpUrgency"] = "routine";
        let noShowRiskScore = 0.12; // baseline 12%
        const integratedModules: string[] = ["MediScribe"];

        // ── Risk-driven follow-up ─────────────────────────────────────────────
        switch (session.riskLevel) {
            case "critical":
                recommendedFollowUpDays = 3;
                followUpUrgency = "immediate";
                noShowRiskScore = 0.08; // critical patients are more likely to show up
                engagementActions.push("Immediate call-back by care team.");
                engagementActions.push("Escalate to attending physician.");
                careGaps.push("Verify emergency contact is on file.");
                break;
            case "high":
                recommendedFollowUpDays = 7;
                followUpUrgency = "urgent";
                noShowRiskScore = 0.15;
                engagementActions.push("Schedule 7-day follow-up appointment.");
                engagementActions.push("Send patient reminder via preferred channel.");
                break;
            case "medium":
                recommendedFollowUpDays = 14;
                followUpUrgency = "soon";
                noShowRiskScore = 0.20;
                engagementActions.push("Schedule 14-day follow-up.");
                engagementActions.push("Automated reminder in 10 days.");
                break;
            default:
                engagementActions.push("Routine 30-day follow-up check-in.");
                noShowRiskScore = 0.25; // routine visits have higher no-show baseline
        }

        // ── ICD-driven care gaps ──────────────────────────────────────────────
        const icdCount = session.icdCodes?.length ?? 0;
        if (icdCount > 3) {
            careGaps.push(`${icdCount} diagnoses identified — verify all conditions are being managed.`);
            integratedModules.push("BillingIQ");
        }

        // ── Imaging integration ───────────────────────────────────────────────
        if (session.specialty?.toLowerCase().includes("wound") ||
            session.specialty?.toLowerCase().includes("derm")) {
            integratedModules.push("WoundIQ");
            careGaps.push("Schedule wound care follow-up imaging.");
        }

        if (session.specialty?.toLowerCase().includes("radio") ||
            session.specialty?.toLowerCase().includes("pulm") ||
            session.specialty?.toLowerCase().includes("cardio")) {
            integratedModules.push("RadiologyIQ");
        }

        // ── Low confidence flag ───────────────────────────────────────────────
        if (session.requiresHumanReview) {
            notes.push("AI notes require clinician sign-off before care plan is finalized.");
            noShowRiskScore += 0.05;
        }

        // ── AI confidence signal ──────────────────────────────────────────────
        if (session.overallConfidence && session.overallConfidence < 0.6) {
            notes.push("Low documentation confidence — manual review of care plan recommended.");
        }

        const estimatedFollowUpDate = new Date(
            new Date(session.date).getTime() + recommendedFollowUpDays * 24 * 60 * 60 * 1000
        ).toISOString();

        const followUpPrediction: FollowUpPrediction = {
            patientName: session.patientName,
            sessionId: session.id,
            recommendedFollowUpDays,
            followUpUrgency,
            noShowRiskScore: Math.min(1, noShowRiskScore),
            engagementActions,
            careGaps,
            estimatedFollowUpDate,
        };

        return {
            sessionId: session.id,
            patientName: session.patientName,
            followUpPrediction,
            integratedModules: [...new Set(integratedModules)],
            notes,
            agentVersion: this.agentVersion,
        };
    }

    /**
     * Generate care coordination plans for multiple sessions.
     */
    async coordinate(sessions: IScribe[]): Promise<{
        plans: CareCoordPlan[];
        urgentCount: number;
        avgNoShowRisk: number;
        predictedNoShows: number;
    }> {
        const plans = await Promise.all(sessions.map(s => this.plan(s)));
        const urgentCount = plans.filter(p =>
            p.followUpPrediction.followUpUrgency === "urgent" ||
            p.followUpPrediction.followUpUrgency === "immediate"
        ).length;
        const avgNoShowRisk = plans.length
            ? plans.reduce((t, p) => t + p.followUpPrediction.noShowRiskScore, 0) / plans.length
            : 0;
        const predictedNoShows = Math.round(plans.length * avgNoShowRisk);

        return { plans, urgentCount, avgNoShowRisk, predictedNoShows };
    }
}

export const careCoordAgent = new CareCoordAgent();
