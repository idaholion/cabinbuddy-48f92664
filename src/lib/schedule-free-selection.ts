import { supabase } from '@/integrations/supabase/client';
import { secureSelect, secureUpdate, createOrganizationContext } from '@/lib/secure-queries';
import { holdOpening, DEFAULT_OPEN_TIME } from '@/lib/post-rotation-hold';

/**
 * Called right after the last family finishes Round 2. Saves the hold opening
 * (finish date + hold days, at the opening time MT) only if none is saved yet,
 * then asks the checker to send the announcement now instead of next morning.
 */
export async function scheduleFreeSelectionOpening(organizationId: string, rotationYear: number, finishedAt = new Date()) {
  try {
    const ctx = createOrganizationContext(organizationId);
    const { data } = await secureSelect('rotation_orders', ctx)
      .select('id, enable_post_rotation_selection, post_rotation_hold_days, post_rotation_open_time, post_rotation_opens_at')
      .eq('rotation_year', rotationYear).maybeSingle();
    const row = data as any;
    if (!row?.enable_post_rotation_selection || row.post_rotation_opens_at || !(row.post_rotation_hold_days > 0)) return;
    const opensAt = holdOpening(finishedAt, row.post_rotation_hold_days, row.post_rotation_open_time || DEFAULT_OPEN_TIME);
    const { error } = await secureUpdate('rotation_orders', { post_rotation_opens_at: opensAt.toISOString() }, ctx)
      .eq('id', row.id).is('post_rotation_opens_at', null);
    if (error) { console.error('[free-selection] could not save opening', error); return; }
    await supabase.functions.invoke('check-selection-turn-changes', { body: {} }).catch(() => undefined);
  } catch (e) {
    console.error('[free-selection] scheduling failed; daily check will retry', e);
  }
}
