"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

const STATS = [
    { value: "6x", label: "Faster Documentation" },
    { value: "98%", label: "Coding Accuracy" },
    { value: "40%", label: "Revenue Recovery" },
    { value: "<200ms", label: "Agent Response Time" },
];

const STEPS = [
    {
        number: "01",
        title: "Clinician Records",
        description: "Voice recording captured on any device. Whisper AI transcribes in real-time with clinical precision.",
        color: "#06b6d4",
    },
    {
        number: "02",
        title: "Agents Activate",
        description: "NLP, SOAP, RiskIQ, BillingIQ, and CareCoordIQ fire in parallel — sharing state via the live agent blackboard.",
        color: "#8b5cf6",
    },
    {
        number: "03",
        title: "Structured Output",
        description: "Complete clinical note, risk profile, billing codes, and care plan — ready in seconds, not hours.",
        color: "#10b981",
    },
    {
        number: "04",
        title: "Coordinated Care",
        description: "iSkylar orchestrates follow-up, CareCoordIQ predicts care gaps, all modules stay synchronized.",
        color: "#f59e0b",
    },
];

function StatCard({ stat, index }: { stat: typeof STATS[0]; index: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.5 });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: index * 0.1 }}
            className="text-center"
        >
            <div
                className="text-5xl sm:text-6xl font-black mb-2"
                style={{
                    background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                }}
            >
                {stat.value}
            </div>
            <div className="text-sm text-white/40 font-medium uppercase tracking-widest">{stat.label}</div>
        </motion.div>
    );
}

export function PlatformSection() {
    const titleRef = useRef<HTMLDivElement>(null);
    const titleInView = useInView(titleRef, { once: true, amount: 0.4 });

    return (
        <section
            id="platform"
            className="relative py-32 overflow-hidden"
            style={{ background: "#050810" }}
        >
            {/* Top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)" }} />

            <div className="max-w-7xl mx-auto px-6">
                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 mb-32">
                    {STATS.map((s, i) => <StatCard key={s.label} stat={s} index={i} />)}
                </div>

                {/* Section header */}
                <motion.div
                    ref={titleRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={titleInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-bold text-violet-400/70 mb-6">
                        <span className="h-px w-8 bg-violet-400/40" />
                        How iCareOS Works
                        <span className="h-px w-8 bg-violet-400/40" />
                    </span>
                    <h2 className="text-4xl sm:text-6xl font-black text-white leading-tight">
                        From Voice to Complete
                        <br />
                        <span
                            style={{
                                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            Clinical Intelligence
                        </span>
                    </h2>
                </motion.div>

                {/* Steps */}
                <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute top-10 left-0 right-0 h-px hidden lg:block pointer-events-none"
                        style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.3) 20%, rgba(6,182,212,0.3) 80%, transparent)" }} />

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {STEPS.map((step, i) => {
                            const ref = useRef<HTMLDivElement>(null);
                            const inView = useInView(ref, { once: true, amount: 0.3 });
                            return (
                                <motion.div
                                    key={step.number}
                                    ref={ref}
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={inView ? { opacity: 1, y: 0 } : {}}
                                    transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                                    className="relative"
                                >
                                    {/* Node dot */}
                                    <div className="relative w-20 h-20 mb-6 mx-auto lg:mx-0">
                                        <div className="absolute inset-0 rounded-full opacity-20 blur-lg animate-pulse"
                                            style={{ background: step.color }} />
                                        <div className="relative h-full w-full rounded-full flex items-center justify-center border"
                                            style={{ background: `${step.color}15`, borderColor: `${step.color}40` }}>
                                            <span className="font-black text-lg" style={{ color: step.color }}>{step.number}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-3">{step.title}</h3>
                                    <p className="text-sm text-white/40 leading-relaxed">{step.description}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
