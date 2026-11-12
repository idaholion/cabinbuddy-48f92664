import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useRotationOrder } from '@/hooks/useRotationOrder';
import { createOrganizationContext, secureSelect } from '@/lib/secure-queries';
import {
  runSelectionPreflight,
  type PreflightPeriod,
  type PreflightResult,
  type PreflightSeason,
  type PreflightSecondaryStatus,
  type PreflightUsage,
} from '@/lib/selection-preflight';

/**
 * Read-only readiness check for the selection season that is next up.
 *
 * Every read goes through the organization-scoped secure wrappers and nothing
 * here writes: it only reports what is missing, stale or inconsistent so an
 * admin can fix it before families start picking.
 */
export const useSelectionPreflight = () => {
  const { organization } = useOrganization();
  const { familyGroups } = useFamilyGroups();
  const { rotationData, getSelectionRotationYear } = useRotationOrder();

  const [result, setResult] = useState<PreflightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const year = rotationData ? getSelectionRotationYear() : 0;

  const load = useCallback(async () => {
    if (!organization?.id || !rotationData || !year) return;

    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);

    try {
      const orgContext = createOrganizationContext(
        organization.id,
        organization.is_test_organization,
        organization.allocation_model
      );

      const [seasonRes, periodsRes, usageRes, statusRes] = await Promise.all([
        secureSelect('rotation_orders', orgContext)
          .eq('rotation_year', year)
          .maybeSingle(),
        secureSelect('reservation_periods', orgContext)
          .eq('rotation_year', year)
          .order('selection_start_date'),
        secureSelect('time_period_usage', orgContext).eq('rotation_year', year),
        secureSelect('secondary_selection_status', orgContext)
          .eq('rotation_year', year)
          .maybeSingle(),
      ]);

      // A newer check already started (different season or a refresh) — drop this answer.
      if (requestRef.current !== requestId) return;

      const names = (familyGroups || [])
        .map((group: any) => group?.name)
        .filter((name: any): name is string => Boolean(name));

      setResult(
        runSelectionPreflight({
          year,
          today: new Date(),
          familyGroups: names,
          season: (seasonRes.data as PreflightSeason | null) ?? null,
          periods: (periodsRes.data as PreflightPeriod[] | null) ?? [],
          usage: (usageRes.data as PreflightUsage[] | null) ?? [],
          secondaryStatus: (statusRes.data as PreflightSecondaryStatus | null) ?? null,
        })
      );
    } catch (err: any) {
      if (requestRef.current !== requestId) return;
      setError(err?.message || 'Could not check season readiness.');
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [organization?.id, organization?.is_test_organization, organization?.allocation_model, rotationData, year, familyGroups]);

  useEffect(() => {
    load();
  }, [load]);

  return { result, loading, error, refresh: load, year };
};
