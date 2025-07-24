
export interface Consultation {
  id: string;
  userId: string; // ID of the user who created the consultation
  patientName: string;
  date: string; // ISO string date
  status: 'Recorded' | 'Transcribing' | 'Summarizing' | 'Completed' | 'Failed';
  transcript?: string;
  summary?: string;
  audioUrl?: string; // Optional: URL if audio is stored persistently
  audioDataUri?: string; // Optional: Base64 Data URI for locally stored/played audio
  translatedTranscript?: string; // Optional: For initially translated transcript
  translatedTranscriptLanguage?: string; // Optional: Language of the translatedTranscript
}
