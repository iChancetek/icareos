'use server';

import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';
import type { ComplianceResult, ComplianceCheck, HipaaStatus, AgentMeta } from '@/types/agents';

const COMPLIANCE_SCHEMA = {
    type: "object",
    properties: {
        isCompliant: { type: "boolean" },
        hipaaStatus: { type: "string", enum: ["compliant", "non_compliant", "review_required"] },
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
        flags: { type: "array", items: { type: "string" } },
        recommendations: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
        confidence: { type: "number" },
    },
    required: ["isCompliant", "hipaaStatus", "checks", "flags", "recommendations", "summary", "confidence"],
    additionalProperties: false,
};

interface ComplianceStructuredOutput {
    isCompliant: boolean;
    hipaaStatus: HipaaStatus;
    checks: ComplianceCheck[];
    flags: string[];
    recommendations: string[];
    summary: string;
    confidence: number;
}

export async function runComplianceAgent(
    soapNote: { subjective: string; objective: string; assessment: string; plan: string },
    riskLevel: string,
    entities: Array<{ text: string; type: string }>,
): Promise<ComplianceResult> {
    const start = Date.now();

    const systemPrompt = `You are a senior clinical compliance officer and HIPAA documentation specialist for a healthcare AI platform.
Your role is to perform a thorough compliance audit of a SOAP note against CMS documentation standards and HIPAA requirements.

Run all of these checks and return detailed, clinical-grade results:
1. COMPLETENESS — All four SOAP sections must be substantively filled (not just a sentence each)
2. CLINICAL COHERENCE — Chief complaint, symptoms, assessment, and plan must be logically consistent
3. MEDICATION SAFETY — Any medications mentioned must have dose, route, and frequency. Flag missing information.
4. RISK DOCUMENTATION — High or critical risk level must be accompanied by a documented escalation plan
5. HIPAA SENSITIVITY — PHI must not appear in inappropriate sections. Flag if patient identifiers appear where they should not.
6. BILLING ALIGNMENT — The documented services must support the clinical assessment (no upcoding risk)
7. STANDARD OF CARE — The plan should align with current evidence-based clinical guidelines for the documented conditions

For each check, provide a specific, clinical-grade message explaining the finding.
hipaaStatus must be "compliant", "non_compliant", or "review_required".
isCompliant = true only if NO "error" severity checks failed AND hipaaStatus is not "non_compliant".
Rate confidence in your compliance evaluation 0.0-1.0.
Be rigorous — patient safety depends on documentation quality.`;

    const entitySummary = entities
        .filter(e => e.type === 'medication' || e.type === 'condition')
        .map(e => `${e.type}: ${e.text}`)
        .join(', ') || 'None identified';

    const userPrompt = `SOAP Note to Audit:
Subjective: ${soapNote.subjective}
Objective: ${soapNote.objective}
Assessment: ${soapNote.assessment}
Plan: ${soapNote.plan}

Clinical Risk Level: ${riskLevel}
Extracted Medical Entities: ${entitySummary}`;

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
            modelVersion: DEFAULT_AI_LABEL,
            confidence,
            latency_ms,
            requiresHumanReview: hasErrors || !complianceData.isCompliant || confidence < 0.7,
            reviewNote: !complianceData.isCompliant
                ? `Compliance failures detected: ${complianceData.flags.join('; ')}`
                : confidence < 0.7 ? 'Compliance confidence low — recommend compliance officer review' : undefined,
        };

        return { ...complianceData, meta };
    } catch (error: any) {
        throw new Error(`ComplianceAgent failed: ${error.message}`);
    }
}
