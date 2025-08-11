
"use client";

import Link from 'next/link';
import { Stethoscope, MessageSquare, BookOpen, Heart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-page-container">
      <header className="landing-header">
        <div className="logo">
          <Stethoscope className="h-8 w-8 text-primary" />
          <h1>MediScribe</h1>
        </div>
        <nav className="main-nav">
          <Link href="/login" passHref>
            <Button variant="ghost" className="signin-btn">Sign In</Button>
          </Link>
          <Link href="/signup" passHref>
            <Button className="getstarted-btn">Get Started</Button>
          </Link>
        </nav>
      </header>
      
      <main className="landing-main">
        <section className="hero-section">
          <h2 className="hero-title">Welcome to MediScribe</h2>
          <p className="hero-subtitle">
            MediScribe is your intelligent, voice-powered companion for healthcare, everyday tasks, and personal interactions—blending empathy, precision, and innovation to revolutionize how you capture, understand, and act on information. With multilingual communication (English, Spanish, German, and French), seamless translation, and precise transcription, MediScribe empowers you to work and connect effortlessly across professional and personal settings.
          </p>
          <div className="hero-actions">
            <Link href="/signup" passHref>
              <Button size="lg" className="getstarted-btn">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
             <Link href="/learn-more" passHref>
                <Button size="lg" variant="outline" className="learnmore-btn">
                    Learn More
                </Button>
            </Link>
          </div>
        </section>

        <section id="features" className="features-section">
          <div className="feature-card">
            <MessageSquare className="feature-icon" />
            <h3 className="feature-title">AI-Powered Transcription</h3>
            <p className="feature-description">
              Get accurate, real-time transcriptions of your medical notes, patient interactions, and personal voice memos with our advanced AI.
            </p>
          </div>
          <div className="feature-card">
            <BookOpen className="feature-icon" />
            <h3 className="feature-title">Intelligent Summarization</h3>
            <p className="feature-description">
              Instantly generate concise summaries of long transcripts, highlighting key issues, diagnoses, and action items, saving you valuable time.
            </p>
          </div>
          <div className="feature-card">
            <Heart className="feature-icon" />
            <h3 className="feature-title">AI Wellness Companion</h3>
            <p className="feature-description">
              Engage with iSkylar, your empathetic AI companion, for wellness check-ins, mindfulness exercises, and support for your well-being.
            </p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} MediScribe. All Rights Reserved. | Developed by iSynera LLC | ChanceTEK LLC</p>
      </footer>
    </div>
  );
}
