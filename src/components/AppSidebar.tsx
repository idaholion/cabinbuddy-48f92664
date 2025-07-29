import { 
  Home,
  Users,
  DollarSign,
  Calendar,
  ClipboardCheck,
  CalendarDays,
  Receipt,
  ShoppingCart,
  FileText,
  Book,
  Image,
  CheckSquare,
  Settings,
  Building,
  HeadphonesIcon
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSupervisor } from "@/hooks/useSupervisor";

const setupItems = [
  {
    title: "Family Setup",
    url: "/family-setup",
    icon: Users,
  },
  {
    title: "Family Group Setup", 
    url: "/family-group-setup",
    icon: Users,
  },
  {
    title: "Financial Setup",
    url: "/financial-setup",
    icon: DollarSign,
  },
  {
    title: "Reservation Setup",
    url: "/reservation-setup", 
    icon: Calendar,
  },
];

const cabinItems = [
  {
    title: "Cabin Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Check In",
    url: "/check-in",
    icon: ClipboardCheck,
  },
  {
    title: "Daily Check In",
    url: "/daily-check-in",
    icon: CalendarDays,
  },
  {
    title: "Shopping List",
    url: "/shopping-list",
    icon: ShoppingCart,
  },
  {
    title: "Add Receipt",
    url: "/add-receipt",
    icon: Receipt,
  },
  {
    title: "Check Out",
    url: "/checkout-list",
    icon: CheckSquare,
  },
];

const resourcesItems = [
  {
    title: "Cabin Rules",
    url: "/cabin-rules",
    icon: Book,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
  },
  {
    title: "Seasonal Docs",
    url: "/cabin-seasonal-docs",
    icon: FileText,
  },
  {
    title: "Photos",
    url: "/photos",
    icon: Image,
  },
];

const managementItems = [
  {
    title: "Finance Reports",
    url: "/finance-reports",
    icon: DollarSign,
  },
  {
    title: "Organization",
    url: "/select-organization",
    icon: Building,
  },
  {
    title: "Calendar Keeper",
    url: "/calendar-keeper-management",
    icon: HeadphonesIcon,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { isSupervisor } = useSupervisor();
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50";

  return (
    <Sidebar className="border-r" collapsible="icon">
      <div className="p-2">
        <SidebarTrigger />
      </div>
      
      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard">
                  <NavLink 
                    to="/home" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Cabin */}
        <SidebarGroup>
          <SidebarGroupLabel>Cabin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {cabinItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources */}
        <SidebarGroup>
          <SidebarGroupLabel>Resources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Setup */}
        <SidebarGroup>
          <SidebarGroupLabel>Setup</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setupItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Supervisor */}
        {isSupervisor && (
          <SidebarGroup>
            <SidebarGroupLabel>Supervisor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Supervisor Dashboard">
                    <NavLink 
                      to="/supervisor" 
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}