'use server';

import { OpenAIService, DEFAULT_MODEL } from '@/services/openaiService';
import type { SOAPResult, SOAPNote, AgentMeta } from '@/types/agents';

const SOAP_SCHEMA = {
    type: "object",
    properties: {
        subjective: { type: "string" },
        objective: { type: "string" },
        assessment: { type: "string" },
        plan: { type: "string" },
        chiefComplaint: { type: "string" },
        differentialDiagnoses: { type: "array", items: { type: "string" } },
        structuredSummary: { type: "string" },
        laymanSummary: { type: "string" },
        confidence: { type: "number" },
    },
    required: ["subjective", "objective", "assessment", "plan", "chiefComplaint", "differentialDiagnoses", "structuredSummary", "laymanSummary", "confidence"],
    additionalProperties: false,
};

interface SOAPStructuredOutput extends SOAPNote {
    structuredSummary: string;
    laymanSummary: string;
    confidence: number;
}

export async function runSOAPAgent(
    transcript: string,
    specialty?: string,
    patientContext?: string
): Promise<SOAPResult> {
    const start = Date.now();

    const systemPrompt = `You are an expert clinical documentation specialist powered by ${DEFAULT_MODEL}.
Your role is to generate accurate, complete SOAP notes from medical transcripts.
${specialty ? `Specialty context: ${specialty}` : ''}
Include:
- Subjective: patient-reported symptoms and history
- Objective: observations, vitals, exam findings
- Assessment: diagnosis and clinical reasoning, including differentials
- Plan: treatment, medications, follow-up
Also provide a structured clinical summary and a simple layman's summary the patient can understand.
Rate your confidence in the SOAP note from 0 to 1.`;

    const userPrompt = `${patientContext ? `Patient Context: ${patientContext}\n` : ''}Generate a complete SOAP note from this transcript:\n\n${transcript}`;

    try {
        const output = await OpenAIService.generateStructured<SOAPStructuredOutput>(
            userPrompt,
            systemPrompt,
            SOAP_SCHEMA,
            "soap_note_generation"
        );

        const latency_ms = Date.now() - start;
        const { confidence, structuredSummary, laymanSummary, ...soap } = output;

        const meta: AgentMeta = {
            agentName: 'SOAPAgent',
            modelVersion: DEFAULT_MODEL,
            confidence,
            latency_ms,
            requiresHumanReview: confidence < 0.7,
            reviewNote: confidence < 0.7 ? 'SOAP note confidence below threshold — recommend clinician review' : undefined,
        };

        return { soap, structuredSummary, laymanSummary, meta };
    } catch (error: any) {
        throw new Error(`SOAPAgent failed: ${error.message}`);
    }
}
