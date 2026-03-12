import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';
import type { NLPResult, MedicalEntity, ICDCode, AgentMeta } from '@/types/agents';

const NLP_SCHEMA = {
    type: "object",
    properties: {
        entities: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    text: { type: "string" },
                    type: {
                        type: "string",
                        enum: ["medication", "condition", "symptom", "procedure", "anatomy", "dosage", "other"]
                    },
                    normalized: { type: "string" },
                    confidence: { type: "number" },
                },
                required: ["text", "type", "confidence"],
                additionalProperties: false,
            },
        },
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
        keywords: { type: "array", items: { type: "string" } },
        specialty: { type: "string" },
    },
    required: ["entities", "icdCodes", "keywords", "specialty"],
    additionalProperties: false,
};

interface NLPStructuredOutput {
    entities: MedicalEntity[];
    icdCodes: ICDCode[];
    keywords: string[];
    specialty: string;
}

export async function runNLPAgent(transcript: string, patientContext?: string): Promise<NLPResult> {
    const start = Date.now();

    const systemPrompt = `You are a senior Medical NLP Engineer and clinical coding specialist.
Your role is to extract all clinically relevant entities from a medical transcript, suggest ICD-10 codes, and detect the clinical specialty involved.
Be precise. Include confidence scores between 0 and 1 for every entity and code.
Respond ONLY in the specified JSON format.`;

    const userPrompt = `Analyze the following medical transcript and extract entities.
${patientContext ? `Patient context: ${patientContext}` : ''}

TRANSCRIPT:
${transcript}`;

    try {
        const output = await OpenAIService.generateStructured<NLPStructuredOutput>(
            userPrompt,
            systemPrompt,
            NLP_SCHEMA,
            "medical_nlp_extraction"
        );

        const latency_ms = Date.now() - start;
        const avgEntityConfidence = output.entities.length > 0
            ? output.entities.reduce((s, e) => s + e.confidence, 0) / output.entities.length
            : 0.5;
        const avgCodeConfidence = output.icdCodes.length > 0
            ? output.icdCodes.reduce((s, c) => s + c.confidence, 0) / output.icdCodes.length
            : 0.5;
        const confidence = (avgEntityConfidence + avgCodeConfidence) / 2;

        const meta: AgentMeta = {
            agentName: 'NLPAgent',
            modelVersion: DEFAULT_AI_LABEL,
            confidence,
            latency_ms,
            requiresHumanReview: confidence < 0.65,
            reviewNote: confidence < 0.65 ? 'Low entity confidence — recommend clinical review' : undefined,
        };

        return { ...output, meta };
    } catch (error: any) {
        throw new Error(`NLPAgent failed: ${error.message}`);
    }
}
