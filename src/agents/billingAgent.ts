'use server';

import { OpenAIService, DEFAULT_MODEL } from '@/services/openaiService';
import type { BillingResult, CPTCode, ICDCode, AgentMeta } from '@/types/agents';

const BILLING_SCHEMA = {
    type: "object",
    properties: {
        icdCodes: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    code: { type: "string" },
                    description: { type: "string" },
                    confidence: { type: "number" },
                    type: { type: "string", enum: ["primary", "secondary"] },
                },
                required: ["code", "description", "confidence", "type"],
                additionalProperties: false,
            },
        },
        cptCodes: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    code: { type: "string" },
                    description: { type: "string" },
                    confidence: { type: "number" },
                    category: { type: "string" },
                },
                required: ["code", "description", "confidence", "category"],
                additionalProperties: false,
            },
        },
        billingNarrative: { type: "string" },
        optimizationNotes: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
    },
    required: ["icdCodes", "cptCodes", "billingNarrative", "optimizationNotes", "confidence"],
    additionalProperties: false,
};

interface BillingStructuredOutput {
    icdCodes: ICDCode[];
    cptCodes: CPTCode[];
    billingNarrative: string;
    optimizationNotes: string[];
    confidence: number;
}

export async function runBillingAgent(
    soapNote: { subjective: string; objective: string; assessment: string; plan: string },
    nlpIcdCodes: ICDCode[],
    specialty?: string,
): Promise<BillingResult> {
    const start = Date.now();

    const systemPrompt = `You are an expert medical billing and coding specialist powered by ${DEFAULT_MODEL}.
${specialty ? `Specialty: ${specialty}` : ''}
Your task is to:
1. Confirm or improve ICD-10 codes from the clinical assessment
2. Suggest accurate CPT procedure codes based on the documented services
3. Provide a billing narrative and optimization notes to maximize correct reimbursement
4. Rate your confidence in the billing accuracy 0-1
Follow current CMS guidelines. Prefer specificity over vagueness in all codes.`;

    const nlpCodeSummary = nlpIcdCodes.map(c => `${c.code}: ${c.description} (${c.type}, confidence: ${c.confidence})`).join('\n');
    const userPrompt = `SOAP Note:
Subjective: ${soapNote.subjective}
Objective: ${soapNote.objective}
Assessment: ${soapNote.assessment}
Plan: ${soapNote.plan}

Pre-identified ICD codes from NLP:
${nlpCodeSummary || 'None identified'}`;

    try {
        const output = await OpenAIService.generateStructured<BillingStructuredOutput>(
            userPrompt,
            systemPrompt,
            BILLING_SCHEMA,
            "medical_billing_optimization"
        );

        const latency_ms = Date.now() - start;
        const { confidence, ...billingData } = output;

        const meta: AgentMeta = {
            agentName: 'BillingAgent',
            modelVersion: DEFAULT_MODEL,
            confidence,
            latency_ms,
            requiresHumanReview: confidence < 0.7,
            reviewNote: confidence < 0.7 ? 'Billing confidence low — recommend coder verification' : undefined,
        };

        return { ...billingData, meta };
    } catch (error: any) {
        throw new Error(`BillingAgent failed: ${error.message}`);
    }
}
