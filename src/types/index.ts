

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
