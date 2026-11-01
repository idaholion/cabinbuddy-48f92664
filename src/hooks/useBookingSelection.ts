import { useEffect, useState } from 'react';
import { useOrganizationContext } from './useOrganizationContext';
import { createOrganizationContext, secureSelect } from '@/lib/secure-queries';
import type { BookingSettings } from '@/lib/reservation-create-limits';

export function useBookingSelection(year: number, open: boolean) {
  const { activeOrganization } = useOrganizationContext();
  const organizationId = activeOrganization?.organization_id;
  const [snapshot, setSnapshot] = useState<{ year: number; organizationId: string; settings: BookingSettings; secondary: { started_at: string | null; current_family_group: string | null } | null; reservations: any[] } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open || !organizationId) return;
    let cancelled = false;
    setSnapshot(null);
    setError('');
    const context = createOrganizationContext(organizationId);
    Promise.all([
      secureSelect('rotation_orders', context).eq('rotation_year', year).maybeSingle(),
      secureSelect('secondary_selection_status', context).eq('rotation_year', year).maybeSingle(),
      secureSelect('reservations', context).gte('start_date', `${year}-01-01`).lt('start_date', `${year + 1}-01-01`),
    ]).then(([settings, secondary, reservations]) => {
      if (cancelled) return;
      if (settings.error || secondary.error || reservations.error || !settings.data) {
        setError(`Could not load selection rules for ${year}. Please reopen the booking or contact the calendar keeper.`);
        return;
      }
      setSnapshot({ year, organizationId, settings: settings.data, secondary: secondary.data, reservations: reservations.data || [] });
    }).catch(() => { if (!cancelled) setError('Could not load selection rules. Please try again.'); });
    return () => { cancelled = true; };
  }, [year, organizationId, open]);
  return { snapshot: snapshot?.year === year && snapshot.organizationId === organizationId ? snapshot : null, error };
}