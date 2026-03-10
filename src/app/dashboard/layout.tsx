
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { Loader2 } from 'lucide-react';
import { textToSpeech } from '@/actions/ai/text-to-speech';
import { useToast } from '@/hooks/use-toast';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [greetingAudio, setGreetingAudio] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const [greetingPlayed, setGreetingPlayed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // AI Voice Greeting Generation — deferred so the page renders first
  useEffect(() => {
    const generateGreeting = async () => {
      if (user?.displayName && sessionStorage.getItem('greetingGenerated') !== 'true') {
        try {
          sessionStorage.setItem('greetingGenerated', 'true');
          const greetingText = `Welcome back, ${user.displayName}. I hope you're feeling well today.`;
          const response = await textToSpeech({ text: greetingText, voice: 'Algenib' });
          if (response.audioDataUri) {
            setGreetingAudio(response.audioDataUri);
          }
        } catch (error) {
          console.error("DashboardLayout: Failed to generate AI greeting:", error);
          toast({ title: "AI Greeting Failed", description: "Could not generate the welcome message.", variant: "destructive" });
        }
      }
    };

    if (isAuthenticated && !isLoading) {
      // Defer 2 seconds so the page fully paints before firing the OpenAI request
      const timer = setTimeout(() => generateGreeting(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const handleFirstInteraction = useCallback(() => {
    if (greetingAudio && audioPlayerRef.current && !greetingPlayed) {
      audioPlayerRef.current.play().catch(() => { });
      setGreetingPlayed(true);
      window.removeEventListener('click', handleFirstInteraction);
    }
  }, [greetingAudio, greetingPlayed]);

  useEffect(() => {
    if (greetingAudio && !greetingPlayed) {
      window.addEventListener('click', handleFirstInteraction);
    }
    return () => { window.removeEventListener('click', handleFirstInteraction); };
  }, [greetingAudio, greetingPlayed, handleFirstInteraction]);


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen w-full">
      {/* Hover-expand nav rail (fixed-positioned internally, renders its own spacer div) */}
      <AppSidebar />

      {/* Main content column — flows after the rail spacer */}
      <div className="flex flex-1 flex-col min-w-0">
        <AppHeader />
        <main className="flex-1 p-4 sm:px-6 sm:py-4 md:gap-8">
          {children}
        </main>
        <footer className="border-t bg-background/80 p-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} iCareOS by ChanceTEK. All Rights Reserved. | icareos.tech
        </footer>
      </div>

      {greetingAudio && <audio ref={audioPlayerRef} src={greetingAudio} className="hidden" preload="auto" />}
    </div>
  );
}
