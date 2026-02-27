"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BrainCircuit, History, ArrowRight } from "lucide-react";
import Link from "next/link";
import CdsImageUpload from "@/components/chat/CdsImageUpload";
import CdsHistoryPanel from "@/components/chat/CdsHistoryPanel";

export default function CdsPage() {
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    const handleAnalysisComplete = () => {
        setHistoryRefreshKey(k => k + 1);
    };

    return (
        <div className="container mx-auto px-4 md:px-6 py-8 space-y-10 max-w-5xl">

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="space-y-1"
            >
                <div className="flex items-center gap-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
                        Clinical Decision Support · MediScribe AI
                    </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight">AI Clinical Analysis</h1>
                <p className="text-sm text-muted-foreground">
                    Multimodal AI support for wound care and radiographic interpretation. All outputs are clinical decision support — not autonomous diagnosis. Every analysis is persistently stored and time-stamped.
                </p>
            </motion.div>

            {/* Disclaimer Banner */}
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-semibold text-yellow-300">Clinical Decision Support — Not a Diagnosis</p>
                    <p className="text-xs text-yellow-400/80 mt-1">
                        This tool assists licensed clinical professionals. All AI findings must be reviewed and confirmed by a qualified clinician before treatment decisions are made. All analyses are logged for compliance and audit.
                    </p>
                </div>
            </div>

            {/* Two-column layout */}
            <div className="grid lg:grid-cols-2 gap-8">

                {/* Wound & X-Ray Image Analysis */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
                    className="space-y-3"
                >
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <ShieldCheck className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold">Image Analysis</h2>
                            <p className="text-xs text-muted-foreground">Wound care · Dermatology · Radiographic support</p>
                        </div>
                    </div>
                    <CdsImageUpload onAnalysisComplete={handleAnalysisComplete} />
                </motion.div>

                {/* AI Conversational Intake placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
                    className="space-y-3"
                >
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
                            <BrainCircuit className="h-4 w-4 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold">AI Conversational Intake</h2>
                            <p className="text-xs text-muted-foreground">LangGraph goal-driven orchestrator</p>
                        </div>
                    </div>
                    {/* Dynamically import AiIntakeChat to avoid SSR issues */}
                    <Link href="/dashboard/iskylar" className="block group">
                        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-6 text-center transition-all hover:bg-violet-500/10 hover:border-violet-500/40 min-h-[220px] flex flex-col items-center justify-center gap-4">
                            <div className="relative">
                                <BrainCircuit className="h-12 w-12 text-violet-400 animate-pulse" />
                                <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-violet-300">Launch Orchestrator</h3>
                                <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                                    Start a goal-driven clinical intake session powered by LangGraph.
                                </p>
                            </div>
                            <div className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-violet-400 group-hover:gap-3 transition-all">
                                Open iSkylar <ArrowRight className="h-3 w-3" />
                            </div>
                        </div>
                    </Link>
                </motion.div>
            </div>

            {/* Clinical Imaging Archive */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.45, ease: "easeOut" }}
                className="space-y-3"
            >
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-8 w-8 flex items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20">
                        <History className="h-4 w-4 text-teal-400" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold">Clinical Imaging Archive</h2>
                        <p className="text-xs text-muted-foreground">Persistent audit trail · Clinician sign-off · MediScribe AI</p>
                    </div>
                </div>
                <CdsHistoryPanel refreshKey={historyRefreshKey} />
            </motion.div>
        </div>
    );
}
