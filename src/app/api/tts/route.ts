import { NextResponse } from 'next/server';
import { OpenAIService } from '@/services/openaiService';

export async function POST(req: Request) {
    try {
        const { text, lang } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        // Map the incoming language to an OpenAI voice
        // Voices: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'
        let voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'alloy';

        switch (lang) {
            case 'Spanish': voice = 'echo'; break;
            case 'French': voice = 'fable'; break;
            case 'German': voice = 'onyx'; break;
            case 'Chinese':
            case 'Mandarin': voice = 'nova'; break;
            case 'Hebrew': voice = 'shimmer'; break;
            case 'Arabic': voice = 'echo'; break;
            default: voice = 'alloy'; break; // English or default
        }

        const audioBuffer = await OpenAIService.textToSpeech(text, voice);

        return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="tts.mp3"',
            },
        });
    } catch (error: any) {
        console.error('TTS API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate speech' },
            { status: 500 }
        );
    }
}
