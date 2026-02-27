import 'server-only';
import OpenAI from 'openai';
import { ENGINE_MODEL, DEFAULT_AI_LABEL } from './constants';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "dummy-openai-api-key-to-bypass-build-crash",
});

export class OpenAIService {
    /**
     * Text-to-Speech (TTS)
     */
    static async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy') {
        try {
            const mp3 = await openai.audio.speech.create({
                model: "tts-1",
                voice,
                input: text,
            });
            const buffer = Buffer.from(await mp3.arrayBuffer());
            return buffer;
        } catch (error) {
            console.error("Error in textToSpeech:", error);
            throw error;
        }
    }

    /**
     * Speech-to-Text (Whisper)
     */
    static async speechToText(audioFile: File | any, language?: string) {
        try {
            const transcription = await openai.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-1",
                language,
            });
            return transcription.text;
        } catch (error) {
            console.error("Error in speechToText:", error);
            throw error;
        }
    }

    /**
     * Chat Completion — plain text response
     */
    static async generateText(prompt: string, systemPrompt?: string): Promise<string> {
        try {
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
            if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
            messages.push({ role: 'user', content: prompt });

            const completion = await openai.chat.completions.create({
                model: ENGINE_MODEL,
                messages,
                max_completion_tokens: 2048,
            });
            return completion.choices[0].message.content ?? '';
        } catch (error) {
            console.error("Error in generateText:", error);
            throw error;
        }
    }

    /**
     * Structured JSON Completion — returns a typed JSON object via GPT response_format.
     * Used by all agents to get structured, parseable AI output.
     */
    static async generateStructured<T = Record<string, unknown>>(
        prompt: string,
        systemPrompt: string,
        jsonSchema: Record<string, unknown>,
        schemaName: string = "structured_output"
    ): Promise<T> {
        try {
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ];

            const completion = await openai.chat.completions.create({
                model: ENGINE_MODEL,
                messages,
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: schemaName,
                        schema: jsonSchema,
                        strict: true,
                    },
                } as any,
                max_completion_tokens: 4096,
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("Empty structured response from model");
            return JSON.parse(content) as T;
        } catch (error) {
            console.error(`Error in generateStructured (${schemaName}):`, error);
            throw error;
        }
    }

    /**
     * Generate text embeddings for semantic memory retrieval.
     */
    static async embed(text: string): Promise<number[]> {
        try {
            const response = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error("Error in embed:", error);
            throw error;
        }
    }
}
