import 'server-only';
import { Pinecone } from '@pinecone-database/pinecone';

export interface DocumentChunk {
    id: string;
    content: string;
    metadata: {
        feature?: string;
        architecture?: string;
        compliance?: string;
        category?: string;
    };
    embedding?: number[];
}

export class VectorStore {
    private pc: Pinecone;
    private host: string;

    constructor() {
        const apiKey = process.env.PINECONE_API_KEY;
        const host = process.env.PINECONE_HOST;
        const indexName = process.env.PINECONE_INDEX || 'mediscribe';

        console.log(`[VectorStore] Initializing with Host: ${host ? 'present' : 'MISSING'}`);
        console.log(`[VectorStore] PINECONE_API_KEY present: ${!!apiKey}`);
        console.log(`[VectorStore] PINECONE_API_KEY length: ${apiKey?.length || 0}`);

        if (!apiKey) {
            console.error("[VectorStore] CRITICAL: PINECONE_API_KEY is missing from process.env");
            throw new Error("Missing PINECONE_API_KEY environment variable. Pincone cannot be initialized.");
        }

        this.pc = new Pinecone({
            apiKey: apiKey || '',
        });
        this.host = host || '';
    }

    /**
     * Search for the top K most similar chunks using Pinecone
     */
    async similaritySearch(queryEmbedding: number[], k: number = 3): Promise<DocumentChunk[]> {
        if (!this.host) {
            console.warn("Pinecone Host is missing. Falling back to empty results.");
            return [];
        }

        try {
            const index = this.pc.index(process.env.PINECONE_INDEX || 'mediscribe', this.host);

            const queryResponse = await index.query({
                vector: queryEmbedding,
                topK: k,
                includeMetadata: true,
            });

            return queryResponse.matches.map(match => ({
                id: match.id,
                content: (match.metadata?.content as string) || "",
                metadata: {
                    category: (match.metadata?.category as string) || "",
                    feature: (match.metadata?.feature as string) || "",
                },
            })) as DocumentChunk[];
        } catch (error) {
            console.error("Pinecone search error:", error);
            return [];
        }
    }

    /**
     * Upsert chunks into Pinecone
     */
    async upsertChunks(chunks: DocumentChunk[]) {
        if (!this.host) return;

        try {
            const index = this.pc.index(process.env.PINECONE_INDEX || 'mediscribe', this.host);
            const vectors = chunks.map(chunk => ({
                id: chunk.id,
                values: chunk.embedding || [],
                metadata: {
                    content: chunk.content,
                    ...chunk.metadata
                }
            }));

            await index.upsert({ records: vectors });
        } catch (error) {
            console.error("Pinecone upsert error:", error);
        }
    }
}
