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

// ─── DataIQ — Clinical Data Intelligence Agent ───────────────────────────────

export type DataIQMessageType = 'SIGNAL_EVENT' | 'PREDICTION_OUTPUT' | 'ALERT' | 'CARE_GAP';

export type DataIQSourceModule =
    | 'MediScribe'
    | 'Insight'
    | 'WoundIQ'
    | 'RadiologyIQ'
    | 'iSkylar'
    | 'BillingIQ'
    | 'RiskIQ'
    | 'CareCoordIQ';

/** A structured signal from any source module, normalized into the Clinical Signal Layer. */
export interface DataIQSignalPayload {
    sourceModule: DataIQSourceModule;
    /** Free-form key/value clinical data from the source module */
    data: Record<string, unknown>;
    /** Source module confidence score (0–1) */
    confidence?: number;
}

/** A single cross-module prediction generated by DataIQ. */
export interface DataIQPrediction {
    predictionType:
    | 'COMPLICATION_RISK'
    | 'CARE_GAP'
    | 'WOUND_HEALING_FORECAST'
    | 'DIAGNOSTIC_FOLLOWUP'
    | 'READMISSION_RISK';
    /** Target module that should act on this prediction */
    targetModule: DataIQSourceModule;
    title: string;
    description: string;
    confidence: number; // 0–1
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendedAction: string;
}

/** Full result from a DataIQ analysis run. */
export interface DataIQResult {
    sessionId: string;
    patientContext: string;
    modulesAnalyzed: DataIQSourceModule[];
    predictions: DataIQPrediction[];
    crossModuleSummary: string;
    overallRiskScore: number; // 0–100
    careGapCount: number;
    timestamp: string;
    meta: AgentMeta;
}

/** Agent-to-Agent (A2A) message published to the shared bus. */
export interface A2AMessage {
    id?: string;
    agent_id: 'DataIQ' | DataIQSourceModule;
    message_type: DataIQMessageType;
    patient_context: string;
    signal_payload: Record<string, unknown>;
    confidence_score: number;
    timestamp: string;
    target_agent?: DataIQSourceModule;
}
