'use server';

import { OpenAIService } from '@/services/openaiService';
import { z } from 'zod';

const SummarizeIScribeInputSchema = z.object({
  transcript: z.string(),
});

export type SummarizeIScribeInput = z.infer<typeof SummarizeIScribeInputSchema>;
export type SummarizeIScribeOutput = { summary: string };

export async function summarizeIScribe(input: SummarizeIScribeInput): Promise<SummarizeIScribeOutput> {
  if (!input.transcript.trim()) {
    return { summary: '' };
  }

  try {
    const systemPrompt = `You are an expert medical summarizer. Your job is to summarize medical iScribes so that doctors can quickly understand the key information.
Please provide a concise summary of the following iScribe, highlighting the key medical issues, diagnoses, and treatment plans.`;

    const summaryText = await OpenAIService.generateText(input.transcript, systemPrompt);

    if (!summaryText) {
      throw new Error('Summarization failed: API returned empty response.');
    }

    return { summary: summaryText.trim() };

  } catch (error: any) {
    console.error(`Error in summarizeIScribe:`, error);
    throw new Error(`AI Summarization process failed: ${error.message || 'Unknown error during summarization.'}`);
  }
}
