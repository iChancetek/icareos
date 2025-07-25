
"use client";

import type { ReactNode } from 'react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from "@/components/ui/sidebar";
import { Loader2 } from 'lucide-react';
import { textToSpeech } from '@/ai/flows/text-to-speech-flow';
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
  
  // AI Voice Greeting Generation
  useEffect(() => {
    const generateGreeting = async () => {
      if (user?.displayName && sessionStorage.getItem('greetingGenerated') !== 'true') {
        try {
          console.log("DashboardLayout: Generating AI welcome greeting...");
          sessionStorage.setItem('greetingGenerated', 'true'); // Mark as generated
          const greetingText = `Welcome back, ${user.displayName}. I hope you're feeling well today.`;
          
          const response = await textToSpeech({ text: greetingText, voice: 'Algenib' });
          
          if (response.audioDataUri) {
            setGreetingAudio(response.audioDataUri);
            console.log("DashboardLayout: AI greeting audio received and is ready to be played on user interaction.");
          } else {
             console.warn("DashboardLayout: AI greeting TTS flow returned an empty audio URI.");
          }
        } catch (error) {
          console.error("DashboardLayout: Failed to generate AI greeting:", error);
           toast({
                title: "AI Greeting Failed",
                description: "Could not generate the welcome message.",
                variant: "destructive"
            });
        }
      } else {
         if (user?.displayName) {
            console.log("DashboardLayout: AI welcome greeting already generated this session.");
         }
      }
    };

    if (isAuthenticated && !isLoading) {
      generateGreeting();
    }
  }, [isAuthenticated, isLoading, user, toast]);

  const handleFirstInteraction = useCallback(() => {
    if (greetingAudio && audioPlayerRef.current && !greetingPlayed) {
      audioPlayerRef.current.play().catch(error => {
        console.error("DashboardLayout: Audio playback failed. This may be due to browser autoplay restrictions still being in effect.", error);
      });
      setGreetingPlayed(true); // Ensure it only plays once
      // Clean up the event listener after it has been used
      window.removeEventListener('click', handleFirstInteraction);
    }
  }, [greetingAudio, greetingPlayed]);

  useEffect(() => {
    if (greetingAudio && !greetingPlayed) {
      window.addEventListener('click', handleFirstInteraction);
    }
  
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
    };
  }, [greetingAudio, greetingPlayed, handleFirstInteraction]);


  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirect is handled by the useEffect
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full flex-col">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-[calc(var(--sidebar-width-icon)_+_1rem)] md:pl-[calc(var(--sidebar-width)_+_1rem)] group-data-[collapsible=icon]:sm:pl-[calc(var(--sidebar-width-icon)_+_1rem)] transition-[padding-left] duration-300 ease-in-out">
          <div className="flex flex-1 flex-col sm:pl-14 md:group-data-[state=expanded]:pl-64"> 
             <AppHeader />
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
            <footer className="border-t bg-background/80 p-4 text-center text-sm text-muted-foreground">
              Developed by iSynera LLC | ChanceTEK LLC
            </footer>
          </div>
        </div>
      </div>
       {greetingAudio && <audio ref={audioPlayerRef} src={greetingAudio} className="hidden" preload="auto" />}
    </SidebarProvider>
  );
}
