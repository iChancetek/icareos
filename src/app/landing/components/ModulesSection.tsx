"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useInView } from "framer-motion";
import { useTheme } from "next-themes";

const MODULES = [
    {
        id: "mediscribe",
        name: "MediScribe",
        tagline: "AI Documentation Intelligence",
        color: "#06b6d4",
        glowLight: "rgba(6,182,212,0.15)",
        glowDark: "rgba(6,182,212,0.25)",
        border: "rgba(6,182,212,0.3)",
        icon: "🎙️",
        features: [
            "Real-time voice transcription",
            "SOAP note generation",
            "NLP clinical extraction",
            "Compliance monitoring",
            "Billing code assistance",
        ],
        connects: ["BillingIQ", "RiskIQ", "CareCoordIQ", "iSkylar"],
    },
    {
        id: "iskylar",
        name: "iSkylar",
        tagline: "Conversational Intake Orchestrator",
        color: "#8b5cf6",
        glowLight: "rgba(139,92,246,0.15)",
        glowDark: "rgba(139,92,246,0.25)",
        border: "rgba(139,92,246,0.3)",
        icon: "🤖",
        features: [
            "Voice-enabled clinical intake",
            "Structured symptom capture",
            "LangGraph orchestration",
            "Agent-to-agent coordination",
            "Wellness companion AI",
        ],
        connects: ["MediScribe", "RiskIQ", "CareCoordIQ"],
    },
    {
        id: "riskiq",
        name: "RiskIQ",
        tagline: "Clinical Guardrails",
        color: "#ef4444",
        glowLight: "rgba(239,68,68,0.15)",
        glowDark: "rgba(239,68,68,0.25)",
        border: "rgba(239,68,68,0.3)",
        icon: "🛡️",
        features: [
            "Real-time safety monitoring",
            "Clinical risk scoring",
            "HIPAA compliance alerts",
            "Drug interaction detection",
            "Readmission risk prediction",
        ],
        connects: ["MediScribe", "BillingIQ", "CareCoordIQ"],
    },
    {
        id: "billingiq",
        name: "BillingIQ",
        tagline: "Revenue Optimization Agent",
        color: "#10b981",
        glowLight: "rgba(16,185,129,0.15)",
        glowDark: "rgba(16,185,129,0.25)",
        border: "rgba(16,185,129,0.3)",
        icon: "💰",
        features: [
            "CPT & ICD-10 code auditing",
            "Underbilling detection",
            "Revenue delta analysis",
            "Claim readiness scoring",
            "Modifier gap detection",
        ],
        connects: ["MediScribe", "RiskIQ"],
    },
    {
        id: "carecoordiq",
        name: "CareCoordIQ",
        tagline: "Predictive Care Coordination",
        color: "#f59e0b",
        glowLight: "rgba(245,158,11,0.15)",
        glowDark: "rgba(245,158,11,0.25)",
        border: "rgba(245,158,11,0.3)",
        icon: "🗓️",
        features: [
            "Care gap detection",
            "Follow-up interval prediction",
            "No-show risk scoring",
            "Patient engagement planning",
            "Multi-module care orchestration",
        ],
        connects: ["MediScribe", "RiskIQ", "iSkylar"],
    },
    {
        id: "woundiq",
        name: "WoundIQ",
        tagline: "AI Wound Analysis",
        color: "#ec4899",
        glowLight: "rgba(236,72,153,0.15)",
        glowDark: "rgba(236,72,153,0.25)",
        border: "rgba(236,72,153,0.3)",
        icon: "🩹",
        features: [
            "Wound classification AI",
            "Severity grading",
            "Healing trajectory tracking",
            "Treatment recommendations",
            "CDS integration",
        ],
        connects: ["RiskIQ", "CareCoordIQ"],
    },
    {
        id: "radiologyiq",
        name: "RadiologyIQ",
        tagline: "Diagnostic Co-Pilot",
        color: "#3b82f6",
        glowLight: "rgba(59,130,246,0.15)",
        glowDark: "rgba(59,130,246,0.25)",
        border: "rgba(59,130,246,0.3)",
        icon: "🔬",
        features: [
            "X-ray & CT analysis",
            "Abnormality detection",
            "Radiology report AI assist",
            "Diagnostic insight generation",
            "Clinician decision support",
        ],
        connects: ["RiskIQ", "MediScribe"],
    },
    {
        id: "insight",
        name: "Insight",
        tagline: "Clinical Intelligence Dashboard",
        color: "#a855f7",
        glowLight: "rgba(168,85,247,0.15)",
        glowDark: "rgba(168,85,247,0.25)",
        border: "rgba(168,85,247,0.3)",
        icon: "📊",
        features: [
            "Cross-module analytics",
            "Operational intelligence",
            "Workflow efficiency insights",
            "Revenue performance metrics",
            "Population health overview",
        ],
        connects: ["MediScribe", "BillingIQ", "CareCoordIQ"],
    },
];

function ModuleCard({ module, index, hoveredId, setHoveredId }: {
    module: typeof MODULES[0];
    index: number;
    hoveredId: string | null;
    setHoveredId: (id: string | null) => void;
}) {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.2 });

    const isHovered = hoveredId === module.id;
    const isConnected = hoveredId !== null && MODULES.find(m => m.id === hoveredId)?.connects.includes(module.name);
    const isDimmed = hoveredId !== null && !isHovered && !isConnected;

    useEffect(() => setMounted(true), []);
    const isDark = mounted ? theme === "dark" : true;

    const glowColor = isDark ? module.glowDark : module.glowLight;
    const cardBgHover = isDark ? "rgba(5,8,16,0.95)" : "rgba(255,255,255,0.95)";

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: isDimmed ? 0.35 : 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => setHoveredId(module.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="relative rounded-2xl p-6 cursor-pointer group bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none"
            style={{
                background: isHovered
                    ? `radial-gradient(ellipse at top left, ${glowColor} 0%, ${cardBgHover} 70%)`
                    : undefined,
                borderColor: isHovered || isConnected ? module.border : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"),
                borderWidth: "1px",
                borderStyle: "solid",
                boxShadow: isHovered ? `0 0 40px ${glowColor}` : isConnected ? `0 0 20px ${glowColor}` : undefined,
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
        >
            {/* Connection flash on hover */}
            {isConnected && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ boxShadow: `inset 0 0 0 1px ${module.color}40` }}
                />
            )}

            {/* Floating icon */}
            <motion.div
                animate={isHovered ? { y: [-2, 2, -2], scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ repeat: isHovered ? Infinity : 0, duration: 2 }}
                className="text-3xl mb-4"
            >
                {module.icon}
            </motion.div>

            {/* Header */}
            <div className="mb-3">
                <h3
                    className="text-lg font-bold mb-0.5"
                    style={{ color: isHovered || isConnected ? module.color : (isDark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.8)") }}
                >
                    {module.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/40 font-medium tracking-wide">{module.tagline}</p>
            </div>

            {/* Features */}
            <ul className="space-y-1.5">
                {module.features.map((f, i) => (
                    <motion.li
                        key={f}
                        initial={{ opacity: 0, x: -8 }}
                        animate={isHovered ? { opacity: 1, x: 0 } : { opacity: 0.7, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-2 text-xs text-slate-600 dark:text-white/60"
                    >
                        <span className="h-1 w-1 rounded-full flex-shrink-0" style={{ background: module.color }} />
                        {f}
                    </motion.li>
                ))}
            </ul>

            {/* Connected modules badge on hover */}
            {isHovered && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 pt-4 border-t border-slate-100 dark:border-white/10"
                >
                    <p className="text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-widest mb-2">Connects to</p>
                    <div className="flex flex-wrap gap-1">
                        {module.connects.map(c => (
                            <span
                                key={c}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                                style={{ background: `${module.color}20`, color: module.color, border: `1px solid ${module.color}40` }}
                            >
                                {c}
                            </span>
                        ))}
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export function ModulesSection() {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const titleRef = useRef<HTMLDivElement>(null);
    const titleInView = useInView(titleRef, { once: true, amount: 0.5 });

    return (
        <section
            className="relative py-32 overflow-hidden bg-slate-50 dark:bg-gradient-to-b dark:from-[#050810] dark:via-[#06091a] dark:to-[#050810]"
        >
            {/* Ambient glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10 dark:opacity-[0.15] blur-[120px] pointer-events-none"
                style={{ background: "radial-gradient(ellipse, #8b5cf6 0%, #06b6d4 50%, transparent 100%)" }}
            />

            <div className="max-w-7xl mx-auto px-6">
                {/* Section header */}
                <motion.div
                    ref={titleRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={titleInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20 relative z-10"
                >
                    <motion.span
                        className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-bold text-cyan-600 dark:text-cyan-400/70 mb-6"
                    >
                        <span className="h-px w-8 bg-cyan-600/40 dark:bg-cyan-400/40" />
                        The Module Ecosystem
                        <span className="h-px w-8 bg-cyan-600/40 dark:bg-cyan-400/40" />
                    </motion.span>
                    <h2 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                        8 Agentic AI Modules.
                        <br />
                        <span
                            style={{
                                background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            One Operating System.
                        </span>
                    </h2>
                    <p className="text-lg text-slate-500 dark:text-white/40 max-w-2xl mx-auto">
                        Every module shares a live agent blackboard. Hover a card to see its real-time connections across the iCareOS network.
                    </p>
                </motion.div>

                {/* Module grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                    {MODULES.map((mod, i) => (
                        <ModuleCard
                            key={mod.id}
                            module={mod}
                            index={i}
                            hoveredId={hoveredId}
                            setHoveredId={setHoveredId}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
