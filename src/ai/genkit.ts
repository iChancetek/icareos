
import { config } from 'dotenv';
config(); // Ensure .env variables are loaded for local development

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI() // This will look for GOOGLE_API_KEY or GEMINI_API_KEY from the environment
  ],
  model: 'googleai/gemini-2.0-flash',
});
