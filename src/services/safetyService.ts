/**
 * SafetyService
 * 
 * Provides governance guardrails for the AI-Native Orchestrator.
 * Handles PII detection/masking and evaluates AI confidence against clinical risk
 * to determine if Human-in-the-Loop escalation is required.
 */

// Simulated PII Patterns (Simplified for architectural demonstration)
const PII_PATTERNS = [
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, // Credit Card
    // Note: True HIPAA PII requires advanced NLP or comprehensive regex libraries,
    // but this serves as the foundational hook.
];

export const SafetyService = {
    /**
     * Scans text and replaces detected PII with generic markers like [REDACTED].
     * This should run before sending raw data to external LLMs if full BAA is not in place.
     */
    maskPII(text: string): string {
        if (!text) return text;
        let masked = text;
        for (const pattern of PII_PATTERNS) {
            masked = masked.replace(pattern, "[REDACTED_PII]");
        }
        return masked;
    },

    /**
     * Evaluates the output of a clinical tool/agent to determine if the 
     * Orchestrator should auto-escalate to a human clinician.
     * 
     * Escalation Rules:
     * - If Risk is Critical, human review is ALWAYS required.
     * - If Confidence < 0.60, human review is ALWAYS required.
     * - If Risk is High and Confidence < 0.85, human review is required.
     */
    evaluateEscalationRisk(
        toolName: string,
        riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown',
        confidence: number
    ): { requiresEscalation: boolean; reason?: string } {

        // Hard stops that bypass AI autonomy
        if (riskLevel === 'critical') {
            return { requiresEscalation: true, reason: `Critical clinical risk detected by [${toolName}]. Mandatory physician review.` };
        }

        if (confidence < 0.60) {
            return { requiresEscalation: true, reason: `AI Confidence (${(confidence * 100).toFixed(0)}%) for [${toolName}] is below safe autonomous threshold.` };
        }

        if (riskLevel === 'high' && confidence < 0.85) {
            return { requiresEscalation: true, reason: `High clinical risk detected with insufficient confidence (${(confidence * 100).toFixed(0)}%).` };
        }

        // Default: AI is confident enough to proceed autonomously
        return { requiresEscalation: false };
    }
};
