import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';
import { transcribeAudio } from '@/actions/ai/transcribe-audio';
import type { TranscriptionResult, AgentMeta } from '@/types/agents';

export async function runTranscriptionAgent(
    audioDataUri?: string,
    transcript?: string,
    language?: string
): Promise<TranscriptionResult> {
    const start = Date.now();

    // If a transcript is already provided, skip transcription
    if (transcript) {
        return {
            transcript,
            detectedLanguage: language ?? 'en',
            meta: {
                agentName: 'TranscriptionAgent',
                modelVersion: 'whisper-1 (bypassed — transcript provided)',
                confidence: 1.0,
                latency_ms: 0,
                requiresHumanReview: false,
            },
        };
    }

    if (!audioDataUri) {
        throw new Error('TranscriptionAgent: either audioDataUri or transcript must be provided.');
    }

    try {
        const { transcription } = await transcribeAudio({ audioDataUri });
        const latency_ms = Date.now() - start;

        // Basic confidence heuristic: longer transcripts are more likely to be complete
        const wordCount = transcription.trim().split(/\s+/).length;
        const confidence = wordCount < 5 ? 0.5 : wordCount < 20 ? 0.75 : 0.92;

        const meta: AgentMeta = {
            agentName: 'TranscriptionAgent',
            modelVersion: 'whisper-1',
            confidence,
            latency_ms,
            requiresHumanReview: confidence < 0.6,
            reviewNote: confidence < 0.6 ? 'Very short transcript — may be incomplete audio' : undefined,
        };

        return { transcript: transcription, detectedLanguage: language ?? 'en', meta };
    } catch (error: any) {
        throw new Error(`TranscriptionAgent failed: ${error.message}`);
    }
}
