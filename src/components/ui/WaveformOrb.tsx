"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface WaveformOrbProps {
    state: "idle" | "recording" | "processing" | "success" | "error";
    size?: number;
    className?: string;
}

const stateConfig = {
    idle: {
        color: "hsl(191 97% 58%)",
        rings: 2,
        pulse: false,
        label: "Ready",
        glow: "hsl(191 97% 58% / 0.2)",
    },
    recording: {
        color: "hsl(0 72% 60%)",
        rings: 3,
        pulse: true,
        label: "Recording",
        glow: "hsl(0 72% 60% / 0.25)",
    },
    processing: {
        color: "hsl(191 97% 58%)",
        rings: 3,
        pulse: true,
        label: "Processing",
        glow: "hsl(191 97% 58% / 0.3)",
    },
    success: {
        color: "hsl(151 55% 52%)",
        rings: 2,
        pulse: false,
        label: "Complete",
        glow: "hsl(151 55% 52% / 0.2)",
    },
    error: {
        color: "hsl(0 72% 50%)",
        rings: 1,
        pulse: false,
        label: "Error",
        glow: "hsl(0 72% 50% / 0.2)",
    },
};

export function WaveformOrb({ state, size = 120, className }: WaveformOrbProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number>(0);
    const cfg = stateConfig[state];
    const bars = 28;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let t = 0;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = 48 * dpr;
        ctx.scale(dpr, dpr);

        function draw() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, size, 48);

            const barWidth = 2.5;
            const gap = (size - bars * barWidth) / (bars - 1);

            for (let i = 0; i < bars; i++) {
                const x = i * (barWidth + gap);
                let h: number;

                if (state === "recording") {
                    h = 6 + 20 * Math.abs(Math.sin(t * 2.5 + i * 0.5)) * (0.4 + 0.6 * Math.random());
                } else if (state === "processing") {
                    h = 4 + 18 * Math.abs(Math.sin(t * 1.8 + i * 0.4));
                } else {
                    h = 4 + 6 * Math.abs(Math.sin(t * 0.5 + i * 0.35));
                }

                const barH = Math.min(h, 40);
                const y = (48 - barH) / 2;

                ctx.fillStyle = cfg.color;
                ctx.globalAlpha = state === "idle" ? 0.4 : 0.85;
                ctx.beginPath();
                ctx.roundRect(x, y, barWidth, barH, 2);
                ctx.fill();
            }

            t += 0.04;
            animRef.current = requestAnimationFrame(draw);
        }

        draw();
        return () => cancelAnimationFrame(animRef.current);
    }, [state, size, cfg.color]);

    const orbSize = size;

    return (
        <div className={cn("relative flex flex-col items-center gap-4", className)}>
            {/* Outer rings */}
            <div className="relative" style={{ width: orbSize, height: orbSize }}>
                {/* Ambient glow blur */}
                <div
                    className="absolute inset-0 rounded-full blur-2xl opacity-40"
                    style={{ background: cfg.glow, transform: "scale(1.3)" }}
                />

                {/* Pulse rings */}
                {cfg.rings >= 3 && (
                    <div
                        className="absolute inset-0 rounded-full border animate-ping"
                        style={{
                            borderColor: cfg.color,
                            opacity: 0.15,
                            animationDuration: "2s",
                        }}
                    />
                )}
                {cfg.rings >= 2 && (
                    <div
                        className="absolute rounded-full border animate-ping"
                        style={{
                            inset: "12px",
                            borderColor: cfg.color,
                            opacity: 0.2,
                            animationDuration: "2.6s",
                            animationDelay: "0.3s",
                        }}
                    />
                )}

                {/* Core orb */}
                <div
                    className={cn(
                        "absolute rounded-full flex items-center justify-center transition-all duration-500",
                        state === "recording" && "animate-pulse-slow-shadow"
                    )}
                    style={{
                        inset: "24px",
                        background: `radial-gradient(circle at 35% 35%, ${cfg.color}55, ${cfg.color}22)`,
                        border: `1.5px solid ${cfg.color}88`,
                        boxShadow: `0 0 32px ${cfg.glow}, inset 0 1px 0 ${cfg.color}44`,
                    }}
                >
                    {/* Waveform canvas */}
                    <canvas
                        ref={canvasRef}
                        width={orbSize - 56}
                        height={48}
                        style={{ width: orbSize - 56, height: 48 }}
                    />
                </div>
            </div>

            {/* State label */}
            <p
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ color: cfg.color }}
            >
                {cfg.label}
            </p>
        </div>
    );
}
