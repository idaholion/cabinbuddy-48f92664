import { useState } from 'react';
import { Building, ChevronDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useMultiOrganization } from '@/hooks/useMultiOrganization';
import { useNavigate } from 'react-router-dom';

export const OrganizationSwitcher = () => {
  const { organizations, activeOrganization, switchToOrganization } = useMultiOrganization();
  const navigate = useNavigate();

  if (!activeOrganization || organizations.length <= 1) {
    return null;
  }

  const handleOrganizationSwitch = async (orgId: string) => {
    await switchToOrganization(orgId);
    // Optionally refresh the page or navigate to ensure clean state
    window.location.reload();
  };

  const handleManageOrganizations = () => {
    navigate('/select-organization');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Building className="h-4 w-4" />
          <span className="hidden sm:inline">{activeOrganization.organization_name}</span>
          <span className="sm:hidden">{activeOrganization.organization_code}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <div className="px-2 py-1.5 text-sm font-semibold">Switch Organization</div>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.organization_id}
            onClick={() => handleOrganizationSwitch(org.organization_id)}
            className={org.organization_id === activeOrganization.organization_id ? 'bg-accent' : ''}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <div className="font-medium">{org.organization_name}</div>
                <div className="text-sm text-muted-foreground">{org.organization_code}</div>
              </div>
              {org.is_primary && (
                <div className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                  Primary
                </div>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleManageOrganizations}>
          <Settings className="h-4 w-4 mr-2" />
          Manage Organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};