// @ts-ignore - Assuming lib/firebase db export doesn't have strict typing yet
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";

/**
 * MemoryService
 * 
 * Bridges LangGraph thread states (Short-Term Memory) and 
 * historical patient session embeddings (Long-Term Memory)
 * with our existing Firestore IScribe collection.
 */
export const MemoryService = {
    /**
     * Short-Term Memory
     * Persists a LangGraph decision trace to the specific IScribe record.
     */
    async logAgentDecision(
        scribeId: string,
        userId: string,
        agent: string,
        action: string,
        reasoning: string,
        confidence: number
    ) {
        try {
            const scribeRef = doc(db as any, "users", userId, "iscribes", scribeId);
            const scribeSnap = await getDoc(scribeRef);

            if (!scribeSnap.exists()) return;

            const data = scribeSnap.data();
            const decisionLogs = data.decisionLogs || [];

            decisionLogs.push({
                agent,
                action,
                reasoning,
                confidence,
                timestamp: new Date().toISOString()
            });

            await setDoc(scribeRef, { decisionLogs }, { merge: true });
        } catch (e) {
            console.error("[MemoryService] Failed to append decision log", e);
        }
    },

    /**
     * Long-Term Memory
     * Retrieves previous IScribes for a patient to provide historical pattern context
     * to the Orchestrator/Clinical Risk Agent.
     */
    async getPatientHistory(userId: string, patientName: string) {
        try {
            const scribesRef = collection(db as any, "users", userId, "iscribes");
            const q = query(scribesRef, where("patientName", "==", patientName));
            const snapshot = await getDocs(q);

            const history = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    date: data.date,
                    assessment: data.soapNote?.assessment || "No assessment",
                    riskLevel: data.riskLevel || "unknown",
                    decisionLogs: data.decisionLogs || []
                };
            });

            return history;
        } catch (e) {
            console.error("[MemoryService] Failed to retrieve patient history", e);
            return [];
        }
    }
};
