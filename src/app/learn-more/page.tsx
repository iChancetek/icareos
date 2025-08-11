
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe, MessageCircle, Mic, ListChecks, Calendar, Bot, Heart, Lock, Smartphone } from 'lucide-react';
import './learn-more.css';

const features = [
  {
    icon: <Globe className="h-10 w-10" />,
    title: "Bilingual English–Spanish Communication 🇺🇸🇪🇸",
    description: "Effortlessly communicate in both English and Spanish, enhancing accessibility and understanding.",
    example: "A nurse dictating patient notes in English while MediScribe translates and shares in Spanish instantly.",
    color: "#4285F4"
  },
  {
    icon: <MessageCircle className="h-10 w-10" />,
    title: "Seamless Real-Time Translation 🔄💬",
    description: "Translate conversations, documents, and consultations on the fly to break language barriers.",
    example: "A doctor uses MediScribe to translate a consultation for a Spanish-speaking patient in real time.",
    color: "#DB4437"
  },
  {
    icon: <Mic className="h-10 w-10" />,
    title: "Accurate Voice Transcription ✍️🎤",
    description: "Transcribe voice notes, meetings, and medical dictations precisely for quick reference and documentation.",
    example: "A therapist records a session, receiving an instant, editable transcript.",
    color: "#F4B400"
  },
  {
    icon: <ListChecks className="h-10 w-10" />,
    title: "Healthcare-Focused Documentation Assistant 🏥📋",
    description: "Specialized tools for symptom tracking, patient summaries, and medical reporting.",
    example: "Quickly generate comprehensive patient visit summaries for record-keeping.",
    color: "#0F9D58"
  },
  {
    icon: <Calendar className="h-10 w-10" />,
    title: "Everyday Companion for Life & Wellness 📅✨",
    description: "Manage daily reminders, journal entries, and personal notes with voice commands.",
    example: "“MediScribe, remind me to take my vitamins at 8 AM.”",
    color: "#AB47BC"
  },
  {
    icon: <Bot className="h-10 w-10" />,
    title: "Natural Voice Interaction 🗣️💡",
    description: "Enjoy hands-free, voice-driven control with a warm, empathetic AI voice.",
    example: "Converse naturally with MediScribe as if speaking with a trusted assistant.",
    color: "#26A69A"
  },
  {
    icon: <Heart className="h-10 w-10" />,
    title: "Empathy-Driven AI Support ❤️🤖",
    description: "Provides thoughtful, human-like responses to support mental wellness and self-care.",
    example: "Offering mindfulness exercises during stressful moments.",
    color: "#EC407A"
  },
  {
    icon: <Lock className="h-10 w-10" />,
    title: "Secure & Private Data Handling 🔐🛡️",
    description: "End-to-end encryption and HIPAA-compliant storage for all data and recordings.",
    example: "Patient records are securely stored and protected from unauthorized access.",
    color: "#5C6BC0"
  },
  {
    icon: <Smartphone className="h-10 w-10" />,
    title: "Multi-Platform Access Anytime, Anywhere 📱💻",
    description: "Available on web, mobile, and smart devices for seamless cross-device use.",
    example: "Start a note on your phone and review it later on your desktop.",
    color: "#78909C"
  }
];

export default function LearnMorePage() {
  return (
    <div className="learn-more-container">
      <header className="learn-more-header">
        <Link href="/" passHref>
          <Button variant="ghost" className="learn-more-back-button">
            <ArrowLeft className="mr-2 h-5 w-5" />
            Back to Home
          </Button>
        </Link>
      </header>

      <main className="learn-more-main">
        <div className="title-section">
          <h1>Discover the Power of MediScribe</h1>
          <p>Your intelligent assistant for healthcare, wellness, and beyond.</p>
        </div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-item-card">
              <div className="feature-item-icon" style={{ backgroundColor: feature.color }}>
                {feature.icon}
              </div>
              <div className="feature-item-content">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <div className="feature-item-example">
                  <p style={{ borderColor: feature.color }}><strong>Example:</strong> {feature.example}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      
      <footer className="learn-more-footer">
        <p>Developed by iSynera LLC | ChanceTEK LLC</p>
      </footer>
    </div>
  );
}
