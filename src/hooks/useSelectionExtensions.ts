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

  const createOrUpdateExtension = async (
    familyGroup: string,
    originalEndDate: string,
    extendedUntil: string,
    reason?: string
  ) => {
    if (!organization?.id) return;

    try {
      const existingExtension = getExtensionForFamily(familyGroup);

      if (existingExtension) {
        // Update existing extension
        const { error } = await supabase
          .from('selection_period_extensions')
          .update({
            extended_until: extendedUntil,
            extension_reason: reason,
          })
          .eq('id', existingExtension.id);

        if (error) throw error;

        toast({
          title: "Extension Updated",
          description: `Selection period for ${familyGroup} has been updated.`,
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

        toast({
          title: "Extension Created",
          description: `Selection period for ${familyGroup} has been extended.`,
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
