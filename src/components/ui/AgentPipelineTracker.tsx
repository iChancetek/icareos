"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentStatus = "pending" | "running" | "done" | "error";

export interface AgentStep {
    name: string;
    shortName: string;
    status: AgentStatus;
    latency_ms?: number;
    confidence?: number;
}

interface AgentPipelineTrackerProps {
    steps: AgentStep[];
    className?: string;
}

const statusConfig = {
    pending: {
        icon: Circle,
        color: "text-muted-foreground",
        bg: "bg-muted/50 border-border",
        label: "Waiting",
    },
    running: {
        icon: Loader2,
        color: "text-primary",
        bg: "bg-primary/10 border-primary/30",
        label: "Running",
    },
    done: {
        icon: Check,
        color: "text-emerald-400",
        bg: "bg-emerald-500/10 border-emerald-500/30",
        label: "Done",
    },
    error: {
        icon: AlertCircle,
        color: "text-destructive",
        bg: "bg-destructive/10 border-destructive/30",
        label: "Failed",
    },
};

export function AgentPipelineTracker({ steps, className }: AgentPipelineTrackerProps) {
    const completedCount = steps.filter(s => s.status === "done").length;
    const totalPct = Math.round((completedCount / steps.length) * 100);

    return (
        <div className={cn("space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Agent Pipeline
                </p>
                <p className="text-xs font-mono text-primary">
                    {completedCount}/{steps.length}
                </p>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                    className="h-full rounded-full bg-primary"
                    style={{ boxShadow: "0 0 8px hsl(191 97% 58% / 0.6)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${totalPct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                />
            </div>

            {/* Steps */}
            <div className="space-y-2">
                {steps.map((step, i) => {
                    const cfg = statusConfig[step.status];
                    const StatusIcon = cfg.icon;

                    return (
                        <motion.div
                            key={step.name}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.3 }}
                            className={cn(
                                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300",
                                cfg.bg
                            )}
                        >
                            {/* Icon */}
                            <div className={cn("shrink-0 h-5 w-5 flex items-center justify-center", cfg.color)}>
                                <AnimatePresence mode="wait">
                                    {step.status === "running" ? (
                                        <motion.div key="spin" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </motion.div>
                                    ) : step.status === "done" ? (
                                        <motion.div
                                            key="check"
                                            initial={{ scale: 0, rotate: -90 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                        >
                                            <Check className="h-4 w-4" />
                                        </motion.div>
                                    ) : (
                                        <motion.div key="idle" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                            <StatusIcon className="h-4 w-4" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                                <p className={cn("text-xs font-semibold truncate", cfg.color.replace("text-", "text-"))}>
                                    {step.name}
                                </p>
                            </div>

                            {/* Right: confidence or latency */}
                            <AnimatePresence>
                                {step.status === "done" && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-2 shrink-0"
                                    >
                                        {step.confidence != null && (
                                            <span className={cn(
                                                "text-[10px] font-mono font-bold",
                                                step.confidence >= 0.8 ? "text-emerald-400" :
                                                    step.confidence >= 0.6 ? "text-yellow-400" : "text-orange-400"
                                            )}>
                                                {Math.round(step.confidence * 100)}%
                                            </span>
                                        )}
                                        {step.latency_ms != null && (
                                            <span className="text-[10px] text-muted-foreground">
                                                {step.latency_ms}ms
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
