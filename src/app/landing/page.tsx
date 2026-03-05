"use client";

import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { ProblemSection } from "./components/ProblemSection";
import { HowItWorks } from "./components/HowItWorks";
import { AIIntelligence } from "./components/AIIntelligence";
import { SecuritySection } from "./components/SecuritySection";
import { Testimonials } from "./components/Testimonials";
import { CTASection } from "./components/CTASection";
import { RAGAssistant } from "@/components/rag/RAGAssistant";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 antialiased overflow-x-hidden">
      <Navbar />

      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <AIIntelligence />
        <SecuritySection />
        <Testimonials />
        <CTASection />
      </main>

      <footer className="py-12 bg-background border-t border-border/50 text-center">
        <div className="container px-6 mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/30">
              <div className="w-3 h-3 text-primary stroke-[3px]" />
            </div>
            <span className="font-bold tracking-tight text-foreground">iCareOS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} iCareOS by ChanceTEK. All Rights Reserved.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            <a href="https://icareos.tech" className="hover:text-primary transition-colors">icareos.tech</a>
          </p>
        </div>
      </footer>

      <RAGAssistant />
    </div>
  );
}
