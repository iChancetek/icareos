import { NextRequest, NextResponse } from 'next/server';
import { processClinicialSession } from '@/services/agentService';
import type { OrchestratorInput } from '@/types/agents';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json() as OrchestratorInput;

        if (!body.audioDataUri && !body.transcript) {
            return NextResponse.json(
                { error: 'Either audioDataUri or transcript must be provided.' },
                { status: 400 }
            );
        }

        const session = await processClinicialSession(body);
        return NextResponse.json(session, { status: 200 });
    } catch (error: any) {
        console.error('[API /api/agents/process] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
