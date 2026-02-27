'use server';

import { OpenAIService } from '@/services/openaiService';
import { z } from 'zod';

const TranslateTextInputSchema = z.object({
    text: z.string(),
    targetLanguage: z.string(),
});

export type TranslateTextInput = z.infer<typeof TranslateTextInputSchema>;
export type TranslateTextOutput = { translatedText: string };

export async function translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
    if (!input.text.trim()) {
        return { translatedText: '' };
    }

    try {
        const systemPrompt = `You are a highly skilled translation assistant.
Translate the following text into ${input.targetLanguage}.
If the text is already in the ${input.targetLanguage}, return the original text.
Ensure the translation is accurate, fluent, and natural sounding.
DO NOT include any conversational filler, only return the translated text.`;

        const translatedText = await OpenAIService.generateText(input.text, systemPrompt);

        if (!translatedText) {
            throw new Error('Translation failed: API returned empty response.');
        }

        return { translatedText: translatedText.trim() };

    } catch (error: any) {
        console.error(`Error in translateText:`, error);
        throw new Error(`AI Translation process failed: ${error.message || 'Unknown error during translation.'}`);
    }
}
