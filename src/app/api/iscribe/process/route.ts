import { runOrchestratorAgent } from '@/agents/orchestratorAgent';
import type { OnPipelineUpdate } from '@/agents/orchestratorAgent';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120; // 2 minutes for the full pipeline

/**
 * POST /api/iscribe/process
 *
 * Accepts: { audioDataUri, specialty?, language?, patientContext? }
 * Returns:  Server-Sent Events stream
 *
 *   event: pipeline_update
 *   data: { step, status, confidence?, latency_ms?, error? }
 *
 *   event: complete
 *   data: <ClinicalSession JSON>
 *
 *   event: error
 *   data: { message: string }
 */
export async function POST(req: NextRequest) {
    let audioDataUri: string;
    let specialty: string | undefined;
    let language: string | undefined;
    let patientContext: string | undefined;

    try {
        const body = await req.json();
        audioDataUri = body.audioDataUri;
        specialty = body.specialty;
        language = body.language;
        patientContext = body.patientContext;

        if (!audioDataUri || typeof audioDataUri !== 'string') {
            return new Response(JSON.stringify({ message: 'audioDataUri is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch {
        return new Response(JSON.stringify({ message: 'Invalid request body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // ── SSE Stream ────────────────────────────────────────────────────────────
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const send = (eventName: string, data: unknown) => {
                try {
                    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(payload));
                } catch {
                    // controller may already be closed
                }
            };

            const onUpdate: OnPipelineUpdate = (update) => {
                send('pipeline_update', update);
            };

            try {
                const session = await runOrchestratorAgent(
                    { audioDataUri, specialty, language, patientContext },
                    onUpdate,
                );
                send('complete', session);
            } catch (err: any) {
                send('error', { message: err?.message ?? 'Pipeline failed' });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
