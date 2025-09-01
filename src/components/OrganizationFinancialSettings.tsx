import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Shield } from 'lucide-react';
import { useOrganization } from '@/hooks/useOrganization';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const OrganizationFinancialSettings = () => {
  const { organization, refetchOrganization } = useOrganization();
  const { isAdmin } = useOrgAdmin();
  const [updating, setUpdating] = useState(false);
  const [localAccessState, setLocalAccessState] = useState<boolean | null>(null);

  // Sync local state with organization data
  useEffect(() => {
    if (organization?.allow_member_financial_access !== undefined) {
      setLocalAccessState(organization.allow_member_financial_access);
    }
  }, [organization?.allow_member_financial_access]);

  const handleToggleMemberAccess = async (enabled: boolean) => {
    if (!organization?.id) return;

    console.log(`🔄 Updating financial access to: ${enabled}`);
    setUpdating(true);
    
    // Optimistically update local state
    setLocalAccessState(enabled);
    
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ allow_member_financial_access: enabled })
        .eq('id', organization.id);

      if (error) throw error;

      console.log(`✅ Database updated successfully`);
      
      // Force a refetch and wait for it
      await refetchOrganization();
      
      console.log(`🔄 Organization data refetched`);
      
      toast({
        title: 'Settings Updated',
        description: enabled 
          ? 'All members can now access the financial dashboard'
          : 'Financial dashboard access restricted to admin and treasurer only',
      });
    } catch (error) {
      console.error('❌ Error updating financial access:', error);
      
      // Revert optimistic update on error
      setLocalAccessState(!enabled);
      
      toast({
        title: 'Update Failed',
        description: 'Failed to update financial access settings',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Only organization administrators can manage financial access settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Financial Dashboard Access
        </CardTitle>
        <CardDescription>
          Control who can access the financial dashboard and view expense data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="member-financial-access" className="text-base">
              Allow All Members Access
            </Label>
            <p className="text-sm text-muted-foreground">
              When enabled, all organization members can view the financial dashboard
            </p>
          </div>
          <Switch
            id="member-financial-access"
            checked={localAccessState ?? false}
            onCheckedChange={handleToggleMemberAccess}
            disabled={updating}
          />
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Default Access:</strong> Admin and treasurer always have full access to financial data.
            {localAccessState ? (
              <span className="block mt-1">
                <strong>Current Setting:</strong> All members can view financial dashboard with appropriate data filtering based on their role.
              </span>
            ) : (
              <span className="block mt-1">
                <strong>Current Setting:</strong> Only admin and treasurer can access financial dashboard.
              </span>
            )}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};