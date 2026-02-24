'use server';
/**
 * @fileOverview A text-to-speech AI agent.
 *
 * - textToSpeech - A function that handles the text-to-speech process.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */
import { OpenAIService } from '@/services/openaiService';
import { z } from 'zod';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
  voice: z.enum(['Algenib', 'Achernar']).default('Algenib').describe('The voice to use for the speech. Algenib is female, Achernar is male.')
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The synthesized audio as a WAV data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  if (!input.text.trim()) {
    return { audioDataUri: '' };
  }

  try {
    // Map old Genkit voices to OpenAI voices loosely
    const openAIVoice = input.voice === 'Achernar' ? 'onyx' : 'alloy';

    // We get back an mp3 buffer from OpenAI
    const audioBuffer = await OpenAIService.textToSpeech(input.text, openAIVoice);

    // Convert directly to base64 mp3 data URI to satisfy existing consumers
    const base64Audio = audioBuffer.toString('base64');

    return {
      audioDataUri: `data:audio/mpeg;base64,${base64Audio}`,
    };
  } catch (error: any) {
    console.error("Error in textToSpeech API route fallback:", error);
    throw new Error("Failed to generate speech using OpenAI");
  }
}
