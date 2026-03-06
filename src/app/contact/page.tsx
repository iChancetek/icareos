"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../landing/components/Navbar";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { AINetworkCanvas } from "../landing/components/AINetworkCanvas";

const formSchema = z.object({
    name: z.string().min(2, "Name is required"),
    email: z.string().email("Invalid email address"),
    organization: z.string().optional(),
    subject: z.string().min(1, "Please select a subject"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

type FormData = z.infer<typeof formSchema>;

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isValid },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        mode: "onChange",
    });

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setSubmitStatus("idle");

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Failed to send message");

            setSubmitStatus("success");
            reset();
        } catch (error) {
            console.error(error);
            setSubmitStatus("error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#050810] text-slate-900 dark:text-foreground font-sans selection:bg-cyan-500/30 antialiased overflow-x-hidden flex flex-col">
            <Navbar />

            <main className="flex-1 relative flex items-center pt-28 pb-20 justify-center">
                {/* Animated Background from Landing Page */}
                <div className="absolute inset-0 z-0 opacity-40 dark:opacity-100 pointer-events-none">
                    <AINetworkCanvas />
                </div>

                {/* Vignette overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#f8fafc_90%)] dark:bg-[radial-gradient(ellipse_at_center,transparent_0%,#050810_90%)] pointer-events-none z-0" />

                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 lg:gap-24">

                    {/* Header & Info Section */}
                    <motion.div
                        initial={{ opacity: 0, x: -40 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col justify-center"
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/5 text-cyan-600 dark:text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-8 shadow-sm dark:shadow-none w-fit"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                            Connect with us
                        </motion.div>

                        <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-tight mb-6">
                            Contact the <br />
                            <span
                                style={{
                                    background: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                }}
                            >
                                iCareOS Team
                            </span>
                        </h1>

                        <p className="text-lg text-slate-600 dark:text-white/60 max-w-lg leading-relaxed mb-12">
                            Have questions about the iCareOS platform, enterprise deployment, or partnerships?
                            Send us a message and our team will respond shortly.
                        </p>

                        <div className="space-y-6">
                            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] shadow-sm dark:shadow-none">
                                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1 uppercase tracking-widest">
                                    Direct Email
                                </p>
                                <a
                                    href="mailto:chancellor@ichancetek.com"
                                    className="text-lg text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors font-medium break-all"
                                >
                                    chancellor@ichancetek.com
                                </a>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-white/40">
                                For enterprise inquiries, partnerships, or platform demonstrations,
                                please contact our team using the form.
                            </p>
                        </div>
                    </motion.div>

                    {/* Form Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#050810]/80 shadow-2xl dark:shadow-none backdrop-blur-3xl relative overflow-hidden">

                            {/* Form Ambient Glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-500/10 dark:bg-violet-500/20 rounded-full blur-[80px] pointer-events-none" />

                            <AnimatePresence mode="wait">
                                {submitStatus === "success" ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center text-center py-20 relative z-10"
                                    >
                                        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Message Sent Successfully</h3>
                                        <p className="text-slate-600 dark:text-white/60">
                                            Thank you for contacting the iCareOS team.<br />
                                            Our team will respond as soon as possible.
                                        </p>
                                        <button
                                            onClick={() => setSubmitStatus("idle")}
                                            className="mt-8 px-6 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                        >
                                            Send Another Message
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        onSubmit={handleSubmit(onSubmit)}
                                        className="space-y-5 relative z-10"
                                    >
                                        {submitStatus === "error" && (
                                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3">
                                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-bold text-red-800 dark:text-red-400">Unable to send message</p>
                                                    <p className="text-sm text-red-600 dark:text-red-300">
                                                        Please try again or contact us directly at chancellor@ichancetek.com
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50">Full Name *</label>
                                                <input
                                                    {...register("name")}
                                                    type="text"
                                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all dark:text-white text-slate-900"
                                                    placeholder="Dr. Sarah Connor"
                                                />
                                                {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50">Email Address *</label>
                                                <input
                                                    {...register("email")}
                                                    type="email"
                                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all dark:text-white text-slate-900"
                                                    placeholder="sarah@hospital.org"
                                                />
                                                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50">Organization</label>
                                            <input
                                                {...register("organization")}
                                                type="text"
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all dark:text-white text-slate-900"
                                                placeholder="e.g. Mass General, Cedar Sinai"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50">Subject *</label>
                                            <select
                                                {...register("subject")}
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-slate-900 dark:text-white appearance-none"
                                            >
                                                <option value="" disabled className="dark:bg-[#050810] dark:text-white">Select a subject...</option>
                                                <option value="General Inquiry" className="dark:bg-[#050810] dark:text-white">General Inquiry</option>
                                                <option value="Platform Demo Request" className="dark:bg-[#050810] dark:text-white">Platform Demo Request</option>
                                                <option value="Partnership Inquiry" className="dark:bg-[#050810] dark:text-white">Partnership Inquiry</option>
                                                <option value="Technical Support" className="dark:bg-[#050810] dark:text-white">Technical Support</option>
                                                <option value="Enterprise Deployment" className="dark:bg-[#050810] dark:text-white">Enterprise Deployment</option>
                                            </select>
                                            {errors.subject && <p className="text-xs text-red-500 font-medium">{errors.subject.message}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-white/50">Message *</label>
                                            <textarea
                                                {...register("message")}
                                                rows={5}
                                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all dark:text-white text-slate-900 resize-none"
                                                placeholder="How can we help you?"
                                            />
                                            {errors.message && <p className="text-xs text-red-500 font-medium">{errors.message.message}</p>}
                                        </div>

                                        <motion.button
                                            whileHover={isValid && !isSubmitting ? { scale: 1.02, boxShadow: "0 0 20px rgba(6,182,212,0.4)" } : undefined}
                                            whileTap={isValid && !isSubmitting ? { scale: 0.98 } : undefined}
                                            type="submit"
                                            disabled={!isValid || isSubmitting}
                                            className={`w-full relative py-4 rounded-xl font-bold text-sm tracking-wide text-white overflow-hidden transition-all ${isValid
                                                    ? "shadow-lg"
                                                    : "opacity-60 cursor-not-allowed grayscale"
                                                }`}
                                            style={{
                                                background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
                                            }}
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                        Sending...
                                                    </>
                                                ) : (
                                                    "Send Message"
                                                )}
                                            </span>
                                            {isValid && !isSubmitting && (
                                                <motion.div
                                                    className="absolute inset-0"
                                                    animate={{ backgroundPosition: ["200% 0", "-200% 0"] }}
                                                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                                    style={{
                                                        background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
                                                        backgroundSize: "200% 100%",
                                                    }}
                                                />
                                            )}
                                        </motion.button>
                                    </motion.form>
                                )}
                            </AnimatePresence>

                        </div>
                    </motion.div>

                </div>
            </main>

            {/* Reused Footer from Landing */}
            <footer className="py-16 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#050810]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                        <div className="flex items-center gap-3">
                            <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center shadow-lg dark:shadow-none"
                                style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
                            >
                                <span className="text-white font-black text-sm">iC</span>
                            </div>
                            <div>
                                <div className="font-black text-slate-900 dark:text-white tracking-tight">iCareOS</div>
                                <div className="text-[8px] text-slate-500 dark:text-white/30 font-medium tracking-widest uppercase">by ChanceTEK</div>
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-600 dark:text-white/35">
                            <a href="https://icareos.tech" className="hover:text-slate-900 dark:hover:text-white transition-colors">Home</a>
                            <a href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Platform</a>
                            <a href="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">Sign In</a>
                        </div>

                        <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">All Systems Operational</span>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-white/20">
                        <p>© {new Date().getFullYear()} iCareOS by ChanceTEK. All Rights Reserved.</p>
                        <p>iCareOS is an AI-Native Clinical Operating System. Not a substitute for clinical judgment.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
