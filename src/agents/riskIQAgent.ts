import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';
import type { AgentMeta } from '@/types/agents';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface RiskIQAlert {
    alertId: string;
    module: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    requiresClinicianAction: boolean;
    suggestedAction: string;
    timestamp: string;
}

export interface RiskIQComplianceStatus {
    hipaaCompliant: boolean;
    clinicianSignOffRequired: boolean;
    auditFlags: string[];
    riskScore: number;        // 0–100
    complianceScore: number;  // 0–100
}

export interface RiskIQResult {
    sessionId: string;
    alerts: RiskIQAlert[];
    overallRiskLevel: AlertSeverity;
    complianceStatus: RiskIQComplianceStatus;
    clinicalSummary: string;
    meta: AgentMeta;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const RISKIQ_SCHEMA = {
    type: "object",
    properties: {
        overallRiskLevel: { type: "string", enum: ["critical", "high", "medium", "low"] },
        riskScore: { type: "number" },
        complianceScore: { type: "number" },
        hipaaCompliant: { type: "boolean" },
        clinicianSignOffRequired: { type: "boolean" },
        clinicalSummary: { type: "string" },
        auditFlags: { type: "array", items: { type: "string" } },
        alerts: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                    title: { type: "string" },
                    message: { type: "string" },
                    requiresClinicianAction: { type: "boolean" },
                    suggestedAction: { type: "string" },
                },
                required: ["severity", "title", "message", "requiresClinicianAction", "suggestedAction"],
                additionalProperties: false,
            },
        },
        confidence: { type: "number" },
    },
    required: ["overallRiskLevel", "riskScore", "complianceScore", "hipaaCompliant",
        "clinicianSignOffRequired", "clinicalSummary", "auditFlags", "alerts", "confidence"],
    additionalProperties: false,
};

interface RiskIQStructuredOutput {
    overallRiskLevel: AlertSeverity;
    riskScore: number;
    complianceScore: number;
    hipaaCompliant: boolean;
    clinicianSignOffRequired: boolean;
    clinicalSummary: string;
    auditFlags: string[];
    alerts: Array<{
        severity: AlertSeverity;
        title: string;
        message: string;
        requiresClinicianAction: boolean;
        suggestedAction: string;
    }>;
    confidence: number;
}

// ─── RiskIQ Agent ─────────────────────────────────────────────────────────────

class RiskIQAgentClass {
    async evaluate(session: any): Promise<RiskIQResult> {
        const start = Date.now();

        const systemPrompt = `You are RiskIQ, an elite clinical risk intelligence agent operating within the iCareOS platform.
Your mission is to perform a comprehensive multi-dimensional risk assessment on a clinical session, covering:

1. PATIENT SAFETY RISK — drug interactions, fall risk, sepsis indicators, suicide/self-harm risk, acute deterioration markers
2. CLINICAL RISK FACTORS — comorbidities, abnormal vitals, urgent lab indicators, unresolved high-acuity complaints
3. COMPLIANCE RISK — documentation gaps that create liability, unsigned orders, missing consents
4. HIPAA RISK — any PHI exposure, consent violations, or improper data handling indicators
5. BILLING RISK — upcoding risk, unbundling, or documentation that does not support codes assigned
6. READMISSION RISK — indicators that the patient is likely to return within 30 days

For each risk alert you generate:
- Be specific and actionable (not generic)
- Cite the exact clinical finding that triggered the alert
- Provide a clear, implementable suggested action for the clinician

Risk score (0–100): 0=no risk, 100=imminent critical risk
Compliance score (0–100): 100=fully compliant
clinicianSignOffRequired = true if riskLevel is high or critical, or compliance is below 80.
confidence = your estimated accuracy of this risk assessment (0.0–1.0).

This is a production healthcare environment. Be thorough, precise, and clinical.`;

        const sessionSummary = typeof session === 'string'
            ? session
            : JSON.stringify({
                riskLevel: session.riskLevel,
                transcript: session.transcript?.substring(0, 2000),
                summary: session.summary?.substring(0, 1000),
                icdCodes: session.icdCodes,
                riskFactors: session.riskFactors,
                specialty: session.specialty,
            });

        const userPrompt = `Perform a full RiskIQ assessment on the following clinical session:\n\n${sessionSummary}`;

        try {
            const output = await OpenAIService.generateStructured<RiskIQStructuredOutput>(
                userPrompt, systemPrompt, RISKIQ_SCHEMA, "riskiq_assessment"
            );

            const latency_ms = Date.now() - start;
            const { confidence, riskScore, complianceScore, hipaaCompliant,
                clinicianSignOffRequired, clinicalSummary, auditFlags,
                overallRiskLevel, alerts } = output;

            const sessionId = `riskiq_${Date.now()}`;
            const ts = new Date().toISOString();

            const meta: AgentMeta = {
                agentName: 'RiskIQ',
                modelVersion: DEFAULT_AI_LABEL,
                confidence,
                latency_ms,
                requiresHumanReview: clinicianSignOffRequired || overallRiskLevel === 'critical',
                reviewNote: overallRiskLevel === 'critical'
                    ? 'CRITICAL risk level — immediate clinician escalation required'
                    : clinicianSignOffRequired ? 'Clinician sign-off required before session is finalized' : undefined,
            };

            return {
                sessionId,
                overallRiskLevel,
                clinicalSummary,
                alerts: alerts.map((a, i) => ({
                    alertId: `${sessionId}_alert_${i}`,
                    module: 'RiskIQ',
                    timestamp: ts,
                    ...a,
                })),
                complianceStatus: {
                    hipaaCompliant,
                    clinicianSignOffRequired,
                    auditFlags,
                    riskScore,
                    complianceScore,
                },
                meta,
            };
        } catch (error: any) {
            throw new Error(`RiskIQ evaluation failed: ${error.message}`);
        }
    }

    async monitorBatch(sessions: any[]): Promise<RiskIQResult[]> {
        return Promise.all(sessions.map(s => this.evaluate(s)));
    }
}

export const riskIQAgent = new RiskIQAgentClass();
