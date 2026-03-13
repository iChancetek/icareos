/**
 * cdsService.ts
 * Firestore service for persistent CDS clinical imaging storage.
 * Handles: save analysis, list history, get by ID, update clinician review.
 */

import {
    collection, addDoc, getDocs, getDoc, doc, updateDoc,
    query, where, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_AI_LABEL } from "@/services/constants";

// ── Types ───────────────────────────────────────────────────────────────
export interface CdsImageRecord {
    id: string;
    userId: string;
    imageType: "wound" | "xray" | "dermatology";
    imageName: string;
    patientName?: string;
    imageDataUri: string;      // base64 stored directly in Firestore (< 1MB per record)
    context?: string;
    analysis: any;             // The full structured AI report
    primaryFinding: string;    // Top-level finding for list display
    severityLevel: string;
    confidenceScore: number;
    escalationRequired: boolean;
    modelVersion: string;
    uploadedAt: Date;
    // Clinician sign-off
    clinicianStatus: "pending" | "approved" | "modified" | "overridden";
    clinicianNotes?: string;
    clinicianUserId?: string;
    clinicianSignedAt?: Date;
}

// ── Constants ───────────────────────────────────────────────────────────
const CDS_COLLECTION = "cdsAnalyses";

// ── Save CDS Analysis ───────────────────────────────────────────────────
export async function saveCdsAnalysis(
    userId: string,
    imageDataUri: string,
    imageName: string,
    imageType: string,
    context: string,
    analysis: any,
    patientName?: string
): Promise<string | null> {
    try {
        const assessment = analysis.differentialAssessment || analysis.probableInterpretation;
        const primaryFinding = assessment?.mostLikely?.condition || "Analysis complete";
        const severityLevel = analysis.severity?.level
            || analysis.clinicalImplications?.urgency
            || "moderate";

        const record = {
            userId,
            imageType,
            imageName,
            patientName: patientName || "Unknown Patient",
            imageDataUri,
            context: context || "",
            analysis,
            primaryFinding,
            severityLevel,
            confidenceScore: analysis.confidenceScore ?? 0,
            escalationRequired: analysis.escalationRequired ?? false,
            modelVersion: DEFAULT_AI_LABEL,
            uploadedAt: serverTimestamp(),
            clinicianStatus: "pending",
            clinicianNotes: null,
            clinicianUserId: null,
            clinicianSignedAt: null,
        };

        const docRef = await addDoc(collection(db, CDS_COLLECTION), record);
        return docRef.id;
    } catch (err) {
        console.error("[cdsService] saveCdsAnalysis failed:", err);
        return null;
    }
}

// ── Get User's CDS History ──────────────────────────────────────────────
export async function getUserCdsHistory(userId: string): Promise<CdsImageRecord[]> {
    try {
        const q = query(
            collection(db, CDS_COLLECTION),
            where("userId", "==", userId),
            orderBy("uploadedAt", "desc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                uploadedAt: (data.uploadedAt as Timestamp)?.toDate?.() ?? new Date(),
                clinicianSignedAt: (data.clinicianSignedAt as Timestamp)?.toDate?.() ?? undefined,
            } as CdsImageRecord;
        });
    } catch (err) {
        console.error("[cdsService] getUserCdsHistory failed:", err);
        return [];
    }
}

// ── Get All CDS (for admin/clinicians) ─────────────────────────────────
export async function getAllCdsHistory(): Promise<CdsImageRecord[]> {
    try {
        const q = query(
            collection(db, CDS_COLLECTION),
            orderBy("uploadedAt", "desc")
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            return {
                ...data,
                id: d.id,
                uploadedAt: (data.uploadedAt as Timestamp)?.toDate?.() ?? new Date(),
                clinicianSignedAt: (data.clinicianSignedAt as Timestamp)?.toDate?.() ?? undefined,
            } as CdsImageRecord;
        });
    } catch (err) {
        console.error("[cdsService] getAllCdsHistory failed:", err);
        return [];
    }
}

// ── Get Single Record ───────────────────────────────────────────────────
export async function getCdsAnalysisById(id: string): Promise<CdsImageRecord | null> {
    try {
        const snap = await getDoc(doc(db, CDS_COLLECTION, id));
        if (!snap.exists()) return null;
        const data = snap.data();
        return {
            ...data,
            id: snap.id,
            uploadedAt: (data.uploadedAt as Timestamp)?.toDate?.() ?? new Date(),
            clinicianSignedAt: (data.clinicianSignedAt as Timestamp)?.toDate?.() ?? undefined,
        } as CdsImageRecord;
    } catch (err) {
        console.error("[cdsService] getCdsAnalysisById failed:", err);
        return null;
    }
}

// ── Clinician Sign-Off ──────────────────────────────────────────────────
export async function updateCdsClinicianReview(
    id: string,
    clinicianUserId: string,
    status: "approved" | "modified" | "overridden",
    notes?: string
): Promise<boolean> {
    try {
        await updateDoc(doc(db, CDS_COLLECTION, id), {
            clinicianStatus: status,
            clinicianNotes: notes || null,
            clinicianUserId,
            clinicianSignedAt: serverTimestamp(),
        });
        return true;
    } catch (err) {
        console.error("[cdsService] updateCdsClinicianReview failed:", err);
        return false;
    }
}
