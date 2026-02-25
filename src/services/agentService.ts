'use server';

import { runOrchestratorAgent } from '@/agents/orchestratorAgent';
import type { ClinicalSession, OrchestratorInput } from '@/types/agents';

/**
 * agentService — Central facade for all clinical AI intelligence.
 *
 * Frontend calls this single function to run the full agent pipeline:
 * Transcription → NLP + SOAP → Risk + Billing + Compliance
 *
 * Returns a unified ClinicalSession.
 */
export async function processClinicialSession(input: OrchestratorInput): Promise<ClinicalSession> {
    try {
        const session = await runOrchestratorAgent(input);
        return session;
    } catch (error: any) {
        console.error('[AgentService] Clinical session processing failed:', error);
        throw new Error(`Clinical intelligence pipeline failed: ${error.message}`);
    }
}

/**
 * Convenience wrapper for transcript-only input (e.g., manually typed notes).
 */
export async function processTranscriptOnly(
    transcript: string,
    options?: { patientContext?: string; specialty?: string }
): Promise<ClinicalSession> {
    return processClinicialSession({
        transcript,
        patientContext: options?.patientContext,
        specialty: options?.specialty,
    });
}

/**
 * Convenience wrapper for audio input.
 */
export async function processAudioSession(
    audioDataUri: string,
    options?: { patientContext?: string; specialty?: string; language?: string }
): Promise<ClinicalSession> {
    return processClinicialSession({
        audioDataUri,
        patientContext: options?.patientContext,
        specialty: options?.specialty,
        language: options?.language,
    });
}
