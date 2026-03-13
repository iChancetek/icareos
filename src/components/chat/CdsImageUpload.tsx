"use client";

import { useState, useRef, useCallback } from "react";
import {
    Upload, AlertTriangle, Loader2, Camera,
    ScanLine, RotateCcw, Activity,
    Microscope, TriangleAlert, CheckCircle2, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

// ── Types ──────────────────────────────────────────────────────────────
type ImageType = "wound" | "xray";

interface AnalysisResult {
    imageType: string;
    // Wound specific
    visualObservations?: {
        location?: string;
        color?: string;
        borderRegularity?: string;
        sizeEstimate?: string;
        signs?: {
            swelling: boolean;
            redness: boolean;
            drainage: boolean;
            necrosis: boolean;
            scaling: boolean;
            blistering: boolean;
            infectionSigns: boolean;
        };
        summary?: string;
    };
    differentialAssessment?: {
        mostLikely: { condition: string; confidence: number };
        alternatives: { condition: string; confidence: number }[];
        reasoning: string;
    };
    severity?: { level: string; explanation: string };
    riskAssessment?: {
        infectionRisk: string;
        systemicComplicationRisk: string;
        urgency: string;
        urgencyExplanation: string;
    };
    treatmentGuidance?: {
        cleaningRecommendations: string;
        dressingType: string;
        medicationGuidance: string;
        monitoringInstructions: string;
        redFlagSymptoms: string[];
        preventativeCare: string;
    };
    // X-Ray specific
    technicalObservations?: { imageOrientation?: string; visibleStructures?: string[]; imageLimitations?: string; summary?: string };
    radiographicFindings?: { primaryFindings: string[]; description: string };
    probableInterpretation?: {
        mostLikely: { condition: string; confidence: number };
        alternatives: { condition: string; confidence: number }[];
        reasoning: string;
    };
    clinicalImplications?: { functionalImpact: string; urgency: string; possibleComplications: string[] };
    recommendedNextSteps?: {
        specialistReferral?: string;
        additionalImaging?: string;
        immobilizationGuidance?: string;
        monitoringAdvice?: string;
        emergencyEscalation?: string | null;
    };
    // Shared
    escalationRequired: boolean;
    escalationReason?: string | null;
    confidenceScore: number;
    auditLog?: {
        modelUsed: string;
        analysisTimestamp: string;
        visualFeaturesExtracted?: string[];
        guidelinesReferenced?: string[];
        escalationDecision?: string;
    };
    disclaimer: string;
}

// ── Sub-components ─────────────────────────────────────────────────────
const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
    "routine": { label: "Routine Monitoring", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
    "24h-clinician-review": { label: "24h Clinician Review", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/25" },
    "immediate-attention": { label: "🚨 Immediate Attention Required", color: "text-red-400 bg-red-500/10 border-red-500/25" },
};

const SEVERITY_COLOR: Record<string, string> = {
    mild: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    moderate: "text-yellow-400 border-yellow-500/30 bg-yellow-500/5",
    severe: "text-orange-400 border-orange-500/30 bg-orange-500/5",
    critical: "text-red-400 border-red-500/30 bg-red-500/5",
};

const RISK_COLOR: Record<string, string> = {
    low: "text-emerald-400",
    moderate: "text-yellow-400",
    high: "text-red-400",
};

function ConfidenceBar({ score }: { score: number }) {
    const color = score >= 80 ? "bg-emerald-500" : score >= 65 ? "bg-yellow-500" : "bg-red-500";
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-muted-foreground font-medium">AI Confidence Score</span>
                <span className={cn("font-bold tabular-nums", score >= 80 ? "text-emerald-400" : score >= 65 ? "text-yellow-400" : "text-red-400")}>
                    {score}%
                </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full", color)}
                />
            </div>
            {score < 65 && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                    <TriangleAlert className="h-3 w-3" /> Confidence below threshold — clinician review mandatory
                </p>
            )}
        </div>
    );
}

function SignPill({ active, label }: { active: boolean; label: string }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border",
            active
                ? "bg-red-500/15 text-red-400 border-red-500/30"
                : "bg-muted/40 text-muted-foreground border-border/40"
        )}>
            {active ? "✓" : "–"} {label}
        </span>
    );
}

function WoundReport({ r }: { r: AnalysisResult }) {
    const assessment = r.differentialAssessment || r.probableInterpretation;
    const urgency = r.riskAssessment?.urgency || r.clinicalImplications?.urgency || "routine";
    const urgencyCfg = URGENCY_CONFIG[urgency] || URGENCY_CONFIG.routine;
    const signs = r.visualObservations?.signs;

    return (
        <div className="space-y-5">
            {/* Urgency Banner */}
            <div className={cn("rounded-xl border px-4 py-3 flex items-center gap-3", urgencyCfg.color)}>
                <Activity className="h-4 w-4 shrink-0" />
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest">{urgencyCfg.label}</p>
                    <p className="text-xs mt-0.5 opacity-80">{r.riskAssessment?.urgencyExplanation || r.clinicalImplications?.functionalImpact}</p>
                </div>
            </div>

            {/* Confidence */}
            <ConfidenceBar score={r.confidenceScore} />

            {/* Visual Observations */}
            {r.visualObservations?.summary && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Objective Visual Observations</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.visualObservations.summary}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                        {r.visualObservations.color && <div><span className="text-muted-foreground">Color: </span>{r.visualObservations.color}</div>}
                        {r.visualObservations.sizeEstimate && <div><span className="text-muted-foreground">Size: </span>{r.visualObservations.sizeEstimate}</div>}
                        {r.visualObservations.borderRegularity && <div className="col-span-2"><span className="text-muted-foreground">Border: </span>{r.visualObservations.borderRegularity}</div>}
                    </div>
                    {signs && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <SignPill active={signs.swelling} label="Swelling" />
                            <SignPill active={signs.redness} label="Redness" />
                            <SignPill active={signs.drainage} label="Drainage" />
                            <SignPill active={signs.necrosis} label="Necrosis" />
                            <SignPill active={signs.blistering} label="Blistering" />
                            <SignPill active={signs.infectionSigns} label="Infection" />
                        </div>
                    )}
                </div>
            )}

            {/* X-Ray observations */}
            {r.radiographicFindings && (
                <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Radiographic Findings</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{r.radiographicFindings.description}</p>
                    <ul className="space-y-1">
                        {r.radiographicFindings.primaryFindings?.map((f, i) => (
                            <li key={i} className="text-xs flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span> {f}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Differential / Interpretation */}
            {assessment && (
                <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Differential Assessment</p>
                    {/* Most likely */}
                    <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                        <div>
                            <p className="text-xs text-muted-foreground">Most Likely</p>
                            <p className="text-sm font-bold">{assessment.mostLikely.condition}</p>
                        </div>
                        <span className="text-xl font-black text-primary">{assessment.mostLikely.confidence}%</span>
                    </div>
                    {/* Alternatives */}
                    {assessment.alternatives?.map((alt, i) => (
                        <div key={i} className="flex items-center justify-between px-3">
                            <p className="text-xs text-muted-foreground">{alt.condition}</p>
                            <span className="text-xs font-mono text-muted-foreground">{alt.confidence}%</span>
                        </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                        <strong>Reasoning: </strong>{assessment.reasoning}
                    </p>
                </div>
            )}

            {/* Severity + Risk */}
            <div className="grid grid-cols-2 gap-3">
                {r.severity && (
                    <div className={cn("rounded-xl border p-3", SEVERITY_COLOR[r.severity.level] || SEVERITY_COLOR.moderate)}>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 opacity-70">Severity</p>
                        <p className="text-base font-bold capitalize">{r.severity.level}</p>
                        <p className="text-xs mt-1 opacity-80">{r.severity.explanation}</p>
                    </div>
                )}
                {r.riskAssessment && (
                    <div className="rounded-xl border border-border/40 bg-card/40 p-3 space-y-1">
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1 text-muted-foreground">Risk Profile</p>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Infection</span>
                            <span className={cn("font-bold capitalize", RISK_COLOR[r.riskAssessment.infectionRisk])}>{r.riskAssessment.infectionRisk}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Systemic</span>
                            <span className={cn("font-bold capitalize", RISK_COLOR[r.riskAssessment.systemicComplicationRisk])}>{r.riskAssessment.systemicComplicationRisk}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* X-ray clinical implications */}
            {r.clinicalImplications && (
                <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Clinical Implications</p>
                    <p className="text-sm text-muted-foreground">{r.clinicalImplications.functionalImpact}</p>
                    {r.clinicalImplications.possibleComplications?.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-1">Possible Complications:</p>
                            {r.clinicalImplications.possibleComplications.map((c, i) => (
                                <p key={i} className="text-xs flex items-start gap-1.5"><span className="text-yellow-400">•</span>{c}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Treatment Guidance */}
            {r.treatmentGuidance && (
                <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Treatment Guidance</p>
                    {[
                        { label: "Cleaning", value: r.treatmentGuidance.cleaningRecommendations },
                        { label: "Dressing", value: r.treatmentGuidance.dressingType },
                        { label: "Medication", value: r.treatmentGuidance.medicationGuidance },
                        { label: "Monitoring", value: r.treatmentGuidance.monitoringInstructions },
                        { label: "Preventative", value: r.treatmentGuidance.preventativeCare },
                    ].filter(g => g.value).map(g => (
                        <div key={g.label}>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{g.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{g.value}</p>
                        </div>
                    ))}
                    {r.treatmentGuidance.redFlagSymptoms?.length > 0 && (
                        <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-3">
                            <p className="text-xs font-bold text-red-400 mb-1">🚨 Seek Immediate Care If:</p>
                            {r.treatmentGuidance.redFlagSymptoms.map((s, i) => (
                                <p key={i} className="text-xs text-red-300 flex items-start gap-1.5"><span>•</span>{s}</p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* X-Ray next steps */}
            {r.recommendedNextSteps && (
                <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recommended Next Steps</p>
                    {[
                        { label: "Specialist Referral", value: r.recommendedNextSteps.specialistReferral },
                        { label: "Additional Imaging", value: r.recommendedNextSteps.additionalImaging },
                        { label: "Immobilization", value: r.recommendedNextSteps.immobilizationGuidance },
                        { label: "Monitoring", value: r.recommendedNextSteps.monitoringAdvice },
                    ].filter(s => s.value).map(s => (
                        <div key={s.label}>
                            <p className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">{s.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.value}</p>
                        </div>
                    ))}
                    {r.recommendedNextSteps.emergencyEscalation && (
                        <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-3">
                            <p className="text-xs font-bold text-red-400">🚨 Emergency Escalation:</p>
                            <p className="text-xs text-red-300 mt-0.5">{r.recommendedNextSteps.emergencyEscalation}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Audit */}
            {r.auditLog && (
                <div className="rounded-xl border border-border/30 bg-muted/20 p-3 space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Audit Log</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-muted-foreground">
                        <span>Model: <span className="font-mono">{r.auditLog.modelUsed}</span></span>
                        {r.auditLog.analysisTimestamp && (
                            <span>Time: {new Date(r.auditLog.analysisTimestamp).toLocaleTimeString()}</span>
                        )}
                        <span>Escalated: {r.escalationRequired ? "Yes" : "No"}</span>
                    </div>
                </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                <p className="text-[10px] text-yellow-400 italic">{r.disclaimer}</p>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────
interface CdsImageUploadProps {
    onAnalysisComplete?: () => void;
}

export default function CdsImageUpload({ onAnalysisComplete }: CdsImageUploadProps = {}) {
    const { user } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [type, setType] = useState<ImageType>("wound");
    const [context, setContext] = useState("");
    const [patientName, setPatientName] = useState("");
    const [consentGiven, setConsentGiven] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((selectedFile: File) => {
        if (!selectedFile.type.startsWith("image/")) {
            setError("Please upload an image file (JPEG, PNG, WEBP).");
            return;
        }
        setFile(selectedFile);
        setError(null);
        setResult(null);
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) handleFileSelect(dropped);
    }, [handleFileSelect]);

    const compressImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new (window as any).Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1200; // Optimal for vision analysis without being too large

                    if (width > height) {
                        if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error("Compression failed"));
                        },
                        "image/jpeg",
                        0.85 // High quality but significantly smaller
                    );
                };
            };
            reader.onerror = (e) => reject(e);
        });
    };

    const handleAnalyze = async () => {
        if (!file || !consentGiven || isProcessing) return;

        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            console.log("[CdsImageUpload] Starting analysis workflow...");
            const compressedBlob = await compressImage(file);
            const formData = new FormData();
            formData.append("image", compressedBlob, file.name || "image.jpg");
            formData.append("type", type);
            formData.append("context", context);
            formData.append("patientName", patientName);
            if (user?.uid) formData.append("userId", user.uid);

            console.log("[CdsImageUpload] Sending request to AI API (GPT-5.4 Codex)...");
            const res = await fetch("/api/ai-native/analyze-image", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Analysis failed");
            }

            const data = await res.json();
            setResult(data.analysis);
            // Notify parent to refresh history panel
            if (onAnalysisComplete) onAnalysisComplete();
        } catch (err: any) {
            console.error("[CdsImageUpload] Analysis error:", err);
            setError(err.message || "Analysis failed. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setFile(null);
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setConsentGiven(false);
        setContext("");
        setPatientName("");
    };

    return (
        <div className="w-full space-y-4">

            {/* Type Selector */}
            <div className="flex gap-2">
                {([
                    { key: "wound", label: "Wound / Skin", icon: Camera },
                    { key: "xray", label: "X-Ray", icon: ScanLine },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => { setType(key); setResult(null); }}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-all",
                            type === key
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/40 bg-card/40 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                    >
                        <Icon className="h-4 w-4" />{label}
                    </button>
                ))}
            </div>

            {/* Upload Zone */}
            {!file ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-all",
                        isDragging
                            ? "border-primary bg-primary/5 scale-[1.01]"
                            : "border-border/40 hover:border-primary/40 hover:bg-primary/5"
                    )}
                >
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-sm font-semibold text-foreground">Drop image here or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WEBP supported</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                </div>
            ) : (
                /* Image Preview */
                <div className="rounded-2xl overflow-hidden border border-border/40 bg-card/40">
                    <div className="relative w-full" style={{ minHeight: 240 }}>
                        <img
                            src={previewUrl!}
                            alt="Uploaded clinical image"
                            className="w-full object-contain max-h-72"
                        />
                        <div className="absolute top-2 right-2 flex gap-1.5">
                            <button
                                onClick={reset}
                                className="h-7 w-7 rounded-lg bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                                title="Remove image"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="absolute bottom-2 left-2">
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-background/80 backdrop-blur-sm px-2 py-1 rounded-lg border border-border/40 text-muted-foreground">
                                {type === "wound" ? "Wound / Skin Analysis" : "Radiographic Support"} · {file.name}
                            </span>
                        </div>
                    </div>

                    {!result && (
                        <div className="p-4 space-y-4 border-t border-border/40">
                            {/* Optional context */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                                    Additional Context (optional)
                                </label>
                                <input
                                    type="text"
                                    value={context}
                                    onChange={(e) => setContext(e.target.value)}
                                    placeholder={type === "wound"
                                        ? "e.g., Diabetic patient, wound on left heel, 3 days old"
                                        : "e.g., Patient fell from 6ft, wrist pain, 45yo male"
                                    }
                                    className="w-full text-sm rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                                />
                            </div>

                            {/* Patient Name */}
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                                    Patient Name
                                </label>
                                <input
                                    type="text"
                                    value={patientName}
                                    onChange={(e) => setPatientName(e.target.value)}
                                    placeholder="e.g., John Doe"
                                    className="w-full text-sm rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                                />
                            </div>

                            {/* Consent */}
                            <div className="rounded-xl border border-yellow-500/25 bg-yellow-500/5 p-3">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-yellow-300">MANDATORY CONSENT & DISCLAIMER</p>
                                        <p className="text-[11px] text-yellow-400/80 mt-1 leading-relaxed">
                                            This tool provides AI-assisted clinical decision support. It does NOT replace a licensed clinician's evaluation and cannot issue medical diagnoses.
                                        </p>
                                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={consentGiven}
                                                onChange={(e) => setConsentGiven(e.target.checked)}
                                                className="h-4 w-4 rounded border-yellow-500/50"
                                            />
                                            <span className="text-xs font-semibold text-yellow-300">
                                                I acknowledge this is CDS only and authorize AI image processing
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-xl border border-red-500/25 bg-red-500/5 px-3 py-2">
                                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                                        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />{error}
                                    </p>
                                </div>
                            )}

                            <button
                                disabled={!consentGiven || isProcessing}
                                onClick={handleAnalyze}
                                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all btn-neural disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Running AI Analysis…
                                    </>
                                ) : (
                                    <>
                                        <Microscope className="h-4 w-4" />
                                        Run AI Clinical Analysis
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.4 }}
                        className="rounded-2xl border border-border/40 bg-card/40 p-5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                <h3 className="text-base font-bold">
                                    {type === "xray" ? "AI Radiographic Support Report" : "AI Clinical Analysis Report"}
                                </h3>
                            </div>
                            {result.escalationRequired && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 rounded-full px-2.5 py-1">
                                    ⚠ Escalated
                                </span>
                            )}
                        </div>

                        {/* Escalation Alert */}
                        {result.escalationRequired && result.escalationReason && (
                            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                                <p className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5" />CLINICIAN REVIEW REQUIRED
                                </p>
                                <p className="text-xs text-red-300 mt-1">{result.escalationReason}</p>
                            </div>
                        )}

                        <WoundReport r={result} />

                        <button
                            onClick={reset}
                            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-border/40 py-2.5 text-sm font-semibold text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all"
                        >
                            <RotateCcw className="h-4 w-4" /> Analyze Another Image
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
