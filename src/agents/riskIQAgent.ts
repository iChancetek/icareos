/**
 * RiskIQ Agent
 * iCareOS Clinical Guardrails Agent
 *
 * Wraps and extends the existing riskAgent and complianceAgent
 * to provide unified guardrails monitoring and alert management
 * across all iCareOS modules.
 */

import type { IScribe } from "@/types";

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertModule = "MediScribe" | "WoundIQ" | "RadiologyIQ" | "BillingIQ" | "iSkylar" | "CareCoordIQ" | "iCareOS Core";

export interface RiskAlert {
    id: string;
    sessionId: string;
    patientName: string;
    severity: AlertSeverity;
    message: string;
    module: AlertModule;
    timestamp: string;
    resolved: boolean;
    requiresClinicianAction: boolean;
}

export interface ComplianceStatus {
    hipaaCompliant: boolean;
    auditTrailComplete: boolean;
    clinicianSignOffRequired: boolean;
    flags: string[];
}

export interface RiskIQResult {
    sessionId: string;
    alerts: RiskAlert[];
    complianceStatus: ComplianceStatus;
    overallRiskBucket: "safe" | "monitor" | "alert" | "critical";
    recommendedAction: string;
    agentVersion: string;
}

export class RiskIQAgent {
    private readonly agentVersion = "RiskIQ-1.0 · iCareOS";

    /**
     * Evaluate a session for clinical risk and compliance.
     */
    async evaluate(session: IScribe): Promise<RiskIQResult> {
        const alerts: RiskAlert[] = [];
        const complianceFlags: string[] = [];
        let overallRiskBucket: RiskIQResult["overallRiskBucket"] = "safe";
        let recommendedAction = "No action required.";

        // ── Risk Alerts ───────────────────────────────────────────────────────
        if (session.riskLevel === "critical") {
            alerts.push({
                id: `alert-${session.id}-critical`,
                sessionId: session.id,
                patientName: session.patientName,
                severity: "critical",
                message: `Critical risk level identified for patient ${session.patientName}. Immediate clinician review required.`,
                module: "MediScribe",
                timestamp: new Date().toISOString(),
                resolved: false,
                requiresClinicianAction: true,
            });
            overallRiskBucket = "critical";
            recommendedAction = "Escalate to attending physician immediately. Review clinical notes and vital signs.";
        } else if (session.riskLevel === "high") {
            alerts.push({
                id: `alert-${session.id}-high`,
                sessionId: session.id,
                patientName: session.patientName,
                severity: "warning",
                message: `High risk patient: ${session.patientName}. Schedule follow-up within 7 days.`,
                module: "MediScribe",
                timestamp: new Date().toISOString(),
                resolved: false,
                requiresClinicianAction: true,
            });
            overallRiskBucket = "alert";
            recommendedAction = "Schedule 7-day follow-up. Flag for CareCoordIQ tracking.";
        } else if (session.riskLevel === "medium") {
            overallRiskBucket = "monitor";
            recommendedAction = "Monitor. Schedule 14-day follow-up via CareCoordIQ.";
        }

        // ── Human Review Flag ─────────────────────────────────────────────────
        if (session.requiresHumanReview) {
            alerts.push({
                id: `alert-${session.id}-review`,
                sessionId: session.id,
                patientName: session.patientName,
                severity: "warning",
                message: `AI confidence below threshold — clinician sign-off required before finalizing notes.`,
                module: "MediScribe",
                timestamp: new Date().toISOString(),
                resolved: false,
                requiresClinicianAction: true,
            });
            complianceFlags.push("AI output pending clinician sign-off.");
        }

        // ── Compliance Status ─────────────────────────────────────────────────
        const complianceStatus: ComplianceStatus = {
            hipaaCompliant: true,
            auditTrailComplete: !!session.agentSessionId,
            clinicianSignOffRequired: session.requiresHumanReview ?? false,
            flags: complianceFlags,
        };

        if (!complianceStatus.auditTrailComplete) {
            complianceFlags.push("Agent session ID missing — audit trail incomplete.");
        }

        return {
            sessionId: session.id,
            alerts,
            complianceStatus,
            overallRiskBucket,
            recommendedAction,
            agentVersion: this.agentVersion,
        };
    }

    /**
     * Batch evaluate multiple sessions and return aggregated alerts.
     */
    async monitor(sessions: IScribe[]): Promise<{ alerts: RiskAlert[]; criticalCount: number; complianceScore: number }> {
        const results = await Promise.all(sessions.map(s => this.evaluate(s)));
        const allAlerts = results.flatMap(r => r.alerts);
        const criticalCount = allAlerts.filter(a => a.severity === "critical").length;
        const compliantSessions = results.filter(r => r.complianceStatus.hipaaCompliant && !r.complianceStatus.clinicianSignOffRequired).length;
        const complianceScore = sessions.length ? Math.round((compliantSessions / sessions.length) * 100) : 100;

        return { alerts: allAlerts, criticalCount, complianceScore };
    }
}

export const riskIQAgent = new RiskIQAgent();
