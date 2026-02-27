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
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        // Seed on first request if not already done
        // (In a real production app, this would be a separate build-time/migration step)
        await seedKnowledge();

        const ragEngine = await getEngine();
        const stream = await ragEngine.answerQuery(query);

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("RAG Assistant API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
