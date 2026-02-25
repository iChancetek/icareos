"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Server } from "lucide-react";

export function SecuritySection() {
    return (
        <section className="py-24 bg-primary/5 relative overflow-hidden">
            {/* Glow Effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-1/2 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="container px-6 mx-auto text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-background border border-border shadow-xl mb-8"
                >
                    <ShieldCheck className="w-10 h-10 text-primary" />
                </motion.div>

                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-3xl md:text-5xl font-bold mb-6"
                >
                    Fort Knox for Health Data
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-lg text-muted-foreground max-w-2xl mx-auto mb-16"
                >
                    We take privacy as seriously as you take patient care. MediScribe is built from the ground up with military-grade encryption and strict compliance protocols.
                </motion.p>

                <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="p-6 rounded-2xl bg-background border border-border/50 shadow-sm flex flex-col items-center gap-4 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold">HIPAA Compliant</h3>
                        <p className="text-sm text-muted-foreground">Rigorous adherence to all health data privacy and security regulations.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="p-6 rounded-2xl bg-background border border-border/50 shadow-sm flex flex-col items-center gap-4 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                            <Lock className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold">End-to-End Encryption</h3>
                        <p className="text-sm text-muted-foreground">Data is encrypted in transit and at rest using AES-256 bit encryption.</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="p-6 rounded-2xl bg-background border border-border/50 shadow-sm flex flex-col items-center gap-4 group"
                    >
                        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <Server className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold">Secure Cloud Architecture</h3>
                        <p className="text-sm text-muted-foreground">Housed in enterprise-grade server environments with isolated tenants.</p>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
