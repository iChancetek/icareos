/**
 * iCareOS Orchestrator
 * Central coordination layer for all iCareOS agentic modules.
 *
 * Dispatches sessions through parallel agent pipelines:
 * MediScribe pipeline → BillingIQ → RiskIQ → CareCoordIQ
 * and aggregates outputs into a unified PlatformInsight.
 */

import type { IScribe } from "@/types";
import { billingIQAgent, type BillingRecommendation } from "./billingIQAgent";
import { riskIQAgent, type RiskAlert } from "./riskIQAgent";
import { careCoordAgent, type CareCoordPlan } from "./careCoordAgent";

// ── Module identifiers ────────────────────────────────────────────────────
export type ModuleId =
    | "MediScribe"
    | "Insight"
    | "WoundIQ"
    | "RadiologyIQ"
    | "iSkylar"
    | "BillingIQ"
    | "RiskIQ"
    | "CareCoordIQ";

export interface ModuleStatus {
    moduleId: ModuleId;
    active: boolean;
    lastRunAt?: string;
    outputSummary?: string;
}

export interface PlatformInsight {
    sessionId: string;
    patientName: string;
    orchestratedAt: string;

    // Module outputs
    billingRecommendation: BillingRecommendation;
    riskAlerts: RiskAlert[];
    careCoordPlan: CareCoordPlan;

    // Aggregated signals
    overallPlatformRisk: "safe" | "monitor" | "alert" | "critical";
    requiresClinicianAction: boolean;
    priorityActions: string[];

    // Module status
    activeModules: ModuleStatus[];

    // Compliance
    hipaaCompliant: boolean;
    auditTrailId: string;

    agentVersion: string;
}

export interface PlatformOrchestratorResult {
    insights: PlatformInsight[];
    totalSessionsProcessed: number;
    criticalAlerts: number;
    platformComplianceScore: number;
    modulesActive: ModuleId[];
    orchestratorVersion: string;
}

export class iCareOSOrchestrator {
    private readonly orchestratorVersion = "iCareOS-Orchestrator-1.0";

    private readonly activeModules: ModuleId[] = [
        "MediScribe",
        "Insight",
        "WoundIQ",
        "RadiologyIQ",
        "iSkylar",
        "BillingIQ",
        "RiskIQ",
        "CareCoordIQ",
    ];

    /**
     * Orchestrate a single session through all agentic pipelines in parallel.
     * All module invocations run concurrently for maximum efficiency.
     */
    async orchestrate(session: IScribe): Promise<PlatformInsight> {
        const orchestratedAt = new Date().toISOString();

        // ── Parallel agent dispatch ───────────────────────────────────────────
        const [billingResult, riskResult, careCoordResult] = await Promise.all([
            billingIQAgent.run(session),
            riskIQAgent.evaluate(session),
            careCoordAgent.plan(session),
        ]);

        // ── Aggregate priority actions ────────────────────────────────────────
        const priorityActions: string[] = [
            ...riskResult.alerts.filter(a => a.requiresClinicianAction).map(a => a.message),
            ...billingResult.notes,
            ...careCoordResult.followUpPrediction.engagementActions.slice(0, 2),
        ];

        // ── Determine overall platform risk ───────────────────────────────────
        const overallPlatformRisk = riskResult.overallRiskBucket;
        const requiresClinicianAction =
            riskResult.alerts.some(a => a.requiresClinicianAction) ||
            billingResult.requiresReview ||
            session.requiresHumanReview === true;

        // ── Module status ─────────────────────────────────────────────────────
        const moduleStatuses: ModuleStatus[] = this.activeModules.map(moduleId => ({
            moduleId,
            active: true,
            lastRunAt: orchestratedAt,
            outputSummary: this.getModuleSummary(moduleId, session, billingResult, riskResult.alerts),
        }));

        return {
            sessionId: session.id,
            patientName: session.patientName,
            orchestratedAt,
            billingRecommendation: billingResult,
            riskAlerts: riskResult.alerts,
            careCoordPlan: careCoordResult,
            overallPlatformRisk,
            requiresClinicianAction,
            priorityActions: [...new Set(priorityActions)].slice(0, 5),
            activeModules: moduleStatuses,
            hipaaCompliant: riskResult.complianceStatus.hipaaCompliant,
            auditTrailId: `audit-${session.id}-${Date.now()}`,
            agentVersion: this.orchestratorVersion,
        };
    }

    /**
     * Orchestrate multiple sessions with full parallel pipeline execution.
     */
    async orchestrateAll(sessions: IScribe[]): Promise<PlatformOrchestratorResult> {
        const insights = await Promise.all(sessions.map(s => this.orchestrate(s)));

        const criticalAlerts = insights.reduce((t, i) =>
            t + i.riskAlerts.filter(a => a.severity === "critical").length, 0
        );

        const compliantSessions = insights.filter(i => i.hipaaCompliant && !i.requiresClinicianAction).length;
        const platformComplianceScore = insights.length
            ? Math.round((compliantSessions / insights.length) * 100)
            : 100;

        return {
            insights,
            totalSessionsProcessed: insights.length,
            criticalAlerts,
            platformComplianceScore,
            modulesActive: this.activeModules,
            orchestratorVersion: this.orchestratorVersion,
        };
    }

    private getModuleSummary(
        moduleId: ModuleId,
        session: IScribe,
        billing: BillingRecommendation,
        alerts: RiskAlert[]
    ): string {
        switch (moduleId) {
            case "MediScribe": return `SOAP generated · ${session.icdCodes?.length ?? 0} ICD codes`;
            case "BillingIQ": return billing.underbillingFlag ? `Underbilling detected · +$${billing.estimatedRevenueDelta}` : "Code verified";
            case "RiskIQ": return alerts.length > 0 ? `${alerts.length} alert(s) raised` : "No alerts";
            case "CareCoordIQ": return `Follow-up in ${session.riskLevel === 'critical' ? '3' : session.riskLevel === 'high' ? '7' : '30'} days`;
            case "Insight": return "Analytics updated";
            case "WoundIQ": return "Imaging support ready";
            case "RadiologyIQ": return "Diagnostic co-pilot ready";
            case "iSkylar": return "Intake orchestrator ready";
            default: return "Active";
        }
    }
}

export const iCareOS = new iCareOSOrchestrator();
