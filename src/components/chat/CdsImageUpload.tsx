"use client";

import { useState } from "react";
import { Upload, AlertTriangle, ShieldCheck, FileImage } from "lucide-react";
import { motion } from "framer-motion";

export default function CdsImageUpload({ onUploadComplete }: { onUploadComplete?: (result: any) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [type, setType] = useState<"wound" | "xray">("wound");
    const [consentGiven, setConsentGiven] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleUpload = async () => {
        if (!file || !consentGiven) return;
        setIsProcessing(true);

        // Simulate sending image to the Orchestrator API
        setTimeout(() => {
            setIsProcessing(false);
            const mockResult = type === "wound" ? {
                title: "AI Wound Analysis Complete",
                findings: "Stage 2 Pressure Ulcer suspected (72% Confidence)",
                urgency: "Elevated Risk",
                disclaimer: "WARNING: This is AI-assisted clinical decision support, NOT a definitive diagnosis."
            } : {
                title: "AI Radiographic Support Complete",
                findings: "Linear lucency in distal radius (85% Confidence)",
                urgency: "Immediate",
                disclaimer: "WARNING: This tool does not replace a board-certified radiologist."
            };
            setResult(mockResult);
            if (onUploadComplete) onUploadComplete(mockResult);
        }, 2500);
    };

    return (
        <div className="w-full max-w-xl mx-auto rounded-2xl border p-6 bg-white shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <FileImage className="h-5 w-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Clinical Image Analysis</h2>
                    <p className="text-sm text-gray-500">Multimodal Decision Support</p>
                </div>
            </div>

            {!result ? (
                <div className="space-y-6">
                    {/* Type Selection */}
                    <div className="flex gap-4">
                        <button
                            onClick={() => setType("wound")}
                            className={`flex-1 py-3 rounded-xl border ${type === "wound" ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "bg-gray-50 text-gray-500"}`}
                        >Wound Care</button>
                        <button
                            onClick={() => setType("xray")}
                            className={`flex-1 py-3 rounded-xl border ${type === "xray" ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold" : "bg-gray-50 text-gray-500"}`}
                        >Radiographic (X-Ray)</button>
                    </div>

                    {/* File Input Mock */}
                    <label className="flex flex-col items-center justify-center h-32 w-full border-2 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pb-6 pt-5">
                            <Upload className="w-8 h-8 mb-2 text-gray-400" />
                            <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> {file ? file.name : "or drag and drop"}</p>
                        </div>
                        <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>

                    {/* Mandatory Regulatory Safeguard */}
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm">
                        <AlertTriangle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-semibold mb-1">MANDATORY CLINICAL DISCLAIMER</p>
                            <p className="mb-2 opacity-90">This tool provides AI-assisted support. It is NOT a medical diagnosis and cannot replace a licensed clinician's judgment.</p>
                            <label className="flex items-center gap-2 font-medium cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300"
                                    checked={consentGiven}
                                    onChange={(e) => setConsentGiven(e.target.checked)}
                                />
                                I acknowledge and authorize AI image processing.
                            </label>
                        </div>
                    </div>

                    <button
                        disabled={!file || !consentGiven || isProcessing}
                        onClick={handleUpload}
                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2 transition-all"
                    >
                        {isProcessing ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Upload className="h-5 w-5" /></motion.div> : "Analyze Image"}
                    </button>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
                        <div>
                            <h3 className="font-bold">{result.title}</h3>
                            <p className="font-mono text-sm mt-1">{result.findings}</p>
                            <p className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-block mt-2 font-semibold">Flag: {result.urgency}</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 italic text-center px-4">{result.disclaimer}</p>
                    <button onClick={() => { setResult(null); setFile(null); setConsentGiven(false); }} className="w-full py-2 text-sm text-blue-600 font-semibold hover:bg-blue-50 rounded-lg">Run Another Scan</button>
                </motion.div>
            )}
        </div>
    );
}
