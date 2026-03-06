import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: 'ok', module: 'Insights', timestamp: Date.now() });
}
