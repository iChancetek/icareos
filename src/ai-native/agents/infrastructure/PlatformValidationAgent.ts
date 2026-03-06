/**
 * Platform Validation Agent (PVA)
 * Continuously checks the health of all 8 iCareOS modules.
 * Detects module failures, API timeouts, and DB connectivity issues.
 * Broadcasts failures to the A2A bus and logs actions to the audit log.
 */
import { writeAuditLog } from '@/services/db/auditService';
import { publishA2AEvent } from '@/ai-native/core/agentToAgentBus';
import { AuditModule } from '@/services/db/auditService';

const MODULES: { name: AuditModule; route: string }[] = [
    { name: 'MediScribe', route: '/api/health/iscribe' },
    { name: 'Insight', route: '/api/health/insights' },
    { name: 'WoundIQ', route: '/api/health/cds' },
    { name: 'RadiologyIQ', route: '/api/health/cds' },
    { name: 'iSkylar', route: '/api/health/iskylar' },
    { name: 'BillingIQ', route: '/api/health/billingiq' },
    { name: 'RiskIQ', route: '/api/health/riskiq' },
    { name: 'CareCoordIQ', route: '/api/health/carecoordiq' },
];

const TIMEOUT_MS = 5000;
const SLOW_RESPONSE_MS = 2000;

interface ModuleHealthResult {
    module: AuditModule;
    status: 'OK' | 'SLOW' | 'FAILED';
    latency_ms: number;
    error?: string;
}

export async function runPlatformValidationAgent(): Promise<ModuleHealthResult[]> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const results: ModuleHealthResult[] = [];

    await writeAuditLog({
        agent: 'PlatformValidationAgent',
        severity: 'INFO',
        module: 'Platform',
        actionTaken: 'Health check cycle started for all 8 iCareOS modules.',
    });

    for (const mod of MODULES) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
            const res = await fetch(`${baseUrl}${mod.route}`, {
                signal: controller.signal,
                cache: 'no-store',
            });
            clearTimeout(timeout);
            const latency = Date.now() - start;

            if (!res.ok) {
                // Module returned a non-2xx HTTP response
                await publishA2AEvent({
                    eventType: 'MODULE_FAILURE_DETECTED',
                    fromAgent: 'PlatformValidationAgent',
                    toAgent: 'DevOpsGuardianAgent',
                    module: mod.name,
                    payload: { status: res.status, latency_ms: latency },
                    severity: 'ERROR',
                    resolved: false,
                });
                await writeAuditLog({
                    agent: 'PlatformValidationAgent',
                    severity: 'ERROR',
                    module: mod.name,
                    actionTaken: `Module health check failed. HTTP ${res.status}`,
                    details: `Latency: ${latency}ms`,
                });
                results.push({ module: mod.name, status: 'FAILED', latency_ms: latency, error: `HTTP ${res.status}` });
            } else if (latency > SLOW_RESPONSE_MS) {
                // Slow response time warning
                await publishA2AEvent({
                    eventType: 'PERFORMANCE_DEGRADATION',
                    fromAgent: 'PlatformValidationAgent',
                    toAgent: 'PerformanceAgent',
                    module: mod.name,
                    payload: { latency_ms: latency },
                    severity: 'WARNING',
                    resolved: false,
                });
                results.push({ module: mod.name, status: 'SLOW', latency_ms: latency });
            } else {
                results.push({ module: mod.name, status: 'OK', latency_ms: latency });
            }
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : String(err);
            await writeAuditLog({
                agent: 'PlatformValidationAgent',
                severity: 'CRITICAL',
                module: mod.name,
                actionTaken: 'Module unreachable — may be offline or crashed.',
                details: errMessage,
            });
            results.push({ module: mod.name, status: 'FAILED', latency_ms: -1, error: errMessage });
        }
    }

    await writeAuditLog({
        agent: 'PlatformValidationAgent',
        severity: 'INFO',
        module: 'Platform',
        actionTaken: `Health check cycle complete. ${results.filter(r => r.status === 'OK').length}/${results.length} modules healthy.`,
    });

    return results;
}
