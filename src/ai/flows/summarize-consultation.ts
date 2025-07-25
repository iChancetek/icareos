
'use server';

/**
 * @fileOverview A iscribe summarization AI agent.
 *
 * - summarizeIScribe - A function that handles the iscribe summarization process.
 * - SummarizeIScribeInput - The input type for the summarizeIScribe function.
 * - SummarizeIScribeOutput - The return type for the summarizeIScribe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeIScribeInputSchema = z.object({
  transcript: z.string().describe('The transcript of the medical iscribe.'),
});
export type SummarizeIScribeInput = z.infer<typeof SummarizeIScribeInputSchema>;

const SummarizeIScribeOutputSchema = z.object({
  summary: z.string().describe('A summary of the medical iscribe.'),
});
export type SummarizeIScribeOutput = z.infer<typeof SummarizeIScribeOutputSchema>;

export async function summarizeIScribe(input: SummarizeIScribeInput): Promise<SummarizeIScribeOutput> {
  return summarizeIScribeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeIScribePrompt',
  input: {schema: SummarizeIScribeInputSchema},
  output: {schema: SummarizeIScribeOutputSchema},
  prompt: `You are an expert medical summarizer. Your job is to summarize medical iscribes so that doctors can quickly understand the key information.

  Here is the transcript of the iscribe:
  {{transcript}}

  Please provide a concise summary of the iscribe, highlighting the key medical issues, diagnoses, and treatment plans.`,
});

const summarizeIScribeFlow = ai.defineFlow(
  {
    name: 'summarizeIScribeFlow',
    inputSchema: SummarizeIScribeInputSchema,
    outputSchema: SummarizeIScribeOutputSchema,
  },
  async (input): Promise<SummarizeIScribeOutput> => {
    try {
      const result = await prompt(input);
      if (!result || typeof result.output?.summary !== 'string') {
        console.error('summarizeIScribeFlow: Prompt did not return a valid summary object.', result);
        throw new Error('Summarization failed: AI service returned an invalid response.');
      }
      return result.output;
    } catch (error: any) {
      console.error(`Error in summarizeIScribeFlow. Input: ${JSON.stringify(input)}. Error:`, error);
      throw new Error(`AI Summarization process failed: ${error.message || 'Unknown error during summarization.'}`);
    }
  }
);
