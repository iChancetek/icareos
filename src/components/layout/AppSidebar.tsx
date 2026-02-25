"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Bot, Languages, FolderKanban, BarChart2,
  ShieldAlert, Activity, Stethoscope, ChevronRight
} from 'lucide-react';
import {
  Sidebar, SidebarHeader, SidebarContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { SheetTitle } from '@/components/ui/sheet';
import RealtimeVoiceTranslatorDialog from '@/components/features/RealtimeVoiceTranslatorDialog';
import { useState, useEffect } from 'react';

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  matchStartsWith?: boolean;
  action?: () => void;
  adminOnly?: boolean;
  badge?: string;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { state: sidebarState, isMobile } = useSidebar();
  const [isVoiceTranslatorOpen, setIsVoiceTranslatorOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const navItems: NavItem[] = [
    { href: '/dashboard/iscribe', label: 'iScribe', icon: LayoutDashboard },
    { href: '/dashboard/recordings', label: 'Recordings', icon: FolderKanban, matchStartsWith: true },
    { href: '/dashboard/insights', label: 'Insights', icon: BarChart2, matchStartsWith: true },
    { href: '/dashboard/iskylar', label: 'iSkylar', icon: Bot },
    { label: 'Voice Translator', icon: Languages, action: () => setIsVoiceTranslatorOpen(true) },
    { href: '/dashboard/admin', label: 'Admin', icon: ShieldAlert, adminOnly: true },
  ];

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.matchStartsWith) return pathname.startsWith(item.href);
    if (item.href === '/dashboard/iscribe') return pathname === item.href || pathname.startsWith('/dashboard/iscribe/');
    return pathname === item.href;
  };

  const collapsible = mounted ? (isMobile ? "offcanvas" : "icon") : "icon";
  const isEffectivelyMobile = mounted && isMobile;
  const expanded = mounted ? sidebarState === 'expanded' : false;
  const showLabel = expanded || isEffectivelyMobile;

  return (
    <>
      <Sidebar side="left" variant="sidebar" collapsible={collapsible}>
        {/* Logo */}
        <SidebarHeader className="relative p-4 pb-3">
          {isEffectivelyMobile && <SheetTitle className="sr-only">Menu</SheetTitle>}
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon mark */}
            <div className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_16px_hsl(191_97%_55%/0.2)]">
              <Activity className="h-4.5 w-4.5 text-primary" style={{ height: '1.125rem', width: '1.125rem' }} />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
            </div>
            {showLabel && (
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight text-foreground truncate">MediScribe</p>
                <p className="text-[10px] text-muted-foreground truncate">Neural Clinical AI</p>
              </div>
            )}
          </div>
          {mounted && !isMobile && (
            <SidebarTrigger className="absolute right-2 top-3 h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" />
          )}
        </SidebarHeader>

        <Separator className="bg-border/50" />

        <SidebarContent className="flex-1 p-2 pt-3">
          <SidebarMenu className="space-y-0.5">
            {navItems.map((item) => {
              if (item.adminOnly && user?.role !== 'admin') return null;
              const active = isActive(item);

              const buttonContent = (
                <SidebarMenuButton
                  isActive={active}
                  onClick={item.action}
                  tooltip={item.label}
                  className={cn(
                    "group w-full justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_hsl(191_97%_55%/0.15)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
                  )}
                >
                  <item.icon className={cn("h-4.5 w-4.5 shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} style={{ height: '1.125rem', width: '1.125rem' }} />
                  {showLabel && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {active && <ChevronRight className="h-3.5 w-3.5 text-primary/60" />}
                      {item.badge && (
                        <span className="ml-auto rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{item.badge}</span>
                      )}
                    </>
                  )}
                </SidebarMenuButton>
              );

              return (
                <SidebarMenuItem key={item.label}>
                  {item.href ? (
                    <Link href={item.href} legacyBehavior passHref>
                      {buttonContent}
                    </Link>
                  ) : buttonContent}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <Separator className="bg-border/50" />

        {/* Footer user info */}
        {showLabel && user && (
          <div className="p-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-accent/30 px-3 py-2.5 border border-border/40">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-bold shrink-0">
                {(user.displayName || user.email || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{user.displayName || user.email}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{user.role || 'User'}</p>
              </div>
            </div>
          </div>
        )}
      </Sidebar>
      <RealtimeVoiceTranslatorDialog isOpen={isVoiceTranslatorOpen} onOpenChange={setIsVoiceTranslatorOpen} />
    </>
  );
}
