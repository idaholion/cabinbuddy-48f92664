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
  Sparkles,
  User
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
import { useRole } from "@/contexts/RoleContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { JoinOrganizationDialog } from "@/components/JoinOrganizationDialog";
import { SupervisorModeToggle } from "@/components/SupervisorModeToggle";

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
    title: "Group Member Profile",
    url: "/group-member-profile",
    icon: User,
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
  const { signOut, user } = useAuth();
  const { canAccessSupervisorFeatures } = useRole();
  const { isGroupLead, isAdmin, loading: roleLoading } = useUserRole();
  const { familyGroups } = useFamilyGroups();
  
  // Direct check for group leadership as fallback
  const isDirectGroupLead = user?.email ? familyGroups.some(group => 
    group.lead_email?.toLowerCase() === user.email.toLowerCase()
  ) : false;
  
  // Combined group lead check
  const isAnyGroupLead = isGroupLead || isDirectGroupLead;
  
  // Debug role detection
  console.log('🔧 [SIDEBAR] Role detection:', {
    userEmail: user?.email,
    isGroupLead,
    isDirectGroupLead,
    isAnyGroupLead,
    isAdmin,
    roleLoading,
    canAccessSupervisorFeatures,
    currentPath: location.pathname,
    familyGroupsCount: familyGroups.length,
    familyGroupsWithLeads: familyGroups.filter(g => g.lead_email).map(g => ({ name: g.name, lead_email: g.lead_email })),
    shouldShowSetup: !roleLoading && (isAdmin || isAnyGroupLead || canAccessSupervisorFeatures || location.pathname.includes('/family-group-setup') || location.pathname.includes('/setup'))
  });
  
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
                <SidebarMenuButton asChild tooltip="Home">
                  <NavLink 
                    to="/home" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Account Setup">
                  <NavLink 
                    to="/setup" 
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Wrench className="h-4 w-4" />
                    <span>Account Setup</span>
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

        {/* Setup - Show to admins, group leads, supervisors, and users setting up groups */}
        {!roleLoading && (isAdmin || isAnyGroupLead || canAccessSupervisorFeatures || location.pathname.includes('/family-group-setup') || location.pathname.includes('/setup')) && (
          <SidebarGroup>
            <SidebarGroupLabel>Setup</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {setupItems
                  .filter(item => {
                    // Filter setup items based on user role
                    if (item.title === "Family Setup") {
                      return isAdmin || canAccessSupervisorFeatures; // Only admins and supervisors
                    }
                    if (item.title === "Family Group Setup") {
                      return isAdmin || isAnyGroupLead || canAccessSupervisorFeatures || location.pathname.includes('/family-group-setup') || location.pathname.includes('/setup'); // Include users actively setting up groups
                    }
                    return isAdmin || isAnyGroupLead || canAccessSupervisorFeatures; // Default: all setup users
                  })
                  .map((item) => (
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
        )}

        {/* Supervisor */}
        {canAccessSupervisorFeatures && (
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
                       <SidebarMenuButton asChild tooltip="Use Fee Setup">
                         <NavLink 
                           to={`/supervisor/organization/${organizationId}/financial`}
                           className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                         >
                           <DollarSign className="h-4 w-4" />
                           <span>Use Fee Setup</span>
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

        {/* Role Toggle Section (only for supervisors) */}
        {isSupervisor && (
          <SidebarGroup className="border-t pt-2">
            <SidebarGroupContent>
              <SupervisorModeToggle />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

      </SidebarContent>
    </Sidebar>
  );
}