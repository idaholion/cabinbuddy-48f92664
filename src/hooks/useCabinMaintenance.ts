import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationContext } from './useOrganizationContext';
import { useToast } from './use-toast';
import { createOrganizationContext, secureSelect, secureInsert, secureUpdate, secureDelete } from '@/lib/secure-queries';

export type EntryType = 'work_log' | 'reference' | 'todo';
export type EntryStatus = 'open' | 'completed';
export type Priority = 'low' | 'medium' | 'high';

export interface MaintenancePhoto {
  id: string;
  entry_id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
  url?: string;
}

export interface MaintenanceEntry {
  id: string;
  organization_id: string;
  entry_type: EntryType;
  title: string;
  description: string | null;
  category: string | null;
  date_performed: string | null;
  performed_by_name: string | null;
  performed_by_user_id: string | null;
  cost: number | null;
  priority: Priority | null;
  target_date: string | null;
  status: EntryStatus;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  photos?: MaintenancePhoto[];
}

export interface NewEntryInput {
  entry_type: EntryType;
  title: string;
  description?: string;
  category?: string;
  date_performed?: string | null;
  performed_by_name?: string | null;
  cost?: number | null;
  priority?: Priority | null;
  target_date?: string | null;
  photos?: File[];
}

const BUCKET = 'photos';

export function useCabinMaintenance() {
  const { user } = useAuth();
  const { activeOrganization } = useOrganizationContext();
  const { toast } = useToast();
  const [entries, setEntries] = useState<MaintenanceEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const orgContext = activeOrganization
    ? createOrganizationContext(
        activeOrganization.organization_id,
        activeOrganization.is_test_organization,
        activeOrganization.allocation_model
      )
    : null;

  const attachPhotoUrls = (photos: MaintenancePhoto[]): MaintenancePhoto[] =>
    photos.map((p) => ({
      ...p,
      url: supabase.storage.from(BUCKET).getPublicUrl(p.storage_path).data.publicUrl,
    }));

  const fetchEntries = useCallback(async () => {
    if (!orgContext) return;
    setLoading(true);
    try {
      const { data, error } = await secureSelect('cabin_maintenance_entries', orgContext)
        .select('*, photos:cabin_maintenance_photos(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const enriched = (data || []).map((e: any) => ({
        ...e,
        photos: attachPhotoUrls(e.photos || []),
      }));
      setEntries(enriched);
    } catch (e: any) {
      console.error('fetchEntries', e);
      toast({ title: 'Error', description: 'Failed to load maintenance entries', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrganization?.organization_id]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const uploadPhotos = async (entryId: string, files: File[]) => {
    if (!orgContext || !user || files.length === 0) return;
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `maintenance/${orgContext.organizationId}/${entryId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (upErr) {
        console.error('photo upload', upErr);
        toast({ title: 'Photo upload failed', description: upErr.message, variant: 'destructive' });
        continue;
      }
      const { error: insErr } = await secureInsert(
        'cabin_maintenance_photos',
        {
          entry_id: entryId,
          storage_path: path,
          uploaded_by: user.id,
        },
        orgContext
      );
      if (insErr) console.error('photo row insert', insErr);
    }
  };

  const createEntry = async (input: NewEntryInput) => {
    if (!orgContext || !user) return null;
    const payload: any = {
      entry_type: input.entry_type,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      category: input.category || null,
      date_performed: input.date_performed ?? (input.entry_type === 'work_log' ? new Date().toISOString().slice(0, 10) : null),
      performed_by_name: input.performed_by_name || null,
      performed_by_user_id: user.id,
      cost: input.cost ?? null,
      priority: input.priority ?? null,
      target_date: input.target_date ?? null,
      status: input.entry_type === 'todo' ? 'open' : 'completed',
      created_by: user.id,
    };
    const { data, error } = await secureInsert('cabin_maintenance_entries', payload, orgContext)
      .select()
      .single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }
    if (input.photos && input.photos.length > 0) {
      await uploadPhotos(data.id, input.photos);
    }
    await fetchEntries();
    toast({ title: 'Saved', description: 'Maintenance entry added' });
    return data;
  };

  const updateEntry = async (id: string, updates: Partial<MaintenanceEntry>) => {
    if (!orgContext) return;
    const { error } = await secureUpdate('cabin_maintenance_entries', updates, orgContext).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchEntries();
  };

  const completeTodo = async (id: string) => {
    await updateEntry(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      date_performed: new Date().toISOString().slice(0, 10),
    } as any);
    toast({ title: 'Marked complete', description: 'Task moved to Maintenance Log' });
  };

  const reopenTodo = async (id: string) => {
    await updateEntry(id, { status: 'open', completed_at: null } as any);
  };

  const deleteEntry = async (id: string) => {
    if (!orgContext) return;
    const { error } = await secureDelete('cabin_maintenance_entries', orgContext).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchEntries();
    toast({ title: 'Deleted' });
  };

  return {
    entries,
    loading,
    createEntry,
    updateEntry,
    completeTodo,
    reopenTodo,
    deleteEntry,
    refetch: fetchEntries,
  };
}
