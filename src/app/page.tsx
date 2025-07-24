
"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Stethoscope, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if the user is already authenticated.
    // The logic to redirect unauthenticated users away from protected routes
    // is handled within the AuthProvider/DashboardLayout.
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard/consultations');
    }
  }, [isAuthenticated, isLoading, router]);

  // While loading authentication status, show a spinner.
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Loading MediScribe...</p>
      </div>
    );
  }
  
  // If user is authenticated, this component will shortly be replaced by the dashboard.
  // We can show the loader to prevent a flash of the landing page.
  if (isAuthenticated) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">Redirecting to Dashboard...</p>
      </div>
    );
  }


  // If not loading and not authenticated, show the new landing page.
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 selection:bg-primary/20 animated-gradient text-white">
      <main className="text-center z-10">
        <div className="mb-8 flex justify-center">
            <div className="rounded-full p-5 bg-primary/80 dark:bg-white/10 shadow-lg shadow-primary/20">
              <Stethoscope className="h-24 w-24 text-white" />
            </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-md">
          Welcome to MediScribe
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-white/90 drop-shadow-sm">
          A modern AI companion for healthcare professionals—powered by voice, empathy, and innovation.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link href="/login" passHref>
            <Button size="lg" className="w-full sm:w-auto text-lg py-6 px-8 font-semibold tracking-wide bg-white text-primary hover:bg-white/90 transform hover:scale-105 transition-transform duration-200 shadow-xl">
              <LogIn className="mr-2 h-5 w-5" />
              Sign In
            </Button>
          </Link>
          <Link href="/signup" passHref>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg py-6 px-8 bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-sm transform hover:scale-105 transition-transform duration-200 shadow-xl">
              <UserPlus className="mr-2 h-5 w-5" />
              Create Account
            </Button>
          </Link>
        </div>
      </main>
      <footer className="absolute bottom-4 text-center text-xs text-white/80">
          Powered by Generative AI to Enhance Patient Care
      </footer>
    </div>
  );
}

    