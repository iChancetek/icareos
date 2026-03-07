/**
 * iCareOS DataIQ Firestore Service
 * Persists and retrieves signals, predictions, A2A messages, and patient profiles
 * for the DataIQ Clinical Data Intelligence Agent.
 *
 * Collections:
 *   - clinical_signals       : Normalized signal records from all agents
 *   - predictive_outputs     : DataIQ cross-module prediction results
 *   - agent_messages         : A2A message bus (publish / consume)
 *   - patient_profiles       : Aggregated cross-module patient context
 */
import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    where,
    Timestamp,
} from 'firebase/firestore';
import type { DataIQSignalPayload, DataIQResult, A2AMessage, DataIQSourceModule } from '@/types/agents';

// ─── Internal Stored Types ────────────────────────────────────────────────────

export interface StoredClinicalSignal extends DataIQSignalPayload {
    id?: string;
    patientContext: string;
    createdAt: Timestamp | null;
}

export interface StoredPredictiveOutput extends DataIQResult {
    id?: string;
    createdAt: Timestamp | null;
}

export interface StoredA2AMessage extends A2AMessage {
    id?: string;
    createdAt: Timestamp | null;
}

export interface PatientProfile {
    id?: string;
    patientContext: string;
    lastUpdatedAt: Timestamp | null;
    modulesContributing: DataIQSourceModule[];
    overallRiskScore: number;
    activePredictionCount: number;
    summary: string;
}

// ─── Clinical Signals ─────────────────────────────────────────────────────────

/**
 * Persist a normalized clinical signal from a source module.
 */
export async function writeSignal(
    patientContext: string,
    signal: DataIQSignalPayload
): Promise<void> {
    try {
        await addDoc(collection(db, 'clinical_signals'), {
            ...signal,
            patientContext,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.warn('[DataIQService] Failed to write clinical signal:', error);
    }
}

/**
 * Retrieve recent signals for a specific patient.
 */
export async function getPatientSignals(
    patientContext: string,
    limitCount = 50
): Promise<StoredClinicalSignal[]> {
    try {
        const q = query(
            collection(db, 'clinical_signals'),
            where('patientContext', '==', patientContext),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoredClinicalSignal));
    } catch {
        return [];
    }
}

// ─── Predictive Outputs ───────────────────────────────────────────────────────

/**
 * Persist a full DataIQ result (predictions, risk score, summary).
 */
export async function writePredictions(result: DataIQResult): Promise<void> {
    try {
        await addDoc(collection(db, 'predictive_outputs'), {
            ...result,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.warn('[DataIQService] Failed to write predictive output:', error);
    }
}

/**
 * Retrieve the most recent DataIQ prediction results (for dashboard).
 */
export async function getRecentPredictions(limitCount = 20): Promise<StoredPredictiveOutput[]> {
    try {
        const q = query(
            collection(db, 'predictive_outputs'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoredPredictiveOutput));
    } catch {
        return [];
    }
}

// ─── A2A Message Bus ──────────────────────────────────────────────────────────

/**
 * Publish an A2A message to the shared agent message bus.
 */
export async function publishA2AMessage(msg: A2AMessage): Promise<void> {
    try {
        await addDoc(collection(db, 'agent_messages'), {
            ...msg,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.warn('[DataIQService] Failed to publish A2A message:', error);
    }
}

/**
 * Retrieve the most recent A2A messages (for dashboard message feed).
 */
export async function getRecentA2AMessages(limitCount = 30): Promise<StoredA2AMessage[]> {
    try {
        const q = query(
            collection(db, 'agent_messages'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StoredA2AMessage));
    } catch {
        return [];
    }
}

// ─── Patient Profiles ─────────────────────────────────────────────────────────

/**
 * Upsert (add) an aggregated patient profile.
 */
export async function upsertPatientProfile(profile: Omit<PatientProfile, 'id' | 'lastUpdatedAt'>): Promise<void> {
    try {
        await addDoc(collection(db, 'patient_profiles'), {
            ...profile,
            lastUpdatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.warn('[DataIQService] Failed to upsert patient profile:', error);
    }
}

/**
 * Retrieve recent patient profiles (for dashboard overview).
 */
export async function getRecentPatientProfiles(limitCount = 10): Promise<PatientProfile[]> {
    try {
        const q = query(
            collection(db, 'patient_profiles'),
            orderBy('lastUpdatedAt', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PatientProfile));
    } catch {
        return [];
    }
}
