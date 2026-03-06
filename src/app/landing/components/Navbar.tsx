"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
    { label: "Platform", href: "#platform" },
    { label: "Modules", href: "#modules" },
    { label: "Security", href: "#security" },
    { label: "Contact", href: "mailto:Demo@MediScribe.us" },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-6xl"
        >
            <div
                className="rounded-2xl px-6 py-3 flex items-center gap-6 transition-all duration-500"
                style={{
                    background: scrolled
                        ? "rgba(5,8,16,0.85)"
                        : "rgba(5,8,16,0.4)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.4)" : "none",
                }}
            >
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5 shrink-0">
                    <div className="relative h-8 w-8 rounded-lg flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}>
                        <span className="text-white font-black text-xs">iC</span>
                        <div className="absolute inset-0 rounded-lg animate-pulse opacity-40"
                            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }} />
                    </div>
                    <div className="leading-tight">
                        <span className="font-black text-sm text-white tracking-tight">iCareOS</span>
                        <span className="block text-[9px] text-white/35 font-medium tracking-widest uppercase">by ChanceTEK</span>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                    <Link href="/login">
                        <button className="text-sm font-semibold text-white/50 hover:text-white transition-colors px-4 py-2">
                            Sign In
                        </button>
                    </Link>
                    <Link href="/dashboard">
                        <motion.button
                            whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(6,182,212,0.4)" }}
                            whileTap={{ scale: 0.97 }}
                            className="px-5 py-2 rounded-xl text-sm font-bold text-white"
                            style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}
                        >
                            Launch Platform →
                        </motion.button>
                    </Link>
                </div>

                {/* Mobile hamburger */}
                <button
                    className="md:hidden ml-auto p-2 text-white/50 hover:text-white"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    <div className="w-5 space-y-1">
                        <motion.div animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                            className="h-px bg-current" />
                        <motion.div animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
                            className="h-px bg-current" />
                        <motion.div animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                            className="h-px bg-current" />
                    </div>
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-2 rounded-2xl p-4 space-y-1"
                        style={{ background: "rgba(5,8,16,0.95)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                        {NAV_LINKS.map(link => (
                            <a key={link.label} href={link.href}
                                className="block px-4 py-3 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all"
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="pt-2 border-t border-white/10 flex gap-2">
                            <Link href="/login" className="flex-1">
                                <button className="w-full py-3 rounded-xl text-sm font-semibold text-white/60 border border-white/10 hover:text-white transition-colors">
                                    Sign In
                                </button>
                            </Link>
                            <Link href="/dashboard" className="flex-1">
                                <button className="w-full py-3 rounded-xl text-sm font-bold text-white"
                                    style={{ background: "linear-gradient(135deg, #06b6d4, #8b5cf6)" }}>
                                    Launch →
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
