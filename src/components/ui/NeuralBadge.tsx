"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface NeuralBadgeProps {
    value: number; // 0-1
    label?: string;
    size?: "sm" | "md" | "lg";
    showBar?: boolean;
    className?: string;
}

const sizeClasses = {
    sm: { text: "text-[10px]", value: "text-xs", ring: "h-6 w-6" },
    md: { text: "text-xs", value: "text-sm", ring: "h-8 w-8" },
    lg: { text: "text-xs", value: "text-base", ring: "h-12 w-12" },
};

function getColor(v: number) {
    if (v >= 0.8) return { text: "text-emerald-400", bg: "bg-emerald-500", glow: "hsl(151 55% 52% / 0.4)" };
    if (v >= 0.6) return { text: "text-yellow-400", bg: "bg-yellow-500", glow: "hsl(38 92% 60% / 0.4)" };
    return { text: "text-orange-400", bg: "bg-orange-500", glow: "hsl(25 88% 58% / 0.4)" };
}

export function NeuralBadge({ value, label, size = "md", showBar = true, className }: NeuralBadgeProps) {
    const pct = Math.round(value * 100);
    const color = getColor(value);
    const sz = sizeClasses[size];

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            {label && (
                <p className={cn("text-muted-foreground font-medium uppercase tracking-widest", sz.text)}>
                    {label}
                </p>
            )}
            <div className="flex items-center gap-2">
                <p className={cn("font-black tabular-nums", sz.value, color.text)}>
                    {pct}%
                </p>
                {showBar && (
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <motion.div
                            className={cn("h-full rounded-full", color.bg)}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                            style={{ boxShadow: `0 0 8px ${color.glow}` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/* Circular ring variant */
export function NeuralRing({ value, label, className }: { value: number; label?: string; className?: string }) {
    const pct = Math.round(value * 100);
    const color = getColor(value);
    const r = 20;
    const circ = 2 * Math.PI * r;
    const dash = (value * circ);

    return (
        <div className={cn("flex flex-col items-center gap-1", className)}>
            <div className="relative h-14 w-14">
                <svg viewBox="0 0 48 48" className="h-14 w-14 -rotate-90">
                    <circle cx="24" cy="24" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                    <motion.circle
                        cx="24" cy="24" r={r}
                        fill="none"
                        stroke={color.bg.replace("bg-", "").includes("emerald") ? "hsl(151 55% 52%)" : color.bg.includes("yellow") ? "hsl(38 92% 60%)" : "hsl(25 88% 58%)"}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: circ - dash }}
                        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn("text-xs font-black tabular-nums", color.text)}>{pct}%</span>
                </div>
            </div>
            {label && <p className="text-[10px] text-muted-foreground text-center">{label}</p>}
        </div>
    );
}
