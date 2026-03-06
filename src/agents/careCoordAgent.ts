import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';
import type { AgentMeta } from '@/types/agents';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FollowUpUrgency = 'immediate' | 'urgent' | 'soon' | 'routine';
export type CareGapCategory = 'medication' | 'referral' | 'lab' | 'imaging' | 'screening' | 'lifestyle' | 'mental_health';

export interface CareGap {
    category: CareGapCategory;
    description: string;
    priority: 'high' | 'medium' | 'low';
    recommendedAction: string;
    timeframe: string;
}

export interface FollowUpPlan {
    followUpIntervalDays: number;
    followUpUrgency: FollowUpUrgency;
    followUpReason: string;
    suggestedCareTeam: string[];
    careGaps: string[];
    detailedCareGaps: CareGap[];
}

export interface NoShowRiskProfile {
    noShowRiskScore: number;     // 0–100
    noShowRiskLevel: 'high' | 'medium' | 'low';
    contributingFactors: string[];
    mitigationStrategies: string[];
}

export interface ModuleIntegration {
    moduleName: string;
    integrated: boolean;
    status: string;
    dataShared: string[];
}

export interface CareCoordResult {
    sessionId: string;
    followUpPrediction: FollowUpPlan;
    noShowRisk: NoShowRiskProfile;
    engagementActions: string[];
    moduleIntegrations: ModuleIntegration[];
    patientEngagementScore: number;  // 0–100
    careCoordSummary: string;
    meta: AgentMeta;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const CARECOORD_SCHEMA = {
    type: "object",
    properties: {
        followUpIntervalDays: { type: "number" },
        followUpUrgency: { type: "string", enum: ["immediate", "urgent", "soon", "routine"] },
        followUpReason: { type: "string" },
        suggestedCareTeam: { type: "array", items: { type: "string" } },
        careGaps: { type: "array", items: { type: "string" } },
        detailedCareGaps: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    category: { type: "string", enum: ["medication", "referral", "lab", "imaging", "screening", "lifestyle", "mental_health"] },
                    description: { type: "string" },
                    priority: { type: "string", enum: ["high", "medium", "low"] },
                    recommendedAction: { type: "string" },
                    timeframe: { type: "string" },
                },
                required: ["category", "description", "priority", "recommendedAction", "timeframe"],
                additionalProperties: false,
            },
        },
        noShowRiskScore: { type: "number" },
        noShowRiskLevel: { type: "string", enum: ["high", "medium", "low"] },
        contributingFactors: { type: "array", items: { type: "string" } },
        mitigationStrategies: { type: "array", items: { type: "string" } },
        engagementActions: { type: "array", items: { type: "string" } },
        patientEngagementScore: { type: "number" },
        careCoordSummary: { type: "string" },
        confidence: { type: "number" },
    },
    required: [
        "followUpIntervalDays", "followUpUrgency", "followUpReason", "suggestedCareTeam",
        "careGaps", "detailedCareGaps", "noShowRiskScore", "noShowRiskLevel",
        "contributingFactors", "mitigationStrategies", "engagementActions",
        "patientEngagementScore", "careCoordSummary", "confidence"
    ],
    additionalProperties: false,
};

interface CareCoordStructuredOutput {
    followUpIntervalDays: number;
    followUpUrgency: FollowUpUrgency;
    followUpReason: string;
    suggestedCareTeam: string[];
    careGaps: string[];
    detailedCareGaps: CareGap[];
    noShowRiskScore: number;
    noShowRiskLevel: 'high' | 'medium' | 'low';
    contributingFactors: string[];
    mitigationStrategies: string[];
    engagementActions: string[];
    patientEngagementScore: number;
    careCoordSummary: string;
    confidence: number;
}

// ─── CareCoordIQ Agent ────────────────────────────────────────────────────────

class CareCoordAgentClass {
    async plan(session: any): Promise<CareCoordResult> {
        const start = Date.now();

        const systemPrompt = `You are CareCoordIQ, an elite predictive care coordination intelligence agent within the iCareOS platform.
Your mission is to analyze a completed clinical session and produce a comprehensive, personalized care coordination plan.

You are trained in:
- Evidence-based clinical guidelines (AHA, ADA, USPSTF, ACR, etc.)
- Population health management and care gap identification
- No-show prediction and patient engagement science
- Chronic disease management and comorbidity coordination

Perform ALL of the following analyses:

1. FOLLOW-UP PLANNING — Based on the clinical findings, determine:
   - Exact follow-up interval in days (be specific, not generic)
   - Urgency level: "immediate"=same day, "urgent"=<72h, "soon"=<2wk, "routine"=2-4wk+
   - Clear clinical reason for the chosen interval
   - Which care team members should be involved (e.g., PCP, cardiologist, care coordinator, pharmacist)

2. CARE GAP DETECTION — Identify specific care gaps based on clinical data:
   - Missing or overdue screenings (colonoscopy, mammogram, A1c, lipid panel, etc.)
   - Medication gaps (missing guideline-directed medications for documented conditions)
   - Unaddressed referrals clearly indicated by the clinical findings
   - Lifestyle interventions needed but not planned

3. NO-SHOW RISK PREDICTION — Based on clinical complexity and typical patient profiles:
   - noShowRiskScore: 0–100 (higher = more likely to miss follow-up)
   - Specific contributing factors (complex regimen, poor health literacy indicators, social determinants)
   - Concrete mitigation strategies (reminder systems, care coordinator outreach, telehealth option)

4. PATIENT ENGAGEMENT — Generate specific, actionable engagement steps the care team should take

5. MODULE INTEGRATION — Note which iCareOS modules have relevant data for this patient
   (MediScribe, RiskIQ, BillingIQ, WoundIQ, RadiologyIQ)

patientEngagementScore: 0–100 (100 = maximally engaged/adherent profile)
confidence: your confidence in this care plan (0.0–1.0)

This is a production clinical environment. Be specific, cite clinical guidelines, and prioritize patient outcomes.`;

        const sessionSummary = typeof session === 'string'
            ? session
            : JSON.stringify({
                transcript: session.transcript?.substring(0, 2000),
                summary: session.summary?.substring(0, 1000),
                soapNote: session.soapNote,
                icdCodes: session.icdCodes,
                riskLevel: session.riskLevel,
                riskScore: session.riskScore,
                riskFactors: session.riskFactors,
                specialty: session.specialty,
                patientName: session.patientName,
            });

        const userPrompt = `Generate a full CareCoordIQ care coordination plan for the following clinical session:\n\n${sessionSummary}`;

        try {
            const output = await OpenAIService.generateStructured<CareCoordStructuredOutput>(
                userPrompt, systemPrompt, CARECOORD_SCHEMA, "carecoordiq_plan"
            );

            const latency_ms = Date.now() - start;
            const { confidence, followUpIntervalDays, followUpUrgency, followUpReason,
                suggestedCareTeam, careGaps, detailedCareGaps,
                noShowRiskScore, noShowRiskLevel, contributingFactors,
                mitigationStrategies, engagementActions,
                patientEngagementScore, careCoordSummary } = output;

            const sessionId = `carecoord_${Date.now()}`;

            const meta: AgentMeta = {
                agentName: 'CareCoordIQ',
                modelVersion: DEFAULT_AI_LABEL,
                confidence,
                latency_ms,
                requiresHumanReview: followUpUrgency === 'immediate' || noShowRiskLevel === 'high',
                reviewNote: followUpUrgency === 'immediate'
                    ? 'Immediate follow-up required — care coordinator must contact patient today'
                    : noShowRiskLevel === 'high' ? 'High no-show risk — proactive outreach recommended before appointment' : undefined,
            };

            return {
                sessionId,
                followUpPrediction: {
                    followUpIntervalDays,
                    followUpUrgency,
                    followUpReason,
                    suggestedCareTeam,
                    careGaps,
                    detailedCareGaps,
                },
                noShowRisk: {
                    noShowRiskScore,
                    noShowRiskLevel,
                    contributingFactors,
                    mitigationStrategies,
                },
                engagementActions,
                moduleIntegrations: [
                    { moduleName: 'MediScribe', integrated: true, status: 'Active', dataShared: ['transcript', 'SOAP', 'ICD codes'] },
                    { moduleName: 'RiskIQ', integrated: true, status: 'Active', dataShared: ['riskLevel', 'riskScore', 'alerts'] },
                    { moduleName: 'BillingIQ', integrated: true, status: 'Active', dataShared: ['CPT codes', 'claim status'] },
                    { moduleName: 'WoundIQ', integrated: false, status: 'Not triggered', dataShared: [] },
                    { moduleName: 'RadiologyIQ', integrated: false, status: 'Not triggered', dataShared: [] },
                ],
                patientEngagementScore,
                careCoordSummary,
                meta,
            };
        } catch (error: any) {
            throw new Error(`CareCoordIQ planning failed: ${error.message}`);
        }
    }
}

export const careCoordAgent = new CareCoordAgentClass();
