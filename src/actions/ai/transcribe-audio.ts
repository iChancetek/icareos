'use server';

import { OpenAIService } from '@/services/openaiService';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TranscribeAudioInputSchema = z.object({
    audioDataUri: z.string(),
});

export type TranscribeAudioInput = z.infer<typeof TranscribeAudioInputSchema>;
export type TranscribeAudioOutput = { transcription: string };

export async function transcribeAudio(input: TranscribeAudioInput): Promise<TranscribeAudioOutput> {
    try {
        // 1. Extract base64 and create a temporary file
        const matches = input.audioDataUri.match(/^data:(audio\/\w+(?:;\w+=\w+)?);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid audio payload format. Must be a data URI.');
        }
        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        // Determine extension based on mimetype
        let ext = '.webm';
        if (mimeType.includes('mp4')) ext = '.mp4';
        else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) ext = '.mp3';
        else if (mimeType.includes('wav')) ext = '.wav';

        // Write to a temporary file
        const tmpFilePath = path.join(os.tmpdir(), `audio-${Date.now()}${ext}`);
        fs.writeFileSync(tmpFilePath, buffer);

        // 2. Call OpenAI Service
        // OpenAI SDK expects a native ReadStream when passing a file from Node.js
        const fileStream = fs.createReadStream(tmpFilePath);

        const transcriptionText = await OpenAIService.speechToText(fileStream);

        // Clean up temp file
        if (fs.existsSync(tmpFilePath)) {
            fs.unlinkSync(tmpFilePath);
        }

        if (!transcriptionText) {
            throw new Error('Transcription failed: API returned empty response.');
        }

        return { transcription: transcriptionText };

    } catch (error: any) {
        console.error(`Error in transcribeAudio:`, error);
        throw new Error(`AI Transcription process failed: ${error.message || 'Unknown error during transcription.'}`);
    }
}
