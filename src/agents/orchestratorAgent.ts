'use server';

import { runTranscriptionAgent } from './transcriptionAgent';
import { runNLPAgent } from './nlpAgent';
import { runSOAPAgent } from './soapAgent';
import { runRiskAgent } from './riskAgent';
import { runBillingAgent } from './billingAgent';
import { runComplianceAgent } from './complianceAgent';
import type {
    ClinicalSession, OrchestratorInput, SessionMeta,
    TranscriptionResult, NLPResult, SOAPResult, RiskResult, BillingResult, ComplianceResult,
    AgentMeta,
} from '@/types/agents';

export type PipelineStepName =
    | 'Transcription'
    | 'NLP Extraction'
    | 'SOAP Generation'
    | 'Risk Assessment'
    | 'Billing Codes'
    | 'Compliance Check';

export type PipelineStatus = 'pending' | 'running' | 'done' | 'error';

export interface PipelineUpdate {
    step: PipelineStepName;
    status: PipelineStatus;
    confidence?: number;
    latency_ms?: number;
    error?: string;
}

export type OnPipelineUpdate = (update: PipelineUpdate) => void;

// ─── Fallback Factories ───────────────────────────────────────────────────────
// Each factory returns a safe, typed default when an agent fails in production.
// The session still saves; clinician is flagged for human review.

function transcriptionFallback(err: string): TranscriptionResult {
    return {
        transcript: '',
        detectedLanguage: 'en',
        meta: fallbackMeta('TranscriptionAgent', err),
    };
}

function nlpFallback(err: string): NLPResult {
    return {
        entities: [],
        icdCodes: [],
        keywords: [],
        specialty: 'General',
        meta: fallbackMeta('NLPAgent', err),
    };
}

function soapFallback(err: string): SOAPResult {
    const empty = { subjective: '', objective: '', assessment: '', plan: '' };
    return {
        soap: empty,
        structuredSummary: 'AI pipeline degraded — manual clinical review required.',
        laymanSummary: 'Summary unavailable. Please consult clinician notes.',
        meta: fallbackMeta('SOAPAgent', err),
    };
}

function riskFallback(err: string): RiskResult {
    return {
        riskLevel: 'medium',
        riskScore: 50,
        riskFactors: [{ factor: 'Pipeline degradation', severity: 'medium', note: 'Risk could not be assessed — default to medium. Clinician review required.' }],
        recommendations: ['Full clinical review required — risk assessment was unavailable during this session.'],
        meta: { ...fallbackMeta('RiskAgent', err), requiresHumanReview: true },
    };
}

function billingFallback(err: string): BillingResult {
    return {
        icdCodes: [],
        cptCodes: [],
        billingNarrative: 'Billing codes could not be generated. Manual coding required.',
        optimizationNotes: ['AI billing pipeline unavailable — submit for manual coding review.'],
        meta: { ...fallbackMeta('BillingAgent', err), requiresHumanReview: true },
    };
}

function complianceFallback(err: string): ComplianceResult {
    return {
        isCompliant: false,
        flags: ['Compliance could not be assessed — manual review required.'],
        recommendations: ['Submit this session for compliance officer review.'],
        hipaaStatus: 'review_required',
        meta: { ...fallbackMeta('ComplianceAgent', err), requiresHumanReview: true },
    };
}

function fallbackMeta(agentName: string, errorMessage: string): AgentMeta {
    return {
        agentName,
        modelVersion: 'gpt-5.4 (degraded)',
        confidence: 0,
        latency_ms: 0,
        requiresHumanReview: true,
        reviewNote: `Agent failed in production: ${errorMessage}. Session flagged for human review.`,
    };
}

// ─── OrchestratorAgent ────────────────────────────────────────────────────────

/**
 * OrchestratorAgent — production-grade multi-agent clinical pipeline.
 *
 * Execution stages:
 *   1. TranscriptionAgent (sequential — all others depend on it)
 *   2. NLPAgent + SOAPAgent (parallel)
 *   3. RiskAgent (depends on NLP + SOAP)
 *   4. BillingAgent + ComplianceAgent (parallel)
 *
 * Fault tolerance: each agent has a typed fallback result. One agent failure
 * does NOT crash the pipeline — the session still saves with requiresHumanReview=true.
 *
 * @param onUpdate — optional real-time callback for pipeline UI status
 */
export async function runOrchestratorAgent(
    input: OrchestratorInput,
    onUpdate?: OnPipelineUpdate,
): Promise<ClinicalSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startedAt = new Date();
    const agentsRun: string[] = [];
    const errors: string[] = [];

    const notify = (update: PipelineUpdate) => onUpdate?.(update);

    // ── Step 1: Transcription ──────────────────────────────────────────────
    notify({ step: 'Transcription', status: 'running' });
    let transcription: TranscriptionResult;
    try {
        transcription = await runTranscriptionAgent(input.audioDataUri, input.transcript, input.language);
        agentsRun.push('TranscriptionAgent');
        notify({ step: 'Transcription', status: 'done', confidence: transcription.meta.confidence, latency_ms: transcription.meta.latency_ms });
    } catch (err: any) {
        const msg = err.message ?? 'Unknown error';
        errors.push(`TranscriptionAgent: ${msg}`);
        transcription = transcriptionFallback(msg);
        notify({ step: 'Transcription', status: 'error', error: msg });
    }

    const transcript = transcription.transcript;

    // ── Step 2: NLP + SOAP in parallel ────────────────────────────────────
    notify({ step: 'NLP Extraction', status: 'running' });
    notify({ step: 'SOAP Generation', status: 'running' });

    let nlp: NLPResult;
    let soap: SOAPResult;

    const [nlpResult, soapResult] = await Promise.allSettled([
        runNLPAgent(transcript, input.patientContext),
        runSOAPAgent(transcript, input.specialty, input.patientContext),
    ]);

    if (nlpResult.status === 'fulfilled') {
        nlp = nlpResult.value;
        agentsRun.push('NLPAgent');
        notify({ step: 'NLP Extraction', status: 'done', confidence: nlp.meta.confidence, latency_ms: nlp.meta.latency_ms });
    } else {
        const msg = nlpResult.reason?.message ?? 'Unknown error';
        errors.push(`NLPAgent: ${msg}`);
        nlp = nlpFallback(msg);
        notify({ step: 'NLP Extraction', status: 'error', error: msg });
    }

    if (soapResult.status === 'fulfilled') {
        soap = soapResult.value;
        agentsRun.push('SOAPAgent');
        notify({ step: 'SOAP Generation', status: 'done', confidence: soap.meta.confidence, latency_ms: soap.meta.latency_ms });
    } else {
        const msg = soapResult.reason?.message ?? 'Unknown error';
        errors.push(`SOAPAgent: ${msg}`);
        soap = soapFallback(msg);
        notify({ step: 'SOAP Generation', status: 'error', error: msg });
    }

    // ── Step 3: Risk Assessment ────────────────────────────────────────────
    notify({ step: 'Risk Assessment', status: 'running' });
    let risk: RiskResult;
    try {
        risk = await runRiskAgent(transcript, soap.soap.assessment, nlp.entities);
        agentsRun.push('RiskAgent');
        notify({ step: 'Risk Assessment', status: 'done', confidence: risk.meta.confidence, latency_ms: risk.meta.latency_ms });
    } catch (err: any) {
        const msg = err.message ?? 'Unknown error';
        errors.push(`RiskAgent: ${msg}`);
        risk = riskFallback(msg);
        notify({ step: 'Risk Assessment', status: 'error', error: msg });
    }

    // ── Step 4: Billing + Compliance in parallel ───────────────────────────
    notify({ step: 'Billing Codes', status: 'running' });
    notify({ step: 'Compliance Check', status: 'running' });

    let billing: BillingResult;
    let compliance: ComplianceResult;

    const [billingResult, complianceResult] = await Promise.allSettled([
        runBillingAgent(soap.soap, nlp.icdCodes as any, input.specialty),
        runComplianceAgent(soap.soap, risk.riskLevel, nlp.entities),
    ]);

    if (billingResult.status === 'fulfilled') {
        billing = billingResult.value;
        agentsRun.push('BillingAgent');
        notify({ step: 'Billing Codes', status: 'done', confidence: billing.meta.confidence, latency_ms: billing.meta.latency_ms });
    } else {
        const msg = billingResult.reason?.message ?? 'Unknown error';
        errors.push(`BillingAgent: ${msg}`);
        billing = billingFallback(msg);
        notify({ step: 'Billing Codes', status: 'error', error: msg });
    }

    if (complianceResult.status === 'fulfilled') {
        compliance = complianceResult.value;
        agentsRun.push('ComplianceAgent');
        notify({ step: 'Compliance Check', status: 'done', confidence: compliance.meta.confidence, latency_ms: compliance.meta.latency_ms });
    } else {
        const msg = complianceResult.reason?.message ?? 'Unknown error';
        errors.push(`ComplianceAgent: ${msg}`);
        compliance = complianceFallback(msg);
        notify({ step: 'Compliance Check', status: 'error', error: msg });
    }

    const completedAt = new Date();
    const totalLatency_ms = completedAt.getTime() - startedAt.getTime();

    // ── Aggregate Confidence ───────────────────────────────────────────────
    const allConfidences = [
        transcription.meta.confidence,
        nlp.meta.confidence,
        soap.meta.confidence,
        risk.meta.confidence,
        billing.meta.confidence,
        compliance.meta.confidence,
    ].filter(c => c > 0);

    const overallConfidence = allConfidences.length > 0
        ? allConfidences.reduce((s, c) => s + c, 0) / allConfidences.length
        : 0;

    const requiresHumanReview = errors.length > 0 || [transcription, nlp, soap, risk, billing, compliance]
        .some(r => r.meta.requiresHumanReview);

    const meta: SessionMeta = {
        sessionId,
        startedAt,
        completedAt,
        totalLatency_ms,
        overallConfidence,
        requiresHumanReview,
        agentsRun,
        errors: errors.length > 0 ? errors : undefined,
    };

    return { transcription, nlp, soap, risk, billing, compliance, meta };
}
