"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const ITEMS = [
    { icon: "🔒", title: "HIPAA-Ready Architecture", desc: "All PHI handling follows HIPAA Security Rule requirements. Zero data leaves the pipeline unencrypted." },
    { icon: "🛡️", title: "SOC 2 Aligned Controls", desc: "Access controls, audit logging, and incident response built into every agent layer." },
    { icon: "📋", title: "Full Audit Trail", desc: "Every agent action, session, and data write is timestamped and cryptographically logged." },
    { icon: "🏥", title: "Clinical-Grade Reliability", desc: "99.9% uptime SLA. Each agent has a graceful fallback — one failure never disrupts care." },
    { icon: "🌐", title: "Multi-Site Enterprise", desc: "Built for health systems and enterprise deployments across multiple facilities." },
    { icon: "⚡", title: "Sub-200ms Agent Response", desc: "GPT-5.2 structured output with parallel agent execution. Clinical speed, AI accuracy." },
];

export function SecuritySection() {
    const titleRef = useRef<HTMLDivElement>(null);
    const titleInView = useInView(titleRef, { once: true, amount: 0.4 });

    return (
        <section
            id="security"
            className="relative py-32 overflow-hidden"
            style={{ background: "linear-gradient(180deg, #06091a 0%, #050810 100%)" }}
        >
            {/* Border top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] pointer-events-none"
                style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)" }} />

            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    ref={titleRef}
                    initial={{ opacity: 0, y: 30 }}
                    animate={titleInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-bold text-emerald-400/70 mb-6">
                        <span className="h-px w-8 bg-emerald-400/40" />
                        Enterprise Security
                        <span className="h-px w-8 bg-emerald-400/40" />
                    </span>
                    <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 leading-tight">
                        Built for Healthcare.
                        <br />
                        <span
                            style={{
                                background: "linear-gradient(135deg, #10b981, #06b6d4)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            Secured for Trust.
                        </span>
                    </h2>
                    <p className="text-lg text-white/40 max-w-xl mx-auto">
                        Every layer of iCareOS is designed with clinical security and compliance as the foundation, not an afterthought.
                    </p>
                </motion.div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ITEMS.map((item, i) => {
                        const ref = useRef<HTMLDivElement>(null);
                        const inView = useInView(ref, { once: true, amount: 0.3 });
                        return (
                            <motion.div
                                key={item.title}
                                ref={ref}
                                initial={{ opacity: 0, y: 30 }}
                                animate={inView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                                whileHover={{ borderColor: "rgba(16,185,129,0.35)", boxShadow: "0 0 24px rgba(16,185,129,0.12)" }}
                                className="p-6 rounded-2xl border border-white/7 bg-white/[0.02] transition-all duration-300"
                            >
                                <div className="text-3xl mb-4">{item.icon}</div>
                                <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                                <p className="text-sm text-white/40 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
