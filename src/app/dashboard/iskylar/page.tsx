"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mic, Bot } from 'lucide-react';

export default function ISkylarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessionStarted, setSessionStarted] = useState(false);

  // In a real implementation, this would trigger the voice session logic
  const handleStartSession = () => {
    // For now, we just toggle a state to show what a session view could look like
    setSessionStarted(true);
    // You would likely navigate to a session-specific page or update the state
    // to show the conversational UI here.
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full flex-col text-white">
      <header className="absolute top-4 right-4 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border-2 border-slate-500">
            <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
            <AvatarFallback className="bg-slate-700 text-white">
              {user?.displayName?.split(' ').map(n => n[0]).join('') || 'U'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user?.displayName || 'User'}</span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center text-center">
        {sessionStarted ? (
            <div className="flex flex-col items-center justify-center gap-8">
                <h1 className="text-5xl font-bold">iSkylar is listening...</h1>
                <div className="relative">
                    <div className="absolute -inset-4 animate-pulse rounded-full bg-purple-400/50 blur-xl"></div>
                    <Button variant="default" size="icon" className="relative h-24 w-24 rounded-full bg-purple-500 shadow-lg hover:bg-purple-600">
                        <Mic className="h-12 w-12" />
                    </Button>
                </div>
                 <p className="text-slate-300">Start speaking to begin your session.</p>
            </div>
        ) : (
            <>
                <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/80">
                  <Bot className="h-12 w-12 text-purple-300" />
                </div>
                <h1 className="text-6xl font-bold">iSkylar</h1>
                <p className="mt-2 text-xl text-slate-300">Your AI Voice Therapist</p>
                <Button 
                  onClick={handleStartSession}
                  className="mt-10 rounded-lg bg-purple-500 px-12 py-6 text-lg font-semibold text-white shadow-lg hover:bg-purple-600 focus-visible:ring-purple-400"
                >
                  Start Session
                </Button>
                <p className="mt-4 text-sm text-slate-400">Click ‘Start Session’ to begin.</p>
            </>
        )}
      </main>
    </div>
  );
}
