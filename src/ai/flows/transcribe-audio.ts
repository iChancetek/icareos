
'use server';

/**
 * @fileOverview An audio transcription AI agent.
 *
 * - transcribeAudio - A function that handles the audio transcription process.
 * - TranscribeAudioInput - The input type for the transcribeAudio function.
 * - TranscribeAudioOutput - The return type for the transcribeAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranscribeAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording of a conversation, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;

const TranscribeAudioOutputSchema = z.object({
  transcription: z.string().describe('The transcription of the audio recording.'),
});
export type TranscribeAudioOutput = z.infer<typeof TranscribeAudioOutputSchema>;

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
  return transcribeAudioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'transcribeAudioPrompt',
  input: {schema: TranscribeAudioInputSchema},
  output: {schema: TranscribeAudioOutputSchema},
  prompt: `You are an AI assistant specializing in transcribing audio recordings of medical consultations.\n\nTranscribe the following audio recording to text:\n\n{{media url=audioDataUri}}`,
});

const transcribeAudioFlow = ai.defineFlow(
  {
    name: 'transcribeAudioFlow',
    inputSchema: TranscribeAudioInputSchema,
    outputSchema: TranscribeAudioOutputSchema,
  },
  async (input): Promise<TranscribeAudioOutput> => {
    try {
      const result = await prompt(input);
      if (!result || typeof result.output?.transcription !== 'string') {
        console.error('transcribeAudioFlow: Prompt did not return a valid transcription object.', result);
        throw new Error('Transcription failed: AI service returned an invalid response.');
      }
      return result.output;
    } catch (error: any) {
      console.error(`Error in transcribeAudioFlow. Input: ${JSON.stringify(input)}. Error:`, error);
      throw new Error(`AI Transcription process failed: ${error.message || 'Unknown error during transcription.'}`);
    }
  }
);
