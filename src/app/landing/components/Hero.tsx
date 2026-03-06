"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { AINetworkCanvas } from "./AINetworkCanvas";
import Link from "next/link";

const BADGE_ITEMS = ["GPT-5.2 Powered", "HIPAA-Ready", "Real-Time Agents", "8 AI Modules"];

export function Hero() {
    const heroRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const canvasY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
    const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

    return (
        <section
            ref={heroRef}
            className="relative min-h-screen flex items-center overflow-hidden bg-slate-50 dark:bg-[#050810]"
        >
            {/* Top gradient glow (light vs dark) */}
            <div
                className="absolute inset-0 pointer-events-none hidden dark:block"
                style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,182,212,0.12) 0%, transparent 60%)" }}
            />
            <div
                className="absolute inset-0 pointer-events-none dark:hidden"
                style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,182,212,0.08) 0%, transparent 60%)" }}
            />

            {/* Animated grid */}
            <div
                className="absolute inset-0 opacity-10 dark:opacity-[0.04]"
                style={{
                    backgroundImage: `linear-gradient(rgba(6,182,212,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.8) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* AI Network Canvas — full hero background */}
            <motion.div className="absolute inset-0" style={{ y: canvasY }}>
                <AINetworkCanvas />
            </motion.div>

            {/* Cinematic vignette edges */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#f8fafc_100%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_40%,#050810_100%)] pointer-events-none" />

            {/* Content */}
            <motion.div
                className="relative z-10 w-full max-w-7xl mx-auto px-6 flex flex-col items-center text-center pt-20"
                style={{ y: contentY, opacity }}
            >
                {/* Status badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-50/80 dark:bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-10 shadow-sm dark:shadow-none"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                    Next-Generation Clinical AI Platform
                </motion.div>

                {/* Platform badge row */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="flex flex-wrap justify-center gap-2 mb-8"
                >
                    {BADGE_ITEMS.map((b, i) => (
                        <span
                            key={b}
                            className="px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-white/5 text-slate-500 dark:text-white/50 shadow-sm dark:shadow-none"
                        >
                            {b}
                        </span>
                    ))}
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-none mb-6"
                >
                    <span className="block text-slate-900 dark:text-white">iCareOS</span>
                    <span
                        className="block mt-2 text-2xl sm:text-3xl lg:text-4xl font-bold tracking-normal"
                        style={{
                            background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                        }}
                    >
                        by ChanceTEK
                    </span>
                </motion.h1>

                {/* Subheading */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.55 }}
                    className="text-lg sm:text-2xl font-light text-slate-600 dark:text-white/60 mb-4 tracking-wide"
                >
                    AI-Native Clinical Operating System
                </motion.p>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.65 }}
                    className="max-w-2xl text-base sm:text-lg text-slate-500 dark:text-white/40 leading-relaxed mb-12"
                >
                    Streamline clinical workflows, enhance diagnostics, optimize revenue, and coordinate
                    patient care — all from a single intelligent platform powered by agentic AI.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.75 }}
                    className="flex flex-col sm:flex-row gap-4 items-center"
                >
                    <Link href="/dashboard">
                        <motion.button
                            whileHover={{ scale: 1.04, boxShadow: "0 0 32px rgba(6,182,212,0.5)" }}
                            whileTap={{ scale: 0.97 }}
                            className="group relative px-8 py-4 rounded-2xl font-bold text-sm tracking-wide overflow-hidden text-white shadow-xl dark:shadow-none"
                            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start Your iCareOS Session
                                <motion.span
                                    animate={{ x: [0, 4, 0] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                >
                                    →
                                </motion.span>
                            </span>
                            {/* Shimmer */}
                            <motion.div
                                className="absolute inset-0 -translate-x-full"
                                animate={{ translateX: ["−100%", "200%"] }}
                                transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1 }}
                                style={{
                                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                                }}
                            />
                        </motion.button>
                    </Link>

                    <a href="mailto:Demo@MediScribe.us">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            className="px-8 py-4 rounded-2xl font-bold text-sm tracking-wide border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none transition-colors"
                        >
                            Request a Demo
                        </motion.button>
                    </a>
                </motion.div>

                {/* Scroll indicator */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.8 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                >
                    <span className="text-[10px] tracking-[0.3em] uppercase text-slate-400 dark:text-white/25">Explore Platform</span>
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8 }}
                        className="w-px h-10 bg-gradient-to-b from-cyan-500/40 dark:from-cyan-500/60 to-transparent"
                    />
                </motion.div>
            </motion.div>
        </section>
    );
}
