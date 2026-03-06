'use server';

import { runOrchestratorAgent } from '@/agents/orchestratorAgent';
import type { ClinicalSession, OrchestratorInput } from '@/types/agents';
import type { OnPipelineUpdate } from '@/agents/orchestratorAgent';

/**
 * agentService — Central facade for the iCareOS clinical AI pipeline.
 *
 * All calls use gpt-5.2 structured outputs with real data.
 * The optional onUpdate callback streams real-time per-agent status
 * directly to the pipeline UI.
 *
 * Pipeline stages:
 *   1. Transcription (Whisper)
 *   2. NLP Extraction + SOAP Generation (parallel, gpt-5.2)
 *   3. Risk Assessment (gpt-5.2)
 *   4. Billing Codes + Compliance Check (parallel, gpt-5.2)
 */
export async function processClinicialSession(
    input: OrchestratorInput,
    onUpdate?: OnPipelineUpdate,
): Promise<ClinicalSession> {
    try {
        return await runOrchestratorAgent(input, onUpdate);
    } catch (error: any) {
        console.error('[AgentService] Clinical session processing failed:', error);
        throw new Error(`iCareOS clinical intelligence pipeline failed: ${error.message}`);
    }
}

/** Transcript-only entry point */
export async function processTranscriptOnly(
    transcript: string,
    options?: { patientContext?: string; specialty?: string },
    onUpdate?: OnPipelineUpdate,
): Promise<ClinicalSession> {
    return processClinicialSession({ transcript, ...options }, onUpdate);
}

/** Audio entry point — used by the iScribe new session page */
export async function processAudioSession(
    audioDataUri: string,
    options?: { patientContext?: string; specialty?: string; language?: string },
    onUpdate?: OnPipelineUpdate,
): Promise<ClinicalSession> {
    return processClinicialSession({ audioDataUri, ...options }, onUpdate);
}
