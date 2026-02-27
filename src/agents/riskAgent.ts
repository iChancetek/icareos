'use server';

import { OpenAIService, DEFAULT_AI_LABEL } from '@/services/openaiService';
import type { RiskResult, RiskFactor, RiskLevel, AgentMeta } from '@/types/agents';

const RISK_SCHEMA = {
    type: "object",
    properties: {
        riskLevel: { type: "string", enum: ["low", "medium", "high", "critical"] },
        riskScore: { type: "number" },
        riskFactors: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    factor: { type: "string" },
                    severity: { type: "string", enum: ["low", "medium", "high"] },
                    note: { type: "string" },
                },
                required: ["factor", "severity", "note"],
                additionalProperties: false,
            },
        },
        recommendations: { type: "array", items: { type: "string" } },
        confidence: { type: "number" },
    },
    required: ["riskLevel", "riskScore", "riskFactors", "recommendations", "confidence"],
    additionalProperties: false,
};

interface RiskStructuredOutput {
    riskLevel: RiskLevel;
    riskScore: number;
    riskFactors: RiskFactor[];
    recommendations: string[];
    confidence: number;
}

export async function runRiskAgent(
    transcript: string,
    soapAssessment: string,
    entities: Array<{ text: string; type: string }>,
): Promise<RiskResult> {
    const start = Date.now();

    const systemPrompt = `You are a clinical risk detection AI.
Evaluate the patient's clinical risk based on their transcript and SOAP assessment.
Identify specific risk factors (e.g., drug interactions, fall risk, sepsis indicators, suicide risk, abnormal vitals).
Assign:
- riskLevel: "low" | "medium" | "high" | "critical"
- riskScore: 0-100 (100 = maximum risk)
- List each riskFactor with severity
- Provide actionable recommendations
- Rate your confidence in the risk evaluation 0-1
Err on the side of caution. If in doubt, flag for human review.`;

    const entitySummary = entities.map(e => `${e.type}: ${e.text}`).join('\n');
    const userPrompt = `SOAP Assessment:\n${soapAssessment}\n\nExtracted Entities:\n${entitySummary}\n\nFull Transcript:\n${transcript}`;

    try {
        const output = await OpenAIService.generateStructured<RiskStructuredOutput>(
            userPrompt,
            systemPrompt,
            RISK_SCHEMA,
            "clinical_risk_assessment"
        );

        const latency_ms = Date.now() - start;
        const { confidence, ...riskData } = output;

        const meta: AgentMeta = {
            agentName: 'RiskAgent',
            modelVersion: DEFAULT_AI_LABEL,
            confidence,
            latency_ms,
            requiresHumanReview: riskData.riskLevel === 'high' || riskData.riskLevel === 'critical' || confidence < 0.7,
            reviewNote: riskData.riskLevel === 'critical'
                ? 'CRITICAL RISK level detected — immediate clinician review required'
                : riskData.riskLevel === 'high'
                    ? 'High risk detected — clinician review recommended'
                    : undefined,
        };

        return { ...riskData, meta };
    } catch (error: any) {
        throw new Error(`RiskAgent failed: ${error.message}`);
    }
}
