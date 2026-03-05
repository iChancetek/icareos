"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    HeartPulse, Users, CalendarClock, TrendingDown, Zap,
    CheckCircle2, BrainCircuit, ArrowRight, Bell,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import type { IScribe } from "@/types";

// ── Follow-up interval prediction (simple heuristic) ─────────────
function predictFollowUp(session: IScribe): { label: string; color: string; days: number } {
    const risk = session.riskLevel;
    if (risk === "critical") return { label: "Urgent — 3 days", color: "#EF4444", days: 3 };
    if (risk === "high") return { label: "7 days", color: "#F97316", days: 7 };
    if (risk === "medium") return { label: "14 days", color: "#F59E0B", days: 14 };
    return { label: "30 days", color: "#10B981", days: 30 };
}

const moduleStatus = [
    { label: "MediScribe", color: "#00E5FF", integrated: true },
    { label: "WoundIQ", color: "#10B981", integrated: true },
    { label: "RadiologyIQ", color: "#10B981", integrated: true },
    { label: "iSkylar", color: "#6366F1", integrated: true },
    { label: "BillingIQ", color: "#F59E0B", integrated: false },
    { label: "RiskIQ", color: "#EF4444", integrated: true },
];

function StatCard({ icon: Icon, label, value, sub, color, delay }: {
    icon: React.ElementType; label: string; value: string | number; sub: string; color: string; delay: number;
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
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="text-2xl font-black tabular-nums">{value}</p>
                    <p className="text-[10px] text-muted-foreground">{sub}</p>
                </div>
            </div>
        </motion.div>
    );
}

export default function CareCoordIQPage() {
    const { getUserIScribes } = useAuth();
    const [sessions, setSessions] = useState<IScribe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUserIScribes().then(d => { setSessions(d); setLoading(false); });
    }, [getUserIScribes]);

    const agentSessions = useMemo(() => sessions.filter(s => s.agentSessionId), [sessions]);

    const urgentFollowUps = useMemo(() =>
        agentSessions.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high').length,
        [agentSessions]
    );

    const predictedNoShows = useMemo(() =>
        Math.round(agentSessions.length * 0.12), // 12% baseline prediction
        [agentSessions]
    );

    const engagementScore = useMemo(() => {
        if (!agentSessions.length) return 0;
        const engaged = agentSessions.filter(s => s.overallConfidence && s.overallConfidence > 0.7).length;
        return Math.round((engaged / agentSessions.length) * 100);
    }, [agentSessions]);

    const recentPatients = useMemo(() =>
        [...agentSessions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 6),
        [agentSessions]
    );

    return (
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">

            {/* ── Header ─────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-pink-400">iCareOS · Predictive Care Coordination Agent</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight gradient-text">CareCoordIQ</h1>
                <p className="text-sm text-muted-foreground">Predicts patient follow-ups, engagement risk, and care gaps — orchestrating insights from all iCareOS modules.</p>
            </motion.div>

            {/* ── KPI Cards ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Users} label="Active Patients" value={agentSessions.length} sub="In care journey" color="#EC4899" delay={0} />
                <StatCard icon={CalendarClock} label="Follow-ups Due" value={urgentFollowUps} sub="High/critical risk" color="#EF4444" delay={0.07} />
                <StatCard icon={TrendingDown} label="Predicted No-Shows" value={predictedNoShows} sub="Next 30 days" color="#F59E0B" delay={0.14} />
                <StatCard icon={HeartPulse} label="Engagement Score" value={`${engagementScore}%`} sub="AI-assessed" color="#10B981" delay={0.21} />
            </div>

            {/* ── Patient Journey Tracker ────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="glass neural-border rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-5">
                    <div className="h-7 w-7 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                        <HeartPulse className="h-3.5 w-3.5 text-pink-400" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Patient Journey & Follow-up Predictions</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <BrainCircuit className="h-7 w-7 text-primary animate-pulse" />
                    </div>
                ) : recentPatients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <HeartPulse className="h-10 w-10 text-pink-400 opacity-30" />
                        <p className="text-sm text-muted-foreground">Start MediScribe sessions to activate care coordination predictions.</p>
                        <Link href="/dashboard/iscribe/new"
                            className="text-xs font-semibold text-primary flex items-center gap-1 hover:gap-2 transition-all">
                            Open MediScribe <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentPatients.map(s => {
                            const followUp = predictFollowUp(s);
                            const dueDate = addDays(new Date(s.date), followUp.days);
                            return (
                                <div key={s.id} className="flex items-center gap-4 rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
                                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border border-pink-500/25 bg-pink-500/10">
                                        <HeartPulse className="h-4 w-4 text-pink-400" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold truncate">{s.patientName}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {format(new Date(s.date), "MMM d, yyyy")}
                                            {s.specialty ? ` · ${s.specialty}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-[10px] text-muted-foreground">Follow-up due</p>
                                            <p className="text-xs font-bold" style={{ color: followUp.color }}>
                                                {format(dueDate, "MMM d")} · {followUp.label}
                                            </p>
                                        </div>
                                        <Bell className="h-3.5 w-3.5 shrink-0" style={{ color: followUp.color }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </motion.div>

            {/* ── Module Integration Status ──────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="glass neural-border rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-5">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Module Integration Status</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {moduleStatus.map(m => (
                        <div key={m.label} className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/10 px-4 py-3">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", m.integrated ? "animate-pulse" : "opacity-30")}
                                style={{ backgroundColor: m.color }} />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{m.label}</p>
                                <p className="text-[10px] text-muted-foreground">{m.integrated ? "Integrated" : "Coming soon"}</p>
                            </div>
                            {m.integrated
                                ? <CheckCircle2 className="h-3.5 w-3.5 ml-auto shrink-0" style={{ color: m.color }} />
                                : <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-muted/50 text-muted-foreground">soon</span>}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Footer Banner ─────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-pink-500/10 bg-pink-500/[0.03] py-4 px-6"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-pink-400 animate-pulse" />
                <p className="text-xs text-muted-foreground text-center">
                    Powered by <span className="text-foreground font-semibold">CareCoordIQ</span> · iCareOS Predictive Care Coordination ·
                    Follow-up predictions AI-generated · Clinician review required before scheduling actions
                </p>
            </motion.div>
        </div>
    );
}
