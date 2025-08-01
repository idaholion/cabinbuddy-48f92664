import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useBulkOperationProtection } from "@/hooks/useBulkOperationProtection";
import { useMultiOrganization } from "@/hooks/useMultiOrganization";
import { supabase } from "@/integrations/supabase/client";

export const useFamilyGroupBulkOperations = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { requestBulkOperation } = useBulkOperationProtection();
  const { activeOrganization } = useMultiOrganization();

  const bulkUpdateLeads = async (leadPhone?: string, leadEmail?: string) => {
    if (!activeOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    // Get estimated count
    const { count } = await supabase
      .from('family_groups')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.organization_id);

    requestBulkOperation({
      operationType: 'Update Lead Information',
      organizationId: activeOrganization.organization_id,
      organizationName: activeOrganization.organization_name,
      estimatedRecords: count || 0,
      onConfirm: async () => {
        const { error } = await supabase.rpc('supervisor_bulk_update_leads', {
          p_organization_id: activeOrganization.organization_id,
          p_confirmation_code: 'CONFIRM_BULK_UPDATE',
          p_lead_phone: leadPhone,
          p_lead_email: leadEmail,
        });

        if (error) throw error;
      },
    });
  };

  const bulkRemoveHostMember = async (hostName: string) => {
    if (!activeOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    // Get estimated count of groups with this host member
    const { data } = await supabase
      .from('family_groups')
      .select('id')
      .eq('organization_id', activeOrganization.organization_id)
      .like('host_members', `%${hostName}%`);

    requestBulkOperation({
      operationType: 'Remove Host Member',
      organizationId: activeOrganization.organization_id,
      organizationName: activeOrganization.organization_name,
      estimatedRecords: data?.length || 0,
      onConfirm: async () => {
        const { error } = await supabase.rpc('supervisor_bulk_remove_host_member', {
          p_organization_id: activeOrganization.organization_id,
          p_confirmation_code: 'CONFIRM_BULK_UPDATE',
          p_host_name: hostName,
        });

        if (error) throw error;
      },
    });
  };

  const bulkUpdateReservationPermissions = async (enableAll: boolean) => {
    if (!activeOrganization) {
      toast({
        title: "Error",
        description: "No organization selected",
        variant: "destructive",
      });
      return;
    }

    // Get estimated count of groups with host members
    const { count } = await supabase
      .from('family_groups')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', activeOrganization.organization_id)
      .not('host_members', 'is', null);

    requestBulkOperation({
      operationType: enableAll ? 'Enable All Host Reservations' : 'Disable All Host Reservations',
      organizationId: activeOrganization.organization_id,
      organizationName: activeOrganization.organization_name,
      estimatedRecords: count || 0,
      onConfirm: async () => {
        const { error } = await supabase.rpc('supervisor_bulk_update_reservations', {
          p_organization_id: activeOrganization.organization_id,
          p_confirmation_code: 'CONFIRM_BULK_UPDATE',
          p_enable_all_hosts: enableAll ? true : null,
          p_disable_all_hosts: enableAll ? null : true,
        });

        if (error) throw error;
      },
    });
  };

  return {
    bulkUpdateLeads,
    bulkRemoveHostMember,
    bulkUpdateReservationPermissions,
    loading,
  };
};