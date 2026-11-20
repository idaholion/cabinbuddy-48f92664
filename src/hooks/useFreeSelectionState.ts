import { useEffect, useState } from 'react';
import { secureSelect, createOrganizationContext } from '@/lib/secure-queries';
import { freeSelectionState, type FreeSelectionState } from '@/lib/post-rotation-hold';
import { SELECTION_DISPLAY_REFRESH } from '@/lib/selection-display-events';

/** Read-only free-selection status for one selection year. */
export function useFreeSelectionState(organizationId: string | undefined, year: number, enabled: boolean) {
  const [state, setState] = useState<FreeSelectionState | null>(null);
  const [rules, setRules] = useState<{ min?: number | null; max?: number | null; weeks?: number | null }>({});
  const [opensAt, setOpensAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const bump = () => setTick(t => t + 1);
    window.addEventListener(SELECTION_DISPLAY_REFRESH, bump);
    return () => window.removeEventListener(SELECTION_DISPLAY_REFRESH, bump);
  }, []);

  useEffect(() => {
    if (!enabled || !organizationId) { setState(null); return; }
    let live = true;
    const ctx = createOrganizationContext(organizationId);
    (async () => {
      const [settings, secondary] = await Promise.all([
        secureSelect('rotation_orders', ctx).eq('rotation_year', year).maybeSingle(),
        secureSelect('secondary_selection_status', ctx).eq('rotation_year', year).maybeSingle(),
      ]);
      if (!live || settings.error || !settings.data) return;
      const s = settings.data as any;
      setState(freeSelectionState(s, secondary.data as any));
      setOpensAt(s.post_rotation_opens_at ? new Date(s.post_rotation_opens_at) : null);
      setRules({ min: s.post_rotation_min_nights, max: s.post_rotation_max_consecutive_nights, weeks: s.post_rotation_max_weeks });
    })();
    return () => { live = false; };
  }, [organizationId, year, enabled, tick]);

  // Re-check once at the saved opening moment instead of polling every minute.
  useEffect(() => {
    if (!opensAt) return;
    const wait = opensAt.getTime() - Date.now() + 1000;
    if (wait <= 0 || wait > 2_147_000_000) return;
    const t = setTimeout(() => setTick(x => x + 1), wait);
    return () => clearTimeout(t);
  }, [opensAt]);

  return { state, rules, opensAt };
}
