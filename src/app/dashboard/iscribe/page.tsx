"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Clock, AlertTriangle, TrendingUp, ArrowRight, Activity, ShieldCheck, BrainCircuit, Zap, ScanLine, MessageSquare, Camera } from "lucide-react";
import type { IScribe } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { StaggerList, FadeUpItem } from "@/components/ui/MotionCard";
import { NeuralBadge } from "@/components/ui/NeuralBadge";
import { Loader2 } from "lucide-react";

const riskColors: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/25",
  high: "bg-orange-500/10 text-orange-400 border-orange-500/25",
  critical: "bg-red-500/10 text-red-400 border-red-500/25",
};

function KPICard({ icon: Icon, label, value, sub, color, delay }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -3, scale: 1.02 }}
      className="glass neural-border rounded-2xl p-5 cursor-default"
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
          <p className="text-2xl font-black tabular-nums tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// AI Feature cards shown at the top of the dashboard
const AI_FEATURES = [
  {
    href: "/dashboard/cds",
    title: "Wound Care AI",
    desc: "Upload wound photos for AI-powered classification, severity grading, and care recommendations.",
    icon: Camera,
    color: "from-indigo-500/15 to-purple-500/5 border-indigo-500/25",
    iconColor: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    badge: "Vision AI",
  },
  {
    href: "/dashboard/cds",
    title: "X-Ray Analysis",
    desc: "AI radiographic support for fracture detection, opacity analysis, and differential ranking.",
    icon: ScanLine,
    color: "from-teal-500/15 to-emerald-500/5 border-teal-500/25",
    iconColor: "bg-teal-500/10 border-teal-500/20 text-teal-400",
    badge: "Radiology AI",
  },
  {
    href: "/dashboard/cds",
    title: "AI Conversational Intake",
    desc: "Goal-driven AI orchestrator conducts adaptive patient intake and routes to clinical agents.",
    icon: MessageSquare,
    color: "from-violet-500/15 to-blue-500/5 border-violet-500/25",
    iconColor: "bg-violet-500/10 border-violet-500/20 text-violet-400",
    badge: "LangGraph",
  },
];

export default function IScribesPage() {
  const [iscribes, setIScribes] = useState<IScribe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getUserIScribes } = useAuth();

  useEffect(() => {
    getUserIScribes().then(d => { setIScribes(d); setIsLoading(false); });
  }, [getUserIScribes]);

  const agentSessions = iscribes.filter(s => s.agentSessionId);
  const avgConf = agentSessions.length
    ? Math.round(agentSessions.reduce((s, i) => s + (i.overallConfidence ?? 0), 0) / agentSessions.length * 100)
    : 0;
  const flagged = agentSessions.filter(s => s.requiresHumanReview).length;
  const todaySessions = iscribes.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <div className="absolute inset-0 rounded-full blur-xl bg-primary/20" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Loading sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 space-y-8 max-w-5xl">

      {/* ── Hero header ───────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary">Neural Clinical AI</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight gradient-text">iScribe Sessions</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered SOAP documentation · 6-agent pipeline · gpt-5.3-codex
          </p>
        </div>

        <Link href="/dashboard/iscribe/new">
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            className="btn-neural flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
          >
            <Mic className="h-4 w-4" />
            New Session
          </motion.button>
        </Link>
      </motion.div>

      {/* ── AI-Native Feature Cards ─────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">AI-Native Clinical Features</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AI_FEATURES.map((f, i) => (
            <Link href={f.href} key={f.title}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
                whileHover={{ y: -3, scale: 1.02 }}
                className={cn(
                  "group relative rounded-2xl border bg-gradient-to-br p-4 cursor-pointer transition-all",
                  f.color
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("h-9 w-9 shrink-0 flex items-center justify-center rounded-xl border", f.iconColor)}>
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{f.title}</p>
                      <span className="text-[9px] font-bold uppercase tracking-wider bg-white/10 text-foreground/60 rounded-full px-2 py-0.5 border border-white/10">
                        {f.badge}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                    <p className="text-xs text-primary mt-2 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open <ArrowRight className="h-3 w-3" />
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard icon={Activity} label="Total Sessions" value={iscribes.length} sub="All time" color="bg-primary/10 border-primary/20 text-primary" delay={0} />
        <KPICard icon={BrainCircuit} label="AI Confidence" value={avgConf > 0 ? `${avgConf}%` : "—"} sub="Avg across agents" color="bg-violet-500/10 border-violet-500/20 text-violet-400" delay={0.07} />
        <KPICard icon={AlertTriangle} label="Review Flags" value={flagged} sub="Clinician review needed" color={flagged > 0 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"} delay={0.14} />
        <KPICard icon={Zap} label="Today" value={todaySessions} sub="Sessions recorded today" color="bg-cyan-500/10 border-cyan-500/20 text-cyan-400" delay={0.21} />
      </div>

      {/* ── Multimodal CDS Panels (Phase 7) ───────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-5 border rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-wider">Wound Intelligence</h2>
          </div>
          <p className="text-2xl font-black tabular-nums tracking-tight">12</p>
          <p className="text-xs text-muted-foreground mt-1">High-risk healing progressions tracking</p>
        </div>
        <div className="p-5 border rounded-2xl bg-gradient-to-br from-teal-500/10 to-emerald-500/5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-teal-500" />
            <h2 className="text-sm font-bold text-teal-500 uppercase tracking-wider">Radiology Support</h2>
          </div>
          <p className="text-2xl font-black tabular-nums tracking-tight">3</p>
          <p className="text-xs text-muted-foreground mt-1">Fracture alerts awaiting clinician sign-off</p>
        </div>
      </div>

      {/* ── AI Triage Queue (Phase 5 Enhancement) ───────────── */}
      {iscribes.filter(s => s.escationRequired).length > 0 && (
        <div className="mb-8 p-5 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-500">AI Triage Escalation Queue</h2>
          </div>
          <p className="text-sm text-red-400 mb-4">The following sessions were escalated by the Safety Governance Layer and require immediate clinician review.</p>
          <StaggerList className="space-y-2">
            {iscribes.filter(s => s.escationRequired).map(iscribe => (
              <FadeUpItem key={`esc-${iscribe.id}`}>
                <Link href={`/dashboard/iscribe/${iscribe.id}`}>
                  <div className="group flex items-center justify-between rounded-xl border border-red-500/40 bg-red-500/5 px-5 py-3 hover:bg-red-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <ShieldCheck className="h-5 w-5 text-red-400" />
                      <div>
                        <p className="font-semibold text-white">{iscribe.patientName}</p>
                        <p className="text-xs text-red-300">Risk Level: {iscribe.riskLevel?.toUpperCase()} | Sent to Triage</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-red-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </FadeUpItem>
            ))}
          </StaggerList>
        </div>
      )}

      {/* ── Standard Session list ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-4 mt-8">
        <Activity className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-bold text-foreground">Standard Sessions</h2>
      </div>

      {iscribes.filter(s => !s.escationRequired).length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] py-24 text-center gap-6"
        >
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 animate-float">
              <Mic className="h-10 w-10 text-primary" />
            </div>
            <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
          </div>
          <div className="space-y-2 max-w-xs">
            <h2 className="text-xl font-bold">No standard sessions yet</h2>
            <p className="text-sm text-muted-foreground">
              Record your first consultation. Our 6-agent AI pipeline generates SOAP notes, risk scores, and billing codes in seconds.
            </p>
          </div>
          <Link href="/dashboard/iscribe/new">
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="btn-neural flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
            >
              <Mic className="h-4 w-4" />
              Start First Session
            </motion.button>
          </Link>
        </motion.div>
      ) : (
        <StaggerList className="space-y-2">
          {[...iscribes]
            .filter(s => !s.escationRequired)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(iscribe => {
              const hasAgent = !!iscribe.agentSessionId;
              const confPct = iscribe.overallConfidence != null ? iscribe.overallConfidence : null;
              return (
                <FadeUpItem key={iscribe.id}>
                  <Link href={`/dashboard/iscribe/${iscribe.id}`}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      className={cn(
                        "group flex items-center gap-4 rounded-xl border px-5 py-3.5",
                        "bg-card/50 glass neural-border cursor-pointer",
                        "hover:border-primary/25 hover:bg-card/70 transition-all duration-200"
                      )}
                    >
                      {/* Status dot */}
                      <div className={cn(
                        "shrink-0 h-8 w-8 rounded-xl flex items-center justify-center border",
                        hasAgent ? "bg-primary/10 border-primary/20" : "bg-muted border-border"
                      )}>
                        <ShieldCheck className={cn("h-4 w-4", hasAgent ? "text-primary" : "text-muted-foreground")} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-semibold text-sm">{iscribe.patientName}</span>
                          {iscribe.specialty && (
                            <span className="text-[10px] bg-muted/60 text-muted-foreground rounded-full px-2 py-0.5">
                              {iscribe.specialty}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(iscribe.date), "MMM d, h:mm a")}</span>
                          {iscribe.agentLatency_ms && (
                            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{(iscribe.agentLatency_ms / 1000).toFixed(1)}s</span>
                          )}
                        </div>
                      </div>

                      {/* Right badges */}
                      <div className="flex items-center gap-2 shrink-0">
                        {iscribe.riskLevel && (
                          <Badge className={cn("text-[10px] capitalize border font-medium px-2", riskColors[iscribe.riskLevel])}>
                            {iscribe.riskLevel}
                          </Badge>
                        )}
                        {confPct != null && (
                          <span className={cn("text-xs font-mono font-bold",
                            confPct >= 0.8 ? "text-emerald-400" : confPct >= 0.6 ? "text-yellow-400" : "text-orange-400"
                          )}>
                            {Math.round(confPct * 100)}%
                          </span>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.div>
                  </Link>
                </FadeUpItem>
              );
            })}
        </StaggerList>
      )}
    </div>
  );
}
