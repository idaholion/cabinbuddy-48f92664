import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { secureSelect, createOrganizationContext } from '@/lib/secure-queries';
import { supabase } from '@/integrations/supabase/client';
import { SELECTION_DISPLAY_REFRESH } from '@/lib/selection-display-events';

interface Usage {
  family_group: string;
  time_periods_used: number;
  secondary_periods_used: number | null;
  turn_completed: boolean | null;
  selection_round: string | null;
}

// Display refreshes must never run the booking hook's usage reconciliation.
export function useSelectionUsageDisplay(year: number) {
  const { organization } = useOrganization();
  const [snapshot, setSnapshot] = useState<{ key: string; rows: Usage[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const key = `${organization?.id}:${year}`;
  const latestKey = useRef(key);
  latestKey.current = key;
  const requestId = useRef(0);
  const fetchTimePeriodUsage = useCallback(async (_year?: number) => {
    if (!organization?.id) return;
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await secureSelect('time_period_usage', createOrganizationContext(organization.id)).eq('rotation_year', year);
      if (latestKey.current !== key || id !== requestId.current) return;
      if (result.error) throw result.error;
      setSnapshot({ key, rows: result.data || [] });
    } catch (error) {
      console.error('Selection display refresh failed:', error);
    } finally {
      if (latestKey.current === key && id === requestId.current) setLoading(false);
    }
  }, [organization?.id, year, key]);

  useEffect(() => {
    void fetchTimePeriodUsage();
    const refresh = () => { void fetchTimePeriodUsage(); };
    window.addEventListener(SELECTION_DISPLAY_REFRESH, refresh);
    window.addEventListener('focus', refresh);
    const channel = supabase.channel(`selection-display-${key}-${Math.random()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'time_period_usage', filter: `organization_id=eq.${organization?.id}` }, refresh)
      .subscribe();
    return () => {
      window.removeEventListener(SELECTION_DISPLAY_REFRESH, refresh);
      window.removeEventListener('focus', refresh);
      void supabase.removeChannel(channel);
    };
  }, [fetchTimePeriodUsage, key, organization?.id]);

  return { timePeriodUsage: snapshot?.key === key ? snapshot.rows : [], loading: loading || snapshot?.key !== key, fetchTimePeriodUsage };
}