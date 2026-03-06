"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";

export function CTASection() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.4 });

    return (
        <section
            className="relative py-40 overflow-hidden bg-slate-50 dark:bg-[#050810]"
        >
            {/* Background glow burst */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                    className="w-[800px] h-[400px] rounded-full opacity-10 dark:opacity-15 blur-[100px]"
                    style={{ background: "radial-gradient(ellipse, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)" }}
                />
            </div>

            {/* Animated grid pulse */}
            <div
                className="absolute inset-0 opacity-10 dark:opacity-[0.025]"
                style={{
                    backgroundImage: `linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="max-w-5xl mx-auto px-6 relative z-10">
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 40 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center"
                >
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={inView ? { opacity: 1, scale: 1 } : {}}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-10 shadow-sm dark:shadow-none"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                        icareos.tech — Now Available
                    </motion.div>

                    <h2 className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white leading-none mb-6">
                        The Future of
                        <br />
                        <span
                            style={{
                                background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                            }}
                        >
                            Clinical AI
                        </span>
                        <br />
                        Is Here.
                    </h2>

                    <p className="text-lg text-slate-500 dark:text-white/40 max-w-xl mx-auto mb-14 leading-relaxed">
                        Join the clinicians and health systems already running iCareOS.
                        8 AI agents. One unified platform. Zero compromise on quality.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/dashboard">
                            <motion.button
                                whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(6,182,212,0.5)" }}
                                whileTap={{ scale: 0.97 }}
                                className="relative px-10 py-5 rounded-2xl font-bold text-base tracking-wide text-white overflow-hidden shadow-xl dark:shadow-none"
                                style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899)" }}
                            >
                                Start Your iCareOS Session →
                                {/* Shimmer */}
                                <motion.div
                                    className="absolute inset-0"
                                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                    style={{
                                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                                        backgroundSize: "200% 100%",
                                    }}
                                />
                            </motion.button>
                        </Link>

                        <Link href="/learn-more">
                            <motion.button
                                whileHover={{ scale: 1.04, borderColor: "rgba(6,182,212,0.5)" }}
                                whileTap={{ scale: 0.97 }}
                                className="px-10 py-5 rounded-2xl font-bold text-base tracking-wide border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:dark:border-cyan-500/50 shadow-sm dark:shadow-none transition-all"
                            >
                                Learn More
                            </motion.button>
                        </Link>

                        <Link href="/login">
                            <motion.button
                                whileHover={{ scale: 1.04, borderColor: "rgba(6,182,212,0.5)" }}
                                whileTap={{ scale: 0.97 }}
                                className="px-10 py-5 rounded-2xl font-bold text-base tracking-wide border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-transparent text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 hover:dark:bg-white/10 shadow-sm dark:shadow-none transition-all"
                            >
                                Sign In
                            </motion.button>
                        </Link>
                    </div>

                    {/* Trust indicators */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ delay: 0.5 }}
                        className="mt-16 flex flex-wrap justify-center gap-8 text-xs text-slate-400 dark:text-white/25 font-medium uppercase tracking-widest"
                    >
                        {["SOC 2 Ready", "HIPAA Compliant Architecture", "Enterprise SLA", "99.9% Uptime"].map(s => (
                            <span key={s} className="flex items-center gap-2">
                                <span className="h-1 w-1 rounded-full bg-cyan-500/50" />{s}
                            </span>
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
