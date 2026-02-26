'use server';

import { runTranscriptionAgent } from './transcriptionAgent';
import { runNLPAgent } from './nlpAgent';
import { runSOAPAgent } from './soapAgent';
import { runRiskAgent } from './riskAgent';
import { runBillingAgent } from './billingAgent';
import { runComplianceAgent } from './complianceAgent';
import type { ClinicalSession, OrchestratorInput, SessionMeta } from '@/types/agents';

/**
 * OrchestratorAgent
 *
 * Sequences and partially parallelizes all clinical intelligence agents:
 * 1. TranscriptionAgent (must complete first)
 * 2. NLPAgent + SOAPAgent (run in parallel on the transcript)
 * 3. RiskAgent + BillingAgent + ComplianceAgent (run in parallel on NLP/SOAP results)
 *
 * Returns a unified ClinicalSession with all results and aggregate metadata.
 */
export async function runOrchestratorAgent(input: OrchestratorInput): Promise<ClinicalSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startedAt = new Date();
    const agentsRun: string[] = [];

    // ── Step 1: Transcription ──────────────────────────────────────────────────
    const transcription = await runTranscriptionAgent(
        input.audioDataUri,
        input.transcript,
        input.language
    );
    agentsRun.push('TranscriptionAgent');
    const transcript = transcription.transcript;

    // ── Step 2: NLP + SOAP in parallel ────────────────────────────────────────
    const [nlp, soap] = await Promise.all([
        runNLPAgent(transcript, input.patientContext),
        runSOAPAgent(transcript, input.specialty, input.patientContext),
    ]);
    agentsRun.push('NLPAgent', 'SOAPAgent');

    // ── Step 3: Risk first, then Billing + Compliance in parallel ─────────────
    const risk = await runRiskAgent(transcript, soap.soap.assessment, nlp.entities);
    const [billing, compliance] = await Promise.all([
        runBillingAgent(soap.soap, nlp.icdCodes as any, input.specialty),
        runComplianceAgent(soap.soap, risk.riskLevel, nlp.entities),
    ]);
    agentsRun.push('RiskAgent', 'BillingAgent', 'ComplianceAgent');

    const completedAt = new Date();
    const totalLatency_ms = completedAt.getTime() - startedAt.getTime();

    // ── Aggregate confidence ───────────────────────────────────────────────────
    const allConfidences = [
        transcription.meta.confidence,
        nlp.meta.confidence,
        soap.meta.confidence,
        risk.meta.confidence,
        billing.meta.confidence,
        compliance.meta.confidence,
    ];
    const overallConfidence = allConfidences.reduce((s, c) => s + c, 0) / allConfidences.length;
    const requiresHumanReview = [transcription, nlp, soap, risk, billing, compliance]
        .some(r => r.meta.requiresHumanReview);

    const meta: SessionMeta = {
        sessionId,
        startedAt,
        completedAt,
        totalLatency_ms,
        overallConfidence,
        requiresHumanReview,
        agentsRun,
    };

    return { transcription, nlp, soap, risk, billing, compliance, meta };
}
