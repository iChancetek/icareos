"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    RadialBarChart, RadialBar, Legend, BarChart, Bar, CartesianGrid, Cell,
} from "recharts";
import {
    BrainCircuit, Activity, AlertTriangle, CheckCircle2, TrendingUp,
    CreditCard, ShieldCheck, Loader2, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StaggerList, FadeUpItem } from "@/components/ui/MotionCard";
import { NeuralBadge } from "@/components/ui/NeuralBadge";
import { format } from "date-fns";
import type { IScribe } from "@/types";
import { Badge } from "@/components/ui/badge";

const riskBadge: Record<string, string> = {
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/25",
    critical: "bg-red-500/10 text-red-400 border-red-500/25",
};

const RISK_COLORS: Record<string, string> = {
    low: "hsl(151 55% 52%)",
    medium: "hsl(38 92% 60%)",
    high: "hsl(25 88% 58%)",
    critical: "hsl(0 72% 50%)",
};

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <div className="h-7 w-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{label}</h2>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, sub, delay }: {
    icon: React.ElementType; label: string; value: string | number; sub?: string; delay: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            whileHover={{ y: -2 }}
            className="glass neural-border rounded-2xl p-5"
        >
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="h-4.5 w-4.5 text-primary" style={{ height: "1.125rem", width: "1.125rem" }} />
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="text-xl font-black tabular-nums">{value}</p>
                    {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
                </div>
            </div>
        </motion.div>
    );
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass rounded-xl border border-primary/20 px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold text-foreground mb-1">{label}</p>
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color }} className="tabular-nums">{p.name}: {typeof p.value === 'number' && p.value <= 1 ? `${Math.round(p.value * 100)}%` : p.value}</p>
            ))}
        </div>
    );
};

export default function InsightsPage() {
    const { getUserIScribes } = useAuth();
    const [sessions, setSessions] = useState<IScribe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUserIScribes().then(d => { setSessions(d); setLoading(false); });
    }, [getUserIScribes]);

    const agentSessions = useMemo(() => sessions.filter(s => s.agentSessionId), [sessions]);

    const avgConf = useMemo(() => {
        const v = agentSessions.filter(s => s.overallConfidence != null).map(s => s.overallConfidence!);
        return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) : 0;
    }, [agentSessions]);

    const reviewsNeeded = useMemo(() => agentSessions.filter(s => s.requiresHumanReview).length, [agentSessions]);

    const avgLatency = useMemo(() => {
        const v = agentSessions.filter(s => s.agentLatency_ms).map(s => s.agentLatency_ms!);
        return v.length ? (v.reduce((a, b) => a + b, 0) / v.length / 1000).toFixed(1) : "—";
    }, [agentSessions]);

    const totalICD = useMemo(() => agentSessions.reduce((t, s) => t + (s.icdCodes?.length ?? 0), 0), [agentSessions]);

    // Recharts data
    const confidenceTrend = useMemo(() =>
        agentSessions.slice(-14).map((s, i) => ({
            name: format(new Date(s.date), "M/d"),
            confidence: s.overallConfidence ?? 0,
            patient: s.patientName,
        })), [agentSessions]);

    const riskData = useMemo(() => {
        const counts = { low: 0, medium: 0, high: 0, critical: 0 };
        agentSessions.forEach(s => { if (s.riskLevel) counts[s.riskLevel]++; });
        return [
            { name: "Low", value: counts.low, fill: RISK_COLORS.low },
            { name: "Medium", value: counts.medium, fill: RISK_COLORS.medium },
            { name: "High", value: counts.high, fill: RISK_COLORS.high },
            { name: "Critical", value: counts.critical, fill: RISK_COLORS.critical },
        ].filter(d => d.value > 0);
    }, [agentSessions]);

    const icdFreq = useMemo(() => {
        const freq: Record<string, { desc: string; count: number }> = {};
        agentSessions.forEach(s => s.icdCodes?.forEach(c => {
            if (!freq[c.code]) freq[c.code] = { desc: c.description, count: 0 };
            freq[c.code].count++;
        }));
        return Object.entries(freq).sort((a, b) => b[1].count - a[1].count).slice(0, 6)
            .map(([code, d]) => ({ code, desc: d.desc, count: d.count }));
    }, [agentSessions]);

    const recent = useMemo(() =>
        [...agentSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
        [agentSessions]);

    if (loading) return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="relative"><Loader2 className="h-9 w-9 animate-spin text-primary" /><div className="absolute inset-0 rounded-full blur-xl bg-primary/20" /></div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading analytics</p>
            </div>
        </div>
    );

    return (
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Neural Intelligence</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight gradient-text">Clinical Insights</h1>
                <p className="text-sm text-muted-foreground">Agent pipeline analytics · {agentSessions.length} AI-processed sessions</p>
            </motion.div>

            {/* No data */}
            {agentSessions.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] py-20 gap-4 text-center">
                    <BrainCircuit className="h-12 w-12 text-primary/40 animate-float" />
                    <div className="space-y-1.5 max-w-xs">
                        <h2 className="font-bold text-lg">No agent sessions yet</h2>
                        <p className="text-sm text-muted-foreground">Record a consultation through iScribe to populate your AI insights dashboard.</p>
                    </div>
                </motion.div>
            )}

            {agentSessions.length > 0 && (
                <>
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <StatCard icon={BrainCircuit} label="Avg Confidence" value={`${avgConf}%`} sub="Across all agents" delay={0} />
                        <StatCard icon={Activity} label="Sessions" value={agentSessions.length} sub={`${sessions.length} total iScribes`} delay={0.07} />
                        <StatCard icon={AlertTriangle} label="Flagged" value={reviewsNeeded} sub="Clinician review" delay={0.14} />
                        <StatCard icon={Clock} label="Avg Latency" value={`${avgLatency}s`} sub={`${totalICD} ICD codes`} delay={0.21} />
                    </div>

                    {/* Charts row */}
                    <div className="grid lg:grid-cols-3 gap-5">

                        {/* Confidence Trend Area Chart */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                            className="lg:col-span-2 glass neural-border rounded-2xl p-6"
                        >
                            <SectionTitle icon={TrendingUp} label="Confidence Trend" />
                            <ResponsiveContainer width="100%" height={180}>
                                <AreaChart data={confidenceTrend} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                                    <defs>
                                        <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(191 97% 58%)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(191 97% 58%)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 1]} tickFormatter={v => `${Math.round(v * 100)}%`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area type="monotone" dataKey="confidence" name="Confidence" stroke="hsl(191 97% 58%)" strokeWidth={2} fill="url(#confGrad)" dot={{ r: 3, fill: "hsl(191 97% 58%)", strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </motion.div>

                        {/* Risk Distribution Radial */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.32, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                            className="glass neural-border rounded-2xl p-6"
                        >
                            <SectionTitle icon={ShieldCheck} label="Risk Distribution" />
                            {riskData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={180}>
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={riskData} barSize={14}>
                                        <RadialBar dataKey="value" cornerRadius={6} label={false} />
                                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-[10px] text-muted-foreground capitalize">{v}</span>} />
                                        <Tooltip content={<CustomTooltip />} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">No risk data yet</div>
                            )}
                        </motion.div>
                    </div>

                    {/* ICD Frequency Bar Chart */}
                    {icdFreq.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                            className="glass neural-border rounded-2xl p-6"
                        >
                            <SectionTitle icon={CreditCard} label="Top ICD-10 Codes" />
                            <ResponsiveContainer width="100%" height={140}>
                                <BarChart data={icdFreq} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 8 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.3} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="code" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "JetBrains Mono, monospace" }} axisLine={false} tickLine={false} width={60} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="count" name="Sessions" radius={[0, 4, 4, 0]}>
                                        {icdFreq.map((_, i) => (
                                            <Cell key={i} fill={`hsl(191 97% ${58 - i * 5}%)`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}

                    {/* Recent Sessions Table */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                        className="glass neural-border rounded-2xl p-6"
                    >
                        <SectionTitle icon={Activity} label="Recent Sessions" />
                        <div className="space-y-2">
                            {recent.map(s => {
                                const conf = s.overallConfidence != null ? s.overallConfidence : null;
                                return (
                                    <div key={s.id} className="flex items-center gap-4 rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold truncate">{s.patientName}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {format(new Date(s.date), "MMM d, yyyy")}
                                                {s.specialty && ` · ${s.specialty}`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {s.riskLevel && (
                                                <Badge className={cn("text-[10px] border capitalize px-2 py-0.5 font-medium", riskBadge[s.riskLevel])}>
                                                    {s.riskLevel}
                                                </Badge>
                                            )}
                                            {s.requiresHumanReview && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />}
                                            {conf != null && <NeuralBadge value={conf} size="sm" showBar={false} />}
                                            {s.agentLatency_ms && (
                                                <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                                                    {(s.agentLatency_ms / 1000).toFixed(1)}s
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Footer banner */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center justify-center gap-2 rounded-2xl border border-primary/10 bg-primary/[0.03] py-4 px-6"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-xs text-muted-foreground text-center">
                            Powered by <span className="text-foreground font-semibold">gpt-5.3-codex</span> ·
                            Transcription → NLP → SOAP → Risk → Billing → Compliance ·
                            All data encrypted at rest in Firestore
                        </p>
                    </motion.div>
                </>
            )}
        </div>
    );
}
