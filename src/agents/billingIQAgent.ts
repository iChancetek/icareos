import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';
import type { AgentMeta } from '@/types/agents';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BillingIQCodeAudit {
    code: string;
    codeType: 'ICD-10' | 'CPT' | 'HCPCS';
    description: string;
    status: 'confirmed' | 'upgraded' | 'downgraded' | 'flagged' | 'recommended';
    confidence: number;
    rationale: string;
    estimatedRevenueImpact_usd: number;
}

export interface BillingIQResult {
    sessionId: string;
    codeAudit: BillingIQCodeAudit[];
    underbillingFlag: boolean;
    overbillingFlag: boolean;
    estimatedRevenueDelta: number;    // USD — positive = underbilled, negative = overbilled
    claimReady: boolean;
    codeAccuracy: number;             // 0–100
    billingNarrative: string;
    optimizationSummary: string;
    notes: string[];
    meta: AgentMeta;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const BILLINGIQ_SCHEMA = {
    type: "object",
    properties: {
        underbillingFlag: { type: "boolean" },
        overbillingFlag: { type: "boolean" },
        estimatedRevenueDelta: { type: "number" },
        claimReady: { type: "boolean" },
        codeAccuracy: { type: "number" },
        billingNarrative: { type: "string" },
        optimizationSummary: { type: "string" },
        notes: { type: "array", items: { type: "string" } },
        codeAudit: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    code: { type: "string" },
                    codeType: { type: "string", enum: ["ICD-10", "CPT", "HCPCS"] },
                    description: { type: "string" },
                    status: { type: "string", enum: ["confirmed", "upgraded", "downgraded", "flagged", "recommended"] },
                    confidence: { type: "number" },
                    rationale: { type: "string" },
                    estimatedRevenueImpact_usd: { type: "number" },
                },
                required: ["code", "codeType", "description", "status", "confidence", "rationale", "estimatedRevenueImpact_usd"],
                additionalProperties: false,
            },
        },
        confidence: { type: "number" },
    },
    required: ["underbillingFlag", "overbillingFlag", "estimatedRevenueDelta", "claimReady",
        "codeAccuracy", "billingNarrative", "optimizationSummary", "notes", "codeAudit", "confidence"],
    additionalProperties: false,
};

interface BillingIQStructuredOutput {
    underbillingFlag: boolean;
    overbillingFlag: boolean;
    estimatedRevenueDelta: number;
    claimReady: boolean;
    codeAccuracy: number;
    billingNarrative: string;
    optimizationSummary: string;
    notes: string[];
    codeAudit: Omit<BillingIQCodeAudit, never>[];
    confidence: number;
}

// ─── BillingIQ Agent ──────────────────────────────────────────────────────────

class BillingIQAgentClass {
    async run(session: any): Promise<BillingIQResult> {
        const start = Date.now();

        const systemPrompt = `You are BillingIQ, an elite revenue cycle intelligence agent operating within the iCareOS healthcare AI platform.
You are a board-certified medical coder with deep expertise in CMS guidelines, ICD-10-CM, CPT, HCPCS, and payer-specific billing rules.

Your mission is to perform a comprehensive billing optimization audit on the clinical session data:

1. CODE AUDIT — Review all assigned ICD-10 and CPT codes for accuracy, completeness, and specificity
2. UNDERBILLING DETECTION — Identify services documented but not coded (revenue leakage)
3. OVERBILLING RISK — Flag any potential upcoding or unbundling that creates compliance risk
4. CLAIM READINESS — Determine if documentation is sufficient for clean claim submission
5. REVENUE OPTIMIZATION — Recommend additional legitimate codes supported by documentation
6. MODIFIER ANALYSIS — Identify missing modifiers that affect reimbursement

For each code in the audit:
- "confirmed" = code is correct and well-supported
- "upgraded" = a more specific or higher-value code is supported by documentation  
- "downgraded" = code is overcalimed; documentation only supports a lesser code
- "flagged" = code may trigger a payer audit; explain why
- "recommended" = additional code that is supported and would improve reimbursement

estimatedRevenueDelta: positive value = underbilled (money left on table), negative = overbilled/at risk
codeAccuracy: 0–100, where 100 = perfect coding, <70 = significant issues
claimReady = true only if documentation supports clean claim with no missing elements
confidence = your confidence in this billing assessment (0.0–1.0)

This is a production environment serving real healthcare providers. Be precise, cite CMS guidelines where relevant, and maximize legitimate revenue capture.`;

        const sessionSummary = typeof session === 'string'
            ? session
            : JSON.stringify({
                transcript: session.transcript?.substring(0, 2000),
                summary: session.summary?.substring(0, 1000),
                soapNote: session.soapNote,
                icdCodes: session.icdCodes,
                cptCodes: session.cptCodes,
                specialty: session.specialty,
                riskLevel: session.riskLevel,
            });

        const userPrompt = `Perform a full BillingIQ revenue optimization audit on the following clinical session:\n\n${sessionSummary}`;

        try {
            const output = await OpenAIService.generateStructured<BillingIQStructuredOutput>(
                userPrompt, systemPrompt, BILLINGIQ_SCHEMA, "billingiq_audit"
            );

            const latency_ms = Date.now() - start;
            const { confidence, ...billingData } = output;
            const sessionId = `billingiq_${Date.now()}`;

            const meta: AgentMeta = {
                agentName: 'BillingIQ',
                modelVersion: DEFAULT_AI_LABEL,
                confidence,
                latency_ms,
                requiresHumanReview: !billingData.claimReady || billingData.overbillingFlag || confidence < 0.75,
                reviewNote: billingData.overbillingFlag
                    ? 'Potential overbilling detected — requires manual coding review before submission'
                    : !billingData.claimReady ? 'Claim not ready — documentation gaps require clinician addendum' : undefined,
            };

            return { sessionId, ...billingData, meta };
        } catch (error: any) {
            throw new Error(`BillingIQ audit failed: ${error.message}`);
        }
    }
}

export const billingIQAgent = new BillingIQAgentClass();
