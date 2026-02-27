"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function Navbar() {
    return (
        <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-background/70 border-b border-border/40"
        >
            <Link href="/" className="flex items-center gap-2 group">
                <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                >
                    <Stethoscope className="h-8 w-8 text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                </motion.div>
                <span className="text-xl font-bold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    MediScribe
                </span>
            </Link>

            <nav className="flex items-center gap-4">
                <Link href="/learn-more" passHref>
                    <Button variant="ghost" className="hidden md:inline-flex text-muted-foreground hover:text-foreground">
                        Learn More
                    </Button>
                </Link>
                <ThemeToggle />
                <Link href="/login" passHref>
                    <Button variant="ghost" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground">
                        Sign In
                    </Button>
                </Link>
                <Link href="/signup" passHref>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(0,150,136,0.3)] transition-all">
                        Get Started
                    </Button>
                </Link>
            </nav>
        </motion.header>
    );
}
