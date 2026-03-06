import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({ status: 'ok', modules: ['WoundIQ', 'RadiologyIQ'], timestamp: Date.now() });
}
