"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_LINKS = [
    { label: "Platform", href: "/#platform" },
    { label: "Modules", href: "/#modules" },
    { label: "Security", href: "/#security" },
    { label: "Contact", href: "/contact" },
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
                style={{
                    backdropFilter: "blur(20px)",
                }}
                // Using classes for light/dark rather than style obj where possible
                data-scrolled={scrolled}
                className={`rounded-2xl px-6 py-3 flex items-center gap-6 transition-all duration-500 ${scrolled
                    ? "bg-white/80 dark:bg-[#050810]/85 border border-slate-200 dark:border-white/10 shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                    : "bg-white/40 dark:bg-[#050810]/40 border border-slate-100 dark:border-white/5"
                    }`}
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
                        <span className="block text-[7px] text-white/35 font-medium tracking-widest uppercase">by ChanceTEK</span>
                    </div>
                </Link>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5 transition-all duration-200"
                        >
                            {link.label}
                        </a>
                    ))}
                </nav>

                {/* CTA */}
                <div className="hidden md:flex items-center gap-3 shrink-0">
                    <ThemeToggle />
                    <Link href="/login">
                        <button className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white transition-colors px-4 py-2">
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
                <div className="md:hidden ml-auto flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        className="p-2 text-slate-500 hover:text-slate-900 dark:text-white/50 dark:hover:text-white"
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
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-2 rounded-2xl p-4 space-y-1 bg-white/95 dark:bg-[#050810]/95 border border-slate-200 dark:border-white/10"
                        style={{ backdropFilter: "blur(20px)" }}
                    >
                        {NAV_LINKS.map(link => (
                            <a key={link.label} href={link.href}
                                className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/5 transition-all"
                                onClick={() => setMobileOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex gap-2">
                            <Link href="/login" className="flex-1">
                                <button className="w-full py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-white/60 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-transparent dark:hover:text-white transition-colors">
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
