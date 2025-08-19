import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

export interface Feature {
  id: string;
  organization_id: string;
  feature_key: string;
  title: string;
  description: string;
  icon: string;
  category: 'host' | 'admin';
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFeatures = () => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { organization: currentOrganization } = useOrganization();

  const fetchFeatures = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setFeatures((data || []) as Feature[]);
    } catch (error) {
      console.error('Error fetching features:', error);
      toast({
        title: "Error",
        description: "Failed to load features",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = async (featureId: string, updates: Partial<Feature>) => {
    if (!currentOrganization?.id) return false;

    try {
      const { error } = await supabase
        .from('features')
        .update(updates)
        .eq('id', featureId)
        .eq('organization_id', currentOrganization.id);

      if (error) throw error;

      // Update local state
      setFeatures(prev => prev.map(feature => 
        feature.id === featureId ? { ...feature, ...updates } : feature
      ));

      toast({
        title: "Success",
        description: "Feature updated successfully",
      });
      return true;
    } catch (error) {
      console.error('Error updating feature:', error);
      toast({
        title: "Error",
        description: "Failed to update feature",
        variant: "destructive",
      });
      return false;
    }
  };

  const reorderFeatures = async (reorderedFeatures: Feature[]) => {
    if (!currentOrganization?.id) return false;

    try {
      // Update sort_order for all features in the reordered list
      const updates = reorderedFeatures.map((feature, index) => ({
        id: feature.id,
        sort_order: index + 1
      }));

      // Batch update all sort orders
      for (const update of updates) {
        const { error } = await supabase
          .from('features')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id)
          .eq('organization_id', currentOrganization.id);

        if (error) throw error;
      }

      // Update local state with new sort orders
      setFeatures(prev => prev.map(feature => {
        const reorderedFeature = reorderedFeatures.find(f => f.id === feature.id);
        if (reorderedFeature) {
          const newSortOrder = reorderedFeatures.indexOf(reorderedFeature) + 1;
          return { ...feature, sort_order: newSortOrder };
        }
        return feature;
      }));

      toast({
        title: "Success",
        description: "Feature order updated successfully",
      });
      return true;
    } catch (error) {
      console.error('Error reordering features:', error);
      toast({
        title: "Error",
        description: "Failed to update feature order",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, [currentOrganization?.id]);

  const hostFeatures = features.filter(f => f.category === 'host');
  const adminFeatures = features.filter(f => f.category === 'admin');

  return {
    features,
    hostFeatures,
    adminFeatures,
    loading,
    updateFeature,
    reorderFeatures,
    refetch: fetchFeatures
  };
};