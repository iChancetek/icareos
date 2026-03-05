"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    CreditCard, TrendingUp, AlertCircle, CheckCircle2,
    ArrowRight, BrainCircuit, FileText, DollarSign, Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ── Mock data ────────────────────────────────────────────────────────────
const auditRows = [
    { patient: "J. Thompson", code: "99214", desc: "Office Visit – Moderate", status: "optimized", delta: "+$42", date: "Mar 4" },
    { patient: "M. Rivera", code: "99213", desc: "Office Visit – Low", status: "flagged", delta: "+$78", date: "Mar 4" },
    { patient: "A. Patel", code: "99215", desc: "Office Visit – High", status: "confirmed", delta: "$0", date: "Mar 3" },
    { patient: "D. Kim", code: "99212", desc: "Office Visit – Straightforward", status: "flagged", delta: "+$130", date: "Mar 3" },
    { patient: "S. Johnson", code: "99214", desc: "Office Visit – Moderate", status: "optimized", delta: "+$55", date: "Mar 2" },
];

const pipelineSteps = [
    { label: "MediScribe", sub: "SOAP + ICD extraction", color: "#00E5FF", done: true },
    { label: "BillingIQ", sub: "Code mapping + audit", color: "#F59E0B", done: true },
    { label: "Claims Engine", sub: "Submission ready", color: "#10B981", done: false },
];

function StatCard({ icon: Icon, label, value, sub, color, delay }: {
    icon: React.ElementType; label: string; value: string; sub: string; color: string; delay: number;
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

export default function BillingIQPage() {
    const [tab, setTab] = useState<"all" | "flagged">("all");

    const rows = useMemo(() =>
        tab === "flagged" ? auditRows.filter(r => r.status === "flagged") : auditRows,
        [tab]
    );

    const statusStyle: Record<string, string> = {
        optimized: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
        flagged: "bg-amber-500/10 text-amber-400 border-amber-500/25",
        confirmed: "bg-primary/10 text-primary border-primary/25",
    };

    return (
        <div className="container mx-auto max-w-6xl px-4 md:px-6 py-8 space-y-8">

            {/* ── Header ─────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">iCareOS · Revenue Optimization Agent</span>
                </div>
                <h1 className="text-3xl font-black tracking-tight gradient-text">BillingIQ</h1>
                <p className="text-sm text-muted-foreground">AI-powered coding audit, underbilling detection, and claims optimization — powered by MediScribe outputs.</p>
            </motion.div>

            {/* ── CDS Disclaimer ──────────────────────────── */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-amber-300">AI Coding Recommendations — Clinician Review Required</p>
                    <p className="text-xs text-amber-400/80 mt-1">All BillingIQ suggestions must be reviewed and confirmed by a licensed billing professional or clinician before submission. All actions are audit-logged.</p>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={DollarSign} label="Revenue Captured" value="$18,240" sub="This month" color="#F59E0B" delay={0} />
                <StatCard icon={AlertCircle} label="Underbilling Flags" value="12" sub="Pending review" color="#EF4444" delay={0.07} />
                <StatCard icon={CheckCircle2} label="Claims Ready" value="47" sub="Submission queue" color="#10B981" delay={0.14} />
                <StatCard icon={TrendingUp} label="Code Accuracy" value="94%" sub="Avg across sessions" color="#3B82F6" delay={0.21} />
            </div>

            {/* ── Agentic Pipeline ───────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="glass neural-border rounded-2xl p-6"
            >
                <div className="flex items-center gap-2 mb-5">
                    <div className="h-7 w-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Agent Pipeline</h2>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch gap-3">
                    {pipelineSteps.map((step, i) => (
                        <div key={step.label} className="flex sm:flex-col items-center flex-1 gap-2">
                            <div className="flex-1 w-full sm:w-auto rounded-xl border p-4 text-center"
                                style={{ borderColor: `${step.color}30`, backgroundColor: `${step.color}08` }}>
                                <div className="h-8 w-8 mx-auto rounded-lg flex items-center justify-center mb-2 border"
                                    style={{ backgroundColor: `${step.color}15`, borderColor: `${step.color}30` }}>
                                    {step.done ? <CheckCircle2 className="h-4 w-4" style={{ color: step.color }} /> : <BrainCircuit className="h-4 w-4" style={{ color: step.color }} />}
                                </div>
                                <p className="text-xs font-bold" style={{ color: step.color }}>{step.label}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{step.sub}</p>
                            </div>
                            {i < pipelineSteps.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 rotate-90 sm:rotate-0" />
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Coding Audit Table ─────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
                className="glass neural-border rounded-2xl p-6"
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Coding Audits</h2>
                    </div>
                    <div className="flex gap-1 rounded-xl border border-border/50 p-1">
                        {(["all", "flagged"] as const).map(t => (
                            <button key={t} onClick={() => setTab(t)} className={cn(
                                "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                                tab === t ? "bg-primary/15 text-primary border border-primary/25" : "text-muted-foreground hover:text-foreground"
                            )}>{t === "all" ? "All" : "Flagged"}</button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2">
                    {rows.map((row, i) => (
                        <div key={i} className="flex items-center gap-4 rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{row.patient}</p>
                                <p className="text-[10px] text-muted-foreground">{row.desc} · {row.date}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono text-xs text-muted-foreground">{row.code}</span>
                                {row.delta !== "$0" && (
                                    <span className="text-xs font-bold text-emerald-400">{row.delta}</span>
                                )}
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize", statusStyle[row.status])}>
                                    {row.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ── Footer ─────────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] py-4 px-6"
            >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-xs text-muted-foreground text-center">
                    Powered by <span className="text-foreground font-semibold">BillingIQ</span> · iCareOS Revenue Optimization Agent ·
                    All data encrypted at rest · <Link href="/dashboard/iscribe" className="underline underline-offset-2 hover:text-foreground">Open MediScribe</Link>
                </p>
            </motion.div>
        </div>
    );
}
