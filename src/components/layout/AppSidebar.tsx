"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bot, Languages, FolderKanban, BarChart2,
  ShieldAlert, Activity, PanelLeft, PanelLeftClose,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import RealtimeVoiceTranslatorDialog from '@/components/features/RealtimeVoiceTranslatorDialog';

// ── Constants ────────────────────────────────────────────────
const RAIL_W = 64;   // collapsed px
const PANEL_W = 240;  // expanded px
const INSET = 12;   // gap from screen edges (px)
const STORAGE = 'mediscribe-sidebar-pinned';

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  matchStartsWith?: boolean;
  action?: () => void;
  adminOnly?: boolean;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isVoiceTranslatorOpen, setIsVoiceTranslatorOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [suppressHover, setSuppressHover] = useState(false);
  const leaveTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    try { setPinned(localStorage.getItem(STORAGE) === 'true'); } catch { }
  }, []);

  const togglePin = () => {
    if (pinned) {
      setPinned(false);
      setSuppressHover(true); // Force collapse immediately
      try { localStorage.setItem(STORAGE, 'false'); } catch { }
    } else {
      setPinned(true);
      setSuppressHover(false);
      try { localStorage.setItem(STORAGE, 'true'); } catch { }
    }
  };

  const handleMouseEnter = useCallback(() => {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null; }
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (pinned) return;
    leaveTimer.current = setTimeout(() => {
      setHovered(false);
      setSuppressHover(false); // Reset suppression once they leave the rail
    }, 120);
  }, [pinned]);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  const expanded = mounted && (pinned || (hovered && !suppressHover));
  const currentW = expanded ? PANEL_W : RAIL_W;

  const navItems: NavItem[] = [
    { href: '/dashboard/iscribe', label: 'iScribe', icon: LayoutDashboard },
    { href: '/dashboard/recordings', label: 'Recordings', icon: FolderKanban, matchStartsWith: true },
    { href: '/dashboard/insights', label: 'Insights', icon: BarChart2, matchStartsWith: true },
    { href: '/dashboard/iskylar', label: 'iSkylar', icon: Bot },
    { label: 'Translator', icon: Languages, action: () => setIsVoiceTranslatorOpen(true) },
    { href: '/dashboard/admin', label: 'Admin', icon: ShieldAlert, adminOnly: true },
  ];

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.matchStartsWith) return pathname.startsWith(item.href);
    if (item.href === '/dashboard/iscribe') return pathname === item.href || pathname.startsWith('/dashboard/iscribe/');
    return pathname === item.href;
  };

  const initials = user ? (user.displayName || user.email || 'U')[0].toUpperCase() : 'U';

  // ── SSR skeleton ────────────────────────────────────────────
  if (!mounted) {
    return (
      <div
        style={{ width: RAIL_W + INSET, minWidth: RAIL_W + INSET }}
        className="hidden md:block shrink-0"
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      {/*
       * The fixed floating rail sits inset from the screen edges.
       * A static spacer of (RAIL_W + INSET) always reserves room
       * for the collapsed state — the expanded panel floats OVER
       * the right side of the spacer, so nothing is ever hidden.
       */}
      <div
        style={{ width: RAIL_W + INSET, minWidth: RAIL_W + INSET }}
        className="hidden md:block shrink-0 relative"
        aria-hidden="true"
      />

      {/* ── Floating glass rail ─────────────────────────────── */}
      <motion.nav
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{ width: currentW }}
        transition={{ duration: 0.30, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          // floating: fixed + inset from all edges
          "fixed z-50 hidden md:flex flex-col overflow-hidden",
          // detached look: margin from edges, fully rounded
          "rounded-2xl",
          // glassmorphism — highly translucent so page content shows through clearly
          "backdrop-blur-md",
          "dark:bg-background/10 bg-white/10",
          // border + dual shadow (depth + glow)
          "border border-white/10 dark:border-white/[0.06]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.04),0_0_24px_hsl(191_97%_58%/0.07)]",
        )}
        style={{
          top: INSET,
          left: INSET,
          bottom: INSET,
          willChange: 'width',
        }}
        aria-label="Main navigation"
      >
        {/* ── Top: Logo + Pin ─────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 px-[14px] py-4 shrink-0">
          <Link href="/dashboard/iscribe" className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_16px_hsl(191_97%_55%/0.25)]">
              <Activity className="h-4 w-4 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-bold tracking-tight leading-none whitespace-nowrap">MediScribe</p>
                  <p className="text-[10px] text-primary/70 whitespace-nowrap mt-0.5">Agentic AI · Neural</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>

          <AnimatePresence>
            {expanded && (
              <motion.button
                initial={{ opacity: 0, scale: 0.75 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{ duration: 0.15 }}
                onClick={togglePin}
                aria-label={pinned ? 'Collapse sidebar' : 'Lock sidebar open'}
                className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                title={pinned ? 'Collapse sidebar' : 'Lock sidebar open'}
              >
                {pinned ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-white/10 dark:bg-white/5 shrink-0" />

        {/* ── Nav items ───────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-0.5 overflow-hidden px-2 py-3">
          {navItems.map(item => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const active = isActive(item);

            const inner = (
              <motion.div
                onClick={item.action}
                whileHover={!active ? { x: 1 } : {}}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-[14px] py-2.5 cursor-pointer transition-colors duration-150",
                  active
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_hsl(191_97%_55%/0.12)]"
                    : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-white/5 dark:hover:bg-white/[0.06]"
                )}
              >
                {/* Active bar */}
                {active && (
                  <motion.span
                    layoutId="activeBar"
                    className="absolute left-0 inset-y-2 w-0.5 rounded-full bg-primary"
                    style={{ boxShadow: '0 0 6px hsl(191 97% 58% / 0.7)' }}
                  />
                )}

                {/* Icon */}
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />

                {/* Label */}
                <AnimatePresence>
                  {expanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.16 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Hover radial glow */}
                <span className={cn(
                  "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "bg-[radial-gradient(ellipse_60%_50%_at_30%_50%,hsl(191_97%_58%/0.06),transparent)]"
                )} />

                {/* Tooltip (collapsed only) */}
                {!expanded && (
                  <div className={cn(
                    "pointer-events-none absolute left-full ml-3 z-50",
                    "flex items-center rounded-lg border border-border/50 bg-popover/95 backdrop-blur-sm px-2.5 py-1.5",
                    "text-xs font-medium text-popover-foreground shadow-lg",
                    "opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-0.5",
                    "transition-all duration-150 whitespace-nowrap"
                  )}>
                    {item.label}
                  </div>
                )}
              </motion.div>
            );

            return (
              <div key={item.label}>
                {item.href ? (
                  <Link href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined}>
                    {inner}
                  </Link>
                ) : inner}
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="mx-3 h-px bg-white/10 dark:bg-white/5 shrink-0" />

        {/* ── Bottom: User card ────────────────────────────── */}
        <div className="px-2 py-3 shrink-0">
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 dark:border-white/[0.06] bg-white/5 px-[14px] py-2.5">
            <div className="h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-primary/15 border border-primary/20 text-primary text-xs font-bold">
              {initials}
            </div>
            <AnimatePresence>
              {expanded && user && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.16 }}
                  className="min-w-0 overflow-hidden"
                >
                  <p className="text-xs font-semibold truncate leading-none">
                    {user.displayName || user.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                    {user.role || 'User'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>

      {/* Voice Translator Dialog */}
      <RealtimeVoiceTranslatorDialog
        isOpen={isVoiceTranslatorOpen}
        onOpenChange={setIsVoiceTranslatorOpen}
      />
    </>
  );
}
