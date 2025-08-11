

export interface IScribe {
  id: string;
  userId: string; // ID of the user who created the iscribe
  patientName: string;
  date: string; // ISO string date
  status: 'Completed' | 'Processing' | 'Failed';
  transcript?: string;
  summary?: string;
  audioDataUri?: string; // Optional: Base64 Data URI for locally stored/played audio
  translatedTranscript?: string; // Optional: For initially translated transcript
  translatedTranscriptLanguage?: string; // Optional: Language of the translatedTranscript
}

export type TranslationLanguage = 'English' | 'Spanish' | 'French' | 'German' | 'Chinese' | 'Hebrew';

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
