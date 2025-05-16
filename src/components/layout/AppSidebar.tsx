
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope, LayoutDashboard, User, Settings, Bot, LogOut } from 'lucide-react'; // Added Bot
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
import ISkylarAssistantDialog from '@/components/features/ISkylarAssistantDialog'; // Added iSkylar Dialog
import { useState } from 'react'; // Added useState

interface NavItem {
  href?: string; // Optional for items that open dialogs
  label: string;
  icon: React.ElementType;
  matchStartsWith?: boolean;
  action?: () => void; // For items that trigger actions like opening dialog
}

export default function AppSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { state: sidebarState, isMobile } = useSidebar();
  const [isISkylarDialogOpen, setIsISkylarDialogOpen] = useState(false);


  const navItems: NavItem[] = [
    { href: '/dashboard/consultations', label: 'Consultations', icon: LayoutDashboard, matchStartsWith: true },
    { 
      label: 'iSkylar Assistant', 
      icon: Bot, 
      action: () => setIsISkylarDialogOpen(true) 
    },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (item: NavItem) => {
    if (!item.href) return false; // Items with actions aren't "active" in the traditional sense
    if (item.matchStartsWith) {
      // For /dashboard/consultations, also match /dashboard/consultations/new and /dashboard/consultations/[id]
      if (item.href === '/dashboard/consultations') {
        return pathname.startsWith('/dashboard/consultations');
      }
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  return (
    <>
      <Sidebar side="left" variant="sidebar" collapsible={isMobile ? "offcanvas" : "icon"}>
        <SidebarHeader className="p-4">
          {isMobile && <SheetTitle className="sr-only">Menu</SheetTitle>}
          <div className="flex items-center gap-2">
            <Stethoscope className="h-8 w-8 text-primary" />
            {sidebarState === 'expanded' && !isMobile && (
              <h1 className="text-xl font-semibold text-foreground">MediSummarize</h1>
            )}
          </div>
          {!isMobile && <SidebarTrigger className="absolute right-2 top-3 data-[state=open]:hidden data-[state=closed]:block group-data-[collapsible=offcanvas]:hidden" />}
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
                      <span className={cn(sidebarState === 'collapsed' && !isMobile ? "hidden" : "inline-block")}>{item.label}</span>
                    </SidebarMenuButton>
                  </Link>
                ) : (
                  <SidebarMenuButton 
                    onClick={item.action}
                    className={cn("w-full justify-start")}
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className={cn(sidebarState === 'collapsed' && !isMobile ? "hidden" : "inline-block")}>{item.label}</span>
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
            <span className={cn(sidebarState === 'collapsed' && !isMobile ? "hidden" : "inline-block")}>Logout</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <ISkylarAssistantDialog isOpen={isISkylarDialogOpen} onOpenChange={setIsISkylarDialogOpen} />
    </>
  );
}
