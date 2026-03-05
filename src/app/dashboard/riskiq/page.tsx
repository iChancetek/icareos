"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    ShieldCheck, AlertTriangle, Activity, ClipboardList,
    CheckCircle2, XCircle, Clock, BrainCircuit,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { IScribe } from "@/types";
import { Badge } from "@/components/ui/badge";

const riskStyle: Record<string, string> = {
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/25",
    critical: "bg-red-500/10 text-red-400 border-red-500/25",
};

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

// Mock audit trail for initial render
const mockAuditTrail = [
    { id: "1", action: "Critical risk flag raised", module: "MediScribe", time: "2m ago", resolved: false },
    { id: "2", action: "Compliance check passed", module: "BillingIQ", time: "8m ago", resolved: true },
    { id: "3", action: "High risk patient flagged for review", module: "MediScribe", time: "23m ago", resolved: false },
    { id: "4", action: "HIPAA audit log archived", module: "iCareOS Core", time: "1h ago", resolved: true },
    { id: "5", action: "Wound analysis CDS disclaimer confirmed", module: "WoundIQ", time: "2h ago", resolved: true },
];

export default function RiskIQPage() {
    const { getUserIScribes } = useAuth();
    const [sessions, setSessions] = useState<IScribe[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getUserIScribes().then(d => { setSessions(d); setLoading(false); });
    }, [getUserIScribes]);

    const flagged = useMemo(() => sessions.filter(s => s.requiresHumanReview || s.riskLevel === 'critical' || s.riskLevel === 'high'), [sessions]);
    const criticalCount = useMemo(() => sessions.filter(s => s.riskLevel === 'critical').length, [sessions]);
    const complianceScore = useMemo(() => {
        if (!sessions.length) return 100;
        const passing = sessions.filter(s => !s.requiresHumanReview).length;
        return Math.round((passing / sessions.length) * 100);
    }, [sessions]);

    return (
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">

            {/* ── Header ─────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-red-400">iCareOS · Clinical Guardrails Agent</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight gradient-text">RiskIQ</h1>
                <p className="text-sm text-muted-foreground">Real-time safety monitoring, compliance enforcement, and persistent audit trail across all iCareOS modules.</p>
            </motion.div>

            {/* ── KPI Cards ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={AlertTriangle} label="Active Alerts" value={flagged.length} sub="Flagged sessions" color="#EF4444" delay={0} />
                <StatCard icon={ShieldCheck} label="Compliance Score" value={`${complianceScore}%`} sub="Across all sessions" color="#10B981" delay={0.07} />
                <StatCard icon={XCircle} label="Critical Risk" value={criticalCount} sub="Requires immediate review" color="#F97316" delay={0.14} />
                <StatCard icon={ClipboardList} label="Audit Events" value={mockAuditTrail.length} sub="Last 24 hours" color="#6366F1" delay={0.21} />
            </div>

            {/* ── Active Alerts Panel ────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="glass neural-border rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-5">
                    <div className="h-7 w-7 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Clinical Alerts</h2>
                    {flagged.length > 0 && (
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                            {flagged.length} flagged
                        </span>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-10">
                        <BrainCircuit className="h-7 w-7 text-primary animate-pulse" />
                    </div>
                ) : flagged.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                        <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                        <p className="text-sm font-semibold text-emerald-400">All Clear — No Active Alerts</p>
                        <p className="text-xs text-muted-foreground">No sessions currently require human review. RiskIQ is monitoring all modules.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {flagged.slice(0, 8).map(s => (
                            <div key={s.id} className="flex items-center gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate">{s.patientName}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        {s.date ? format(new Date(s.date), "MMM d, yyyy") : "—"}
                                        {s.specialty ? ` · ${s.specialty}` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {s.riskLevel && (
                                        <Badge className={cn("text-[10px] border capitalize px-2 py-0.5 font-medium", riskStyle[s.riskLevel])}>
                                            {s.riskLevel}
                                        </Badge>
                                    )}
                                    {s.requiresHumanReview && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                                            Review Required
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* ── Audit Trail ───────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="glass neural-border rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-5">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Audit Trail</h2>
                </div>
                <div className="space-y-2">
                    {mockAuditTrail.map((entry) => (
                        <div key={entry.id} className="flex items-center gap-4 rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
                            <div className="shrink-0">
                                {entry.resolved
                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    : <Clock className="h-4 w-4 text-amber-400 animate-pulse" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{entry.action}</p>
                                <p className="text-[10px] text-muted-foreground">{entry.module} · {entry.time}</p>
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0",
                                entry.resolved
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                            )}>
                                {entry.resolved ? "Resolved" : "Pending"}
                            </span>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Module Coverage ────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42, duration: 0.45 }}
                className="glass neural-border rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-5">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Module Coverage</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "MediScribe", status: "Monitored", color: "#00E5FF" },
                        { label: "WoundIQ", status: "Monitored", color: "#10B981" },
                        { label: "RadiologyIQ", status: "Monitored", color: "#10B981" },
                        { label: "BillingIQ", status: "Monitored", color: "#F59E0B" },
                        { label: "iSkylar", status: "Monitored", color: "#6366F1" },
                        { label: "CareCoordIQ", status: "Monitored", color: "#EC4899" },
                        { label: "Insight", status: "Monitored", color: "#3B82F6" },
                        { label: "iCareOS Core", status: "Active", color: "#00E5FF" },
                    ].map(m => (
                        <div key={m.label} className="flex items-center gap-2 rounded-xl border border-border/30 bg-muted/10 px-3 py-2">
                            <span className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: m.color }} />
                            <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{m.label}</p>
                                <p className="text-[10px] text-muted-foreground">{m.status}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Footer Banner ─────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/10 bg-red-500/[0.03] py-4 px-6"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                <p className="text-xs text-muted-foreground text-center">
                    Powered by <span className="text-foreground font-semibold">RiskIQ</span> · iCareOS Clinical Guardrails Agent ·
                    All module actions are audit-logged · HIPAA-compliant encrypted storage
                </p>
            </motion.div>
        </div>
    );
}
