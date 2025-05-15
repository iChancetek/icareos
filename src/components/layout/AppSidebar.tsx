
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Stethoscope, LayoutDashboard, User, Settings, FileText, PlusCircle, LogOut } from 'lucide-react';
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  matchStartsWith?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard/consultations', label: 'Consultations', icon: LayoutDashboard, matchStartsWith: true },
  // { href: '/dashboard/profile', label: 'Profile', icon: User }, // Example, if needed later
  // { href: '/dashboard/settings', label: 'Settings', icon: Settings }, // Example
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { state: sidebarState, isMobile } = useSidebar();

  const isActive = (item: NavItem) => {
    if (item.matchStartsWith) {
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  };

  return (
    <Sidebar side="left" variant="sidebar" collapsible={isMobile ? "offcanvas" : "icon"}>
      <SidebarHeader className="p-4">
        {/* Add accessible title for mobile sheet/dialog */}
        {isMobile && <SheetTitle className="sr-only">Menu</SheetTitle>}
        <div className="flex items-center gap-2">
          <Stethoscope className="h-8 w-8 text-primary" />
          {/* Visual title for expanded desktop sidebar */}
          {sidebarState === 'expanded' && !isMobile && (
             <h1 className="text-xl font-semibold text-foreground">MediSummarize</h1>
          )}
        </div>
         {/* Desktop-only trigger for collapsing/expanding */}
         {!isMobile && <SidebarTrigger className="absolute right-2 top-3 data-[state=open]:hidden data-[state=closed]:block group-data-[collapsible=offcanvas]:hidden" />}
      </SidebarHeader>
      
      <Separator className="my-0" />

      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
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
  );
}

