
"use client";

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider } from "@/components/ui/sidebar";
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

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
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <AppSidebar />
        <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-[calc(var(--sidebar-width-icon)_+_1rem)] md:pl-[calc(var(--sidebar-width)_+_1rem)] group-data-[collapsible=icon]:sm:pl-[calc(var(--sidebar-width-icon)_+_1rem)] transition-[padding-left] duration-300 ease-in-out">
          <div className="flex flex-1 flex-col sm:pl-14 md:group-data-[state=expanded]:pl-64"> 
             <AppHeader />
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
              {children}
            </main>
            <footer className="border-t bg-background/80 p-4 text-center text-sm text-muted-foreground">
              Powered by Generative AI to Enhance Patient Care
            </footer>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

    