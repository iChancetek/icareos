export interface Consultation {
  id: string;
  patientName: string;
  date: string; // ISO string date
  status: 'Recorded' | 'Transcribing' | 'Summarizing' | 'Completed' | 'Failed';
  transcript?: string;
  summary?: string;
  audioUrl?: string; // Optional: if storing audio URLs
}
