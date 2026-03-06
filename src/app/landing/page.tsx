"use client";

import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { PlatformSection } from "./components/PlatformSection";
import { ModulesSection } from "./components/ModulesSection";
import { SecuritySection } from "./components/SecuritySection";
import { CTASection } from "./components/CTASection";
import { RAGAssistant } from "@/components/rag/RAGAssistant";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-foreground font-sans selection:bg-cyan-500/30 antialiased overflow-x-hidden"
      style={{ background: "#050810" }}
    >
      <Navbar />

      <main>
        <Hero />
        <PlatformSection />
        <ModulesSection />
        <SecuritySection />
        <CTASection />
      </main>

      {/* Footer */}
      <footer
        className="py-16 border-t"
        style={{ background: "#050810", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
              >
                <span className="text-white font-black text-sm">iC</span>
              </div>
              <div>
                <div className="font-black text-white tracking-tight">iCareOS</div>
                <div className="text-[8px] text-white/30 font-medium tracking-widest uppercase">by ChanceTEK</div>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap justify-center gap-8 text-sm text-white/35">
              <a href="https://icareos.tech" className="hover:text-white transition-colors">icareos.tech</a>
              <a href="mailto:Demo@MediScribe.us" className="hover:text-white transition-colors">Request Demo</a>
              <Link href="/dashboard" className="hover:text-white transition-colors">Launch Platform</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-semibold">All Systems Operational</span>
            </div>
          </div>

          {/* Legal */}
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-white/20">
            <p>© {new Date().getFullYear()} iCareOS by ChanceTEK. All Rights Reserved.</p>
            <p>iCareOS is an AI-Native Clinical Operating System. Not a substitute for clinical judgment.</p>
          </div>
        </div>
      </footer>

      <RAGAssistant />
    </div>
  );
}
