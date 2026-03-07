import { NextRequest, NextResponse } from 'next/server';
import { dataIQAgent } from '@/agents/dataIQAgent';
import type { DataIQSignalPayload } from '@/types/agents';

/**
 * POST /api/agents/dataiq
 *
 * Accepts a multi-module signal payload, runs DataIQ cross-module analysis,
 * persists results to Firestore, and returns the DataIQResult.
 *
 * Body:
 * {
 *   patientContext: string,        // e.g. "patient_12345"
 *   signals: DataIQSignalPayload[] // signals from one or more modules
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { patientContext, signals } = body as {
            patientContext: string;
            signals: DataIQSignalPayload[];
        };

        if (!patientContext || typeof patientContext !== 'string') {
            return NextResponse.json({ error: 'patientContext is required.' }, { status: 400 });
        }

        if (!Array.isArray(signals) || signals.length === 0) {
            return NextResponse.json({ error: 'At least one signal is required.' }, { status: 400 });
        }

        const result = await dataIQAgent.aggregateSignals(patientContext, signals);

        return NextResponse.json(result, { status: 200 });
    } catch (error: any) {
        console.error('[DataIQ API] Error:', error);
        return NextResponse.json(
            { error: 'DataIQ analysis failed.', details: error.message },
            { status: 500 }
        );
    }
}
