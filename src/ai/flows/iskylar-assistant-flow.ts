
'use server';
/**
 * @fileOverview An AI assistant named iSkylar to answer user questions.
 *
 * - askISkylar - A function that handles user questions for iSkylar.
 * - ISkylarAssistantInput - The input type for the askISkylar function.
 * - ISkylarAssistantOutput - The return type for the askISkylar function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ISkylarAssistantInputSchema = z.object({
  question: z.string().describe("The user's question for iSkylar."),
});
export type ISkylarAssistantInput = z.infer<typeof ISkylarAssistantInputSchema>;

const ISkylarAssistantOutputSchema = z.object({
  answer: z.string().describe("ISkylar's answer to the user's question."),
});
export type ISkylarAssistantOutput = z.infer<typeof ISkylarAssistantOutputSchema>;

export async function askISkylar(input: ISkylarAssistantInput): Promise<ISkylarAssistantOutput> {
  return iskylarAssistantFlow(input);
}

const MEDISUMMARIZE_CONTEXT = `
MediSummarize is an AI-powered voice recording and transcription app for healthcare professionals.
Core Features:
1.  User Authentication & Profile: Signup, Login, Display Name, Profile Photo. (Demo auth uses localStorage).
2.  Consultation Management:
    *   Create New: Patient Name, Voice Recording, AI Transcription, Optional Initial Transcript Translation (Eng, Spa, Fre, Ger), AI Summarization.
    *   View List & Details: Patient Name, Date, AI Summary, Full Transcript, Initial Translation (if any), Audio Playback.
    *   Edit: AI Summary, Full Transcript.
    *   Download: .txt file of details.
    *   Delete.
3.  Communication & Accessibility:
    *   On-Demand Text Translation: AI Summary & Full Transcript (Eng/Spa).
    *   Text-to-Speech (TTS): For AI Summary (Eng/Spa).
4.  Application Settings: Light/Dark Theme, (Demo) Language Preference.
5.  (Placeholder) HubSpot Integration: For sending data, tracking logins. (Requires setup).

User Workflow:
1.  Register/Login -> My Consultations dashboard.
2.  New Consultation: Enter Patient Name -> Start/Stop Recording -> (Optional) Select initial transcript translation language -> Save. App transcribes, (optionally translates original transcript), generates summary from original transcript, saves all data (including audio Data URI).
3.  View/Interact with Consultations: Review Summary/Transcript, Use On-demand Translate for summary or transcript, Listen to Summary (TTS), Play Audio Recording, View Initial Translation (if any), Edit summary/transcript, Download, Delete.
4.  Manage Profile & Settings: Update display name/profile photo, change application theme (Light/Dark), select preferred display language (demo).

Technical Stack: Next.js (App Router), React, TypeScript, ShadCN UI Components, Tailwind CSS, Genkit for AI.
Important Demo Limitations: Authentication & Data Storage use browser localStorage (not secure for production). HubSpot integration is a placeholder. Full application language translation (i18n) is not yet implemented beyond UI placeholders and specific summary/transcript translation features.
`;

const prompt = ai.definePrompt({
  name: 'iskylarAssistantPrompt',
  input: {schema: ISkylarAssistantInputSchema},
  output: {schema: ISkylarAssistantOutputSchema},
  prompt: `You are iSkylar, a friendly, helpful, and concise AI assistant for the MediSummarize application.

Your primary role is to answer user questions about the MediSummarize application: its features, functionality, and how to use it.
You should also be able to provide brief, general information about www.iChanceTEK.com, which is the official website of ChanceTEK LLC, the company that developed and maintains MediSummarize.

Use the following information about MediSummarize to answer questions:
<medisummarize_info>
${MEDISUMMARIZE_CONTEXT}
</medisummarize_info>

About www.iChanceTEK.com:
ChanceTEK LLC is the innovative company that developed and maintains the MediSummarize application. For detailed information about ChanceTEK LLC, its services, mission, and contact information, users should be directed to visit the official website at www.iChanceTEK.com.

When answering:
- Be clear, polite, and concise.
- If a question is about a MediSummarize feature, explain it based on the provided information.
- If a question is about www.iChanceTEK.com, provide the general information above and direct the user to the website.
- If you cannot answer a question based on the provided information, politely state that you don't have that specific information.
- Do not make up features or information not present in your knowledge base.
- Keep your answers focused and to the point.

User's question: {{{question}}}

iSkylar's answer:
`,
});

const iskylarAssistantFlow = ai.defineFlow(
  {
    name: 'iskylarAssistantFlow',
    inputSchema: ISkylarAssistantInputSchema,
    outputSchema: ISkylarAssistantOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      return { answer: "I'm sorry, I encountered an issue trying to process your request. Please try again." };
    }
    return output;
  }
);
