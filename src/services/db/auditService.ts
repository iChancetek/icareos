/**
 * iCareOS Centralized Audit Service
 * Writes and reads all system events, repairs, security patches,
 * and user activity to the `platform_audit_logs` Firestore collection.
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

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export type AuditAgent =
    | 'PlatformValidationAgent'
    | 'CodeSecurityAgent'
    | 'DevOpsGuardianAgent'
    | 'PerformanceAgent'
    | 'ComplianceAgent'
    | 'System'
    | 'User';

export type AuditModule =
    | 'MediScribe'
    | 'Insight'
    | 'WoundIQ'
    | 'RadiologyIQ'
    | 'iSkylar'
    | 'BillingIQ'
    | 'RiskIQ'
    | 'CareCoordIQ'
    | 'Auth'
    | 'Admin'
    | 'CI/CD'
    | 'Platform';

export interface AuditLogEntry {
    id?: string;
    timestamp: Timestamp | null;
    agent: AuditAgent;
    severity: AuditSeverity;
    module: AuditModule;
    actionTaken: string;
    details?: string;
    userId?: string;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function writeAuditLog(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<void> {
    try {
        await addDoc(collection(db, 'platform_audit_logs'), {
            ...entry,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        // Fail silently — audit logging must never crash the platform
        console.warn('[AuditService] Failed to write audit log:', error);
    }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getRecentAuditLogs(
    limitCount = 100
): Promise<AuditLogEntry[]> {
    try {
        const q = query(
            collection(db, 'platform_audit_logs'),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry));
    } catch {
        return [];
    }
}

export async function getAuditLogsByAgent(
    agent: AuditAgent,
    limitCount = 50
): Promise<AuditLogEntry[]> {
    try {
        const q = query(
            collection(db, 'platform_audit_logs'),
            where('agent', '==', agent),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry));
    } catch {
        return [];
    }
}

export async function getAuditLogsBySeverity(
    severity: AuditSeverity,
    limitCount = 50
): Promise<AuditLogEntry[]> {
    try {
        const q = query(
            collection(db, 'platform_audit_logs'),
            where('severity', '==', severity),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLogEntry));
    } catch {
        return [];
    }
}
