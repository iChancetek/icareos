"use client";

import { motion } from "framer-motion";
import { Mic, BrainCircuit, FileText } from "lucide-react";

const steps = [
    {
        id: 1,
        title: "Listen",
        description: "Capture the conversation naturally. MediScribe accurately transcribes complex medical terminology on the fly.",
        icon: Mic,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
    },
    {
        id: 2,
        title: "Process",
        description: "Advanced context-aware NLP analyzes the transcript to extract symptoms, history, and physical exam findings.",
        icon: BrainCircuit,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
    },
    {
        id: 3,
        title: "Generate",
        description: "Instantly formats the extracted data into a perfect, structured SOAP note ready for any EHR system.",
        icon: FileText,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
    }
];

export function HowItWorks() {
    return (
        <section className="py-24 bg-background relative" id="how-it-works">
            <div className="container px-6 mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold mb-4">How MediScribe Works</h2>
                    <p className="text-lg text-muted-foreground">Three simple steps to seamless clinical documentation.</p>
                </div>

                <div className="flex flex-col md:flex-row justify-center items-start gap-8 relative">
                    {/* Connector Line */}
                    <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-border/50 -z-10" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={step.id}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-100px" }}
                            transition={{ duration: 0.6, delay: index * 0.2 }}
                            className="flex-1 text-center relative"
                        >
                            <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-xl ${step.bg} border border-border/50 relative overflow-hidden group`}>
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/10 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                                <step.icon className={`w-10 h-10 ${step.color} relative z-10 transition-transform group-hover:scale-110`} />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                {step.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
