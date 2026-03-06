/**
 * DevOps Guardian Agent (DGA)
 * Monitors the CI/CD pipeline (GitHub Actions) for build/deploy failures.
 * Subscribes to A2A bus events from other agents to coordinate autonomous repairs.
 * Logs all pipeline events to the centralized audit log.
 */
import { writeAuditLog } from '@/services/db/auditService';
import { publishA2AEvent, A2AEvent } from '@/ai-native/core/agentToAgentBus';

const GITHUB_API = 'https://api.github.com';
const GITHUB_OWNER = 'iChancetek';
const GITHUB_REPO = 'MediScribe';

interface WorkflowRun {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    html_url: string;
    created_at: string;
}

/**
 * Fetches recent GitHub Actions workflow runs and audits their status.
 */
export async function runDevOpsGuardianAgent(): Promise<void> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        await writeAuditLog({
            agent: 'DevOpsGuardianAgent',
            severity: 'WARNING',
            module: 'CI/CD',
            actionTaken: 'Skipped GitHub Actions scan — GITHUB_TOKEN not configured.',
        });
        return;
    }

    await writeAuditLog({
        agent: 'DevOpsGuardianAgent',
        severity: 'INFO',
        module: 'CI/CD',
        actionTaken: 'Checking CI/CD pipeline health via GitHub Actions API.',
    });

    try {
        const res = await fetch(
            `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=10`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                },
            }
        );

        if (!res.ok) {
            throw new Error(`GitHub API returned ${res.status}`);
        }

        const data = await res.json() as { workflow_runs: WorkflowRun[] };

        for (const run of data.workflow_runs) {
            if (run.status === 'completed' && run.conclusion === 'failure') {
                // Pipeline failed — broadcast to A2A bus
                await publishA2AEvent({
                    eventType: 'PIPELINE_FAILURE',
                    fromAgent: 'DevOpsGuardianAgent',
                    toAgent: 'ALL',
                    module: 'CI/CD',
                    payload: {
                        runId: run.id,
                        workflowName: run.name,
                        url: run.html_url,
                        createdAt: run.created_at,
                    },
                    severity: 'ERROR',
                    resolved: false,
                });

                await writeAuditLog({
                    agent: 'DevOpsGuardianAgent',
                    severity: 'ERROR',
                    module: 'CI/CD',
                    actionTaken: `Pipeline failure detected: "${run.name}" (Run #${run.id})`,
                    details: run.html_url,
                });
            } else if (run.status === 'completed' && run.conclusion === 'success') {
                await writeAuditLog({
                    agent: 'DevOpsGuardianAgent',
                    severity: 'INFO',
                    module: 'CI/CD',
                    actionTaken: `Pipeline success: "${run.name}" (Run #${run.id})`,
                });
            }
        }
    } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : String(err);
        await writeAuditLog({
            agent: 'DevOpsGuardianAgent',
            severity: 'ERROR',
            module: 'CI/CD',
            actionTaken: 'Failed to query GitHub Actions API.',
            details: errMessage,
        });
    }
}

/**
 * React to A2A bus events as the DevOps Guardian.
 * Called when another agent broadcasts an event relevant to infrastructure.
 */
export async function handleA2AEvent(event: A2AEvent): Promise<void> {
    if (event.eventType === 'MODULE_FAILURE_DETECTED') {
        await writeAuditLog({
            agent: 'DevOpsGuardianAgent',
            severity: 'WARNING',
            module: event.module,
            actionTaken: `Received A2A alert: module failure in ${event.module}. Monitoring for repeat failures.`,
            details: JSON.stringify(event.payload),
        });
    }
}
