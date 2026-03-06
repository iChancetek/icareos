/**
 * iCareOS Agent-to-Agent (A2A) Communication Bus
 * Provides a Firestore-backed pub/sub messaging layer for all 5 autonomous agents.
 * Agents publish events and subscribe to events from other agents.
 *
 * Event Flow Example:
 *   CodeSecurityAgent detects vulnerability
 *   → publishes A2AEvent to bus
 *   → DevOpsGuardianAgent subscribes and triggers patch deployment
 *   → all events written to audit log via AuditService
 */

import { db } from '@/lib/firebase';
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    onSnapshot,
    Unsubscribe,
    Timestamp,
} from 'firebase/firestore';
import { writeAuditLog, AuditAgent, AuditModule } from '@/services/db/auditService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type A2AEventType =
    | 'VULNERABILITY_DETECTED'
    | 'MODULE_FAILURE_DETECTED'
    | 'REPAIR_INITIATED'
    | 'REPAIR_COMPLETED'
    | 'SECURITY_PATCH_APPLIED'
    | 'COMPLIANCE_ALERT'
    | 'PERFORMANCE_DEGRADATION'
    | 'PIPELINE_FAILURE'
    | 'PIPELINE_SUCCESS'
    | 'AGENT_HEALTH_CHECK'
    | 'SYSTEM_ALERT';

export interface A2AEvent {
    id?: string;
    eventType: A2AEventType;
    fromAgent: AuditAgent;
    toAgent?: AuditAgent | 'ALL';
    module: AuditModule;
    payload: Record<string, unknown>;
    severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
    timestamp?: Timestamp;
    resolved: boolean;
}

const A2A_COLLECTION = 'a2a_event_bus';

// ─── Publish ──────────────────────────────────────────────────────────────────

/**
 * Publish an event from one agent to the A2A bus.
 */
export async function publishA2AEvent(
    event: Omit<A2AEvent, 'id' | 'timestamp'>
): Promise<void> {
    try {
        await addDoc(collection(db, A2A_COLLECTION), {
            ...event,
            timestamp: serverTimestamp(),
        });

        // Mirror critical events to the audit log
        if (event.severity === 'CRITICAL' || event.severity === 'ERROR') {
            await writeAuditLog({
                agent: event.fromAgent,
                severity: event.severity,
                module: event.module,
                actionTaken: `[A2A] ${event.eventType} broadcast`,
                details: JSON.stringify(event.payload),
            });
        }
    } catch (error) {
        console.warn('[A2ABus] Failed to publish event:', error);
    }
}

// ─── Subscribe ────────────────────────────────────────────────────────────────

/**
 * Subscribe to A2A events targeted at a specific agent or broadcast to ALL.
 * Returns an unsubscribe function — call it to stop listening.
 */
export function subscribeA2AEvents(
    targetAgent: AuditAgent | 'ALL',
    callback: (event: A2AEvent) => void
): Unsubscribe {
    const q = query(
        collection(db, A2A_COLLECTION),
        where('toAgent', 'in', [targetAgent, 'ALL']),
        where('resolved', '==', false),
        orderBy('timestamp', 'desc'),
        limit(20)
    );

    return onSnapshot(q, (snap) => {
        snap.docChanges().forEach((change) => {
            if (change.type === 'added') {
                callback({ id: change.doc.id, ...change.doc.data() } as A2AEvent);
            }
        });
    });
}

// ─── Fetch Recent Events ──────────────────────────────────────────────────────

export async function getRecentA2AEvents(limitCount = 50): Promise<A2AEvent[]> {
    try {
        const q = query(
            collection(db, A2A_COLLECTION),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() } as A2AEvent));
    } catch {
        return [];
    }
}
