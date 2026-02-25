"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles, AudioWaveform } from "lucide-react";

export function AIIntelligence() {
    return (
        <section className="py-24 overflow-hidden relative" id="ai-intelligence">
            {/* Background Grid */}
            <div className="absolute inset-0 z-0 bg-grid-white/[0.02] bg-grid-black/[0.02] bg-[size:50px_50px]" />
            <div className="absolute inset-0 z-0 bg-background/80 backdrop-blur-[1px]" />

            <div className="container relative z-10 px-6 mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Left: Interactive Visualization */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative h-[500px] rounded-3xl border border-primary/20 bg-background/50 shadow-2xl backdrop-blur-xl overflow-hidden flex items-center justify-center"
                    >
                        {/* Central Brain Node */}
                        <motion.div
                            animate={{ scale: [1, 1.05, 1], boxShadow: ["0 0 20px rgba(var(--primary), 0.2)", "0 0 60px rgba(var(--primary), 0.6)", "0 0 20px rgba(var(--primary), 0.2)"] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="w-32 h-32 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center z-20 backdrop-blur-md"
                        >
                            <Brain className="w-12 h-12 text-primary" />
                        </motion.div>

                        {/* Orbiting Elements */}
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={i}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 flex items-center justify-center"
                            >
                                <div className={`w-[${250 + i * 100}px] h-[${250 + i * 100}px] rounded-full border border-primary/10 absolute`} />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "linear" }}
                                    className={`w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center shadow-lg absolute -top-6 ${i === 1 ? 'right-0 top-auto left-auto' : ''}`}
                                >
                                    {i === 0 && <AudioWaveform className="w-5 h-5 text-accent" />}
                                    {i === 1 && <Sparkles className="w-5 h-5 text-yellow-500" />}
                                    {i === 2 && <span className="text-xs font-bold text-primary">NLP</span>}
                                </motion.div>
                            </motion.div>
                        ))}

                        {/* Connecting Lines */}
                        <svg className="absolute inset-0 w-full h-full opacity-20 z-10 pointer-events-none">
                            <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary animate-pulse" />
                            <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary animate-pulse" />
                            <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary animate-pulse" />
                            <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-primary animate-pulse" />
                        </svg>
                    </motion.div>

                    {/* Right: Copy */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                    >
                        <h2 className="text-4xl font-bold mb-6">Uncompromising Medical Intelligence</h2>
                        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                            MediScribe isn't just a dictation tool. It's a highly specialized medical AI trained to understand nuanced clinical context, complex pharmacology, and distinct medical accents.
                        </p>

                        <ul className="space-y-6">
                            {[
                                { title: "Advanced Speech Recognition", desc: "Captures rapid, complex medical terminology with near-perfect accuracy, even in noisy environments." },
                                { title: "Context-Aware Summarization", desc: "Distills meandering patient histories into concise, actionable clinical narratives." },
                                { title: "Multilingual Support", desc: "Seamlessly handles English, Spanish, French, Mandarin, and Arabic, bridging communication gaps instantly." }
                            ].map((item, i) => (
                                <motion.li
                                    key={i}
                                    whileHover={{ x: 10 }}
                                    transition={{ type: "spring", stiffness: 300 }}
                                    className="flex flex-col gap-2 p-4 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
                                >
                                    <h4 className="text-xl font-bold text-foreground">{item.title}</h4>
                                    <p className="text-muted-foreground">{item.desc}</p>
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>

                </div>
            </div>
        </section>
    );
}
