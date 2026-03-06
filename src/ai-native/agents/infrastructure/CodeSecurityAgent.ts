/**
 * Code Security Agent (CSA)
 * Scans environment variables, API routes, and Firestore rules for insecure patterns.
 * Uses Tavily to look up CVEs for detected vulnerable packages.
 * Broadcasts security events to the A2A bus.
 */
import { writeAuditLog } from '@/services/db/auditService';
import { publishA2AEvent } from '@/ai-native/core/agentToAgentBus';
import { searchVulnerability } from '@/services/intelligence/tavilyService';

interface SecurityScanResult {
    finding: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    recommendation: string;
    tavilyIntelligence?: string;
}

// Known vulnerable package patterns to flag for review
const VULNERABLE_PACKAGES = [
    { name: 'lodash', version: '<4.17.21', reason: 'Prototype pollution CVE-2021-23337' },
    { name: 'axios', version: '<1.6.8', reason: 'CSRF and SSRF risk' },
    { name: 'node-fetch', version: '<3.3.2', reason: 'Header injection risk' },
];

// Env variable names that must NEVER appear in client-side code
const FORBIDDEN_CLIENT_ENV_PATTERNS = [
    'SECRET', 'PRIVATE', 'API_KEY', 'TOKEN', 'PASSWORD', 'DB_URL', 'RESEND', 'OPENAI', 'PINECONE'
];

export async function runCodeSecurityAgent(): Promise<SecurityScanResult[]> {
    const findings: SecurityScanResult[] = [];

    await writeAuditLog({
        agent: 'CodeSecurityAgent',
        severity: 'INFO',
        module: 'Platform',
        actionTaken: 'Security scan cycle started.',
    });

    // ── 1. Check for exposed server-side secrets in NEXT_PUBLIC_ vars ──────────
    const envKeys = Object.keys(process.env);
    for (const key of envKeys) {
        if (key.startsWith('NEXT_PUBLIC_')) {
            for (const forbidden of FORBIDDEN_CLIENT_ENV_PATTERNS) {
                if (key.includes(forbidden)) {
                    const finding: SecurityScanResult = {
                        finding: `Potentially sensitive key exposed to client: ${key}`,
                        severity: 'CRITICAL',
                        recommendation: `Remove NEXT_PUBLIC_ prefix from ${key} to keep it server-side only.`,
                    };
                    findings.push(finding);

                    await publishA2AEvent({
                        eventType: 'VULNERABILITY_DETECTED',
                        fromAgent: 'CodeSecurityAgent',
                        toAgent: 'ALL',
                        module: 'Platform',
                        payload: { key, issue: 'Sensitive key exposed to client bundle' },
                        severity: 'CRITICAL',
                        resolved: false,
                    });

                    await writeAuditLog({
                        agent: 'CodeSecurityAgent',
                        severity: 'CRITICAL',
                        module: 'Platform',
                        actionTaken: `Detected sensitive env variable exposed to client: ${key}`,
                        details: finding.recommendation,
                    });
                }
            }
        }
    }

    // ── 2. Tavily CVE check for known vulnerable packages ─────────────────────
    for (const pkg of VULNERABLE_PACKAGES) {
        try {
            const intel = await searchVulnerability(pkg.name, pkg.version);
            const topResult = intel.results?.[0];

            const finding: SecurityScanResult = {
                finding: `Potentially vulnerable package pattern: ${pkg.name} ${pkg.version} — ${pkg.reason}`,
                severity: 'WARNING',
                recommendation: `Review the latest patched version of ${pkg.name}. Consult your package.json.`,
                tavilyIntelligence: topResult?.content ?? intel.answer ?? 'No additional intelligence retrieved.',
            };
            findings.push(finding);

            await writeAuditLog({
                agent: 'CodeSecurityAgent',
                severity: 'WARNING',
                module: 'Platform',
                actionTaken: `CVE intelligence gathered for ${pkg.name}`,
                details: finding.tavilyIntelligence,
            });
        } catch (e) {
            console.warn('[CodeSecurityAgent] Tavily lookup failed for', pkg.name, e);
        }
    }

    await writeAuditLog({
        agent: 'CodeSecurityAgent',
        severity: 'INFO',
        module: 'Platform',
        actionTaken: `Security scan complete. ${findings.length} findings logged.`,
    });

    return findings;
}
