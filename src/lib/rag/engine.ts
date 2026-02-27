import 'server-only';
import OpenAI from "openai";
import { VectorStore, DocumentChunk } from "./vector-store";
import { ENGINE_MODEL } from "@/services/constants";

const getClient = () => {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key.includes("dummy")) {
        console.error("[RAGEngine] CRITICAL: OPENAI_API_KEY is not set or using dummy value.");
        throw new Error("Missing OPENAI_API_KEY environment variable. RAG Engine cannot function.");
    } else {
        console.log(`[RAGEngine] Using API Key: ${key.substring(0, 7)}...`);
    }
    return new OpenAI({
        apiKey: key || "dummy-key",
    });
};

export class RAGEngine {
    private vectorStore: VectorStore;

    constructor() {
        this.vectorStore = new VectorStore();
    }

    /**
     * Generate an embedding for a given text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        console.log(`[RAGEngine] Generating embedding for text length: ${text.length}`);
        const response = await getClient().embeddings.create({
            model: "text-embedding-3-small",
            input: text.replace(/\n/g, " "),
        });
        console.log("[RAGEngine] Embedding generated successfully.");
        return response.data[0].embedding;
    }

    /**
     * Answer a query based on retrieved context
     */
    async answerQuery(query: string): Promise<ReadableStream> {
        console.log("[RAGEngine] Generating query embedding...");
        const queryEmbedding = await this.generateEmbedding(query);

        console.log("[RAGEngine] Performing similarity search in Pinecone...");
        const relevantChunks = await this.vectorStore.similaritySearch(queryEmbedding, 4);
        console.log(`[RAGEngine] Found ${relevantChunks.length} relevant chunks.`);

        const context = relevantChunks.map(c => `[Category: ${c.metadata.category || 'General'}] ${c.content}`).join("\n\n");

        const systemPrompt = `
      You are the MediScribe AI Support Intelligence. Your goal is to provide authoritative, technical, and helpful information about MediScribe.

      ### Professional Communication Standards:
      - **Tone**: Professional, technical, executive-grade.
      - **Structure**: Use clear headings (###) and double spaces between paragraphs.
      - **Formatting**: Broadly use **bullet points** to break down features.
      - **Boldness**: Use **bolding** for all MediScribe product names and core features.

      ### Constraints:
      - Responses must be polished and ready for a clinician.
      - Always include a structured section for **Core Capabilities** if relevant.

      Use the context below to answer. If missing, guide the user to **Neural SOAP Generation** or **Agentic (A2A) Orchestration**.

      Context:
      ${context}
    `;

        console.log(`[RAGEngine] Calling OpenAI Chat Completion (${ENGINE_MODEL})...`);
        const response = await getClient().chat.completions.create({
            model: ENGINE_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            stream: true,
            temperature: 0.3,
            max_completion_tokens: 1024,
        });
        console.log("[RAGEngine] Stream response started.");

        // Convert OpenAI stream to a Web ReadableStream
        return new ReadableStream({
            async start(controller) {
                for await (const chunk of response) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        controller.enqueue(new TextEncoder().encode(content));
                    }
                }
                controller.close();
            },
        });
    }
}
