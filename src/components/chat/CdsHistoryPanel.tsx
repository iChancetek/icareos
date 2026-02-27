"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
    Clock, ShieldCheck, AlertTriangle, ChevronDown, ChevronRight,
    Camera, ScanLine, CheckCircle2, RotateCcw, Loader2, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserCdsHistory, updateCdsClinicianReview, type CdsImageRecord } from "@/services/cdsService";
import { useAuth } from "@/hooks/useAuth";

const SEVERITY_COLOR: Record<string, string> = {
    mild: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    moderate: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
    severe: "text-orange-400 border-orange-500/30 bg-orange-500/5",
    critical: "text-red-400 border-red-500/30 bg-red-500/5",
    routine: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    "24h-clinician-review": "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
    "immediate-attention": "text-red-400 border-red-500/30 bg-red-500/5",
};

const STATUS_CONFIG = {
    pending: { label: "Pending Review", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" },
    approved: { label: "Approved", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    modified: { label: "Modified", color: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
    overridden: { label: "Overridden", color: "text-orange-400 bg-orange-500/10 border-orange-500/25" },
};

function ConfBar({ score }: { score: number }) {
    const color = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-yellow-500" : "bg-red-500";
    const textColor = score >= 80 ? "text-emerald-400" : score >= 65 ? "text-yellow-400" : "text-red-400";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full", color)} style={{ width: `${score}%` }} />
            </div>
            <span className={cn("text-xs font-bold tabular-nums w-8 text-right", textColor)}>{score}%</span>
        </div>
    );
}

function HistoryCard({ record, onReviewUpdate }: { record: CdsImageRecord; onReviewUpdate: () => void }) {
    const [expanded, setExpanded] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const [notes, setNotes] = useState(record.clinicianNotes || "");
    const [saving, setSaving] = useState(false);
    const { user } = useAuth();

    const handleSignOff = async (status: "approved" | "modified" | "overridden") => {
        if (!user) return;
        setSaving(true);
        await updateCdsClinicianReview(record.id, user.uid, status, notes);
        setSaving(false);
        setReviewMode(false);
        onReviewUpdate();
    };

    const assessment = record.analysis?.differentialAssessment || record.analysis?.probableInterpretation;
    const statusCfg = STATUS_CONFIG[record.clinicianStatus] || STATUS_CONFIG.pending;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card/40 overflow-hidden"
        >
            {/* Row header */}
            <button
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Thumbnail */}
                <div className="h-12 w-12 rounded-xl overflow-hidden border border-border/40 shrink-0 bg-muted/30">
                    {record.imageDataUri ? (
                        <img src={record.imageDataUri} alt="Clinical" className="h-full w-full object-cover" />
                    ) : (
                        <div className="h-full w-full flex items-center justify-center">
                            {record.imageType === "xray" ? <ScanLine className="h-5 w-5 text-muted-foreground" /> : <Camera className="h-5 w-5 text-muted-foreground" />}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold truncate">{record.primaryFinding}</span>
                        {record.escalationRequired && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 border border-red-500/25 rounded-full px-1.5 py-0.5">Escalated</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            {record.imageType === "xray" ? <ScanLine className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
                            {record.imageType === "xray" ? "X-Ray" : "Wound / Skin"}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(record.uploadedAt, "MMM d, h:mm a")}
                        </span>
                    </div>
                </div>

                {/* Right chips */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5", SEVERITY_COLOR[record.severityLevel] || SEVERITY_COLOR.moderate)}>
                        {record.severityLevel}
                    </span>
                    <span className={cn("text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5", statusCfg.color)}>
                        {statusCfg.label}
                    </span>
                    {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
            </button>

            {/* Expanded detail */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-border/30"
                    >
                        <div className="p-4 space-y-5">
                            {/* Image + metadata row */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="rounded-xl overflow-hidden border border-border/40 bg-muted/20">
                                    {record.imageDataUri ? (
                                        <img src={record.imageDataUri} alt="Full clinical" className="w-full object-contain max-h-56" />
                                    ) : (
                                        <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">No image stored</div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Audit Metadata</p>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                            <div className="flex justify-between"><span>Model</span><span className="font-mono text-foreground/70">{record.modelVersion}</span></div>
                                            <div className="flex justify-between"><span>Uploaded</span><span>{format(record.uploadedAt, "PPP p")}</span></div>
                                            <div className="flex justify-between"><span>Image Type</span><span className="capitalize">{record.imageType}</span></div>
                                            <div className="flex justify-between"><span>Escalated</span><span className={record.escalationRequired ? "text-red-400 font-bold" : "text-emerald-400"}>{record.escalationRequired ? "Yes" : "No"}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Confidence</p>
                                        <ConfBar score={record.confidenceScore} />
                                    </div>
                                    {record.context && (
                                        <div>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Context Provided</p>
                                            <p className="text-xs text-muted-foreground italic">"{record.context}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Differential */}
                            {assessment && (
                                <div className="rounded-xl border border-border/40 bg-card/30 p-3 space-y-2">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Differential Assessment</p>
                                    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                                        <p className="text-sm font-bold">{assessment.mostLikely.condition}</p>
                                        <span className="text-lg font-black text-primary">{assessment.mostLikely.confidence}%</span>
                                    </div>
                                    {assessment.alternatives?.slice(0, 2).map((alt: any, i: number) => (
                                        <div key={i} className="flex justify-between px-1 text-xs text-muted-foreground">
                                            <span>{alt.condition}</span><span className="font-mono">{alt.confidence}%</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Clinician sign-off */}
                            <div className="rounded-xl border border-border/40 bg-card/30 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Clinician Sign-Off</p>
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider border rounded-full px-2 py-0.5", statusCfg.color)}>
                                        {statusCfg.label}
                                    </span>
                                </div>

                                {record.clinicianStatus === "pending" && !reviewMode && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setReviewMode(true); }}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
                                    >
                                        <FileText className="h-3.5 w-3.5" /> Sign Off on This Analysis
                                    </button>
                                )}

                                {record.clinicianStatus !== "pending" && record.clinicianNotes && (
                                    <div className="text-xs text-muted-foreground">
                                        <p className="font-semibold text-foreground/70 mb-0.5">Clinician Notes:</p>
                                        <p className="italic">{record.clinicianNotes}</p>
                                        {record.clinicianSignedAt && (
                                            <p className="mt-1 opacity-60">Signed: {format(record.clinicianSignedAt, "PPP p")}</p>
                                        )}
                                    </div>
                                )}

                                {reviewMode && (
                                    <div className="space-y-2">
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Add clinical notes, modifications, or override reasoning..."
                                            rows={3}
                                            className="w-full text-xs rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none resize-none"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                disabled={saving}
                                                onClick={() => handleSignOff("approved")}
                                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Approve
                                            </button>
                                            <button
                                                disabled={saving}
                                                onClick={() => handleSignOff("modified")}
                                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 py-2 text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                                            >
                                                Modify
                                            </button>
                                            <button
                                                disabled={saving}
                                                onClick={() => handleSignOff("overridden")}
                                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 py-2 text-xs font-bold text-orange-400 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                                            >
                                                Override
                                            </button>
                                        </div>
                                        <button onClick={() => setReviewMode(false)} className="w-full text-xs text-muted-foreground hover:text-foreground py-1">Cancel</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ── Main Panel ─────────────────────────────────────────────────────────
interface CdsHistoryPanelProps {
    /** Pass a refresh trigger from parent so panel reloads after new analysis */
    refreshKey?: number;
}

export default function CdsHistoryPanel({ refreshKey = 0 }: CdsHistoryPanelProps) {
    const { user } = useAuth();
    const [records, setRecords] = useState<CdsImageRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "escalated" | "pending">("all");

    const loadHistory = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        const data = await getUserCdsHistory(user.uid);
        setRecords(data);
        setIsLoading(false);
    }, [user]);

    useEffect(() => { loadHistory(); }, [loadHistory, refreshKey]);

    const filtered = records.filter(r => {
        if (filter === "escalated") return r.escalationRequired;
        if (filter === "pending") return r.clinicianStatus === "pending";
        return true;
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Imaging Archive</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{records.length} record{records.length !== 1 ? "s" : ""} · gpt-5.3-codex · Time-stamped</p>
                </div>
                <button onClick={loadHistory} className="h-7 w-7 flex items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5">
                {([
                    { key: "all", label: `All (${records.length})` },
                    { key: "escalated", label: `Escalated (${records.filter(r => r.escalationRequired).length})` },
                    { key: "pending", label: `Pending Review (${records.filter(r => r.clinicianStatus === "pending").length})` },
                ] as const).map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={cn(
                            "rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                            filter === f.key
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary/20 py-12 text-center">
                    <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm font-semibold">{filter === "all" ? "No analyses yet" : `No ${filter} analyses`}</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload an image above to get started</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map(r => (
                        <HistoryCard key={r.id} record={r} onReviewUpdate={loadHistory} />
                    ))}
                </div>
            )}
        </div>
    );
}
