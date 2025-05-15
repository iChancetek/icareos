
export interface Consultation {
  id: string;
  patientName: string;
  date: string; // ISO string date
  status: 'Recorded' | 'Transcribing' | 'Summarizing' | 'Completed' | 'Failed';
  transcript?: string;
  summary?: string;
  audioUrl?: string; // Optional: URL if audio is stored persistently
  // Potential future fields for HubSpot integration:
  // hubspotContactId?: string;
  // hubspotDealId?: string;
  // hubspotNoteId?: string;
}
