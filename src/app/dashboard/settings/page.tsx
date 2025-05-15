
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  // Effect to load and apply theme on initial mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
    // Determine initial theme: 1. Saved theme, 2. System preference, 3. Default to light
    let initialTheme: 'light' | 'dark' = 'light';
    if (savedTheme) {
      initialTheme = savedTheme;
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      initialTheme = 'dark';
    }
    
    setCurrentTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    setMounted(true);
  }, []);

  const handleThemeChange = (isDark: boolean) => {
    if (!mounted) return; // Prevent changes until fully mounted and theme loaded

    const newTheme = isDark ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-0">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <SettingsIcon className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-3xl font-bold">Application Settings</CardTitle>
              <CardDescription>Manage your application preferences.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 pt-6">
          {/* Appearance Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Appearance</h2>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="theme-switch" className="text-base font-medium">
                    Theme
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes for the application.
                  </p>
                </div>
                {mounted ? (
                  <div className="flex items-center space-x-2">
                    <Sun className={`h-5 w-5 ${currentTheme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Switch
                      id="theme-switch"
                      checked={currentTheme === 'dark'}
                      onCheckedChange={handleThemeChange}
                      aria-label={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
                    />
                    <Moon className={`h-5 w-5 ${currentTheme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                ) : (
                  // Skeleton for switch area while loading
                  <div className="flex items-center space-x-2">
                    <div className="h-5 w-5 rounded-full bg-muted-foreground/20 animate-pulse" />
                    <div className="h-6 w-11 rounded-full bg-muted-foreground/20 animate-pulse" />
                    <div className="h-5 w-5 rounded-full bg-muted-foreground/20 animate-pulse" />
                  </div>
                )}
              </div>
              {mounted && (
                 <p className="mt-3 text-xs text-muted-foreground">
                    Current theme: <span className="font-semibold">{currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</span>. Your preference is saved in your browser.
                  </p>
              )}
            </div>
          </section>

          {/* Placeholder for future settings sections */}
          {/* 
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Notifications</h2>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <p className="text-muted-foreground">Notification settings will appear here.</p>
            </div>
          </section>
          */}
        </CardContent>
      </Card>
    </div>
  );
}
