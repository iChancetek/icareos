import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { saveCdsAnalysis } from "@/services/cdsService";
import { OpenAIService } from '@/services/openaiService';
import { DEFAULT_AI_LABEL } from '@/services/constants';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Generic label for privacy
const MODEL_LABEL = DEFAULT_AI_LABEL;
const ENGINE_MODEL = "gpt-5.2";

// ── Clinical prompts ───────────────────────────────────────────────────
const WOUND_SYSTEM_PROMPT = `You are a clinical decision support AI specialized in wound care and dermatology.
Your role is to assist licensed healthcare professionals — NOT to provide autonomous diagnosis.

When analyzing a wound, skin condition, rash, lesion, or pressure sore image, respond ONLY with structured JSON in this exact shape:

{
  "imageType": "wound",
  "visualObservations": {
    "location": "string or Not specified",
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
    "mostLikely": { "condition": "string", "confidence": 0 },
    "alternatives": [
      { "condition": "string", "confidence": 0 },
      { "condition": "string", "confidence": 0 }
    ],
    "reasoning": "string"
  },
  "severity": {
    "level": "mild",
    "explanation": "string"
  },
  "riskAssessment": {
    "infectionRisk": "low",
    "systemicComplicationRisk": "low",
    "urgency": "routine",
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
  "escalationRequired": false,
  "escalationReason": null,
  "confidenceScore": 0, // Scale 0-100
  "auditLog": {
    "modelUsed": "MediScribe AI",
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
    "mostLikely": { "condition": "string", "confidence": 0 },
    "alternatives": [
      { "condition": "string", "confidence": 0 }
    ],
    "reasoning": "string"
  },
  "clinicalImplications": {
    "functionalImpact": "string",
    "urgency": "routine",
    "possibleComplications": ["string"]
  },
  "recommendedNextSteps": {
    "specialistReferral": "string",
    "additionalImaging": "string",
    "immobilizationGuidance": "string",
    "monitoringAdvice": "string",
    "emergencyEscalation": null
  },
  "escalationRequired": false,
  "escalationReason": null,
  "confidenceScore": 0, // Scale 0-100
  "auditLog": {
    "modelUsed": "MediScribe AI",
    "analysisTimestamp": "ISO string",
    "visualFeaturesExtracted": ["string"],
    "guidelinesReferenced": ["string"],
    "escalationDecision": "string"
  },
  "disclaimer": "This AI-assisted radiographic interpretation is for clinical decision support only and does not replace evaluation by a board-certified radiologist."
}`;

// ── Route Handler ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  console.log("[CDS ImageAnalysis] POST request received");
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const imageType = (formData.get("type") as string) || "wound";
    const context = formData.get("context") as string || "";
    const userId = formData.get("userId") as string || "anonymous";

    console.log(`[CDS ImageAnalysis] Type: ${imageType}, Context: ${context.substring(0, 20)}..., User: ${userId}`);

    if (!imageFile) {
      console.error("[CDS ImageAnalysis] Missing image file");
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    // Convert to base64
    console.log("[CDS ImageAnalysis] Processing image buffer...");
    const imageBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageFile.type || "image/jpeg";
    const imageDataUri = `data:${mimeType};base64,${base64Image}`;

    const systemPrompt = imageType === "xray" ? XRAY_SYSTEM_PROMPT : WOUND_SYSTEM_PROMPT;

    const userMessage = imageType === "xray"
      ? `Analyze this radiographic image and provide a comprehensive AI-assisted radiographic interpretation report. ${context ? `Additional context: ${context}` : ""}`
      : `Analyze this clinical image of a wound/skin condition and provide a comprehensive clinical decision support analysis. ${context ? `Additional context: ${context}` : ""}`;

    console.log(`[CDS ImageAnalysis] Calling OpenAI Vision...`);
    const response = await openai.chat.completions.create({
      model: ENGINE_MODEL,
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageDataUri, detail: "high" },
            },
            { type: "text", text: userMessage },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      console.error("[CDS ImageAnalysis] Empty response from OpenAI");
      throw new Error("No response from AI model");
    }

    console.log("[CDS ImageAnalysis] Parsing AI response...");
    const analysis = JSON.parse(rawContent);

    // Enforce escalation & metric normalization
    let conf = analysis.confidenceScore ?? 100;
    // Normalize if the model returned a decimal (e.g., 0.85 -> 85)
    if (conf > 0 && conf <= 1) conf = conf * 100;
    analysis.confidenceScore = Math.round(conf);

    const hasInfectionSigns = analysis.visualObservations?.signs?.infectionSigns;
    if (conf < 65 || hasInfectionSigns) {
      analysis.escalationRequired = true;
      if (!analysis.escalationReason) {
        analysis.escalationReason = conf < 65
          ? `AI confidence is ${conf}% — below the 65% threshold requiring clinician review.`
          : "Potential infection signs detected — immediate clinician review recommended.";
      }
    }

    // Stamp audit log with platform model label
    analysis.auditLog = {
      ...analysis.auditLog,
      modelUsed: MODEL_LABEL,
      analysisTimestamp: new Date().toISOString(),
    };

    // ── Persist to Firestore (Non-blocking background task) ─────────
    if (userId !== "anonymous") {
      console.log(`[CDS ImageAnalysis] Scheduling Firestore archival for user: ${userId}`);
      // Run as a background promise so we don't hold up the AI response
      saveCdsAnalysis(
        userId,
        "archived_in_storage", // Placeholder until Firebase Storage is configured
        imageFile.name || "clinical-image",
        imageType,
        context,
        analysis
      ).then(id => {
        if (id) console.log(`[CDS ImageAnalysis] Background save successful. ID: ${id}`);
        else console.warn("[CDS ImageAnalysis] Background save failed (null ID)");
      }).catch(e => {
        console.error("[CDS ImageAnalysis] Background save error:", e);
      });
    }

    console.log("[CDS ImageAnalysis] Request completed successfully. Returning response.");
    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error("[CDS ImageAnalysis] Error:", error);
    return NextResponse.json(
      { error: error.message || "Image analysis failed" },
      { status: 500 }
    );
  }
}
