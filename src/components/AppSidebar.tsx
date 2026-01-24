
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
  User,
  Shield,
  StickyNote,
  CreditCard,
  Database,
  HelpCircle,
  FileCode,
  Bell,
  AlertCircle,
  BookOpen,
  ListChecks,
  Camera
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
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSupervisor } from "@/hooks/useSupervisor";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSetupState } from "@/hooks/useSetupState";
import { useFamilyGroups } from "@/hooks/useFamilyGroups";
import { useOrganization } from "@/hooks/useOrganization";
import { JoinOrganizationDialog } from "@/components/JoinOrganizationDialog";
import { SupervisorModeToggle } from "@/components/SupervisorModeToggle";
import { VersionIndicator } from "@/components/VersionIndicator";

const setupItems = [
  {
    title: "Account Setup",
    url: "/setup",
    icon: Wrench,
  },
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
    title: "Use Fee Setup",
    url: "/use-fee-setup",
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
    title: "Check out Checklist",
    url: "/checkout-list",
    icon: CheckSquare,
  },
  {
    title: "Daily & Final Check",
    url: "/checkout-final",
    icon: CreditCard,
  },
  {
    title: "Stay History",
    url: "/stay-history",
    icon: Calendar,
  },
];

const resourcesItems = [
  {
    title: "Cabin Rules",
    url: "/cabin-rules",
    icon: Book,
  },
  {
    title: "Seasonal Checklists",
    url: "/seasonal-checklists",
    icon: CheckSquare,
  },
  {
    title: "Documents",
    url: "/documents",
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
    title: "FAQ",
    url: "/faq",
    icon: HelpCircle,
  },
  {
    title: "Feature Guide",
    url: "/features",
    icon: Sparkles,
  },
];

const adminItems = [
  {
    title: "Financial Dashboard",
    url: "/finance-reports",
    icon: DollarSign,
  },
  {
    title: "Billing & Invoices",
    url: "/billing",
    icon: Receipt,
  },
  {
    title: "Invoice Settings",
    url: "/invoice-settings",
    icon: FileText,
  },
  {
    title: "Financial Admin Tools",
    url: "/financial-admin-tools",
    icon: Settings,
  },
  {
    title: "Google Calendar Setup",
    url: "/google-calendar-setup",
    icon: Calendar,
  },
  {
    title: "Family Group Health Check",
    url: "/family-group-health-check",
    icon: AlertCircle,
  },
  {
    title: "Notification Monitoring",
    url: "/notification-monitoring",
    icon: Bell,
  },
  {
    title: "Data Backup",
    url: "/data-backup",
    icon: Database,
  },
  {
    title: "Stay History Snapshots",
    url: "/stay-history-snapshots",
    icon: Camera,
  },
  {
    title: "Checklist Creator",
    url: "/checklist-creator",
    icon: ListChecks,
  },
  {
    title: "FAQ Management",
    url: "/faq-management",
    icon: HelpCircle,
  },
];


export function AppSidebar() {
  const location = useLocation();
  const { isSupervisor } = useSupervisor();
  const { signOut, user } = useAuth();
  const { canAccessSupervisorFeatures } = useRole();
  const { isGroupLead, isNameMatchedGroupLead, isNameMatchedMember, isAdmin, loading: roleLoading } = useUserRole();
  const { setupState } = useSetupState();
  const { familyGroups } = useFamilyGroups();
  const { organization } = useOrganization();
  const { isMobile, setOpenMobile } = useSidebar();
  
  // Helper function to close sidebar on mobile after navigation
  const handleMobileNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  // Check if members have financial access
  const allowMemberFinancialAccess = organization?.allow_member_financial_access === true;
  
  // Direct check for group leadership as fallback
  const isDirectGroupLead = user?.email ? familyGroups.some(group => 
    group.lead_email?.toLowerCase() === user.email.toLowerCase()
  ) : false;
  
  // Combined group lead check - includes name-matched users
  const isAnyGroupLead = isGroupLead || isDirectGroupLead || isNameMatchedGroupLead;
  
  // Enhanced setup visibility check - persistent for admins and group leads
  const isOnSetupFlow = location.pathname.includes('/setup') || 
                       location.pathname.includes('/family-setup') ||
                       location.pathname.includes('/family-group-setup') ||
                       location.pathname.includes('mode=create') ||
                       location.search.includes('mode=create');
  
  // Show setup menus for admins and group leads (always) or during setup flow
  const shouldShowSetup = isAdmin || isAnyGroupLead || canAccessSupervisorFeatures || 
    setupState.isInSetupFlow || 
    location.pathname.includes('/setup') || 
    location.pathname.includes('/family-setup') ||
    location.pathname.includes('/family-group-setup') ||
    location.pathname.includes('mode=create') ||
    location.search.includes('mode=create');
  
  // Debug for alpha alpha specifically - more detailed logging
  if (user?.email?.toLowerCase().includes('alpha')) {
    console.log('🔍 [ALPHA DEBUG] Sidebar data:', {
      userEmail: user?.email,
      isAdmin,
      isGroupLead,
      isNameMatchedGroupLead,
      isAnyGroupLead,
      isNameMatchedMember,
      roleLoading,
      canAccessSupervisorFeatures,
      location: location.pathname,
      locationSearch: location.search,
      isOnSetupFlow,
      shouldShowSetup,
      familyGroupsCount: familyGroups.length,
      // Additional debugging for conditions
      condition1: roleLoading && isOnSetupFlow,
      condition2: !roleLoading && (isAdmin || isAnyGroupLead || isNameMatchedMember || canAccessSupervisorFeatures),
      condition3: isOnSetupFlow
    });
  }
  
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
                    onClick={handleMobileNavClick}
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account & Security */}
        <SidebarGroup className="border-b pb-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Profile Settings">
                  <NavLink 
                    to="/group-member-profile" 
                    onClick={handleMobileNavClick}
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>Profile Settings</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
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
                      onClick={handleMobileNavClick}
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
                      onClick={handleMobileNavClick}
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
                <SidebarMenuButton asChild tooltip="Shared Notes">
                  <NavLink 
                    to="/shared-notes" 
                    onClick={handleMobileNavClick}
                    className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                  >
                    <StickyNote className="h-4 w-4" />
                    <span>Shared Notes</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Messaging">
                  <NavLink 
                    to="/messaging" 
                    onClick={handleMobileNavClick}
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
                    onClick={handleMobileNavClick}
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
                      onClick={handleMobileNavClick}
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

        {/* Admin Tools - show all items for admins/supervisors, or just Financial Dashboard for members with access */}
        {(isAdmin || canAccessSupervisorFeatures || allowMemberFinancialAccess) && (
          <SidebarGroup>
            <SidebarGroupLabel>{isAdmin || canAccessSupervisorFeatures ? 'Admin' : 'Financial'}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems
                  .filter(item => {
                    // Hide Google Calendar Setup for all orgs except Andrew Family Cabin
                    if (item.url === '/google-calendar-setup') {
                      if (organization?.name !== 'Andrew Family Cabin') {
                        return false;
                      }
                    }
                    // Admins/supervisors see all items
                    if (isAdmin || canAccessSupervisorFeatures) return true;
                    // Members with financial access only see Financial Dashboard
                    if (allowMemberFinancialAccess && item.url === '/finance-reports') return true;
                    return false;
                  })
                  .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink 
                        to={item.url} 
                        onClick={handleMobileNavClick}
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

        {/* Organizations - moved above Setup */}
        <SidebarGroup>
          <SidebarGroupLabel>Organizations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Manage Organizations">
                  <NavLink 
                    to="/manage-organizations" 
                    onClick={handleMobileNavClick}
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
                    onClick={handleMobileNavClick}
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
                    onClick={handleMobileNavClick}
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
                    onClick={handleMobileNavClick}
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

        {/* Setup - Enhanced visibility for setup flow users */}
        {shouldShowSetup && (
          <SidebarGroup>
            <SidebarGroupLabel>Setup</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                 {setupItems
                  .filter(item => {
  // Filter setup items based on user role and setup flow
                    if (item.title === "Family Setup") {
                      return isAdmin || canAccessSupervisorFeatures || isOnSetupFlow; // Show during setup flow
                    }
                    if (item.title === "Family Group Setup") {
                      return isAdmin || isAnyGroupLead || canAccessSupervisorFeatures || isOnSetupFlow; // Show during setup flow
                    }
                    return isAdmin || isAnyGroupLead || canAccessSupervisorFeatures || isOnSetupFlow; // Default: show during setup
                  })
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild tooltip={item.title}>
                        <NavLink 
                          to={item.url} 
                          onClick={handleMobileNavClick}
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
                      onClick={handleMobileNavClick}
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <Settings className="h-4 w-4" />
                      <span>Dashboard</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin Documentation">
                    <NavLink 
                      to="/admin-documentation" 
                      onClick={handleMobileNavClick}
                      className={({ isActive }) => `${getNavCls({ isActive })} flex items-center gap-2`}
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Admin Documentation</span>
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
                          onClick={handleMobileNavClick}
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
                           onClick={handleMobileNavClick}
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
                          onClick={handleMobileNavClick}
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
      
      <SidebarFooter className="p-2">
        <VersionIndicator />
      </SidebarFooter>
    </Sidebar>
  );
}
