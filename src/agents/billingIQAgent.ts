/**
 * BillingIQ Agent
 * iCareOS Revenue Optimization Agent
 *
 * Analyzes ICD/CPT codes from MediScribe sessions and returns
 * revenue optimization recommendations and claim readiness score.
 */

import type { IScribe } from "@/types";

// CPT code revenue mapping (simplified)
const CPT_REVENUE: Record<string, number> = {
    "99211": 25,
    "99212": 55,
    "99213": 92,
    "99214": 145,
    "99215": 210,
    "99221": 175,
    "99222": 230,
    "99223": 295,
};

export interface BillingRecommendation {
    sessionId: string;
    patientName: string;
    currentCode?: string;
    suggestedCode?: string;
    estimatedRevenueDelta: number;
    underbillingFlag: boolean;
    claimReady: boolean;
    codeAccuracy: number; // 0-1
    notes: string[];
    requiresReview: boolean;
}

export interface BillingIQResult {
    sessionId: string;
    recommendations: BillingRecommendation[];
    totalRevenueCaptured: number;
    totalUnderbillingDelta: number;
    claimReadyCount: number;
    avgCodeAccuracy: number;
    agentVersion: string;
}

export class BillingIQAgent {
    private readonly agentVersion = "BillingIQ-1.0 · iCareOS";

    /**
     * Run BillingIQ analysis on a single iScribe session.
     * Returns revenue optimization recommendations.
     */
    async run(session: IScribe): Promise<BillingRecommendation> {
        const notes: string[] = [];
        let underbillingFlag = false;
        let estimatedRevenueDelta = 0;
        let suggestedCode: string | undefined;
        let codeAccuracy = 0.9;

        // Evaluate based on risk level as complexity proxy
        const riskToComplexity: Record<string, string> = {
            low: "99212",
            medium: "99213",
            high: "99214",
            critical: "99215",
        };

        const suggestedByRisk = session.riskLevel
            ? riskToComplexity[session.riskLevel]
            : undefined;

        // Check ICD code count — more codes suggest higher complexity
        const icdCount = session.icdCodes?.length ?? 0;
        if (icdCount > 4) {
            suggestedCode = suggestedByRisk === "99213" ? "99214" : suggestedByRisk;
            underbillingFlag = true;
            estimatedRevenueDelta = icdCount * 8;
            notes.push(`${icdCount} ICD codes identified — suggests higher complexity billing.`);
            codeAccuracy = 0.82;
        }

        if (session.riskLevel === "critical") {
            underbillingFlag = true;
            estimatedRevenueDelta += 65;
            notes.push("Critical risk session — verify highest complexity code.");
            codeAccuracy = 0.78;
        }

        if (session.requiresHumanReview) {
            notes.push("Human review required before claim submission.");
        }

        const claimReady = !session.requiresHumanReview && icdCount > 0;

        return {
            sessionId: session.id,
            patientName: session.patientName,
            suggestedCode,
            estimatedRevenueDelta,
            underbillingFlag,
            claimReady,
            codeAccuracy,
            notes,
            requiresReview: session.requiresHumanReview ?? false,
        };
    }

    /**
     * Batch process multiple iScribe sessions.
     */
    async analyze(sessions: IScribe[]): Promise<BillingIQResult> {
        const recommendations = await Promise.all(sessions.map(s => this.run(s)));
        const totalRevenueCaptured = recommendations.reduce((t, r) => t + (CPT_REVENUE[r.suggestedCode ?? "99213"] ?? 0), 0);
        const totalUnderbillingDelta = recommendations.reduce((t, r) => t + r.estimatedRevenueDelta, 0);
        const claimReadyCount = recommendations.filter(r => r.claimReady).length;
        const avgCodeAccuracy = recommendations.length
            ? recommendations.reduce((t, r) => t + r.codeAccuracy, 0) / recommendations.length
            : 0;

        return {
            sessionId: `batch-${Date.now()}`,
            recommendations,
            totalRevenueCaptured,
            totalUnderbillingDelta,
            claimReadyCount,
            avgCodeAccuracy,
            agentVersion: this.agentVersion,
        };
    }
}

export const billingIQAgent = new BillingIQAgent();
