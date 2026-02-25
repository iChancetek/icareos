'use server';

import { OpenAIService, DEFAULT_MODEL } from '@/services/openaiService';
import type { ComplianceResult, ComplianceCheck, AgentMeta } from '@/types/agents';

const COMPLIANCE_SCHEMA = {
    type: "object",
    properties: {
        passed: { type: "boolean" },
        checks: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    checkName: { type: "string" },
                    passed: { type: "boolean" },
                    severity: { type: "string", enum: ["info", "warning", "error"] },
                    message: { type: "string" },
                },
                required: ["checkName", "passed", "severity", "message"],
                additionalProperties: false,
            },
        },
        summary: { type: "string" },
        confidence: { type: "number" },
    },
    required: ["passed", "checks", "summary", "confidence"],
    additionalProperties: false,
};

interface ComplianceStructuredOutput {
    passed: boolean;
    checks: ComplianceCheck[];
    summary: string;
    confidence: number;
}

export async function runComplianceAgent(
    soapNote: { subjective: string; objective: string; assessment: string; plan: string },
    riskLevel: string,
    entities: Array<{ text: string; type: string }>,
): Promise<ComplianceResult> {
    const start = Date.now();

    const systemPrompt = `You are a clinical compliance and documentation quality specialist powered by ${DEFAULT_MODEL}.
Your role is to validate that a SOAP note meets clinical documentation standards.
Run these checks:
1. COMPLETENESS — All SOAP sections are adequately filled
2. CLINICAL COHERENCE — Symptoms, assessment, and plan are logically consistent
3. MEDICATION SAFETY — Check for any obvious medication risks or missing dosages
4. RISK DOCUMENTATION — High/critical risk is properly documented with a plan
5. HIPAA SENSITIVITY — Flag if any identifiers appear in inappropriate places
6. BILLING ALIGNMENT — Documentation supports the clinical codes assigned
Rate your confidence in the compliance evaluation 0-1.
passed = true only if NO "error" severity checks failed.`;

    const entitySummary = entities
        .filter(e => e.type === 'medication' || e.type === 'condition')
        .map(e => `${e.type}: ${e.text}`)
        .join(', ') || 'None';

    const userPrompt = `SOAP Note:
Subjective: ${soapNote.subjective}
Objective: ${soapNote.objective}
Assessment: ${soapNote.assessment}
Plan: ${soapNote.plan}

Risk Level: ${riskLevel}
Key Entities: ${entitySummary}`;

    try {
        const output = await OpenAIService.generateStructured<ComplianceStructuredOutput>(
            userPrompt,
            systemPrompt,
            COMPLIANCE_SCHEMA,
            "compliance_validation"
        );

        const latency_ms = Date.now() - start;
        const { confidence, ...complianceData } = output;
        const hasErrors = complianceData.checks.some(c => c.severity === 'error' && !c.passed);

        const meta: AgentMeta = {
            agentName: 'ComplianceAgent',
            modelVersion: DEFAULT_MODEL,
            confidence,
            latency_ms,
            requiresHumanReview: hasErrors || confidence < 0.7,
            reviewNote: hasErrors ? 'Compliance errors found — documentation requires clinician correction' : undefined,
        };

        return { ...complianceData, meta };
    } catch (error: any) {
        throw new Error(`ComplianceAgent failed: ${error.message}`);
    }
}
