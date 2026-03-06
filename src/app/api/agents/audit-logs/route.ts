import { NextResponse } from 'next/server';
import { getRecentAuditLogs, getAuditLogsBySeverity } from '@/services/db/auditService';
import { getRecentA2AEvents } from '@/ai-native/core/agentToAgentBus';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') ?? 'all';
    const severity = searchParams.get('severity');

    if (type === 'a2a') {
        const events = await getRecentA2AEvents(50);
        return NextResponse.json({ events });
    }

    if (severity) {
        const logs = await getAuditLogsBySeverity(
            severity as 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL',
            100
        );
        return NextResponse.json({ logs });
    }

    const logs = await getRecentAuditLogs(100);
    return NextResponse.json({ logs });
}
