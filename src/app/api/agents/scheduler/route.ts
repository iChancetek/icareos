import { NextResponse } from 'next/server';
import { runPlatformValidationAgent } from '@/ai-native/agents/infrastructure/PlatformValidationAgent';
import { runCodeSecurityAgent } from '@/ai-native/agents/infrastructure/CodeSecurityAgent';
import { runDevOpsGuardianAgent } from '@/ai-native/agents/infrastructure/DevOpsGuardianAgent';
import { runPerformanceAgent } from '@/ai-native/agents/infrastructure/PerformanceAgent';
import { runComplianceAgent } from '@/ai-native/agents/infrastructure/ComplianceAgent';
import { writeAuditLog } from '@/services/db/auditService';

// Protect this endpoint with a shared secret
// Set AGENT_SCHEDULER_SECRET in your environment variables
const AGENT_SCHEDULER_SECRET = process.env.AGENT_SCHEDULER_SECRET;

export async function POST(req: Request) {
    // Verify caller is the scheduler (cron job, GitHub Actions, or Vercel cron)
    const authHeader = req.headers.get('Authorization');
    if (AGENT_SCHEDULER_SECRET && authHeader !== `Bearer ${AGENT_SCHEDULER_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agent } = await req.json() as { agent?: string };

    await writeAuditLog({
        agent: 'System',
        severity: 'INFO',
        module: 'Platform',
        actionTaken: `Agent scheduler invoked. Target: ${agent ?? 'ALL'}`,
    });

    const results: Record<string, unknown> = {};

    try {
        if (!agent || agent === 'PlatformValidationAgent' || agent === 'ALL') {
            results.PlatformValidationAgent = await runPlatformValidationAgent();
        }

        if (!agent || agent === 'CodeSecurityAgent' || agent === 'ALL') {
            results.CodeSecurityAgent = await runCodeSecurityAgent();
        }

        if (!agent || agent === 'DevOpsGuardianAgent' || agent === 'ALL') {
            await runDevOpsGuardianAgent();
            results.DevOpsGuardianAgent = 'completed';
        }

        if (!agent || agent === 'PerformanceAgent' || agent === 'ALL') {
            results.PerformanceAgent = await runPerformanceAgent();
        }

        if (!agent || agent === 'ComplianceAgent' || agent === 'ALL') {
            results.ComplianceAgent = await runComplianceAgent();
        }

        return NextResponse.json({ success: true, results }, { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        await writeAuditLog({
            agent: 'System',
            severity: 'ERROR',
            module: 'Platform',
            actionTaken: 'Agent scheduler encountered an error.',
            details: message,
        });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'iCareOS Agent Scheduler is active. POST to trigger agents.' });
}
