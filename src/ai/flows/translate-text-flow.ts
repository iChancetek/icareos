
'use server';
/**
 * @fileOverview A text translation AI agent.
 *
 * - translateText - A function that handles the text translation process.
 * - TranslateTextInput - The input type for the translateText function.
 * - TranslateTextOutput - The return type for the translateText function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TranslateTextInputSchema = z.object({
  text: z.string().describe('The text to be translated.'),
  targetLanguage: z.string().describe('The language to translate the text into (e.g., "Spanish", "English").'),
});
export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;

const TranslateTextOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateTextOutput = z.infer<typeof TranslateTextOutputSchema>;

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
  return translateTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateTextPrompt',
  input: {schema: TranslateTextInputSchema},
  output: {schema: TranslateTextOutputSchema},
  prompt: `You are a highly skilled translation assistant. Translate the following text into {{targetLanguage}}.
If the text is already in the {{targetLanguage}}, return the original text.
Ensure the translation is accurate, fluent, and natural sounding.

Text to translate:
{{{text}}}

Translated text:`,
});

const translateTextFlow = ai.defineFlow(
  {
    name: 'translateTextFlow',
    inputSchema: TranslateTextInputSchema,
    outputSchema: TranslateTextOutputSchema,
  },
  async (input): Promise<TranslateTextOutput> => {
    if (!input.text.trim()) {
      return { translatedText: '' };
    }
    try {
      const result = await prompt(input);
      if (!result || typeof result.output?.translatedText !== 'string') {
        console.error('translateTextFlow: Prompt did not return a valid translation object.', result);
        throw new Error('Translation failed: AI service returned an invalid response.');
      }
      return result.output;
    } catch (error: any) {
      console.error(`Error in translateTextFlow. Input: ${JSON.stringify(input)}. Error:`, error);
      throw new Error(`AI Translation process failed: ${error.message || 'Unknown error during translation.'}`);
    }
  }
);
