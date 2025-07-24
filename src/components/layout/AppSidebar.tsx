
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope, LayoutDashboard, User, Settings, Bot, LogOut, Languages } from 'lucide-react'; // Added Languages
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter, 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { SheetTitle } from '@/components/ui/sheet';
import ISkylarAssistantDialog from '@/components/features/ISkylarAssistantDialog';
import RealtimeVoiceTranslatorDialog from '@/components/features/RealtimeVoiceTranslatorDialog'; // Added
import { useState, useEffect } from 'react';

interface NavItem {
  href?: string;
  label: string;
  icon: React.ElementType;
  matchStartsWith?: boolean;
  action?: () => void;
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth(); 
  const { state: sidebarState, isMobile: sidebarIsMobileFromHook } = useSidebar(); 
  const [isISkylarDialogOpen, setIsISkylarDialogOpen] = useState(false);
  const [isVoiceTranslatorDialogOpen, setIsVoiceTranslatorDialogOpen] = useState(false); // Added
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems: NavItem[] = [
    { href: '/dashboard/consultations', label: 'Consultations', icon: LayoutDashboard, matchStartsWith: true },
    { 
      label: 'iSkylar - AI Voice Therapist', 
      icon: Bot, 
      action: () => setIsISkylarDialogOpen(true) 
    },
    { 
      label: 'Voice Translator',  // Added
      icon: Languages,           // Added
      action: () => setIsVoiceTranslatorDialogOpen(true) // Added
    },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (item: NavItem) => {
    if (!item.href) return false;
    if (item.matchStartsWith) {
      if (item.href === '/dashboard/consultations') {
        return pathname.startsWith('/dashboard/consultations');
      }
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  const collapsibleProp = mounted ? (sidebarIsMobileFromHook ? "offcanvas" : "icon") : "icon";
  const isEffectivelyMobile = mounted && sidebarIsMobileFromHook;
  const sidebarDisplayState = mounted ? sidebarState : "collapsed"; 

  return (
    <>
      <Sidebar side="left" variant="sidebar" collapsible={collapsibleProp}>
        <SidebarHeader className="p-4">
          {isEffectivelyMobile && <SheetTitle className="sr-only">Menu</SheetTitle>}
          <div className="flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            {(sidebarDisplayState === 'expanded' || (sidebarDisplayState === 'collapsed' && isEffectivelyMobile)) &&  (
              <h1 className="text-xl font-semibold text-foreground">MediScribe</h1>
            )}
          </div>
          {mounted && !sidebarIsMobileFromHook && <SidebarTrigger className="absolute right-2 top-3 data-[state=open]:hidden data-[state=closed]:block group-data-[collapsible=offcanvas]:hidden" />}
        </SidebarHeader>
        
        <Separator className="my-0" />

        <SidebarContent className="flex-1 p-2">
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.label}>
                {item.href ? (
                  <Link href={item.href} legacyBehavior passHref>
                    <SidebarMenuButton 
                      isActive={isActive(item)} 
                      className={cn("w-full justify-start", isActive(item) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "")}
                      tooltip={item.label}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className={cn((sidebarDisplayState === 'collapsed' && !isEffectivelyMobile) ? "hidden" : "inline-block")}>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                ) : (
                  <SidebarMenuButton 
                    onClick={item.action}
                    className={cn("w-full justify-start")}
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                     <span className={cn((sidebarDisplayState === 'collapsed' && !isEffectivelyMobile) ? "hidden" : "inline-block")}>{item.label}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <Separator className="my-0" />
        
        <SidebarFooter className="p-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-5 w-5" />
            <span className={cn((sidebarDisplayState === 'collapsed' && !isEffectivelyMobile) ? "hidden" : "inline-block")}>Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <ISkylarAssistantDialog isOpen={isISkylarDialogOpen} onOpenChange={setIsISkylarDialogOpen} />
      <RealtimeVoiceTranslatorDialog isOpen={isVoiceTranslatorDialogOpen} onOpenChange={setIsVoiceTranslatorDialogOpen} />
    </>
  );
}
