import { 
  Home, 
  Users, 
  DollarSign, 
  Calendar, 
  ClipboardCheck, 
  Receipt, 
  ShoppingCart, 
  FileText, 
  Camera, 
  Settings,
  Building2
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarProvider,
} from "@/components/ui/sidebar";

// Navigation items organized by category
const setupItems = [
  { title: "Setup Overview", url: "/setup", icon: Settings },
  { title: "Family Setup", url: "/family-setup", icon: Users },
  { title: "Family Groups", url: "/family-group-setup", icon: Users },
  { title: "Financial Setup", url: "/financial-setup", icon: DollarSign },
  { title: "Reservation Setup", url: "/reservation-setup", icon: Calendar },
];

const cabinItems = [
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Check In", url: "/check-in", icon: ClipboardCheck },
  { title: "Daily Check-in", url: "/daily-check-in", icon: ClipboardCheck },
  { title: "Shopping List", url: "/shopping-list", icon: ShoppingCart },
  { title: "Add Receipt", url: "/add-receipt", icon: Receipt },
  { title: "Checkout List", url: "/checkout-list", icon: ClipboardCheck },
  { title: "Checkout Final", url: "/checkout-final", icon: ClipboardCheck },
];

const resourcesItems = [
  { title: "Cabin Rules", url: "/cabin-rules", icon: FileText },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Seasonal Docs", url: "/cabin-seasonal-docs", icon: FileText },
  { title: "Photo Gallery", url: "/photos", icon: Camera },
];

const managementItems = [
  { title: "Organizations", url: "/select-organization", icon: Building2 },
  { title: "Financial Reports", url: "/finance-reports", icon: DollarSign },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50";

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="[&_.sidebar-item-text]:group-data-[collapsible=icon]:opacity-100 [&_.sidebar-item-text]:group-data-[state=expanded]:opacity-100">
      <style>{`
        .sidebar-item-text {
          opacity: 1 !important;
        }
        [data-state="expanded"] .sidebar-item-text {
          display: inline !important;
          opacity: 1 !important;
        }
      `}</style>
      <SidebarContent>
        {/* Main Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink 
                    to="/home" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Home className="h-4 w-4" />
                    <span className="sidebar-item-text">Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Setup Section */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Setup
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setupItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="sidebar-item-text">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Cabin Management */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Cabin Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cabinItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="sidebar-item-text">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Resources
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="sidebar-item-text">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="sidebar-item-text">{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

// Example of how it would look in a layout
export function SidebarExampleLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex h-14 items-center px-4 gap-4">
              <SidebarTrigger className="h-8 w-8" />
              <div className="font-semibold">Cabin Management System</div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

// Demo component to show the sidebar in action
export function SidebarDemo() {
  return (
    <SidebarExampleLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sidebar Demo</h1>
          <p className="text-muted-foreground">
            This shows how your cabin management app would look with a collapsible sidebar.
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">✨ Features</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Organized navigation by category</li>
              <li>• Collapsible with mini icons mode</li>
              <li>• Active route highlighting</li>
              <li>• Persistent header with toggle</li>
            </ul>
          </div>
          
          <div className="p-6 border rounded-lg">
            <h3 className="font-semibold mb-2">🎯 Benefits</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Quick access to all features</li>
              <li>• Better spatial organization</li>
              <li>• Improved user orientation</li>
              <li>• Professional appearance</li>
            </ul>
          </div>
        </div>
        
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm">
            <strong>Try it:</strong> Click the menu icon in the header to collapse/expand the sidebar. 
            Notice how it shows icons only when collapsed but maintains full functionality.
          </p>
        </div>
      </div>
    </SidebarExampleLayout>
  );
}