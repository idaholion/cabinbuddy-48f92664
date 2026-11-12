import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { secureSelect, createOrganizationContext } from '@/lib/secure-queries';
import { supabase } from '@/integrations/supabase/client';
import { SELECTION_DISPLAY_REFRESH } from '@/lib/selection-display-events';
import { selectionDisplayCounts } from '@/lib/selection-display-counts';

interface Usage {
  family_group: string;
  rotation_year: number;
  primary_turn_completed: boolean | null;
  secondary_turn_completed: boolean | null;
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
      const context = createOrganizationContext(organization.id);
      const [result, stays] = await Promise.all([
        secureSelect('time_period_usage', context).eq('rotation_year', year),
        secureSelect('reservations', context).gte('start_date', `${year}-01-01`).lt('start_date', `${year + 1}-01-01`),
      ]);
      if (latestKey.current !== key || id !== requestId.current) return;
      if (result.error) throw result.error;
      if (stays.error) throw stays.error;
      const counts = selectionDisplayCounts(stays.data || []);
      // Refresh the visible tally without writing counters or completion flags.
      const rows = (result.data || []).map(row => ({ ...row,
        time_periods_used: Math.max(row.time_periods_used || 0, counts.get(row.family_group)?.primary || 0),
        secondary_periods_used: Math.max(row.secondary_periods_used || 0, counts.get(row.family_group)?.secondary || 0),
      }));
      for (const [family, count] of counts) {
        if (!rows.some(row => row.family_group === family)) rows.push({ family_group: family, time_periods_used: count.primary,
          secondary_periods_used: count.secondary, rotation_year: year, primary_turn_completed: false,
          secondary_turn_completed: false, turn_completed: false, selection_round: 'primary' } as typeof rows[number]);
      }
      setSnapshot({ key, rows });
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