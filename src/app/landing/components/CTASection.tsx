"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
    return (
        <section className="relative py-32 overflow-hidden border-t border-border/50">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-background z-0" />
            <motion.div
                animate={{
                    background: [
                        "radial-gradient(circle at 0% 0%, rgba(var(--primary), 0.15) 0%, transparent 50%)",
                        "radial-gradient(circle at 100% 100%, rgba(var(--primary), 0.15) 0%, transparent 50%)",
                        "radial-gradient(circle at 0% 0%, rgba(var(--primary), 0.15) 0%, transparent 50%)",
                    ]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-0 opacity-50"
            />

            <div className="container px-6 mx-auto relative z-10 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl mx-auto"
                >
                    <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
                        Reclaim Your Time. <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Focus on Patients.</span>
                    </h2>
                    <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
                        Experience the future of clinical documentation. Start using MediScribe today and eliminate after-hours charting forever.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup" passHref>
                            <Button size="lg" className="group h-14 px-8 text-lg font-semibold rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all duration-300 w-full sm:w-auto">
                                Start Free Trial
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link href="/learn-more" passHref>
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold rounded-full border-border hover:bg-muted/50 transition-all duration-300 backdrop-blur-sm w-full sm:w-auto">
                                Request Demo
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
