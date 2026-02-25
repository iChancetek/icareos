"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function AnimatedCounter({ from, to, duration = 2 }: { from: number, to: number, duration?: number }) {
    const [count, setCount] = useState(from);
    const nodeRef = useRef<HTMLSpanElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                }
            },
            { threshold: 0.5 }
        );
        if (nodeRef.current) {
            observer.observe(nodeRef.current);
        }
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!inView) return;
        let startTimestamp: number;
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
            setCount(Math.floor(progress * (to - from) + from));
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }, [inView, from, to, duration]);

    return <span ref={nodeRef}>{count}</span>;
}

export function ProblemSection() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
    const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [100, 0, 0, -100]);

    return (
        <section ref={containerRef} className="py-24 bg-muted/30 relative overflow-hidden">
            <motion.div style={{ opacity, y }} className="container px-6 mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">The Hidden Cost of Care</h2>
                    <p className="text-lg text-muted-foreground">
                        Physicians are drowning in documentation. It's time to let AI handle the notes so you can get back to what you were trained to do.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 text-center">
                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-8 rounded-2xl bg-card border border-border/50 shadow-lg"
                    >
                        <div className="text-5xl md:text-6xl font-black text-primary mb-4">
                            <AnimatedCounter from={0} to={49} />%
                        </div>
                        <p className="text-lg font-medium text-foreground">Time Spent on Notes</p>
                        <p className="text-sm text-muted-foreground mt-2">Almost half of a physician's day is lost to the EHR.</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-8 rounded-2xl bg-card border border-border/50 shadow-lg relative overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="text-5xl md:text-6xl font-black text-destructive mb-4 relative z-10">
                            <AnimatedCounter from={0} to={63} />%
                        </div>
                        <p className="text-lg font-medium text-foreground relative z-10">Physician Burnout</p>
                        <p className="text-sm text-muted-foreground mt-2 relative z-10">Highest rates ever recorded, driven by administrative burden.</p>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -10 }}
                        className="p-8 rounded-2xl bg-card border border-border/50 shadow-lg"
                    >
                        <div className="text-5xl md:text-6xl font-black text-accent mb-4">
                            <AnimatedCounter from={0} to={2} /> hrs
                        </div>
                        <p className="text-lg font-medium text-foreground">Pajama Time</p>
                        <p className="text-sm text-muted-foreground mt-2">Average time spent charting at home after hours.</p>
                    </motion.div>
                </div>
            </motion.div>
        </section>
    );
}
