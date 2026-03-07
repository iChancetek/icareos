'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Activity, AlertTriangle, CheckCircle2, ChevronRight,
    BarChart3, MessageSquare, Zap, Network, Database, RefreshCw,
    ArrowUpRight, CircleDot, Clock,
} from 'lucide-react';
import type { DataIQResult, DataIQPrediction, DataIQSignalPayload, DataIQSourceModule } from '@/types/agents';

// ── Types ─────────────────────────────────────────────────────────────────────

interface A2AFeedMessage {
    id?: string;
    agent_id: string;
    message_type: string;
    patient_context: string;
    signal_payload: Record<string, unknown>;
    confidence_score: number;
    timestamp: string;
    target_agent?: string;
}

// ── Module Signal Config ───────────────────────────────────────────────────────

const MODULE_CONFIG: Record<DataIQSourceModule, { color: string; bg: string; abbr: string }> = {
    MediScribe: { color: '#00E5FF', bg: '#00E5FF15', abbr: 'MS' },
    Insight: { color: '#3B82F6', bg: '#3B82F615', abbr: 'IN' },
    WoundIQ: { color: '#10B981', bg: '#10B98115', abbr: 'WQ' },
    RadiologyIQ: { color: '#8B5CF6', bg: '#8B5CF615', abbr: 'RD' },
    iSkylar: { color: '#6366F1', bg: '#6366F115', abbr: 'SK' },
    BillingIQ: { color: '#F59E0B', bg: '#F59E0B15', abbr: 'BI' },
    RiskIQ: { color: '#EF4444', bg: '#EF444415', abbr: 'RI' },
    CareCoordIQ: { color: '#EC4899', bg: '#EC489915', abbr: 'CC' },
};

const SEVERITY_CONFIG = {
    critical: { color: '#EF4444', label: 'Critical', dot: '🔴' },
    high: { color: '#F97316', label: 'High', dot: '🟠' },
    medium: { color: '#F59E0B', label: 'Medium', dot: '🟡' },
    low: { color: '#10B981', label: 'Low', dot: '🟢' },
};

// ── Demo Signal Presets ────────────────────────────────────────────────────────

const DEMO_SIGNALS: DataIQSignalPayload[] = [
    {
        sourceModule: 'MediScribe',
        confidence: 0.94,
        data: { soapFilled: true, icdCodes: ['E11.9', 'I10'], chiefComplaint: 'Uncontrolled diabetes with hypertension', clinicianNote: 'Patient A1c 9.2%, BP 158/96' },
    },
    {
        sourceModule: 'RiskIQ',
        confidence: 0.91,
        data: { overallRiskLevel: 'high', riskScore: 74, alerts: ['Drug interaction: metformin + lisinopril', 'Fall risk elevated'], complianceScore: 82 },
    },
    {
        sourceModule: 'BillingIQ',
        confidence: 0.88,
        data: { claimReady: false, underbillingFlag: true, estimatedRevenueDelta: 340, missingCode: '99213-25 modifier' },
    },
    {
        sourceModule: 'CareCoordIQ',
        confidence: 0.86,
        data: { followUpIntervalDays: 14, followUpUrgency: 'soon', noShowRiskLevel: 'medium', careGaps: ['Nephrology referral overdue', 'Foot exam not completed'] },
    },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DataIQDashboard() {
    const [result, setResult] = useState<DataIQResult | null>(null);
    const [messages, setMessages] = useState<A2AFeedMessage[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isLoadingFeed, setIsLoadingFeed] = useState(true);
    const [patientContext, setPatientContext] = useState('patient_demo_001');
    const [activeTab, setActiveTab] = useState<'signals' | 'predictions' | 'a2a'>('signals');
    const [selectedPrediction, setSelectedPrediction] = useState<DataIQPrediction | null>(null);
    const [error, setError] = useState<string | null>(null);

    const loadFeed = useCallback(async () => {
        try {
            const res = await fetch('/api/agents/dataiq/predictions');
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
            }
        } finally {
            setIsLoadingFeed(false);
        }
    }, []);

    useEffect(() => { loadFeed(); }, [loadFeed]);

    const runAnalysis = async () => {
        setIsRunning(true);
        setError(null);
        setSelectedPrediction(null);
        try {
            const res = await fetch('/api/agents/dataiq', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientContext, signals: DEMO_SIGNALS }),
            });
            if (!res.ok) throw new Error('Analysis failed');
            const data: DataIQResult = await res.json();
            setResult(data);
            setActiveTab('predictions');
            await loadFeed();
        } catch (e: any) {
            setError(e.message || 'Unknown error');
        } finally {
            setIsRunning(false);
        }
    };

    const riskColor = (score: number) =>
        score >= 70 ? '#EF4444' : score >= 40 ? '#F59E0B' : '#10B981';

    return (
        <div className="min-h-screen bg-[#050510] text-white p-6 space-y-6">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="relative h-14 w-14 rounded-2xl bg-[#1a0a2e] border border-purple-500/20 flex items-center justify-center shadow-[0_0_32px_rgba(168,85,247,0.25)]">
                        <Brain className="h-7 w-7" style={{ color: '#A855F7', filter: 'drop-shadow(0 0 12px #A855F7)' }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            DataIQ
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
                                Clinical Data Intelligence
                            </span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-0.5">Central intelligence hub — cross-module signal aggregation & predictive analytics</p>
                    </div>
                </div>

                {/* Run Analysis Button */}
                <div className="flex items-center gap-3">
                    <input
                        value={patientContext}
                        onChange={(e) => setPatientContext(e.target.value)}
                        className="h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 w-48 focus:outline-none focus:border-purple-500/50"
                        placeholder="Patient context..."
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={runAnalysis}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 transition-all"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 0 24px rgba(168, 85, 247, 0.3)' }}
                    >
                        {isRunning ? (
                            <><RefreshCw className="h-4 w-4 animate-spin" />Analyzing...</>
                        ) : (
                            <><Zap className="h-4 w-4" />Run Analysis</>
                        )}
                    </motion.button>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
                </div>
            )}

            {/* ── Stats Row ──────────────────────────────────────────────────── */}
            {result && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                    {[
                        { label: 'Risk Score', value: `${result.overallRiskScore}/100`, icon: Activity, color: riskColor(result.overallRiskScore) },
                        { label: 'Predictions', value: result.predictions.length, icon: BarChart3, color: '#A855F7' },
                        { label: 'Care Gaps', value: result.careGapCount, icon: AlertTriangle, color: '#F59E0B' },
                        { label: 'Modules', value: result.modulesAnalyzed.length, icon: Network, color: '#3B82F6' },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500">{stat.label}</span>
                                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                            </div>
                            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                        </div>
                    ))}
                </motion.div>
            )}

            {/* ── Summary Bar ────────────────────────────────────────────────── */}
            {result?.crossModuleSummary && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl bg-purple-500/5 border border-purple-500/15 px-5 py-4"
                >
                    <div className="flex items-start gap-3">
                        <Brain className="h-5 w-5 text-purple-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-purple-400 mb-1">Cross-Module Intelligence Summary</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{result.crossModuleSummary}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* ── Tab Bar ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.07] rounded-2xl p-1.5 w-fit">
                {([
                    { id: 'signals', label: 'Signal Aggregation', icon: Database },
                    { id: 'predictions', label: 'Predictions', icon: BarChart3 },
                    { id: 'a2a', label: 'A2A Message Feed', icon: MessageSquare },
                ] as const).map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Tab Content ────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">

                {/* SIGNALS TAB */}
                {activeTab === 'signals' && (
                    <motion.div key="signals" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-3">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-4">Demo Signal Payload — 4 Modules</p>
                        {DEMO_SIGNALS.map((sig) => {
                            const cfg = MODULE_CONFIG[sig.sourceModule];
                            return (
                                <div key={sig.sourceModule} className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 hover:border-white/10 transition-all">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                                                {cfg.abbr}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold" style={{ color: cfg.color }}>{sig.sourceModule}</p>
                                                <p className="text-[10px] text-slate-500">Confidence: {((sig.confidence ?? 0) * 100).toFixed(0)}%</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries(sig.data).slice(0, 4).map(([k, v]) => (
                                            <div key={k} className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-1.5">
                                                <p className="text-[10px] text-slate-600 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                                                <p className="text-xs text-slate-300 font-medium truncate">{Array.isArray(v) ? v.join(', ') : String(v)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </motion.div>
                )}

                {/* PREDICTIONS TAB */}
                {activeTab === 'predictions' && (
                    <motion.div key="predictions" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                        {!result ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                                <Brain className="h-14 w-14 text-slate-700" />
                                <p className="text-slate-500 text-sm">Run an analysis to see DataIQ predictions</p>
                                <button onClick={runAnalysis} disabled={isRunning} className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-xl px-4 py-2 transition-all bg-purple-500/5">
                                    <Zap className="h-3.5 w-3.5" /> Run Analysis Now
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {result.predictions.map((pred, i) => {
                                    const sev = SEVERITY_CONFIG[pred.severity];
                                    const targetCfg = MODULE_CONFIG[pred.targetModule];
                                    return (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => setSelectedPrediction(pred === selectedPrediction ? null : pred)}
                                            className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 cursor-pointer hover:border-white/10 transition-all"
                                            style={{ borderLeft: `3px solid ${sev.color}` }}
                                        >
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: sev.color }}>
                                                        {sev.dot} {pred.predictionType.replace(/_/g, ' ')}
                                                    </span>
                                                    <p className="text-sm font-bold text-white mt-0.5">{pred.title}</p>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <div className="h-7 w-7 rounded-lg flex items-center justify-center text-[9px] font-bold" style={{ background: targetCfg.bg, color: targetCfg.color, border: `1px solid ${targetCfg.color}30` }}>
                                                        {targetCfg.abbr}
                                                    </div>
                                                    <ChevronRight className={`h-3.5 w-3.5 text-slate-600 transition-transform ${selectedPrediction === pred ? 'rotate-90' : ''}`} />
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{pred.description}</p>

                                            <AnimatePresence>
                                                {selectedPrediction === pred && (
                                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-white/[0.06]">
                                                        <p className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">Recommended Action</p>
                                                        <p className="text-xs text-emerald-400 flex items-start gap-1.5">
                                                            <ArrowUpRight className="h-3 w-3 mt-0.5 shrink-0" />
                                                            {pred.recommendedAction}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-3">
                                                            <span className="text-[10px] text-slate-600">Confidence</span>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-1 w-24 bg-white/10 rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${pred.confidence * 100}%` }} />
                                                                </div>
                                                                <span className="text-[10px] text-purple-400 font-bold">{(pred.confidence * 100).toFixed(0)}%</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* A2A FEED TAB */}
                {activeTab === 'a2a' && (
                    <motion.div key="a2a" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                        {isLoadingFeed ? (
                            <div className="flex items-center justify-center py-24">
                                <RefreshCw className="h-8 w-8 text-purple-500 animate-spin" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
                                <MessageSquare className="h-12 w-12 text-slate-700" />
                                <p className="text-slate-500 text-sm">No A2A messages yet. Run an analysis to populate the bus.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={msg.id ?? i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        className="flex items-start gap-4 rounded-xl bg-white/[0.02] border border-white/[0.05] px-4 py-3"
                                    >
                                        <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-[9px] font-bold text-purple-300">
                                            {msg.agent_id.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-purple-300">{msg.agent_id}</span>
                                                <span className="text-[10px] text-slate-600">→</span>
                                                {msg.target_agent && <span className="text-xs font-medium text-slate-400">{msg.target_agent}</span>}
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-500">{msg.message_type}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate">
                                                Patient: {msg.patient_context} | Confidence: {(msg.confidence_score * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-600 shrink-0">
                                            <Clock className="h-3 w-3" />
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

            </AnimatePresence>

            {/* ── Status Bar ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 border-t border-white/[0.05] text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                    <CircleDot className="h-3 w-3 text-emerald-500" />
                    DataIQ Agent — Active
                </div>
                {result && (
                    <span>Session {result.sessionId} · {new Date(result.timestamp).toLocaleString()}</span>
                )}
            </div>
        </div>
    );
}
