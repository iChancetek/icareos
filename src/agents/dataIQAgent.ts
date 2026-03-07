import 'server-only';
import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';
import {
    writeSignal,
    writePredictions,
    publishA2AMessage,
    upsertPatientProfile,
} from '@/services/dataIQService';
import { writeAuditLog } from '@/services/db/auditService';
import type {
    AgentMeta,
    DataIQSignalPayload,
    DataIQResult,
    DataIQPrediction,
    DataIQSourceModule,
    A2AMessage,
} from '@/types/agents';

// ─── Schema ───────────────────────────────────────────────────────────────────

const DATAIQ_SCHEMA = {
    type: 'object',
    properties: {
        overallRiskScore: { type: 'number' },
        crossModuleSummary: { type: 'string' },
        careGapCount: { type: 'number' },
        confidence: { type: 'number' },
        predictions: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    predictionType: {
                        type: 'string',
                        enum: [
                            'COMPLICATION_RISK',
                            'CARE_GAP',
                            'WOUND_HEALING_FORECAST',
                            'DIAGNOSTIC_FOLLOWUP',
                            'READMISSION_RISK',
                        ],
                    },
                    targetModule: {
                        type: 'string',
                        enum: ['MediScribe', 'Insight', 'WoundIQ', 'RadiologyIQ', 'iSkylar', 'BillingIQ', 'RiskIQ', 'CareCoordIQ'],
                    },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    confidence: { type: 'number' },
                    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                    recommendedAction: { type: 'string' },
                },
                required: ['predictionType', 'targetModule', 'title', 'description', 'confidence', 'severity', 'recommendedAction'],
                additionalProperties: false,
            },
        },
    },
    required: ['overallRiskScore', 'crossModuleSummary', 'careGapCount', 'confidence', 'predictions'],
    additionalProperties: false,
};

interface DataIQStructuredOutput {
    overallRiskScore: number;
    crossModuleSummary: string;
    careGapCount: number;
    confidence: number;
    predictions: DataIQPrediction[];
}

// ─── DataIQ Agent ─────────────────────────────────────────────────────────────

class DataIQAgentClass {

    /**
     * Aggregate structured signals from all source modules, run cross-module
     * predictive analysis, persist to Firestore, and publish A2A messages.
     */
    async aggregateSignals(
        patientContext: string,
        signals: DataIQSignalPayload[]
    ): Promise<DataIQResult> {
        const start = Date.now();

        // Build the signal summary for the AI prompt
        const modulesAnalyzed = [...new Set(signals.map((s) => s.sourceModule))] as DataIQSourceModule[];
        const signalSummary = signals.map((s) => ({
            module: s.sourceModule,
            confidence: s.confidence ?? null,
            data: s.data,
        }));

        const systemPrompt = `You are DataIQ, the Central Clinical Data Intelligence Agent of the iCareOS healthcare AI platform.

Your role is to synthesize cross-module clinical signals into unified predictive intelligence. You receive structured signals from these specialized agents: MediScribe, Insight, WoundIQ, RadiologyIQ, iSkylar, BillingIQ, RiskIQ, and CareCoordIQ.

Your mission:
1. CROSS-MODULE ANALYSIS — Identify patterns and correlations that individual agents cannot see in isolation (e.g., BillingIQ flags underbilling while RiskIQ flags high severity — combined signal = documentation gap requiring immediate clinical and billing attention).
2. PREDICTIVE INTELLIGENCE — Generate specific, actionable predictions for:
   - Complication risks (cross-referencing all clinical signals)
   - Care gaps (medications, referrals, screenings not yet planned)
   - Wound healing forecasts (if WoundIQ signals present)
   - Diagnostic follow-up needs (if RadiologyIQ signals present)
   - Readmission risk (synthesizing MediScribe + RiskIQ + CareCoordIQ signals)
3. TARGET ROUTING — Each prediction must specify the targetModule that should act on it.
4. RISK SCORING — Synthesize all signals into an overall clinical risk score (0–100).

overallRiskScore: 0=no identifiable risk, 100=imminent critical multi-domain risk
careGapCount: exact number of distinct care gaps identified
confidence: your confidence in this cross-module assessment (0.0–1.0)
crossModuleSummary: a concise, expert-level narrative synthesizing all signals and your key findings

Generate predictions only for signals where there is genuine multi-module insight to add. Be specific, cite which modules contributed to each prediction, and prioritize patient outcomes.`;

        const userPrompt = `Perform a full DataIQ cross-module analysis for patient context: "${patientContext}"

Modules contributing signals: ${modulesAnalyzed.join(', ')}

Signal data:
${JSON.stringify(signalSummary, null, 2)}`;

        const output = await OpenAIService.generateStructured<DataIQStructuredOutput>(
            userPrompt, systemPrompt, DATAIQ_SCHEMA, 'dataiq_analysis'
        );

        const latency_ms = Date.now() - start;
        const sessionId = `dataiq_${Date.now()}`;
        const timestamp = new Date().toISOString();

        const meta: AgentMeta = {
            agentName: 'DataIQ',
            modelVersion: DEFAULT_AI_LABEL,
            confidence: output.confidence,
            latency_ms,
            requiresHumanReview: output.overallRiskScore >= 70,
            reviewNote: output.overallRiskScore >= 70
                ? `High aggregate risk score (${output.overallRiskScore}/100) — multi-agent escalation recommended`
                : undefined,
        };

        const result: DataIQResult = {
            sessionId,
            patientContext,
            modulesAnalyzed,
            predictions: output.predictions,
            crossModuleSummary: output.crossModuleSummary,
            overallRiskScore: output.overallRiskScore,
            careGapCount: output.careGapCount,
            timestamp,
            meta,
        };

        // ── Persist to Firestore (non-blocking, fire-and-forget) ──────────────
        void (async () => {
            // 1. Persist each incoming signal
            await Promise.all(signals.map((s) => writeSignal(patientContext, s)));

            // 2. Persist prediction results
            await writePredictions(result);

            // 3. Publish A2A messages for each prediction
            await this.publishPredictions(result);

            // 4. Update aggregated patient profile
            await upsertPatientProfile({
                patientContext,
                modulesContributing: modulesAnalyzed,
                overallRiskScore: output.overallRiskScore,
                activePredictionCount: output.predictions.length,
                summary: output.crossModuleSummary,
            });

            // 5. Audit log
            await writeAuditLog({
                agent: 'System',
                severity: output.overallRiskScore >= 70 ? 'WARNING' : 'INFO',
                module: 'DataIQ',
                actionTaken: `DataIQ analysis completed for patient context: ${patientContext}`,
                details: `Modules: ${modulesAnalyzed.join(', ')} | Risk Score: ${output.overallRiskScore} | Predictions: ${output.predictions.length}`,
            });
        })();

        return result;
    }

    /**
     * Publish A2A messages for each prediction to the shared agent message bus.
     * Each prediction message is routed to the relevant target module.
     */
    async publishPredictions(result: DataIQResult): Promise<void> {
        const messages: A2AMessage[] = result.predictions.map((pred) => ({
            agent_id: 'DataIQ',
            message_type: pred.predictionType === 'CARE_GAP' ? 'CARE_GAP' : 'PREDICTION_OUTPUT',
            patient_context: result.patientContext,
            signal_payload: {
                predictionType: pred.predictionType,
                title: pred.title,
                description: pred.description,
                severity: pred.severity,
                recommendedAction: pred.recommendedAction,
                sourceSessionId: result.sessionId,
            },
            confidence_score: pred.confidence,
            timestamp: result.timestamp,
            target_agent: pred.targetModule,
        }));

        await Promise.all(messages.map((msg) => publishA2AMessage(msg)));
    }
}

export const dataIQAgent = new DataIQAgentClass();
