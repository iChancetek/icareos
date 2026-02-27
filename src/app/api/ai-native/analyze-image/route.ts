import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Clinical prompts ───────────────────────────────────────────────────
const WOUND_SYSTEM_PROMPT = `You are a clinical decision support AI specialized in wound care and dermatology.
Your role is to assist licensed healthcare professionals — NOT to provide autonomous diagnosis.

When analyzing a wound, skin condition, rash, lesion, or pressure sore image, respond ONLY with structured JSON in this exact shape:

{
  "imageType": "wound" | "dermatology" | "xray",
  "visualObservations": {
    "location": "string or 'Not specified'",
    "color": "string",
    "borderRegularity": "string",
    "sizeEstimate": "string",
    "signs": {
      "swelling": boolean,
      "redness": boolean,
      "drainage": boolean,
      "necrosis": boolean,
      "scaling": boolean,
      "blistering": boolean,
      "infectionSigns": boolean
    },
    "summary": "2-3 sentence objective description of what is visually present"
  },
  "differentialAssessment": {
    "mostLikely": { "condition": "string", "confidence": number (0-100) },
    "alternatives": [
      { "condition": "string", "confidence": number (0-100) },
      { "condition": "string", "confidence": number (0-100) }
    ],
    "reasoning": "string"
  },
  "severity": {
    "level": "mild" | "moderate" | "severe" | "critical",
    "explanation": "string"
  },
  "riskAssessment": {
    "infectionRisk": "low" | "moderate" | "high",
    "systemicComplicationRisk": "low" | "moderate" | "high",
    "urgency": "routine" | "24h-clinician-review" | "immediate-attention",
    "urgencyExplanation": "string"
  },
  "treatmentGuidance": {
    "cleaningRecommendations": "string",
    "dressingType": "string",
    "medicationGuidance": "string",
    "monitoringInstructions": "string",
    "redFlagSymptoms": ["string"],
    "preventativeCare": "string"
  },
  "escalationRequired": boolean,
  "escalationReason": "string or null",
  "confidenceScore": number (0-100),
  "auditLog": {
    "modelUsed": "gpt-4-turbo",
    "analysisTimestamp": "ISO string",
    "visualFeaturesExtracted": ["string"],
    "guidelinesReferenced": ["string"],
    "escalationDecision": "string"
  },
  "disclaimer": "This AI-generated analysis is for clinical decision support and does not replace evaluation by a licensed healthcare professional."
}`;

const XRAY_SYSTEM_PROMPT = `You are a clinical decision support AI providing AI-assisted radiographic interpretation support.
Your role assists licensed radiologists and clinicians — NOT to replace board-certified radiologists.

When analyzing an X-ray or radiographic image, respond ONLY with structured JSON in this exact shape:

{
  "imageType": "xray",
  "technicalObservations": {
    "imageOrientation": "string",
    "visibleStructures": ["string"],
    "imageLimitations": "string",
    "summary": "string"
  },
  "radiographicFindings": {
    "primaryFindings": ["string"],
    "description": "Objective description of what is radiographically visible before interpretation"
  },
  "probableInterpretation": {
    "mostLikely": { "condition": "string", "confidence": number (0-100) },
    "alternatives": [
      { "condition": "string", "confidence": number (0-100) }
    ],
    "reasoning": "string"
  },
  "clinicalImplications": {
    "functionalImpact": "string",
    "urgency": "routine" | "24h-clinician-review" | "immediate-attention",
    "possibleComplications": ["string"]
  },
  "recommendedNextSteps": {
    "specialistReferral": "string",
    "additionalImaging": "string",
    "immobilizationGuidance": "string",
    "monitoringAdvice": "string",
    "emergencyEscalation": "string or null"
  },
  "escalationRequired": boolean,
  "escalationReason": "string or null",
  "confidenceScore": number (0-100),
  "auditLog": {
    "modelUsed": "gpt-4-turbo",
    "analysisTimestamp": "ISO string",
    "visualFeaturesExtracted": ["string"],
    "guidelinesReferenced": ["string"],
    "escalationDecision": "string"
  },
  "disclaimer": "This AI-assisted radiographic interpretation is for clinical decision support only and does not replace evaluation by a board-certified radiologist."
}`;

// ── Route Handler ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const imageFile = formData.get("image") as File | null;
        const imageType = (formData.get("type") as string) || "wound";
        const context = formData.get("context") as string || "";

        if (!imageFile) {
            return NextResponse.json({ error: "Image file is required" }, { status: 400 });
        }

        // Convert to base64
        const imageBuffer = await imageFile.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString("base64");
        const mimeType = imageFile.type || "image/jpeg";

        const systemPrompt = imageType === "xray" ? XRAY_SYSTEM_PROMPT : WOUND_SYSTEM_PROMPT;

        const userMessage = imageType === "xray"
            ? `Please analyze this radiographic image and provide a comprehensive AI-assisted radiographic interpretation report. ${context ? `Additional context: ${context}` : ""}`
            : `Please analyze this clinical image of a wound/skin condition and provide a comprehensive clinical decision support analysis. ${context ? `Additional context: ${context}` : ""}`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",   // gpt-4o has vision capability
            max_completion_tokens: 2000,
            messages: [
                { role: "system", content: systemPrompt },
                {
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`,
                                detail: "high",
                            },
                        },
                        { type: "text", text: userMessage },
                    ],
                },
            ],
            response_format: { type: "json_object" },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
            throw new Error("No response from AI model");
        }

        const analysis = JSON.parse(rawContent);

        // Enforce escalation if confidence < 65 or infection signs detected
        const conf = analysis.confidenceScore ?? 100;
        const hasInfectionSigns = analysis.visualObservations?.signs?.infectionSigns;
        if (conf < 65 || hasInfectionSigns) {
            analysis.escalationRequired = true;
            if (!analysis.escalationReason) {
                analysis.escalationReason = conf < 65
                    ? `AI confidence is ${conf}% — below the 65% threshold requiring clinician review.`
                    : "Potential infection signs detected — immediate clinician review recommended.";
            }
        }

        // Stamp audit log
        analysis.auditLog = {
            ...analysis.auditLog,
            modelUsed: "gpt-4o",
            analysisTimestamp: new Date().toISOString(),
        };

        return NextResponse.json({ success: true, analysis });
    } catch (error: any) {
        console.error("[CDS ImageAnalysis] Error:", error);
        return NextResponse.json(
            { error: error.message || "Image analysis failed" },
            { status: 500 }
        );
    }
}
