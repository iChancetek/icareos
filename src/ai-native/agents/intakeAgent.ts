import { RunnableConfig } from "@langchain/core/runnables";
import { AIMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, messagesStateReducer } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";
import { isSystemMessage } from "@langchain/core/messages";

// The state type for the intake flow
export const IntakeStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    patientId: Annotation<string>(),
    symptomsCollected: Annotation<boolean>({
        reducer: (curr, next) => next,
        default: () => false,
    }),
});

const INTAKE_SYSTEM_PROMPT = `
You are the MediScribe Conversational Intake Agent. Your job is to extract medical symptoms, duration, and severity in a conversational manner from the patient.
Be warm, professional, empathetic, and concise.

If you have collected enough information (at least the main symptom, duration, and severity), use the 'complete_intake' tool (which we will bind later) to signal that you are done. Otherwise, ask the next most important question.
Do NOT give medical advice.
`;

export async function intakeNode(state: typeof IntakeStateAnnotation.State, config?: RunnableConfig) {
    const model = new ChatOpenAI({
        modelName: "gpt-5.3-codex",
        temperature: 0.1,
        maxCompletionTokens: 1000,
    });

    // Ensure system prompt is present
    let messages = state.messages;
    if (messages.length === 0 || !isSystemMessage(messages[0])) {
        messages = [{ role: "system", content: INTAKE_SYSTEM_PROMPT } as any, ...messages];
    }

    // We bind tools that the agent can use. Here we might bind a specific tool to register intake completion
    const response = await model.invoke(messages, config);

    return {
        messages: [response],
    };
}
