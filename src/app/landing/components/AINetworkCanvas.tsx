"use client";

import { useEffect, useRef } from "react";

interface Node {
    id: string;
    label: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
    glowColor: string;
    pulsePhase: number;
    connections: string[];
}

interface Particle {
    fromNode: string;
    toNode: string;
    progress: number;
    speed: number;
    color: string;
    size: number;
    active: boolean;
}

const MODULE_NODES: Omit<Node, "x" | "y" | "vx" | "vy">[] = [
    {
        id: "mediscribe",
        label: "MediScribe",
        radius: 38,
        color: "#06b6d4",
        glowColor: "rgba(6,182,212,0.4)",
        pulsePhase: 0,
        connections: ["billingiq", "riskiq", "carecoordiq", "iskylar"],
    },
    {
        id: "iskylar",
        label: "iSkylar",
        radius: 42,
        color: "#8b5cf6",
        glowColor: "rgba(139,92,246,0.5)",
        pulsePhase: 1.2,
        connections: ["mediscribe", "riskiq", "carecoordiq"],
    },
    {
        id: "riskiq",
        label: "RiskIQ",
        radius: 34,
        color: "#ef4444",
        glowColor: "rgba(239,68,68,0.4)",
        pulsePhase: 2.1,
        connections: ["mediscribe", "billingiq", "carecoordiq"],
    },
    {
        id: "billingiq",
        label: "BillingIQ",
        radius: 34,
        color: "#10b981",
        glowColor: "rgba(16,185,129,0.4)",
        pulsePhase: 0.7,
        connections: ["mediscribe", "riskiq"],
    },
    {
        id: "carecoordiq",
        label: "CareCoordIQ",
        radius: 34,
        color: "#f59e0b",
        glowColor: "rgba(245,158,11,0.4)",
        pulsePhase: 3.1,
        connections: ["mediscribe", "riskiq", "iskylar"],
    },
    {
        id: "woundiq",
        label: "WoundIQ",
        radius: 28,
        color: "#ec4899",
        glowColor: "rgba(236,72,153,0.3)",
        pulsePhase: 1.8,
        connections: ["riskiq", "carecoordiq"],
    },
    {
        id: "radiologyiq",
        label: "RadiologyIQ",
        radius: 28,
        color: "#3b82f6",
        glowColor: "rgba(59,130,246,0.3)",
        pulsePhase: 2.6,
        connections: ["riskiq", "mediscribe"],
    },
    {
        id: "insight",
        label: "Insight",
        radius: 30,
        color: "#a855f7",
        glowColor: "rgba(168,85,247,0.3)",
        pulsePhase: 0.4,
        connections: ["mediscribe", "billingiq", "carecoordiq"],
    },
];

export function AINetworkCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const nodesRef = useRef<Node[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const rafRef = useRef<number>(0);
    const timeRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = canvas.offsetWidth * window.devicePixelRatio;
            canvas.height = canvas.offsetHeight * window.devicePixelRatio;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            initNodes();
        };

        const initNodes = () => {
            const W = canvas.offsetWidth;
            const H = canvas.offsetHeight;
            const cx = W / 2;
            const cy = H / 2;
            const count = MODULE_NODES.length;

            nodesRef.current = MODULE_NODES.map((n, i) => {
                const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                const r = Math.min(W, H) * 0.3;
                return {
                    ...n,
                    x: cx + r * Math.cos(angle),
                    y: cy + r * Math.sin(angle),
                    vx: (Math.random() - 0.5) * 0.2,
                    vy: (Math.random() - 0.5) * 0.2,
                };
            });
        };

        const spawnParticle = () => {
            const nodes = nodesRef.current;
            if (!nodes.length) return;
            const from = nodes[Math.floor(Math.random() * nodes.length)];
            if (!from.connections.length) return;
            const toId = from.connections[Math.floor(Math.random() * from.connections.length)];
            const to = nodes.find(n => n.id === toId);
            if (!to) return;
            particlesRef.current.push({
                fromNode: from.id,
                toNode: toId,
                progress: 0,
                speed: 0.003 + Math.random() * 0.004,
                color: from.color,
                size: 2 + Math.random() * 2,
                active: true,
            });
        };

        const drawNode = (ctx: CanvasRenderingContext2D, node: Node, t: number, hovered: boolean) => {
            const pulse = Math.sin(t * 0.8 + node.pulsePhase) * 0.3 + 0.7;
            const scale = hovered ? 1.15 : 1;
            const r = node.radius * scale;

            // Outer glow
            const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.2);
            grad.addColorStop(0, node.glowColor.replace(")", `, ${pulse * 0.6})`).replace("rgba", "rgba"));
            grad.addColorStop(1, "transparent");
            ctx.beginPath();
            ctx.arc(node.x, node.y, r * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Core circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
            const coreGrad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r);
            coreGrad.addColorStop(0, node.color + "ff");
            coreGrad.addColorStop(1, node.color + "88");
            ctx.fillStyle = coreGrad;
            ctx.fill();

            // Ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
            ctx.strokeStyle = node.color + Math.round(pulse * 140).toString(16).padStart(2, "0");
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Label
            ctx.font = `bold ${hovered ? 11 : 10}px Inter, sans-serif`;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(node.label, node.x, node.y);
        };

        const drawConnection = (
            ctx: CanvasRenderingContext2D,
            a: Node,
            b: Node,
            t: number,
            highlight: boolean
        ) => {
            const alpha = highlight ? 0.45 : 0.12;
            const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
            grad.addColorStop(0, a.color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
            grad.addColorStop(1, b.color + Math.round(alpha * 255).toString(16).padStart(2, "0"));
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = highlight ? 1.5 : 0.8;
            ctx.setLineDash(highlight ? [] : [4, 6]);
            ctx.stroke();
            ctx.setLineDash([]);
        };

        const drawParticle = (ctx: CanvasRenderingContext2D, p: Particle) => {
            const nodes = nodesRef.current;
            const from = nodes.find(n => n.id === p.fromNode);
            const to = nodes.find(n => n.id === p.toNode);
            if (!from || !to) return;

            const x = from.x + (to.x - from.x) * p.progress;
            const y = from.y + (to.y - from.y) * p.progress;

            // Trailing glow
            const trail = ctx.createRadialGradient(x, y, 0, x, y, p.size * 4);
            trail.addColorStop(0, p.color + "cc");
            trail.addColorStop(1, "transparent");
            ctx.beginPath();
            ctx.arc(x, y, p.size * 4, 0, Math.PI * 2);
            ctx.fillStyle = trail;
            ctx.fill();

            // Core dot
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        };

        const getHoveredNode = (): Node | null => {
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            for (const node of nodesRef.current) {
                const d = Math.hypot(node.x - mx, node.y - my);
                if (d < node.radius * 1.6) return node;
            }
            return null;
        };

        const animate = () => {
            const W = canvas.offsetWidth;
            const H = canvas.offsetHeight;
            const cx = W / 2;
            const cy = H / 2;
            timeRef.current += 0.016;
            const t = timeRef.current;

            ctx.clearRect(0, 0, W, H);

            // Subtle mouse attraction
            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;
            const hoveredNode = getHoveredNode();

            // Update node positions (gentle float)
            nodesRef.current.forEach(node => {
                // Mouse repulsion
                const dx = node.x - mx;
                const dy = node.y - my;
                const dist = Math.hypot(dx, dy);
                if (dist < 120) {
                    node.vx += (dx / dist) * 0.08;
                    node.vy += (dy / dist) * 0.08;
                }

                // Gentle orbit drift
                node.vx += Math.sin(t * 0.3 + node.pulsePhase) * 0.005;
                node.vy += Math.cos(t * 0.3 + node.pulsePhase) * 0.005;

                // Spring back to orbit position
                const i = nodesRef.current.indexOf(node);
                const angle = (i / MODULE_NODES.length) * Math.PI * 2 - Math.PI / 2;
                const r = Math.min(W, H) * 0.3;
                const targetX = cx + r * Math.cos(angle);
                const targetY = cy + r * Math.sin(angle);
                node.vx += (targetX - node.x) * 0.004;
                node.vy += (targetY - node.y) * 0.004;

                // Damping
                node.vx *= 0.92;
                node.vy *= 0.92;
                node.x += node.vx;
                node.y += node.vy;
            });

            // Spawn particles
            if (Math.random() < 0.15) spawnParticle();

            // Draw connections
            const drawn = new Set<string>();
            nodesRef.current.forEach(node => {
                node.connections.forEach(cid => {
                    const key = [node.id, cid].sort().join("-");
                    if (drawn.has(key)) return;
                    drawn.add(key);
                    const other = nodesRef.current.find(n => n.id === cid);
                    if (!other) return;
                    const highlight = hoveredNode
                        ? hoveredNode.id === node.id || hoveredNode.id === cid
                        : false;
                    drawConnection(ctx, node, other, t, highlight);
                });
            });

            // Draw particles
            particlesRef.current = particlesRef.current.filter(p => p.active);
            particlesRef.current.forEach(p => {
                p.progress += p.speed;
                if (p.progress >= 1) { p.active = false; return; }
                drawParticle(ctx, p);
            });

            // Draw nodes
            nodesRef.current.forEach(node => {
                const hovered = hoveredNode?.id === node.id;
                drawNode(ctx, node, t, hovered);
            });

            rafRef.current = requestAnimationFrame(animate);
        };

        resize();
        window.addEventListener("resize", resize);

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        };
        canvas.addEventListener("mousemove", handleMouseMove);

        rafRef.current = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(rafRef.current);
            window.removeEventListener("resize", resize);
            canvas.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{ cursor: "crosshair" }}
        />
    );
}
