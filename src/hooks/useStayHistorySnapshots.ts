import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/hooks/useOrganization';

export type SnapshotFrequency = 'off' | 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface SnapshotSettings {
  frequency: SnapshotFrequency;
  retention: number;
}

export interface SnapshotMetadata {
  id: string;
  organization_id: string;
  backup_type: string;
  file_path: string;
  file_size: number;
  created_at: string;
  status: string;
  season_year?: number;
  snapshot_source?: 'manual' | 'auto';
}

interface SnapshotSummary {
  total_reservations: number;
  total_payments: number;
  total_payment_splits: number;
  total_checkin_sessions: number;
  total_receipts: number;
  total_amount_billed: number;
  total_amount_paid: number;
}

interface SnapshotPreview {
  organization: string;
  season_year: number;
  snapshot_date: string;
  snapshot_type: string;
  summary: SnapshotSummary;
}

const DEFAULT_RETENTION: Record<SnapshotFrequency, number> = {
  off: 4,
  daily: 7,
  weekly: 4,
  biweekly: 4,
  monthly: 6
};

export function useStayHistorySnapshots() {
  const [snapshots, setSnapshots] = useState<SnapshotMetadata[]>([]);
  const [settings, setSettings] = useState<SnapshotSettings>({ frequency: 'off', retention: 4 });
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const { toast } = useToast();
  const { organization } = useOrganization();

  const fetchSettings = useCallback(async () => {
    if (!organization?.id) return;

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('stay_history_snapshot_frequency, stay_history_snapshot_retention')
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      setSettings({
        frequency: (data?.stay_history_snapshot_frequency as SnapshotFrequency) || 'off',
        retention: data?.stay_history_snapshot_retention || 4
      });
    } catch (error) {
      console.error('Error fetching snapshot settings:', error);
    }
  }, [organization?.id]);

  const updateSettings = useCallback(async (newSettings: SnapshotSettings) => {
    if (!organization?.id) return false;

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          stay_history_snapshot_frequency: newSettings.frequency,
          stay_history_snapshot_retention: newSettings.retention
        })
        .eq('id', organization.id);

      if (error) throw error;

      setSettings(newSettings);
      toast({
        title: 'Settings Saved',
        description: 'Automatic snapshot settings have been updated',
      });
      return true;
    } catch (error) {
      console.error('Error updating snapshot settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save snapshot settings',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSavingSettings(false);
    }
  }, [organization?.id, toast]);

  const fetchSnapshots = useCallback(async (seasonYear?: number) => {
    if (!organization?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('backup_metadata')
        .select('*')
        .eq('organization_id', organization.id)
        .like('backup_type', 'stay_history_%')
        .order('created_at', { ascending: false });

      if (seasonYear) {
        query = query.eq('backup_type', `stay_history_${seasonYear}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Parse season year from backup_type and include snapshot_source
      const enrichedData = (data || []).map(snapshot => ({
        ...snapshot,
        season_year: parseInt(snapshot.backup_type.replace('stay_history_', ''), 10) || undefined,
        snapshot_source: (snapshot.snapshot_source as 'manual' | 'auto') || 'manual'
      }));

      setSnapshots(enrichedData);
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load snapshots',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [organization?.id, toast]);

  const createSnapshot = useCallback(async (seasonYear: number) => {
    if (!organization?.id) return null;

    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('create-stay-history-snapshot', {
        body: {
          organization_id: organization.id,
          season_year: seasonYear,
          snapshot_type: 'manual',
          snapshot_source: 'manual',
          created_by_user_id: user?.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Snapshot Created',
        description: `Stay history snapshot for ${seasonYear} has been created successfully`,
      });

      // Refresh the list
      fetchSnapshots();

      return data;
    } catch (error) {
      console.error('Error creating snapshot:', error);
      toast({
        title: 'Snapshot Failed',
        description: 'Failed to create stay history snapshot',
        variant: 'destructive'
      });
      return null;
    } finally {
      setCreating(false);
    }
  }, [organization?.id, fetchSnapshots, toast]);

  const previewRestore = useCallback(async (snapshotFilePath: string): Promise<SnapshotPreview | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('restore-stay-history-snapshot', {
        body: {
          snapshot_file_path: snapshotFilePath,
          confirm_restore: false
        }
      });

      if (error) throw error;

      return data.data as SnapshotPreview;
    } catch (error) {
      console.error('Error previewing restore:', error);
      toast({
        title: 'Preview Failed',
        description: 'Failed to preview snapshot data',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  const restoreSnapshot = useCallback(async (
    snapshotFilePath: string, 
    restoreScope: 'full' | 'payments_only' | 'reservations_only' = 'full'
  ) => {
    setRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('restore-stay-history-snapshot', {
        body: {
          snapshot_file_path: snapshotFilePath,
          confirm_restore: true,
          restore_scope: restoreScope
        }
      });

      if (error) throw error;

      toast({
        title: 'Restore Complete',
        description: `Stay history has been restored from the snapshot (${restoreScope})`,
      });

      return data;
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore stay history data',
        variant: 'destructive'
      });
      return null;
    } finally {
      setRestoring(false);
    }
  }, [toast]);

  const downloadSnapshot = useCallback(async (snapshot: SnapshotMetadata) => {
    try {
      const { data, error } = await supabase.storage
        .from('organization-backups')
        .download(snapshot.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = snapshot.file_path.split('/').pop() || 'snapshot.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: 'Snapshot file is being downloaded',
      });
    } catch (error) {
      console.error('Error downloading snapshot:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download snapshot file',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const deleteSnapshot = useCallback(async (snapshot: SnapshotMetadata) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('organization-backups')
        .remove([snapshot.file_path]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: metadataError } = await supabase
        .from('backup_metadata')
        .delete()
        .eq('id', snapshot.id);

      if (metadataError) throw metadataError;

      toast({
        title: 'Snapshot Deleted',
        description: 'Snapshot has been removed successfully',
      });

      // Refresh list
      fetchSnapshots();
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete snapshot',
        variant: 'destructive'
      });
    }
  }, [fetchSnapshots, toast]);

  const getDefaultRetention = (frequency: SnapshotFrequency): number => {
    return DEFAULT_RETENTION[frequency];
  };

  return {
    snapshots,
    settings,
    loading,
    creating,
    restoring,
    savingSettings,
    fetchSnapshots,
    fetchSettings,
    updateSettings,
    createSnapshot,
    previewRestore,
    restoreSnapshot,
    downloadSnapshot,
    deleteSnapshot,
    getDefaultRetention
  };
}
