import { NextRequest, NextResponse } from "next/server";
import { RAGEngine } from "@/lib/rag/engine";
import { knowledgeBase } from "@/lib/rag/knowledge";
import { VectorStore } from "@/lib/rag/vector-store";

let engine: RAGEngine | null = null;
let isSeeded = false;

async function getEngine() {
    if (engine) return engine;
    engine = new RAGEngine();
    return engine;
}

/**
 * Seeding logic to ensure Pinecone has the MediScribe knowledgebase
 */
async function seedKnowledge() {
    if (isSeeded) return;

    const ragEngine = await getEngine();
    const vectorStore = new VectorStore();

    // Generating embeddings and upserting manually for this surgical integration
    const embeddedChunks = await Promise.all(
        knowledgeBase.map(async (doc) => {
            const embedding = await ragEngine.generateEmbedding(doc.content);
            return { ...doc, embedding };
        })
    );

    await vectorStore.upsertChunks(embeddedChunks);
    isSeeded = true;
    console.log("RAG Knowledge Base Seeded to Pinecone.");
}

export async function POST(req: NextRequest) {
    // Diagnostic logging requested by user
    console.log("[RAG API] PINECONE_API_KEY present:", !!process.env.PINECONE_API_KEY);
    console.log("[RAG API] PINECONE_API_KEY length:", process.env.PINECONE_API_KEY?.length || 0);

    try {
        const { query } = await req.json();

        if (!query) {
            console.warn("[RAG API] Missing query in request");
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        console.log(`[RAG API] Processing query: "${query}"`);

        // Seed on first request if not already done
        // (In a real production app, this would be a separate build-time/migration step)
        console.log("[RAG API] Checking knowledge base status...");
        await seedKnowledge();
        console.log("[RAG API] Knowledge base ready.");

        const ragEngine = await getEngine();
        console.log("[RAG API] Calling RAG Engine answerQuery...");
        const stream = await ragEngine.answerQuery(query);
        console.log("[RAG API] Stream obtained, returning response.");

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("[RAG API] ERROR:", error);
        const status = error.status || 500;
        const msg = error.message || "Internal Server Error";
        return NextResponse.json({ error: msg }, { status });
    }
}
