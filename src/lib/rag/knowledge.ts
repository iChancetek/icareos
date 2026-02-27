import { DocumentChunk } from "./vector-store";

export const knowledgeBase: Omit<DocumentChunk, 'embedding'>[] = [
    {
        id: "feature-stt",
        content: "MediScribe uses real-time voice transcription powered by deep learning models. It specifically supports medical-grade accuracy, capturing symptoms, duration, and severity automatically.",
        metadata: { category: "AI Core", feature: "STT" }
    },
    {
        id: "feature-soap",
        content: "Neural SOAP Generation automatically transforms conversational intake into structured clinical notes, following the Subjective, Objective, Assessment, and Plan format.",
        metadata: { category: "Automation", feature: "SOAP" }
    },
    {
        id: "arch-langgraph",
        content: "MediScribe's agentic orchestration is powered by LangGraph, enabling multi-agent workflows that can handle complex clinical tasks autonomously.",
        metadata: { category: "Orchestration", architecture: "LangGraph" }
    },
    {
        id: "arch-a2a",
        content: "The Agent2Agent (A2A) system allows specialized AI agents to communicate and share state, refining patient data through collaborative intelligence.",
        metadata: { category: "Orchestration", architecture: "A2A" }
    },
    {
        id: "feature-rag",
        content: "The RAG (Retrieval-Augmented Generation) system provides authoritative answers about platform features by retrieving context from specialized vector embeddings.",
        metadata: { category: "Intelligence", feature: "RAG" }
    },
    {
        id: "security-compliance",
        content: "MediScribe maintains high security standards with NLP-based PHI scrubbing, ensuring that sensitive patient information is protected and compliant with healthcare regulations.",
        metadata: { category: "Security", compliance: "HIPAA" }
    },
    {
        id: "arch-mcp",
        content: "MediScribe supports the Model Context Protocol (MCP), a future-proof standard for integrating AI tools and data sources across different platforms and ecosystems.",
        metadata: { category: "Innovation", architecture: "MCP" }
    },
    {
        id: "rag-chunking",
        content: "Our RAG pipeline uses recursive splitting with chunks between 500-1000 tokens and a 100-token overlap to maintain semantic continuity during retrieval.",
        metadata: { category: "Infrastructure", architecture: "RAG" }
    }
];
