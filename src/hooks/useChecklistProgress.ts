import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ChecklistItem {
  id: string;
  text: string;
  completed?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  imageDescription?: string;
  imagePosition?: 'before' | 'after';
  imageMarker?: string;
  imageSize?: 'small' | 'medium' | 'large' | 'xl' | 'full';
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    type?: 'step' | 'warning' | 'note' | 'header';
    icon?: string;
  };
}

/**
 * Shape returned to consumers. The `checklist_progress` table stores ONE ROW PER
 * ITEM (unique on user_id + checklist_id + item_id), so this record is a derived
 * summary rather than a single database row.
 */
interface ChecklistProgress {
  checklist_id: string;
  progress: Record<string, boolean>;
  completed_items: number;
  total_items: number;
  image_sizes?: {
    globalSize?: string;
    individualSizes?: Record<string, string>;
  };
}

// Settings for the checklist as a whole are kept on a reserved item row.
const SETTINGS_ITEM_ID = '__checklist_settings__';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useChecklistProgress = (checklistId: string) => {
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [progressRecord, setProgressRecord] = useState<ChecklistProgress | null>(null);

  useEffect(() => {
    if (checklistId && UUID_RE.test(checklistId)) {
      loadProgress();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklistId]);

  const getContext = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return null;

    const { data: organizationId } = await supabase.rpc('get_user_primary_organization_id');
    return { userId, organizationId: (organizationId as string) ?? null };
  };

  const loadProgress = async () => {
    try {
      const ctx = await getContext();
      if (!ctx) return;

      const { data, error } = await supabase
        .from('checklist_progress')
        .select('item_id, completed, image_sizes')
        .eq('checklist_id', checklistId)
        .eq('user_id', ctx.userId);

      if (error) throw error;

      const rows = data ?? [];
      const nextProgress: Record<string, boolean> = {};
      let imageSizes: ChecklistProgress['image_sizes'] = undefined;

      for (const row of rows as any[]) {
        if (row.item_id === SETTINGS_ITEM_ID) {
          imageSizes = (row.image_sizes as any) || undefined;
          continue;
        }
        nextProgress[row.item_id] = !!row.completed;
      }

      setProgress(nextProgress);
      setProgressRecord({
        checklist_id: checklistId,
        progress: nextProgress,
        completed_items: Object.values(nextProgress).filter(Boolean).length,
        total_items: Object.keys(nextProgress).length,
        image_sizes: imageSizes,
      });
    } catch (error) {
      console.error('Error loading progress:', error);
      toast({
        title: 'Error loading progress',
        description: 'Failed to load your saved progress',
        variant: 'destructive',
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
    // Optimistic UI first so toggles never feel laggy.
    setProgress(newProgress);
    setProgressRecord(prev => ({
      checklist_id: checklistId,
      progress: newProgress,
      completed_items: completedItems,
      total_items: totalItems,
      image_sizes: prev?.image_sizes,
    }));

    if (!UUID_RE.test(checklistId)) return;

    try {
      const ctx = await getContext();
      if (!ctx) return;

      const now = new Date().toISOString();
      const rows = Object.entries(newProgress).map(([itemId, completed]) => ({
        user_id: ctx.userId,
        organization_id: ctx.organizationId,
        checklist_id: checklistId,
        item_id: itemId,
        completed: !!completed,
        completed_at: completed ? now : null,
        updated_at: now,
      }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from('checklist_progress')
          .upsert(rows, { onConflict: 'user_id,checklist_id,item_id' });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: 'Error saving progress',
        description: 'Failed to save your progress',
        variant: 'destructive',
      });
    }
  };

  const resetProgress = async () => {
    const itemIds = Object.keys(progress);
    const cleared: Record<string, boolean> = {};
    itemIds.forEach(id => {
      cleared[id] = false;
    });
    await updateProgress(cleared, 0, itemIds.length);
  };

  const saveProgress = async () => {
    await updateProgress(
      progress,
      Object.values(progress).filter(Boolean).length,
      Object.keys(progress).length
    );
  };

  const updateImageSizes = async (globalSize?: string, individualSizes?: Record<string, string>) => {
    const imageSizes = {
      globalSize: globalSize || progressRecord?.image_sizes?.globalSize,
      individualSizes: individualSizes || progressRecord?.image_sizes?.individualSizes || {},
    };

    setProgressRecord(prev =>
      prev
        ? { ...prev, image_sizes: imageSizes }
        : {
            checklist_id: checklistId,
            progress,
            completed_items: 0,
            total_items: 0,
            image_sizes: imageSizes,
          }
    );

    if (!UUID_RE.test(checklistId)) return;

    try {
      const ctx = await getContext();
      if (!ctx) return;

      const { error } = await supabase.from('checklist_progress').upsert(
        {
          user_id: ctx.userId,
          organization_id: ctx.organizationId,
          checklist_id: checklistId,
          item_id: SETTINGS_ITEM_ID,
          completed: false,
          image_sizes: imageSizes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,checklist_id,item_id' }
      );

      if (error) throw error;
    } catch (error) {
      console.error('Error updating image sizes:', error);
    }
  };

  return {
    progress,
    loading,
    updateProgress,
    resetProgress,
    saveProgress,
    progressRecord,
    updateImageSizes,
  };
};
