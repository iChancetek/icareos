"use client";

import Link from 'next/link';
import { Activity, UserCircle, LogOut, Settings, Menu, ShieldCheck, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/components/ui/sidebar';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export default function AppHeader() {
  const { user, logout } = useAuth();
  const { toggleSidebar, isMobile } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  const isDark = mounted && theme === 'dark';

  return (
    <header className={cn(
      "sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-4 backdrop-blur-xl transition-all duration-200 md:px-6",
      scrolled ? "border-border/60 bg-background/95 shadow-sm" : "border-transparent bg-background/70"
    )}>
      {/* Mobile menu trigger */}
      {mounted && isMobile && (
        <Button variant="ghost" size="icon" onClick={toggleSidebar}
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
          <Menu className="h-4.5 w-4.5" style={{ height: '1.125rem', width: '1.125rem' }} />
        </Button>
      )}

      {/* Brand — mobile only */}
      <Link href="/dashboard/iscribe" className="flex items-center gap-2 md:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Activity className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold tracking-tight">MediScribe</span>
      </Link>

      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Agentic AI status pill */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          <span className="font-medium">Agentic AI</span>
          <span className="h-3 w-px bg-border/60" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Neural Active</span>
        </div>

        {/* Dark / Light toggle */}
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-all"
            aria-label="Toggle theme"
          >
            {isDark
              ? <Sun className="h-4 w-4 transition-transform duration-300 rotate-0" />
              : <Moon className="h-4 w-4 transition-transform duration-300 rotate-0" />
            }
          </Button>
        )}

        {/* Profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon"
              className="rounded-full h-8 w-8 ring-offset-background transition-all hover:ring-2 hover:ring-primary/30 hover:ring-offset-1">
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border border-border/60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5 py-1">
                <p className="text-sm font-semibold">{user?.displayName || 'Medical Professional'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-lg">
              <Link href="/dashboard/profile"><UserCircle className="mr-2 h-4 w-4" /><span>Profile</span></Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="rounded-lg">
              <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" /><span>Settings</span></Link>
            </DropdownMenuItem>
            {user?.role === 'admin' && (
              <DropdownMenuItem asChild className="rounded-lg">
                <Link href="/dashboard/admin"><ShieldCheck className="mr-2 h-4 w-4" /><span>Admin Panel</span></Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="rounded-lg text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /><span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
