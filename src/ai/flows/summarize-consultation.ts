'use server';

/**
 * @fileOverview A consultation summarization AI agent.
 *
 * - summarizeConsultation - A function that handles the consultation summarization process.
 * - SummarizeConsultationInput - The input type for the summarizeConsultation function.
 * - SummarizeConsultationOutput - The return type for the summarizeConsultation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeConsultationInputSchema = z.object({
  transcript: z.string().describe('The transcript of the medical consultation.'),
});
export type SummarizeConsultationInput = z.infer<typeof SummarizeConsultationInputSchema>;

const SummarizeConsultationOutputSchema = z.object({
  summary: z.string().describe('A summary of the medical consultation.'),
});
export type SummarizeConsultationOutput = z.infer<typeof SummarizeConsultationOutputSchema>;

export async function summarizeConsultation(input: SummarizeConsultationInput): Promise<SummarizeConsultationOutput> {
  return summarizeConsultationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeConsultationPrompt',
  input: {schema: SummarizeConsultationInputSchema},
  output: {schema: SummarizeConsultationOutputSchema},
  prompt: `You are an expert medical summarizer. Your job is to summarize medical consultations so that doctors can quickly understand the key information.

  Here is the transcript of the consultation:
  {{transcript}}

  Please provide a concise summary of the consultation, highlighting the key medical issues, diagnoses, and treatment plans.`,
});

const summarizeConsultationFlow = ai.defineFlow(
  {
    name: 'summarizeConsultationFlow',
    inputSchema: SummarizeConsultationInputSchema,
    outputSchema: SummarizeConsultationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
