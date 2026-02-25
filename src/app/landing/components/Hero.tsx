"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Activity, FileText, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

const TypingText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
    return (
        <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1, delay }}
        >
            {text.split("").map((char, index) => (
                <motion.span
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                        duration: 0.05,
                        delay: delay + index * 0.03,
                    }}
                >
                    {char}
                </motion.span>
            ))}
        </motion.span>
    );
};

export function Hero() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-24 pb-16">
            {/* Background Neural / Waveform Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 dark:to-primary/10" />
                <motion.div
                    animate={{
                        backgroundPosition: ["0px 0px", "100px 100px"],
                    }}
                    transition={{
                        repeat: Infinity,
                        duration: 20,
                        ease: "linear"
                    }}
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent bg-[length:20px_20px]"
                />
                {/* Glow Spheres */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-[128px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[128px]"
                />
            </div>

            <div className="container relative z-10 px-6 mx-auto grid lg:grid-cols-2 gap-12 items-center">
                {/* Left: Copy & CTAs */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col gap-8 max-w-2xl"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary w-fit border border-primary/20 backdrop-blur-sm">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        <span className="text-sm font-medium tracking-wide">Next-Gen Medical AI is Here</span>
                    </div>

                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                        AI That Writes <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Clinical Notes</span> <br />
                        So You Don't Have To.
                    </h1>

                    <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                        Real-time transcription. Intelligent SOAP generation. Seamless EHR integration. Reclaim your time and focus on what truly matters: your patients.
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        <Link href="/signup" passHref>
                            <Button size="lg" className="h-14 px-8 text-base font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300">
                                Start Free Trial
                                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link href="/learn-more" passHref>
                            <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold rounded-full border-border hover:bg-muted/50 transition-all duration-300 backdrop-blur-sm">
                                Request Demo
                            </Button>
                        </Link>
                    </div>
                </motion.div>

                {/* Right: Holographic Dashboard */}
                {mounted && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, rotateX: 20 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ duration: 1, delay: 0.2, type: "spring", stiffness: 50 }}
                        className="relative lg:h-[600px] w-full perspective-1000"
                    >
                        {/* Main Holographic Panel */}
                        <div className="absolute inset-0 rounded-2xl border border-white/10 dark:border-white/5 bg-background/40 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col">
                            {/* Fake Mac Header */}
                            <div className="h-10 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/20">
                                <div className="w-3 h-3 rounded-full bg-destructive/80" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                <div className="mx-auto text-xs text-muted-foreground font-medium flex items-center gap-2">
                                    <Activity className="w-3 h-3" /> Live Transcription active
                                </div>
                            </div>

                            {/* Panel Content */}
                            <div className="flex-1 p-6 flex flex-col gap-6 relative">
                                {/* Audio Waveform Viz (Simulated) */}
                                <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 relative overflow-hidden">
                                    <motion.div
                                        animate={{ x: ["-100%", "100%"] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent w-1/2"
                                    />
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                        <Mic className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-1 h-6">
                                            {[...Array(20)].map((_, i) => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: ["20%", `${Math.random() * 80 + 20}%`, "20%"] }}
                                                    transition={{ duration: 0.8 + Math.random() * 0.5, repeat: Infinity, ease: "easeInOut" }}
                                                    className="w-1.5 bg-primary/60 rounded-full"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Live Transcript */}
                                <div className="flex-1 rounded-xl bg-card border border-border/50 p-5 shadow-inner relative">
                                    <div className="absolute top-0 right-0 p-3">
                                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 uppercase flex items-center gap-1">
                                            <FileText className="w-3 h-3" /> SOAP Generating
                                        </div>
                                    </div>

                                    <div className="space-y-4 font-mono text-sm">
                                        <div className="text-muted-foreground">
                                            <TypingText text="[10:42 AM] Patient complains of a persistent cough for the past 3 weeks." delay={0.5} />
                                        </div>
                                        <div className="text-muted-foreground">
                                            <TypingText text="[10:43 AM] Also notes slight shortness of breath when climbing stairs." delay={2} />
                                        </div>

                                        {/* SOAP Generation Overlay */}
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 4, duration: 0.5 }}
                                            className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20 relative overflow-hidden"
                                        >
                                            <motion.div
                                                animate={{ top: ["-100%", "200%"] }}
                                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/20 to-transparent w-full h-1/2"
                                            />
                                            <h4 className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">Generated Assessment</h4>
                                            <p className="text-foreground leading-relaxed">
                                                <TypingText text="Suspected acute bronchitis vs. mild asthma exacerbation. Plan: Chest X-ray, prescribe Albuterol inhaler PRN." delay={4.5} />
                                            </p>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Elements (Background) */}
                        <motion.div
                            animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -right-12 top-20 p-4 rounded-xl bg-card border border-border/50 shadow-xl backdrop-blur-xl z-20"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">HIPAA Compliant</p>
                                    <p className="text-xs text-muted-foreground">End-to-End Encrypted</p>
                                </div>
                            </div>
                        </motion.div>

                    </motion.div>
                )}
            </div>
        </section>
    );
}
