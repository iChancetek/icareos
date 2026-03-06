"use client";

import { motion } from "framer-motion";
import { Navbar } from "../landing/components/Navbar";
import {
  Bot,
  BrainCircuit,
  Database,
  Mic,
  ShieldCheck,
  Stethoscope,
  Zap,
  Search,
  Network,
  Cpu,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const features = [
  {
    title: "Real-time Voice Transcription",
    description: "High-fidelity clinical audio processing powered by advanced STT models, ensuring every detail is captured with medical-grade accuracy.",
    icon: Mic,
    category: "AI Core"
  },
  {
    title: "Neural SOAP Generation",
    description: "Autonomous documentation that intelligently extracts Subjective, Objective, Assessment, and Plan data into structured clinical notes.",
    icon: Stethoscope,
    category: "Automation"
  },
  {
    title: "Agentic AI Orchestration",
    description: "Multi-agent workflows managed by LangGraph, enabling goal-driven clinical tasks and autonomous decision support.",
    icon: BrainCircuit,
    category: "Orchestration"
  },
  {
    title: "Agent2Agent (A2A) System",
    description: "A collaborative intelligence layer where specialized AI agents communicate to refine and validate patient data in real-time.",
    icon: Network,
    category: "Orchestration"
  },
  {
    title: "Retrieval-Augmented Generation (RAG)",
    description: "Knowledge-base intelligence using vector embeddings to provide authoritative answers about platform features and compliance.",
    icon: Search,
    category: "Intelligence"
  },
  {
    title: "Vector Database Architecture",
    description: "High-performance semantic storage using modern vector indexing for low-latency similarity search and context retrieval.",
    icon: Database,
    category: "Infrastructure"
  },
  {
    title: "Compliance & Security",
    description: "Enterprise-grade safeguards including NLP-based PHI scrubbing and end-to-end encryption for all clinical data.",
    icon: ShieldCheck,
    category: "Security"
  },
  {
    title: "MCP Compatibility",
    description: "Future-proof integration with the Model Context Protocol, allowing seamless tool and data exchange across AI ecosystems.",
    icon: Layers,
    category: "Innovation"
  }
];

export default function LearnMorePage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 antialiased overflow-x-hidden">
      <Navbar />

      <main className="pt-32 pb-24">
        {/* Hero Section */}
        <section className="container px-6 mx-auto mb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              The Engine Behind <span className="text-primary">iCareOS.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Explore the advanced neural architecture and agentic orchestration system that powers the future of clinical documentation.
            </p>
          </motion.div>
        </section>

        {/* Feature Grid */}
        <section className="container px-6 mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 hover:bg-card/80 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                {feature.category}
              </p>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </section>

        {/* Deep Dive Section */}
        <section className="container px-6 mx-auto space-y-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center"
          >
            <div className="space-y-6">
              <h2 className="text-3xl font-bold tracking-tight">Advanced RAG Infrastructure</h2>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Our Retrieval-Augmented Generation system uses 1536-dimensional embeddings to map technical documentation into a semantic vector space.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Recursive chunking (500-1000 tokens)</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Low-latency vector similarity search</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Metadata-filtered retrieval flows</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="relative aspect-square rounded-3xl bg-slate-100 dark:bg-slate-900 border border-border overflow-hidden p-8 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
              <Cpu className="w-32 h-32 text-primary opacity-20 absolute top-10 right-10" />
              <div className="relative z-10 space-y-4 w-full">
                <div className="h-2 w-3/4 bg-primary/20 rounded-full animate-pulse" />
                <div className="h-2 w-1/2 bg-primary/10 rounded-full animate-pulse delay-75" />
                <div className="h-2 w-2/3 bg-primary/20 rounded-full animate-pulse delay-150" />
              </div>
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="container px-6 mx-auto mt-32 text-center">
          <div className="p-12 rounded-[3rem] bg-slate-900 border border-white/10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/20 blur-[100px] rounded-full" />
            <h2 className="text-4xl font-bold mb-6 relative z-10">Ready to transform your practice?</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                  Join iCareOS
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" size="lg" className="h-12 px-8 rounded-xl border-white/20 hover:bg-white/10 text-white">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 bg-background border-t border-border/50 text-center">
        <div className="container px-6 mx-auto">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} iCareOS by ChanceTEK. All Rights Reserved. | icareos.tech
          </p>
        </div>
      </footer>
    </div>
  );
}
