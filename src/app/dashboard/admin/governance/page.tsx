"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import {
    ShieldCheck, Activity, AlertTriangle, Users, RefreshCw,
    CheckCircle2, XCircle, Clock, Zap, Lock, Server, Database,
    BarChart3, PieChart, FileText, ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
    id: string;
    timestamp: { seconds: number } | null;
    agent: string;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    module: string;
    actionTaken: string;
    details?: string;
}

const ADMIN_EMAIL = 'chancellor@ichancetek.com';

const SEVERITY_COLORS: Record<string, string> = {
    INFO: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    WARNING: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    ERROR: 'text-red-400 bg-red-500/10 border-red-500/20',
    CRITICAL: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

const AGENT_COLORS: Record<string, string> = {
    PlatformValidationAgent: '#06b6d4',
    CodeSecurityAgent: '#8b5cf6',
    DevOpsGuardianAgent: '#f59e0b',
    PerformanceAgent: '#10b981',
    ComplianceAgent: '#ec4899',
    System: '#64748b',
    User: '#3b82f6',
};

export default function AdminGovernanceDashboard() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [agentRunning, setAgentRunning] = useState(false);
    const [agentResult, setAgentResult] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'agents'>('overview');

    // RBAC: Admin-only access
    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
            } else if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
                router.push('/dashboard');
            }
        }
    }, [user, isLoading, router]);

    const fetchLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const res = await fetch('/api/agents/audit-logs');
            const data = await res.json() as { logs: AuditLog[] };
            setLogs(data.logs ?? []);
        } catch {
            setLogs([]);
        } finally {
            setIsLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const runAllAgents = async () => {
        setAgentRunning(true);
        setAgentResult(null);
        try {
            const res = await fetch('/api/agents/scheduler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agent: 'ALL' }),
            });
            const data = await res.json() as { success?: boolean; error?: string };
            if (data.success) {
                setAgentResult('✅ All agents completed their scan cycle successfully.');
                await fetchLogs();
            } else {
                setAgentResult(`❌ Agent run encountered an error: ${data.error}`);
            }
        } catch (e: unknown) {
            setAgentResult(`❌ Failed to trigger agents: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setAgentRunning(false);
        }
    };

    // ── Derived Stats ────────────────────────────────────────────────────────
    const stats = {
        total: logs.length,
        critical: logs.filter(l => l.severity === 'CRITICAL').length,
        errors: logs.filter(l => l.severity === 'ERROR').length,
        warnings: logs.filter(l => l.severity === 'WARNING').length,
        info: logs.filter(l => l.severity === 'INFO').length,
    };

    const agentCounts = logs.reduce<Record<string, number>>((acc, log) => {
        acc[log.agent] = (acc[log.agent] ?? 0) + 1;
        return acc;
    }, {});

    const moduleCounts = logs.reduce<Record<string, number>>((acc, log) => {
        acc[log.module] = (acc[log.module] ?? 0) + 1;
        return acc;
    }, {});

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050810] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050810] text-white font-sans antialiased">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-[#050810]/90 border-b border-white/5 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}>
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black tracking-tight">Governance Dashboard</h1>
                        <p className="text-[10px] text-white/40 tracking-widest uppercase">iCareOS Admin Control Center</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchLogs}
                        disabled={isLoadingLogs}
                        className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-all text-white/50 hover:text-white disabled:opacity-40"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                    </button>
                    <motion.button
                        onClick={runAllAgents}
                        disabled={agentRunning}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 flex items-center gap-2"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)' }}
                    >
                        {agentRunning ? (
                            <><div className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" /> Running...</>
                        ) : (
                            <><Zap className="w-3 h-3" /> Run All Agents</>
                        )}
                    </motion.button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

                {/* Agent Result Banner */}
                <AnimatePresence>
                    {agentResult && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="p-4 rounded-2xl border border-white/10 bg-white/5 text-sm text-white/80"
                        >
                            {agentResult}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Logs', value: stats.total, icon: FileText, color: '#06b6d4' },
                        { label: 'Critical Alerts', value: stats.critical, icon: AlertTriangle, color: '#ec4899' },
                        { label: 'Errors', value: stats.errors, icon: XCircle, color: '#ef4444' },
                        { label: 'Warnings', value: stats.warnings, icon: Clock, color: '#f59e0b' },
                    ].map((s) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-5 rounded-2xl border border-white/8 bg-white/3"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <s.icon className="w-4 h-4 opacity-60" style={{ color: s.color }} />
                                <span className="text-2xl font-black" style={{ color: s.color }}>{s.value}</span>
                            </div>
                            <p className="text-xs text-white/40 font-medium">{s.label}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Agent Activity Summary */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border border-white/8 bg-white/3">
                        <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-cyan-400" /> Agent Activity
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(agentCounts).map(([agent, count]) => (
                                <div key={agent} className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: AGENT_COLORS[agent] ?? '#64748b' }} />
                                    <span className="text-xs text-white/60 flex-1 truncate">{agent}</span>
                                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                                        <div
                                            className="h-1.5 rounded-full"
                                            style={{
                                                width: `${(count / stats.total) * 100}%`,
                                                background: AGENT_COLORS[agent] ?? '#64748b',
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs font-bold text-white/50 w-6 text-right">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl border border-white/8 bg-white/3">
                        <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-purple-400" /> Module Activity
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(moduleCounts).slice(0, 8).map(([module, count]) => (
                                <div key={module} className="flex items-center gap-3">
                                    <Server className="w-3 h-3 text-white/30 shrink-0" />
                                    <span className="text-xs text-white/60 flex-1 truncate">{module}</span>
                                    <span className="text-xs font-bold text-white/50">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Audit Log Table */}
                <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
                            <Lock className="w-4 h-4 text-cyan-400" /> Centralized Audit Logs
                        </h3>
                        <span className="text-xs text-white/30">{logs.length} entries</span>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        {isLoadingLogs ? (
                            <div className="p-12 text-center text-white/40 text-sm">Loading audit logs...</div>
                        ) : logs.length === 0 ? (
                            <div className="p-12 text-center">
                                <Activity className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                <p className="text-sm text-white/30">No audit logs yet. Run the agents to populate logs.</p>
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-[#050810] border-b border-white/5">
                                    <tr>
                                        {['Time', 'Agent', 'Severity', 'Module', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-white/30 tracking-widest uppercase">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/3">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-white/3 transition-colors">
                                            <td className="px-4 py-3 text-white/40 whitespace-nowrap">
                                                {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleTimeString() : '--'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                                        style={{ background: AGENT_COLORS[log.agent] ?? '#64748b' }} />
                                                    <span className="text-white/60 truncate max-w-[120px]">{log.agent}</span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${SEVERITY_COLORS[log.severity]}`}>
                                                    {log.severity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-white/50">{log.module}</td>
                                            <td className="px-4 py-3 text-white/60 max-w-[300px] truncate">{log.actionTaken}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* System Health Indicators */}
                <div className="p-6 rounded-2xl border border-white/8 bg-white/3">
                    <h3 className="text-sm font-bold text-white/70 mb-4 flex items-center gap-2">
                        <Database className="w-4 h-4 text-emerald-400" /> Platform Health Scores
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Platform Health', target: 95, icon: Activity, color: '#06b6d4' },
                            { label: 'Security Score', target: 95, icon: ShieldCheck, color: '#8b5cf6' },
                            { label: 'Performance', target: 95, icon: Zap, color: '#10b981' },
                            { label: 'Compliance', target: 95, icon: CheckCircle2, color: '#ec4899' },
                        ].map((metric) => (
                            <div key={metric.label} className="text-center">
                                <div className="relative w-16 h-16 mx-auto mb-2">
                                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                        <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                                        <circle
                                            cx="18" cy="18" r="15.9155"
                                            fill="none"
                                            stroke={metric.color}
                                            strokeWidth="2"
                                            strokeDasharray={`${metric.target} ${100 - metric.target}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-black" style={{ color: metric.color }}>{metric.target}</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-white/40 font-medium">{metric.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
