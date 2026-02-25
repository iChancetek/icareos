"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, BrainCircuit, ShieldCheck, TrendingUp, CreditCard, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { IScribe } from "@/types";

// ─── Risk color helpers ─────────────────────────────────────────────────────
const riskColors: Record<string, string> = {
    low: "bg-emerald-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
};
const riskBadge: Record<string, string> = {
    low: "bg-emerald-900/50 text-emerald-400 border-emerald-700",
    medium: "bg-yellow-900/50 text-yellow-400 border-yellow-700",
    high: "bg-orange-900/50 text-orange-400 border-orange-700",
    critical: "bg-red-900/50 text-red-400 border-red-700",
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    title,
    value,
    sub,
    color,
}: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    sub?: string;
    color: string;
}) {
    return (
        <Card className="bg-card/80 shadow-lg border border-border/60">
            <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-3">
                    <div className={cn("rounded-xl p-2.5", color)}>
                        <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">{title}</p>
                        <p className="text-2xl font-black tabular-nums">{value}</p>
                        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ConfidenceTrend({ sessions }: { sessions: IScribe[] }) {
    const recent = sessions.slice(-12);
    const max = 1;

    return (
        <Card className="bg-card/80 shadow-lg">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Agent Confidence Trend
                </CardTitle>
                <CardDescription>Last {recent.length} sessions</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
                <div className="flex items-end gap-1.5 h-24">
                    {recent.map((s, i) => {
                        const pct = Math.round((s.overallConfidence ?? 0.5) * 100);
                        const color =
                            pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                                <div
                                    className={cn("w-full rounded-t-sm transition-all duration-500", color)}
                                    style={{ height: `${pct}%` }}
                                />
                                {/* Tooltip */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover border rounded px-2 py-1 text-[10px] whitespace-nowrap z-10 shadow">
                                    {s.patientName} · {pct}%
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground mt-2">
                    <span>Oldest</span>
                    <span>Latest</span>
                </div>
            </CardContent>
        </Card>
    );
}

function RiskDistribution({ sessions }: { sessions: IScribe[] }) {
    const counts = useMemo(() => {
        const c = { low: 0, medium: 0, high: 0, critical: 0 };
        sessions.forEach((s) => {
            if (s.riskLevel) c[s.riskLevel] = (c[s.riskLevel] ?? 0) + 1;
        });
        return c;
    }, [sessions]);
    const total = sessions.filter((s) => s.riskLevel).length || 1;

    return (
        <Card className="bg-card/80 shadow-lg">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Risk Distribution
                </CardTitle>
                <CardDescription>{total} sessions with risk data</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-3">
                {(["critical", "high", "medium", "low"] as const).map((level) => {
                    const n = counts[level] ?? 0;
                    const pct = Math.round((n / total) * 100);
                    return (
                        <div key={level} className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="capitalize font-medium">{level}</span>
                                <span className="text-muted-foreground">{n} ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-700", riskColors[level])}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

function TopICDCodes({ sessions }: { sessions: IScribe[] }) {
    const codes = useMemo(() => {
        const freq: Record<string, { description: string; count: number }> = {};
        sessions.forEach((s) => {
            s.icdCodes?.forEach((c) => {
                if (!freq[c.code]) freq[c.code] = { description: c.description, count: 0 };
                freq[c.code].count++;
            });
        });
        return Object.entries(freq)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 8);
    }, [sessions]);
    const maxCount = codes[0]?.[1].count || 1;

    return (
        <Card className="bg-card/80 shadow-lg">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Top ICD-10 Codes
                </CardTitle>
                <CardDescription>Most frequently assigned across sessions</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-2.5">
                {codes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No ICD code data yet.<br />Complete a session to see billing analytics.</p>
                ) : (
                    codes.map(([code, data]) => (
                        <div key={code} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-primary">{code}</span>
                                    <span className="text-muted-foreground truncate max-w-[200px]">{data.description}</span>
                                </div>
                                <span className="shrink-0 text-muted-foreground ml-2">{data.count}×</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-primary transition-all duration-700"
                                    style={{ width: `${(data.count / maxCount) * 100}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function RecentSessionsTable({ sessions }: { sessions: IScribe[] }) {
    const recent = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

    return (
        <Card className="bg-card/80 shadow-lg">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    Recent Sessions
                </CardTitle>
                <CardDescription>Agent performance per session</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
                <div className="space-y-2">
                    {recent.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No sessions yet. Record your first iScribe to see analytics here.</p>
                    ) : recent.map((s) => {
                        const confPct = Math.round((s.overallConfidence ?? 0) * 100);
                        return (
                            <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{s.patientName}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {new Date(s.date).toLocaleDateString()} {s.specialty ? `· ${s.specialty}` : ''}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {s.riskLevel && (
                                        <Badge className={cn("text-[10px] border capitalize px-1.5 py-0", riskBadge[s.riskLevel])}>
                                            {s.riskLevel}
                                        </Badge>
                                    )}
                                    {s.requiresHumanReview && (
                                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" title="Review needed" />
                                    )}
                                    {s.overallConfidence != null && (
                                        <span className={cn("text-xs font-mono font-bold", confPct >= 80 ? "text-emerald-400" : confPct >= 60 ? "text-yellow-400" : "text-red-400")}>
                                            {confPct}%
                                        </span>
                                    )}
                                    {s.agentLatency_ms && (
                                        <span className="text-[10px] text-muted-foreground hidden sm:inline">{(s.agentLatency_ms / 1000).toFixed(1)}s</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Insights Page ───────────────────────────────────────────────────────────

export default function InsightsPage() {
    const { getUserIScribes } = useAuth();
    const [sessions, setSessions] = useState<IScribe[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getUserIScribes().then((data) => {
            setSessions(data);
            setIsLoading(false);
        });
    }, [getUserIScribes]);

    const agentSessions = useMemo(() => sessions.filter((s) => s.agentSessionId), [sessions]);
    const avgConfidence = useMemo(() => {
        const vals = agentSessions.filter((s) => s.overallConfidence != null).map((s) => s.overallConfidence!);
        return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) : 0;
    }, [agentSessions]);
    const reviewsNeeded = useMemo(() => agentSessions.filter((s) => s.requiresHumanReview).length, [agentSessions]);
    const avgLatency = useMemo(() => {
        const vals = agentSessions.filter((s) => s.agentLatency_ms).map((s) => s.agentLatency_ms!);
        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length / 1000).toFixed(1) : "—";
    }, [agentSessions]);
    const totalICDCodes = useMemo(() => agentSessions.reduce((t, s) => t + (s.icdCodes?.length ?? 0), 0), [agentSessions]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-7 w-7 text-primary" />
                    <h1 className="text-3xl font-black">Clinical Intelligence Insights</h1>
                </div>
                <p className="text-muted-foreground text-sm">
                    Aggregated analytics from your gpt-5.3-codex agent pipeline · {agentSessions.length} processed sessions
                </p>
            </div>

            {/* No agent sessions yet */}
            {agentSessions.length === 0 && (
                <Card className="bg-card/80 border-dashed border-2 border-primary/30">
                    <CardContent className="py-12 text-center space-y-3">
                        <BrainCircuit className="h-12 w-12 text-primary/50 mx-auto" />
                        <h2 className="text-lg font-semibold">No agent sessions yet</h2>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            Record and save a patient consultation through the iScribe page to see your
                            clinical intelligence analytics here. Each session runs through 6 AI agents
                            in parallel to generate SOAP notes, risk scores, billing codes, and more.
                        </p>
                    </CardContent>
                </Card>
            )}

            {agentSessions.length > 0 && (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            icon={BrainCircuit}
                            title="Avg. Confidence"
                            value={`${avgConfidence}%`}
                            sub="Across all agents"
                            color="bg-primary"
                        />
                        <StatCard
                            icon={Activity}
                            title="Sessions Processed"
                            value={agentSessions.length}
                            sub={`${sessions.length} total iScribes`}
                            color="bg-blue-600"
                        />
                        <StatCard
                            icon={AlertTriangle}
                            title="Reviews Needed"
                            value={reviewsNeeded}
                            sub="Clinician review flagged"
                            color={reviewsNeeded > 0 ? "bg-yellow-600" : "bg-emerald-600"}
                        />
                        <StatCard
                            icon={CheckCircle2}
                            title="Avg. Processing"
                            value={`${avgLatency}s`}
                            sub={`${totalICDCodes} ICD codes assigned`}
                            color="bg-violet-600"
                        />
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        <ConfidenceTrend sessions={agentSessions} />
                        <RiskDistribution sessions={agentSessions} />
                        <TopICDCodes sessions={agentSessions} />
                    </div>

                    {/* Recent Sessions Table */}
                    <RecentSessionsTable sessions={agentSessions} />

                    {/* Model Info Banner */}
                    <div className="flex items-center justify-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 py-4 px-6 text-sm text-muted-foreground">
                        <BrainCircuit className="h-4 w-4 text-primary shrink-0" />
                        <span>
                            Powered by <strong className="text-foreground">gpt-5.3-codex</strong> ·
                            6-agent parallel pipeline: Transcription → NLP → SOAP → Risk → Billing → Compliance ·
                            All data stored securely in Firestore
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}
