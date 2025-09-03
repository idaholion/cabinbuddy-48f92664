import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ChecklistProgress {
  id: string;
  checklist_id: string;
  progress: Record<string, boolean>;
  completed_items: number;
  total_items: number;
  last_accessed_at: string;
}

export const useChecklistProgress = (checklistId: string) => {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [progressRecord, setProgressRecord] = useState<ChecklistProgress | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    if (checklistId) {
      loadProgress();
    }
  }, [checklistId]);

  const loadProgress = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organizationId, error: orgError } = await supabase
        .rpc('get_user_primary_organization_id');

      if (orgError) throw orgError;

      // Use raw query since the types haven't been regenerated yet
      const { data, error } = await supabase
        .from('checklist_progress' as any)
        .select('*')
        .eq('checklist_id', checklistId)
        .eq('user_id', user.user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned  
        throw error;
      }

      if (data) {
        const progressData = data as unknown as ChecklistProgress;
        setProgressRecord(progressData);
        setProgress(progressData.progress || {});
        
        // Update last accessed time
        await supabase
          .from('checklist_progress' as any)
          .update({ last_accessed_at: new Date().toISOString() })
          .eq('id', progressData.id);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      toast({
        title: "Error loading progress",
        description: "Failed to load your saved progress",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (
    newProgress: Record<string, boolean>,
    completedItems: number,
    totalItems: number
  ) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data: organizationId, error: orgError } = await supabase
        .rpc('get_user_primary_organization_id');

      if (orgError) throw orgError;

      const progressData = {
        checklist_id: checklistId,
        user_id: user.user.id,
        organization_id: organizationId,
        progress: newProgress,
        completed_items: completedItems,
        total_items: totalItems,
        last_accessed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (progressRecord) {
        // Update existing record
        const { data, error } = await supabase
          .from('checklist_progress' as any)
          .update(progressData)
          .eq('id', progressRecord.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setProgressRecord(data as unknown as ChecklistProgress);
        }
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('checklist_progress' as any)
          .insert(progressData)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setProgressRecord(data as unknown as ChecklistProgress);
        }
      }

      setProgress(newProgress);
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "Error saving progress",
        description: "Failed to save your progress",
        variant: "destructive"
      });
    }
  };

  const resetProgress = async () => {
    const emptyProgress = {};
    await updateProgress(emptyProgress, 0, Object.keys(progress).length);
  };

  const saveProgress = async () => {
    if (progressRecord) {
      await updateProgress(
        progress,
        Object.values(progress).filter(Boolean).length,
        Object.keys(progress).length
      );
    }
  };

  return {
    progress,
    loading,
    updateProgress,
    resetProgress,
    saveProgress,
    progressRecord
  };
};