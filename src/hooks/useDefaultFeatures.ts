import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface DefaultFeature {
  id: string;
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

export const useDefaultFeatures = () => {
  const [features, setFeatures] = useState<DefaultFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFeatures = async () => {
    try {
      const { data, error } = await supabase
        .from('default_features')
        .select('*')
        .order('category', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setFeatures((data || []) as DefaultFeature[]);
    } catch (error) {
      console.error('Error fetching default features:', error);
      toast({
        title: "Error",
        description: "Failed to load features",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFeature = async (featureId: string, updates: Partial<DefaultFeature>) => {
    try {
      const { error } = await supabase
        .from('default_features')
        .update(updates)
        .eq('id', featureId);

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

  const reorderFeatures = async (reorderedFeatures: DefaultFeature[]) => {
    try {
      // Update sort_order for all features in the reordered list
      const updates = reorderedFeatures.map((feature, index) => ({
        id: feature.id,
        sort_order: index + 1
      }));

      // Batch update all sort orders
      for (const update of updates) {
        const { error } = await supabase
          .from('default_features')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Update local state with the new order
      setFeatures(reorderedFeatures.map((feature, index) => ({
        ...feature,
        sort_order: index + 1
      })));

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
  }, []);

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