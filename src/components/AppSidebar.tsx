import { 
  Home,
  Users,
  UsersRound,
  DollarSign,
  Calendar,
  LogIn,
  CheckCircle,
  CalendarDays,
  Receipt,
  ShoppingCart,
  FileText,
  BookOpen,
  Camera,
  LogOut,
  BarChart3,
  Building,
  UserCog,
  Shield
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

// Reorganized into 4 logical groups for better navigation
const coreActivitiesItems = [
  {
    title: "Cabin Calendar",
    url: "/enhanced-calendar",
    icon: Calendar,
  },
  {
    title: "Check In",
    url: "/check-in",
    icon: LogIn,
  },
  {
    title: "Daily Check In", 
    url: "/daily-check-in",
    icon: CheckCircle,
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
    icon: LogOut,
  },
];

const resourcesItems = [
  {
    title: "Cabin Rules",
    url: "/cabin-rules",
    icon: BookOpen,
  },
  {
    title: "Documents",
    url: "/documents",
    icon: FileText,
  },
  {
    title: "Seasonal Docs", 
    url: "/cabin-seasonal-docs",
    icon: Calendar,
  },
  {
    title: "Photos",
    url: "/photos",
    icon: Camera,
  },
];

const managementItems = [
  {
    title: "Financial Review",
    url: "/financial-review",
    icon: DollarSign,
  },
  {
    title: "Finance Reports",
    url: "/finance-reports", 
    icon: BarChart3,
  },
  {
    title: "Organization",
    url: "/select-organization",
    icon: Building,
  },
  {
    title: "Calendar Keeper",
    url: "/calendar-keeper-management",
    icon: UserCog,
  },
];

const setupItems = [
  {
    title: "Family Setup",
    url: "/family-setup",
    icon: Users,
  },
  {
    title: "Family Group Setup",
    url: "/family-group-setup", 
    icon: UsersRound,
  },
  {
    title: "Financial Setup",
    url: "/financial-setup",
    icon: DollarSign,
  },
  {
    title: "Reservation Setup",
    url: "/reservation-setup",
    icon: CalendarDays,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { isSupervisor } = useSupervisor();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground" : "";

  return (
    <Sidebar variant="inset">
      <SidebarContent>
        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/home" className={getNavCls}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Core Activities - Main cabin operations */}
        <SidebarGroup>
          <SidebarGroupLabel>Core Activities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreActivitiesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Resources & Information */}
        <SidebarGroup>
          <SidebarGroupLabel>Resources & Info</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resourcesItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management - Consolidated management functions */}
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Setup & Administration */}
        <SidebarGroup>
          <SidebarGroupLabel>Setup & Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {setupItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Supervisor Section - Only show if user is supervisor */}
        {isSupervisor && (
          <SidebarGroup>
            <SidebarGroupLabel>Supervisor</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/supervisor" className={getNavCls}>
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Supervisor Dashboard</span>
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