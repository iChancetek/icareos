import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: 'ok', module: 'BillingIQ', timestamp: Date.now() });
}
