import { RAGEngine } from "./engine";
import { knowledgeBase } from "./knowledge";
import { DocumentChunk } from "./vector-store";

export async function getInitializedRAGEngine(): Promise<RAGEngine> {
    // RAGEngine manages its own VectorStore internally.
    // Embeddings are generated on-demand via Pinecone.
    return new RAGEngine();
}
