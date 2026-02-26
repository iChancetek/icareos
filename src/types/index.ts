

export interface IScribe {
  id: string;
  userId: string;
  patientName: string;
  date: string;
  status: 'Completed' | 'Processing' | 'Failed';
  transcript?: string;
  summary?: string;
  audioDataUri?: string;
  translatedTranscript?: string;
  translatedTranscriptLanguage?: string;
  // Agent-enriched fields (Phase 2)
  soapNote?: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    chiefComplaint?: string;
    differentialDiagnoses?: string[];
  };
  laymanSummary?: string;
  icdCodes?: Array<{ code: string; description: string; confidence: number; type: 'primary' | 'secondary' }>;
  cptCodes?: Array<{ code: string; description: string; confidence: number; category: string }>;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  riskScore?: number;
  riskFactors?: Array<{ factor: string; severity: string; note: string }>;
  overallConfidence?: number;
  requiresHumanReview?: boolean;
  agentSessionId?: string;
  agentLatency_ms?: number;
  specialty?: string;
  // --- AI-Native Redesign (Phase 3 Enhancements) ---
  langgraphThreadId?: string; // Short-Term Memory mapping
  embeddingId?: string; // Long-Term Memory (Vector Reference)
  decisionLogs?: Array<{
    agent: string;
    action: string;
    reasoning: string;
    confidence: number;
    timestamp: string;
  }>; // Agent trace records and reasoning chains
  escationRequired?: boolean; // Safety & Governance flag

  // --- Multimodal Clinical Decision Support (CDS) (Phase 7 Enhancements) ---
  cdsImages?: Array<{
    url: string;
    type: 'wound' | 'xray' | 'other';
    uploadedAt: string;
    patientConsentGiven: boolean; // Mandatory Regulatory Safeguard
  }>;
  cdsFindings?: {
    visualFeatures?: string[];
    differentialRankings?: Array<{ condition: string; confidence: number }>;
    suggestedCare?: string[];
    urgencyLevel?: 'routine' | 'elevated' | 'immediate';
    clinicianReviewedAt?: string | null; // Human-in-the-loop tracking
    aiDisclaimerAcknowledged?: boolean;
  };
}

export type TranslationLanguage = 'English' | 'Spanish' | 'French' | 'German' | 'Chinese' | 'Hebrew' | 'Mandarin' | 'Arabic';

export interface Translation {
  id: string;
  userId: string;
  date: string; // ISO string date
  sourceLanguage: TranslationLanguage;
  targetLanguage: TranslationLanguage;
  sourceTranscript: string;
  translatedText: string;
  summary: string;
  audioDataUri: string;
}
