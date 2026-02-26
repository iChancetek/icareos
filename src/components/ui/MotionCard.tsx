"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface MotionCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    hover?: boolean;
    glow?: boolean;
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
    ({ children, className, delay = 0, hover = true, glow = false, ...props }, ref) => (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: 0.4,
                delay,
                ease: "easeOut",
            }}
            whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
            className={cn(
                "rounded-2xl border bg-card glass neural-border transition-shadow duration-300",
                glow && "dark:glow-cyan",
                className
            )}
            {...props}
        >
            {children}
        </motion.div>
    )
);

MotionCard.displayName = "MotionCard";

/* ── Stagger container helper ─────────────────────────────── */
export const staggerContainer = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.08, delayChildren: 0.05 },
    },
};

export const fadeUpItem = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4 },
    },
};

export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div
            className={className}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
        >
            {children}
        </motion.div>
    );
}

export function FadeUpItem({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <motion.div className={className} variants={fadeUpItem}>
            {children}
        </motion.div>
    );
}
