import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useToast } from '@/hooks/use-toast';

interface SelectionExtension {
  id: string;
  organization_id: string;
  rotation_year: number;
  family_group: string;
  original_end_date: string;
  extended_until: string;
  extended_by_user_id?: string;
  extension_reason?: string;
  created_at: string;
  updated_at: string;
}

export const useSelectionExtensions = (rotationYear: number) => {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const [extensions, setExtensions] = useState<SelectionExtension[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExtensions = async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('selection_period_extensions')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear);

      if (error) throw error;
      setExtensions(data || []);
    } catch (error) {
      console.error('Error fetching selection extensions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtensions();
  }, [organization?.id, rotationYear]);

  const getExtensionForFamily = (familyGroup: string): SelectionExtension | null => {
    return extensions.find(ext => ext.family_group === familyGroup) || null;
  };

  const pushBackSubsequentPeriods = async (
    familyGroup: string,
    rotationYear: number,
    daysToAdd: number
  ) => {
    if (!organization?.id || daysToAdd <= 0) return;

    try {
      // Get rotation order to find this family's position
      const { data: rotationData } = await supabase
        .from('rotation_orders')
        .select('rotation_order')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .maybeSingle();

      if (!rotationData?.rotation_order) {
        console.error('No rotation order found');
        return;
      }

      const rotationOrder = rotationData.rotation_order as string[];
      const currentIndex = rotationOrder.indexOf(familyGroup);
      
      if (currentIndex === -1) {
        console.error('Family not found in rotation order');
        return;
      }

      // Get all subsequent families
      const subsequentFamilies = rotationOrder.slice(currentIndex + 1);
      
      if (subsequentFamilies.length === 0) {
        console.log('No subsequent periods to push back');
        return;
      }

      // Fetch periods for subsequent families
      const { data: periodsToUpdate, error: fetchError } = await supabase
        .from('reservation_periods')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('rotation_year', rotationYear)
        .in('current_family_group', subsequentFamilies);

      if (fetchError) {
        console.error('Error fetching periods to update:', fetchError);
        return;
      }

      if (!periodsToUpdate || periodsToUpdate.length === 0) {
        console.log('No periods found to update');
        return;
      }

      // Update each period
      const updates = periodsToUpdate.map(period => {
        const newStartDate = new Date(period.selection_start_date);
        newStartDate.setDate(newStartDate.getDate() + daysToAdd);
        
        const newEndDate = new Date(period.selection_end_date);
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);

        return supabase
          .from('reservation_periods')
          .update({
            selection_start_date: newStartDate.toISOString().split('T')[0],
            selection_end_date: newEndDate.toISOString().split('T')[0],
          })
          .eq('id', period.id);
      });

      await Promise.all(updates);
      
      console.log(`Pushed back ${periodsToUpdate.length} subsequent periods by ${daysToAdd} days`);
    } catch (error) {
      console.error('Error pushing back subsequent periods:', error);
    }
  };

  const createOrUpdateExtension = async (
    familyGroup: string,
    originalEndDate: string,
    extendedUntil: string,
    reason?: string
  ) => {
    if (!organization?.id) return;

    try {
      const existingExtension = getExtensionForFamily(familyGroup);
      
      // Calculate days extended
      const originalDate = new Date(originalEndDate);
      const extendedDate = new Date(extendedUntil);
      const daysExtended = Math.ceil((extendedDate.getTime() - originalDate.getTime()) / (1000 * 60 * 60 * 24));

      if (existingExtension) {
        // Calculate additional days if updating extension
        const previousExtendedDate = new Date(existingExtension.extended_until);
        const additionalDays = Math.ceil((extendedDate.getTime() - previousExtendedDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Update existing extension
        const { error } = await supabase
          .from('selection_period_extensions')
          .update({
            extended_until: extendedUntil,
            extension_reason: reason,
          })
          .eq('id', existingExtension.id);

        if (error) throw error;

        // Push back subsequent periods if extending further
        if (additionalDays > 0) {
          await pushBackSubsequentPeriods(familyGroup, rotationYear, additionalDays);
        }

        toast({
          title: "Extension Updated",
          description: `Selection period for ${familyGroup} updated. Subsequent periods adjusted.`,
        });
      } else {
        // Create new extension
        const { error } = await supabase
          .from('selection_period_extensions')
          .insert({
            organization_id: organization.id,
            rotation_year: rotationYear,
            family_group: familyGroup,
            original_end_date: originalEndDate,
            extended_until: extendedUntil,
            extension_reason: reason,
          });

        if (error) throw error;

        // Push back subsequent periods
        await pushBackSubsequentPeriods(familyGroup, rotationYear, daysExtended);

        toast({
          title: "Extension Created",
          description: `Selection period for ${familyGroup} extended. Subsequent periods adjusted by ${daysExtended} days.`,
        });
      }

      await fetchExtensions();
    } catch (error) {
      console.error('Error creating/updating extension:', error);
      toast({
        title: "Error",
        description: "Failed to extend selection period. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteExtension = async (familyGroup: string) => {
    if (!organization?.id) return;

    try {
      const extension = getExtensionForFamily(familyGroup);
      if (!extension) return;

      const { error } = await supabase
        .from('selection_period_extensions')
        .delete()
        .eq('id', extension.id);

      if (error) throw error;

      toast({
        title: "Extension Removed",
        description: `Selection period extension for ${familyGroup} has been removed.`,
      });

      await fetchExtensions();
    } catch (error) {
      console.error('Error deleting extension:', error);
      toast({
        title: "Error",
        description: "Failed to remove extension. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    extensions,
    loading,
    getExtensionForFamily,
    createOrUpdateExtension,
    deleteExtension,
    refetch: fetchExtensions,
  };
};
