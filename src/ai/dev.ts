import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-consultation.ts';
import '@/ai/flows/transcribe-audio.ts';