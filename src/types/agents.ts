/**
 * iCareOS Agent Type Definitions
 * Defines the inputs, outputs, and result structures for the multi-agent clinical intelligence system.
 * All agents run gpt-5.4 structured output calls with zero mocks.
 */

// ─── Base Agent Types ───────────────────────────────────────────────────────

export interface AgentMeta {
    /** Agent name (e.g., "TranscriptionAgent") */
    agentName: string;
    /** AI model version used */
    modelVersion: string;
    /** Confidence score 0–1 */
    confidence: number;
    /** Processing time in milliseconds */
    latency_ms: number;
    /** Whether a human review is recommended */
    requiresHumanReview: boolean;
    /** Optional reason for low confidence or review flag */
    reviewNote?: string;
}

// ─── Transcription Agent ─────────────────────────────────────────────────────

export interface TranscriptionResult {
    transcript: string;
    detectedLanguage?: string;
    meta: AgentMeta;
}

// ─── NLP Agent ───────────────────────────────────────────────────────────────

export interface MedicalEntity {
    text: string;
    type: 'medication' | 'condition' | 'symptom' | 'procedure' | 'anatomy' | 'dosage' | 'other';
    normalized?: string;
    confidence: number;
}

export interface ICDCode {
    code: string;
    description: string;
    confidence: number;
    type: 'primary' | 'secondary';
}

export interface NLPResult {
    entities: MedicalEntity[];
    icdCodes: ICDCode[];
    keywords: string[];
    specialty?: string; // Detected clinical specialty
    meta: AgentMeta;
}

// ─── SOAP Agent ───────────────────────────────────────────────────────────────

export interface SOAPNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    chiefComplaint?: string;
    differentialDiagnoses?: string[];
}

export interface SOAPResult {
    soap: SOAPNote;
    structuredSummary: string;
    laymanSummary: string;
    meta: AgentMeta;
}

// ─── Risk Agent ───────────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    note?: string;
}

export interface RiskResult {
    riskLevel: RiskLevel;
    riskScore: number; // 0–100
    riskFactors: RiskFactor[];
    recommendations: string[];
    meta: AgentMeta;
}

// ─── Billing Agent ────────────────────────────────────────────────────────────

export interface CPTCode {
    code: string;
    description: string;
    confidence: number;
    category: string;
}

export interface BillingResult {
    icdCodes: ICDCode[];
    cptCodes: CPTCode[];
    billingNarrative: string;
    optimizationNotes: string[];
    meta: AgentMeta;
}

// ─── Compliance Agent ─────────────────────────────────────────────────────────

export interface ComplianceCheck {
    checkName: string;
    passed: boolean;
    severity: 'info' | 'warning' | 'error';
    message: string;
}

export type HipaaStatus = 'compliant' | 'non_compliant' | 'review_required';

export interface ComplianceResult {
    /** Overall compliance pass/fail */
    isCompliant: boolean;
    /** Individual compliance check results */
    checks?: ComplianceCheck[];
    /** Plain-language compliance flags */
    flags: string[];
    /** Actionable recommendations */
    recommendations: string[];
    /** HIPAA-specific compliance status */
    hipaaStatus: HipaaStatus;
    /** Optional narrative summary */
    summary?: string;
    meta: AgentMeta;
}

// ─── Orchestrator / Clinical Session ─────────────────────────────────────────

export interface SessionMeta {
    sessionId: string;
    startedAt: Date;
    completedAt: Date;
    totalLatency_ms: number;
    overallConfidence: number;
    requiresHumanReview: boolean;
    agentsRun: string[];
    /** Any agents that failed and fell back to degraded mode */
    errors?: string[];
}

export interface ClinicalSession {
    transcription: TranscriptionResult;
    nlp: NLPResult;
    soap: SOAPResult;
    risk: RiskResult;
    billing: BillingResult;
    compliance: ComplianceResult;
    meta: SessionMeta;
}

// ─── Agent Input ──────────────────────────────────────────────────────────────

export interface OrchestratorInput {
    /** Base64 audio data URI from the recording, OR a pre-existing transcript */
    audioDataUri?: string;
    transcript?: string;
    patientContext?: string;
    specialty?: string;
    language?: string;
}
