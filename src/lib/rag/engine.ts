import OpenAI from "openai";
import { VectorStore, DocumentChunk } from "./vector-store";
import { ENGINE_MODEL } from "@/services/openaiService";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class RAGEngine {
    private vectorStore: VectorStore;

    constructor() {
        this.vectorStore = new VectorStore();
    }

    /**
     * Generate an embedding for a given text
     */
    async generateEmbedding(text: string): Promise<number[]> {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: text.replace(/\n/g, " "),
        });
        return response.data[0].embedding;
    }

    /**
     * Answer a query based on retrieved context
     */
    async answerQuery(query: string): Promise<ReadableStream> {
        const queryEmbedding = await this.generateEmbedding(query);
        const relevantChunks = await this.vectorStore.similaritySearch(queryEmbedding, 4);

        const context = relevantChunks.map(c => `[Category: ${c.metadata.category || 'General'}] ${c.content}`).join("\n\n");

        const systemPrompt = `
      You are the MediScribe AI Assistant. Your goal is to provide authoritative, technical, and helpful information about MediScribe.
      Use the provided context to answer the user's question. 
      If the context doesn't contain the answer, say "I don't have that specific information yet, but I can tell you about our core features like SOAP generation and Agentic Orchestration."
      Keep answers concise and professional.

      Context:
      ${context}
    `;

        const response = await openai.chat.completions.create({
            model: ENGINE_MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            stream: true,
            temperature: 0.3,
            max_completion_tokens: 1024,
        });

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
