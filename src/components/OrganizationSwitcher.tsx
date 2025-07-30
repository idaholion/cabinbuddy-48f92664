import { Building, ChevronDown, Settings, Plus, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { useNavigate } from 'react-router-dom';
import { useSidebar } from '@/components/ui/sidebar';

interface OrganizationSwitcherProps {
  compact?: boolean;
}

export const OrganizationSwitcher = ({ compact = false }: OrganizationSwitcherProps) => {
  const { organizations, activeOrganization, switchToOrganization, joinOrganization } = useMultiOrganization();
  const navigate = useNavigate();
  const { state } = useSidebar();

  // Always show if we have an active organization
  if (!activeOrganization) {
    return null;
  }

  const isCollapsed = state === 'collapsed';
  const hasMultipleOrgs = organizations.length > 1;

  const handleOrganizationSwitch = async (orgId: string) => {
    if (orgId === activeOrganization.organization_id) return;
    
    try {
      await switchToOrganization(orgId);
      // No page refresh needed - let React handle the state update
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  const handleManageOrganizations = () => {
    navigate('/select-organization');
  };

  const handleCreateOrganization = () => {
    navigate('/onboarding');
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
      case 'supervisor':
        return <Shield className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
      case 'supervisor':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`w-full justify-start gap-2 h-auto p-2 ${
            compact ? 'min-h-[40px]' : 'min-h-[56px]'
          } hover:bg-accent/50 transition-colors`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <Building className="h-4 w-4 text-muted-foreground" />
            </div>
            
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <div className="font-medium text-sm truncate">
                  {activeOrganization.organization_name}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="truncate">{activeOrganization.organization_code}</span>
                  <div className="flex items-center gap-1">
                    {getRoleIcon(activeOrganization.role)}
                    <Badge variant={getRoleBadgeVariant(activeOrganization.role)} className="text-xs px-1 py-0">
                      {activeOrganization.role}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
            
            {!isCollapsed && hasMultipleOrgs && (
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="start" 
        className="w-80 max-h-96 overflow-y-auto"
        side={isCollapsed ? "right" : "bottom"}
      >
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center justify-between">
            <span>Organizations</span>
            <Badge variant="outline" className="text-xs">
              {organizations.length}
            </Badge>
          </div>
        </DropdownMenuLabel>
        
        {hasMultipleOrgs && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1">
              <div className="text-xs text-muted-foreground mb-2">Switch to:</div>
              {organizations
                .filter(org => org.organization_id !== activeOrganization.organization_id)
                .map((org) => (
                <DropdownMenuItem
                  key={org.organization_id}
                  onClick={() => handleOrganizationSwitch(org.organization_id)}
                  className="flex items-center justify-between p-3 cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{org.organization_name}</div>
                    <div className="text-xs text-muted-foreground">{org.organization_code}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {getRoleIcon(org.role)}
                    <Badge variant={getRoleBadgeVariant(org.role)} className="text-xs">
                      {org.role}
                    </Badge>
                    {org.is_primary && (
                      <Badge variant="default" className="text-xs">
                        Primary
                      </Badge>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </>
        )}
        
        <DropdownMenuSeparator />
        <div className="p-2">
          <DropdownMenuItem onClick={handleCreateOrganization} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New Organization
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleManageOrganizations} className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            Manage Organizations
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};