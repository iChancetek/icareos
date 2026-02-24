import OpenAI from 'openai';

// Ensure the OPENAI_API_KEY environment variable is set
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    dangerouslyAllowBrowser: true, // If used client-side, enable this; otherwise keep interactions server-side.
});

// User requested "Open AI 5.3 codex model"
const DEFAULT_MODEL = "gpt-5.3-codex";

export class OpenAIService {
    /**
     * Text-to-Speech (TTS)
     * Converts text into spoken audio.
     * @param text The text to convert to speech.
     * @param voice The voice model to use (e.g., 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer').
     */
    static async textToSpeech(text: string, voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy') {
        try {
            const mp3 = await openai.audio.speech.create({
                model: "tts-1",
                voice: voice,
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
     * Speech-to-Text (STT / Whisper)
     * Multi-language support included via the whisper-1 model.
     * @param audioFile The audio file object (e.g., File or ReadStream).
     * @param language Optional ISO-639-1 language code (e.g., 'en' for English, 'es' for Spanish).
     */
    static async speechToText(audioFile: File | any, language?: string) {
        try {
            const transcription = await openai.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-1",
                language: language, // If provided, helps whisper accuracy with multi-languages
            });
            return transcription.text;
        } catch (error) {
            console.error("Error in speechToText:", error);
            throw error;
        }
    }

    /**
     * Text Generation / Chat Completion
     * Uses the requested "5.3 codex model" by default.
     * @param prompt User's input text.
     * @param systemPrompt Optional system instruction.
     */
    static async generateText(prompt: string, systemPrompt?: string) {
        try {
            const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            messages.push({ role: 'user', content: prompt });

            const completion = await openai.chat.completions.create({
                model: DEFAULT_MODEL, // The 5.3 codex model as requested
                messages: messages,
            });
            return completion.choices[0].message.content;
        } catch (error) {
            console.error("Error in generateText:", error);
            throw error;
        }
    }
}
