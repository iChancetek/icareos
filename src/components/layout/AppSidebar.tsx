"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bot, Languages, BarChart2,
  ShieldAlert, Activity, PanelLeft, PanelLeftClose, ScanLine,
  CreditCard, HeartPulse, ShieldCheck, Brain,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import RealtimeVoiceTranslatorDialog from '@/components/features/RealtimeVoiceTranslatorDialog';

// ── Constants ────────────────────────────────────────────────
const RAIL_W = 64;   // collapsed px
const PANEL_W = 260;  // expanded px
const INSET = 12;   // gap from screen edges (px)
const STORAGE = 'icareOS-sidebar-pinned';

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  color: string;
  matchStartsWith?: boolean;
  action?: () => void;
  adminOnly?: boolean;
  badge?: string;
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
      setSuppressHover(true);
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
      setSuppressHover(false);
    }, 120);
  }, [pinned]);

  useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);

  const expanded = mounted && (pinned || (hovered && !suppressHover));
  const currentW = expanded ? PANEL_W : RAIL_W;

  const navItems: NavItem[] = [
    { href: '/dashboard/iscribe', label: 'MediScribe', icon: LayoutDashboard, color: '#00E5FF' },
    { href: '/dashboard/insights', label: 'Insight', icon: BarChart2, matchStartsWith: true, color: '#3B82F6' },
    { href: '/dashboard/cds', label: 'WoundIQ · RadiologyIQ', icon: ScanLine, matchStartsWith: true, color: '#10B981' },
    { href: '/dashboard/iskylar', label: 'iSkylar', icon: Bot, color: '#6366F1' },
    { href: '/dashboard/billingiq', label: 'BillingIQ', icon: CreditCard, matchStartsWith: true, color: '#F59E0B', badge: 'New' },
    { href: '/dashboard/riskiq', label: 'RiskIQ', icon: ShieldCheck, matchStartsWith: true, color: '#EF4444', badge: 'New' },
    { href: '/dashboard/carecoordiq', label: 'CareCoordIQ', icon: HeartPulse, matchStartsWith: true, color: '#EC4899', badge: 'New' },
    { href: '/dashboard/dataiq', label: 'DataIQ', icon: Brain, matchStartsWith: true, color: '#A855F7', badge: 'New' },
    { label: 'Translator', icon: Languages, action: () => setIsVoiceTranslatorOpen(true), color: '#0D9488' },
    { href: '/dashboard/admin', label: 'Admin', icon: ShieldAlert, adminOnly: true, color: '#64748B' },
    { href: '/dashboard/admin/governance', label: 'Governance', icon: Activity, adminOnly: true, color: '#06b6d4', badge: 'New' },
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
          "fixed z-50 hidden md:flex flex-col overflow-hidden",
          "rounded-2xl",
          "backdrop-blur-md",
          "dark:bg-[#0F172A]/40 bg-white/40",
          "border border-white/10 dark:border-white/[0.06]",
          "shadow-[0_8px_32px_rgba(0,0,0,0.28),0_0_0_1px_rgba(255,255,255,0.04)]",
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
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0 h-9 w-9 rounded-xl flex items-center justify-center overflow-hidden shadow-lg border border-white/10">
              <Image src="/icons/icon-192x192.png" alt="iCareOS Logo" width={36} height={36} className="object-cover" />
              <div className="ios-gloss" />
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
                  <p className="text-sm font-bold tracking-tight leading-none whitespace-nowrap">iCareOS</p>
                  <p className="text-[10px] text-primary/70 whitespace-nowrap mt-0.5">AI-Native Clinical OS</p>
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
        <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden px-2 py-3 scrollbar-none">
          {navItems.map(item => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            const active = isActive(item);

            const inner = (
              <motion.div
                onClick={item.action}
                whileHover={!active ? { x: 1 } : {}}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-[14px] py-2.5 cursor-pointer transition-colors duration-200",
                  active
                    ? "bg-white/5 dark:bg-white/5 text-foreground border border-white/10"
                    : "text-muted-foreground border border-transparent hover:text-foreground hover:bg-white/10 dark:hover:bg-white/[0.04]"
                )}
              >
                {/* Active bar */}
                {active && (
                  <motion.span
                    layoutId="activeBar"
                    className="absolute left-0 inset-y-2 w-0.5 rounded-full"
                    style={{
                      backgroundColor: item.color,
                      boxShadow: `0 0 12px ${item.color}`
                    }}
                  />
                )}

                {/* iOS Style Rich Icon */}
                <div className="relative shrink-0 h-9 w-9 ios-squircle bg-[#1a1a1e] border border-white/5 shadow-xl transition-all duration-300 group-hover:scale-105">
                  <item.icon
                    className="h-5 w-5 shrink-0 z-10 transition-all duration-300"
                    style={{
                      color: item.color,
                      filter: `drop-shadow(0 0 8px ${item.color}60)`
                    }}
                  />
                  <div className="ios-gloss" />
                  <div
                    className="ios-icon-glow"
                    style={{ backgroundColor: item.color }}
                  />
                </div>

                {/* Label + Badge */}
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.16 }}
                      className="flex items-center gap-2 min-w-0"
                    >
                      <span className={cn(
                        "text-sm font-semibold whitespace-nowrap overflow-hidden transition-colors",
                        active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                      )}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                          style={{
                            color: item.color,
                            borderColor: `${item.color}40`,
                            backgroundColor: `${item.color}15`,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tooltip (collapsed only) */}
                {!expanded && (
                  <div className={cn(
                    "pointer-events-none absolute left-full ml-4 z-50",
                    "flex items-center rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl px-3 py-2",
                    "text-xs font-bold text-white shadow-2xl",
                    "opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200"
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
                    {user.role || 'Clinician'}
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
