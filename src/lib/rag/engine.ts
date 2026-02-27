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
      You are the MediScribe AI Assistant, a premium clinical intelligence companion. 
      Your goal is to provide authoritative, technical, and helpful information about MediScribe using a polished and professional tone.

      ### Formatting Requirements:
      - Use **bullet points** to break down complex information.
      - Use **bold text** for key terms and feature names.
      - Keep answers concise but highly structured.
      - Use clear headings if explaining multiple topics.

      Use the provided context to answer the user's question. 
      If the context doesn't contain the answer, say "I don't have that specific information yet, but I can guide you through our core capabilities like **Neural SOAP Generation** or **Agentic Orchestration**."

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
