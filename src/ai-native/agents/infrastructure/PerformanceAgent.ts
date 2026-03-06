/**
 * AI Infrastructure Performance Agent (IPA)
 * Monitors system-level performance metrics: CPU, memory, API latency.
 * Subscribes to PERFORMANCE_DEGRADATION events from the A2A bus.
 * Logs all findings to the centralized audit log.
 */
import { writeAuditLog } from '@/services/db/auditService';
import { publishA2AEvent, A2AEvent } from '@/ai-native/core/agentToAgentBus';

interface PerformanceReport {
    timestamp: string;
    apiLatencies: Record<string, number>;
    warnings: string[];
}

const API_PERFORMANCE_THRESHOLDS_MS = {
    '/api/ai-native/analyze-image': 8000,
    '/api/transcribe': 5000,
    '/api/contact': 2000,
    '/api/health': 500,
};

export async function runPerformanceAgent(): Promise<PerformanceReport> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000';
    const report: PerformanceReport = {
        timestamp: new Date().toISOString(),
        apiLatencies: {},
        warnings: [],
    };

    await writeAuditLog({
        agent: 'PerformanceAgent',
        severity: 'INFO',
        module: 'Platform',
        actionTaken: 'Performance monitoring cycle started.',
    });

    for (const [route, threshold] of Object.entries(API_PERFORMANCE_THRESHOLDS_MS)) {
        const start = Date.now();
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), threshold + 2000);
            await fetch(`${baseUrl}${route}`, {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store',
            });
            clearTimeout(timeout);

            const latency = Date.now() - start;
            report.apiLatencies[route] = latency;

            if (latency > threshold) {
                const warning = `API ${route} exceeded threshold: ${latency}ms > ${threshold}ms`;
                report.warnings.push(warning);

                await publishA2AEvent({
                    eventType: 'PERFORMANCE_DEGRADATION',
                    fromAgent: 'PerformanceAgent',
                    toAgent: 'ALL',
                    module: 'Platform',
                    payload: { route, latency_ms: latency, threshold_ms: threshold },
                    severity: 'WARNING',
                    resolved: false,
                });

                await writeAuditLog({
                    agent: 'PerformanceAgent',
                    severity: 'WARNING',
                    module: 'Platform',
                    actionTaken: warning,
                });
            }
        } catch {
            report.apiLatencies[route] = -1;
            report.warnings.push(`Failed to reach ${route}`);
        }
    }

    await writeAuditLog({
        agent: 'PerformanceAgent',
        severity: 'INFO',
        module: 'Platform',
        actionTaken: `Performance cycle complete. ${report.warnings.length} warning(s) detected.`,
        details: JSON.stringify(report.apiLatencies),
    });

    return report;
}

/**
 * React to PERFORMANCE_DEGRADATION events from the A2A bus.
 */
export async function handleA2AEvent(event: A2AEvent): Promise<void> {
    if (event.eventType === 'PERFORMANCE_DEGRADATION') {
        await writeAuditLog({
            agent: 'PerformanceAgent',
            severity: 'WARNING',
            module: event.module,
            actionTaken: `Cross-agent performance alert received for ${event.module}.`,
            details: JSON.stringify(event.payload),
        });
    }
}
