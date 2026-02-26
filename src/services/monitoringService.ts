/**
 * AiMonitoringService
 * 
 * Tracks the performance and safety of the AI-Native Orchestrator.
 * Crucial for observing autonomous decision accuracy and escalation rates over time.
 */

import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export interface OrchestrationLog {
    sessionId: string;
    patientId: string;
    totalLatencyMs: number;
    agentsInvoked: string[];
    wasEscalated: boolean;
    escalationReason: string | null;
    overallConfidence: number;
    timestamp: string;
}

export const AiMonitoringService = {
    /**
     * Logs an orchestration trace.
     * This is typically called at the end of the `orchestratorGraph` execution or 
     * when a tool forces an escalation.
     */
    async logSessionData(data: OrchestrationLog) {
        try {
            // Store in a global system telemetry collection (not attached to a specific user)
            const telemetryRef = collection(db as any, "_system_telemetry", "ai_metrics", "logs");
            await addDoc(telemetryRef, data);
            console.log(`[AiMonitoring] Session ${data.sessionId} logged successfully.`);
        } catch (e) {
            console.error("[AiMonitoring] Failed to log telemetry", e);
        }
    }
}
