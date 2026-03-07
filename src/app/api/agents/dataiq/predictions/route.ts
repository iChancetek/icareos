import { NextResponse } from 'next/server';
import { getRecentPredictions, getRecentA2AMessages } from '@/services/dataIQService';

/**
 * GET /api/agents/dataiq/predictions
 *
 * Returns the most recent DataIQ predictions and A2A messages
 * for the DataIQ dashboard feed.
 */
export async function GET() {
    try {
        const [predictions, messages] = await Promise.all([
            getRecentPredictions(20),
            getRecentA2AMessages(30),
        ]);

        return NextResponse.json({ predictions, messages }, { status: 200 });
    } catch (error: any) {
        console.error('[DataIQ Predictions API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch DataIQ predictions.', details: error.message },
            { status: 500 }
        );
    }
}
