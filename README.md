
# MediScribe: AI-Powered Medical Consultation Summaries

## Overview

MediScribe is a modern, Generative AI-powered voice recording and transcription application. It's specifically designed for healthcare professionals like doctors and nurses to streamline communication, automate documentation, and significantly enhance the patient experience. The application allows for recording medical consultations, transcribing them using AI, generating concise summaries, and offers features like translation and text-to-speech to improve accessibility and understanding.

Built with Next.js, React, ShadCN UI, Tailwind CSS, and Genkit for AI functionalities, MediScribe provides a user-friendly interface with a focus on efficiency and clarity for medical professionals.

## Core Features

### 1. User Authentication & Profile Management
*   **Sign Up & Login**: Users can create an account and log in. (Note: Current implementation uses `localStorage` for demonstration purposes and is not a secure production-ready authentication system).
*   **Profile Management**:
    *   **Display Name**: Users can view and update their display name.
    *   **Profile Photo**: Users can upload and change their profile photo.
*   **Forgot Password (Demo)**: A placeholder "Forgot Password" option demonstrates where this functionality would exist. No actual email is sent in the current demo.

### 2. Consultation Management
*   **New Consultation Creation**:
    *   **Patient Name**: Record the patient's name for the consultation.
    *   **Voice Recording**: Securely record audio consultations directly in the browser using the device microphone.
    *   **AI-Powered Transcription**: The recorded audio is sent to a Genkit AI flow for accurate transcription.
    *   **(Optional) Initial Transcript Translation**: Before saving, the transcript can be translated into selected languages (e.g., English, Spanish, French, German).
    *   **AI-Powered Summarization**: The original transcript is processed by another Genkit AI flow to generate a concise, AI-driven summary of the consultation, highlighting key medical issues, diagnoses, and treatment plans.
*   **View Consultations**:
    *   **Consultation List**: A dashboard view lists all recorded consultations, sorted by date, with patient names and summaries.
    *   **Detailed View**: Clicking on a consultation opens a detailed page showing:
        *   Patient Name and Consultation Date.
        *   AI-generated Summary.
        *   Full original Transcript.
        *   (If applicable) Initially translated transcript and its language.
        *   Audio playback controls.
*   **Edit Consultations**:
    *   **Modify AI Summary**: Users can review and edit the AI-generated summary if needed.
    *   **Modify Transcript**: Users can review and edit the full transcript.
*   **Download Consultations**:
    *   Download consultation details (patient name, date, current summary, current transcript, and initial translated transcript if available) as a `.txt` file.
*   **Audio Playback**:
    *   Listen to the original audio recording directly on the consultation detail page using an integrated audio player.
*   **Delete Consultations**: Remove consultation records.

### 3. Communication & Accessibility Features
*   **On-Demand Text Translation**:
    *   **AI Summary Translation**: Translate the AI-generated summary into English or Spanish on the fly.
    *   **Full Transcript Translation**: Translate the full original transcript into English or Spanish on the fly.
*   **Text-to-Speech (TTS) for Summary**:
    *   Listen to the AI-generated summary (original or translated text) in English or Spanish using browser-based TTS capabilities.

### 4. Application Settings
*   **Theme Customization**: Toggle between Light and Dark mode for the application interface. Preferences are saved locally.
*   **(Demo) Language Preference**: Select a preferred display language for the application (e.g., English, Spanish). (Note: This is currently a UI placeholder; full app internationalization is not yet implemented).

### 5. (Placeholder) HubSpot Integration
*   The application includes placeholder services for integrating with HubSpot. In a full implementation, this could:
    *   Send consultation data (patient name, summary, transcript, audio recording URL) to HubSpot.
    *   Track user login events.
    *   Sync user sign-up information.
    (Note: This requires a HubSpot account, API key, and backend implementation for secure API calls and file storage for audio recordings).

## User Workflow

1.  **Registration & Login**:
    *   New users **Sign Up** by providing an email and password.
    *   Existing users **Login** with their credentials.
    *   Upon successful login, users are directed to the "My Consultations" dashboard.

2.  **Creating a New Consultation**:
    *   Navigate to "Start New Consultation" from the sidebar or dashboard.
    *   Enter the **Patient's Name**.
    *   Click **Start Recording** to begin capturing audio using the microphone.
    *   Speak clearly during the consultation.
    *   Click **Stop Recording** when finished. The recording is now available.
    *   (Optional) Select a target language from the "Translate Transcript to" dropdown if an initial translation of the transcript is desired.
    *   Click **Save Consultation**. The application will:
        *   Transcribe the audio to text.
        *   (If selected) Translate the transcript.
        *   Generate an AI summary from the original transcript.
        *   Save all data (including the audio Data URI).
        *   (Placeholder) Initiate data sync to HubSpot.
    *   The user is then redirected to the detailed view of the newly created consultation.

3.  **Viewing & Interacting with Consultations**:
    *   From the **My Consultations** page, browse the list of past consultations.
    *   Click on a consultation to view its **Details Page**.
    *   On the detail page:
        *   Review the **AI Summary** and **Full Transcript**.
        *   Use the **Translate** dropdowns to view the summary or transcript in English or Spanish.
        *   Use the **Listen** button and language selector to hear the AI summary read aloud.
        *   Play back the original **Audio Recording**.
        *   View the **Initial Translation** if one was performed during creation.
        *   **Edit** the summary or transcript if necessary and save changes.
        *   **Download** the consultation details.
        *   **Delete** the consultation if no longer needed.

4.  **Managing Profile & Settings**:
    *   Access **Profile** from the user menu (top-right) or sidebar to update display name and profile photo.
    *   Access **Settings** to change the application theme (Light/Dark) or preferred display language (demo).

## Technical Stack

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI**: ShadCN UI Components, Tailwind CSS
*   **AI Functionality**: Genkit (for flows calling Large Language Models)
*   **State Management**: React Context API, `useState`, `useEffect`
*   **Local Data Persistence (Demo)**: Browser `localStorage` is used for storing user authentication tokens, user preferences, and consultation data in this demonstration version.

## Important Notes & Limitations (Demo Aspects)

*   **Authentication**: The current authentication system (login, signup, user profile data) uses browser `localStorage`. This is **not secure for production environments**. A proper backend with secure password hashing and database storage is required for a real application. The "Forgot Password" feature is a placeholder.
*   **Data Storage**: All consultation data (transcripts, summaries, audio data URIs, patient names) is stored in `localStorage`. This is suitable for demonstration but not for production due to storage limits, lack of security, and no data persistence across different browsers or devices. A backend database and secure file storage for audio are essential for a production app.
*   **HubSpot Integration**: The HubSpot integration is a placeholder (`hubspotService.ts`). Actual integration requires secure API key management, backend logic for API calls, and potentially a separate file storage solution for audio recordings.
*   **Full Application Language Translation**: The language selection in settings is a UI placeholder. Full application internationalization (i18n) would require integrating an i18n library and translating all UI text.
*   **Error Handling**: While basic error handling is in place, a production application would require more comprehensive error logging and user feedback mechanisms.
*   **Scalability & Security**: The current architecture is designed for demonstration. A production application would need a robust backend, database, secure file storage, and adherence to data privacy regulations (e.g., HIPAA if dealing with real patient data).

This README provides a comprehensive guide to MediScribe. For developers, it outlines the core components and areas for further development towards a production-ready system.
