"use client";

import React from "react";
import type { ClinicalSession, RiskLevel } from "@/types/agents";
import { cn } from "@/lib/utils";

interface AIIntelligencePanelProps {
    session: ClinicalSession;
    className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const riskColors: Record<RiskLevel, string> = {
    low: "text-emerald-400 bg-emerald-950 border-emerald-700",
    medium: "text-yellow-400 bg-yellow-950 border-yellow-700",
    high: "text-orange-400 bg-orange-950 border-orange-700",
    critical: "text-red-400 bg-red-950 border-red-700 animate-pulse",
};

const riskIcons: Record<RiskLevel, string> = {
    low: "🟢",
    medium: "🟡",
    high: "🟠",
    critical: "🔴",
};

function ConfidenceBar({ value, label }: { value: number; label: string }) {
    const pct = Math.round(value * 100);
    const color =
        pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
    return (
        <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{label}</span>
                <span className="font-mono font-semibold">{pct}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-700", color)}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function AgentBadge({
    name,
    latency,
    confidence,
}: {
    name: string;
    latency: number;
    confidence: number;
}) {
    const shortName = name.replace("Agent", "");
    return (
        <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs">
            <span className="font-medium text-foreground">{shortName}</span>
            <div className="flex items-center gap-2 text-muted-foreground">
                <span>{Math.round(confidence * 100)}%</span>
                <span>·</span>
                <span>{latency}ms</span>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIIntelligencePanel({ session, className }: AIIntelligencePanelProps) {
    const { meta, transcription, nlp, soap, risk, billing, compliance } = session;
    const overallPct = Math.round(meta.overallConfidence * 100);

    return (
        <div
            className={cn(
                "rounded-2xl border border-border bg-card text-card-foreground shadow-xl overflow-hidden",
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-primary/5 px-5 py-4 border-b border-border">
                <div>
                    <h2 className="text-base font-semibold tracking-tight">⚡ AI Intelligence Report</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">gpt-5.3-codex · {meta.agentsRun.length} agents · {(meta.totalLatency_ms / 1000).toFixed(1)}s</p>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-2xl font-bold tabular-nums">{overallPct}%</span>
                    <span className="text-xs text-muted-foreground">Overall Confidence</span>
                </div>
            </div>

            <div className="p-5 space-y-5">

                {/* Human Review Alert */}
                {meta.requiresHumanReview && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-yellow-700 bg-yellow-950/50 p-3 text-sm text-yellow-300">
                        <span className="text-base mt-0.5">⚠️</span>
                        <p>
                            <strong>Clinician review recommended.</strong> One or more agents flagged this session for low
                            confidence or high risk.
                        </p>
                    </div>
                )}

                {/* Risk Score */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Risk Assessment</h3>
                    <div className={cn("flex items-center justify-between rounded-lg border px-4 py-3", riskColors[risk.riskLevel])}>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{riskIcons[risk.riskLevel]}</span>
                            <span className="font-bold capitalize text-sm">{risk.riskLevel} Risk</span>
                        </div>
                        <span className="text-2xl font-black tabular-nums">{risk.riskScore}</span>
                    </div>
                    {risk.riskFactors.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {risk.riskFactors.slice(0, 3).map((f, i) => (
                                <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className={f.severity === 'high' ? 'text-orange-400' : f.severity === 'medium' ? 'text-yellow-400' : 'text-emerald-400'}>●</span>
                                    {f.factor}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Confidence Scores */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Agent Confidence</h3>
                    <div className="space-y-2">
                        <ConfidenceBar value={transcription.meta.confidence} label="Transcription" />
                        <ConfidenceBar value={nlp.meta.confidence} label="NLP / Entity Extraction" />
                        <ConfidenceBar value={soap.meta.confidence} label="SOAP Generation" />
                        <ConfidenceBar value={billing.meta.confidence} label="Billing Optimization" />
                        <ConfidenceBar value={compliance.meta.confidence} label="Compliance Check" />
                    </div>
                </div>

                {/* ICD Codes */}
                {billing.icdCodes.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">ICD-10 Codes</h3>
                        <div className="space-y-1.5">
                            {billing.icdCodes.slice(0, 4).map((code, i) => (
                                <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("font-mono font-bold", code.type === 'primary' ? 'text-primary' : 'text-muted-foreground')}>
                                            {code.code}
                                        </span>
                                        <span className="text-muted-foreground truncate max-w-[180px]">{code.description}</span>
                                    </div>
                                    <span className="text-muted-foreground shrink-0">{Math.round(code.confidence * 100)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Compliance */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Compliance</h3>
                    <div className={cn(
                        "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium",
                        compliance.passed
                            ? "border-emerald-700 bg-emerald-950/40 text-emerald-400"
                            : "border-red-700 bg-red-950/40 text-red-400"
                    )}>
                        <span>{compliance.passed ? "✅ All Checks Passed" : "🚨 Compliance Issues Found"}</span>
                    </div>
                    {!compliance.passed && (
                        <ul className="mt-2 space-y-1">
                            {compliance.checks
                                .filter(c => !c.passed)
                                .slice(0, 3)
                                .map((c, i) => (
                                    <li key={i} className="text-xs text-red-400">• {c.checkName}: {c.message}</li>
                                ))}
                        </ul>
                    )}
                </div>

                {/* Agent Map */}
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Agent Performance</h3>
                    <div className="space-y-1.5">
                        {[transcription, nlp, soap, risk, billing, compliance].map((r) => (
                            <AgentBadge
                                key={r.meta.agentName}
                                name={r.meta.agentName}
                                latency={r.meta.latency_ms}
                                confidence={r.meta.confidence}
                            />
                        ))}
                    </div>
                </div>

                {/* Session ID */}
                <p className="text-center text-[10px] text-muted-foreground/50 font-mono pt-1">
                    {meta.sessionId}
                </p>
            </div>
        </div>
    );
}
