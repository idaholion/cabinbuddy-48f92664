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
  HeadphonesIcon,
  Wrench,
  LogOut,
  UserPlus,
  Plus,
  MessageSquare,
  Monitor,
  Vote,
  Sparkles
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
import { useAuth } from "@/contexts/AuthContext";
import { JoinOrganizationDialog } from "@/components/JoinOrganizationDialog";

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
    title: "Financial Dashboard",
    url: "/finance-reports",
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

const helpItems = [
  {
    title: "Feature Guide",
    url: "/features",
    icon: Sparkles,
  },
];


export function AppSidebar() {
  const location = useLocation();
  const { isSupervisor } = useSupervisor();
  const { signOut } = useAuth();
  
  // Check if we're on a supervisor organization page
  const organizationMatch = location.pathname.match(/\/supervisor\/organization\/([^\/]+)/);
  const organizationId = organizationMatch ? organizationMatch[1] : null;
  
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50";

  return (
    <Sidebar className="border-r" collapsible="icon">
      <div className="flex items-center justify-between p-2 border-b">
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

        {/* Logout Section */}
        <SidebarGroup className="border-b pb-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  tooltip="Logout"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <button 
                    onClick={() => signOut()}
                    className="flex items-center gap-2 w-full"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
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
              
              {/* Messaging and Family Voting moved to Resources */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Messaging">
                  <NavLink 
                    to="/messaging" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Messaging</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Family Voting">
                  <NavLink 
                    to="/family-voting" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Vote className="h-4 w-4" />
                    <span>Family Voting</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Help & Features */}
        <SidebarGroup>
          <SidebarGroupLabel>Help</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpItems.map((item) => (
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

        {/* Organizations - moved above Setup */}
        <SidebarGroup>
          <SidebarGroupLabel>Organizations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Manage Organizations">
                  <NavLink 
                    to="/manage-organizations" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Settings className="h-4 w-4" />
                    <span>Manage Organizations</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <JoinOrganizationDialog>
                  <SidebarMenuButton tooltip="Join Organization" className="flex items-center gap-2 w-full cursor-pointer">
                    <UserPlus className="h-4 w-4" />
                    <span>Join Organization</span>
                  </SidebarMenuButton>
                </JoinOrganizationDialog>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Create Organization">
                  <NavLink 
                    to="/family-setup?mode=create" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Organization</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Calendar Keeper and Demo moved to Organizations */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Calendar Keeper">
                  <NavLink 
                    to="/calendar-keeper-management" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <HeadphonesIcon className="h-4 w-4" />
                    <span>Calendar Keeper</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Demo">
                  <NavLink 
                    to="/demo" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Demo</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                
                {/* Organization-specific supervisor links */}
                {organizationId && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Family Groups">
                        <NavLink 
                          to={`/supervisor/organization/${organizationId}/family-groups`}
                          className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                        >
                          <Users className="h-4 w-4" />
                          <span>Family Groups</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Financial Setup">
                        <NavLink 
                          to={`/supervisor/organization/${organizationId}/financial`}
                          className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                        >
                          <DollarSign className="h-4 w-4" />
                          <span>Financial Setup</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild tooltip="Reservation Setup">
                        <NavLink 
                          to={`/supervisor/organization/${organizationId}/reservation`}
                          className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                        >
                          <Calendar className="h-4 w-4" />
                          <span>Reservation Setup</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>
    </Sidebar>
  );
}