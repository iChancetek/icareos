
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings as SettingsIcon, Moon, Sun, Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Theme = 'light' | 'dark';
type Language = 'en' | 'es' | 'fr' | 'zh' | 'ar';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');

  // Effect to load and apply theme and language on initial mount
  useEffect(() => {
    // Theme loading
    const savedTheme = localStorage.getItem('app-theme') as Theme | null;
    let initialTheme: Theme = 'light';
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

    // Language loading
    const savedLanguage = localStorage.getItem('app-language') as Language | null;
    if (savedLanguage) {
      setCurrentLanguage(savedLanguage);
      // In a full i18n setup, you would trigger language change here
      console.log(`App language loaded: ${savedLanguage}`);
    }

    setMounted(true);
  }, []);

  const handleThemeChange = (isDark: boolean) => {
    if (!mounted) return;

    const newTheme = isDark ? 'dark' : 'light';
    setCurrentTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    if (!mounted) return;

    setCurrentLanguage(newLang);
    localStorage.setItem('app-language', newLang);
    // In a full i18n setup, you would call your i18n instance here to change the language
    // e.g., i18n.changeLanguage(newLang);
    console.log(`App language changed to: ${newLang}. UI update would occur with an i18n library.`);
    // Potentially force a re-render or use context if components need to react immediately without full i18n
    // For now, this just saves the preference.
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
                    Toggle between light and dark themes.
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
                  <div className="flex items-center space-x-2">
                    <div className="h-5 w-5 rounded-full bg-muted-foreground/20 animate-pulse" />
                    <div className="h-6 w-11 rounded-full bg-muted-foreground/20 animate-pulse" />
                    <div className="h-5 w-5 rounded-full bg-muted-foreground/20 animate-pulse" />
                  </div>
                )}
              </div>
              {mounted && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Current theme: <span className="font-semibold">{currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1)}</span>.
                </p>
              )}
            </div>
          </section>

          {/* Language Section */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Language</h2>
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="language-select" className="text-base font-medium flex items-center">
                    <Languages className="mr-2 h-5 w-5 text-primary/80" />
                    Display Language
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred language for the application.
                  </p>
                </div>
                {mounted ? (
                  <Select
                    value={currentLanguage}
                    onValueChange={(value: string) => handleLanguageChange(value as Language)}
                  >
                    <SelectTrigger className="w-full sm:w-[180px]" id="language-select">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español (Spanish)</SelectItem>
                      <SelectItem value="fr">Français (French)</SelectItem>
                      <SelectItem value="zh">中文 (Mandarin)</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-10 w-full sm:w-[180px] rounded-md bg-muted-foreground/20 animate-pulse" />
                )}
              </div>
              {mounted && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Current language: <span className="font-semibold">{
                    currentLanguage === 'en' ? 'English' :
                      currentLanguage === 'es' ? 'Español' :
                        currentLanguage === 'fr' ? 'Français' :
                          currentLanguage === 'zh' ? '中文' : 'العربية'
                  }</span>.
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground italic">
                Note: This is a UI placeholder. Actual content translation requires a full internationalization (i18n) setup.
              </p>
            </div>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
