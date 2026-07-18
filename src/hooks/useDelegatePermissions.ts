import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';

/**
 * Resolves the delegate permissions the currently-signed-in user has been
 * granted within each family group in the organization.
 *
 * Group Lead (index 0) always has every permission. Other members only have
 * the permissions their card in FamilyGroupSetup has checked (defaults to true
 * for legacy members via the backfill migration).
 *
 * Returned by family_group name:
 *   { [groupName]: { canEditReservations, canEditDailyFinal, canEditStayHistory, isLead, isMember } }
 */
export type DelegateFlags = {
  canEditReservations: boolean;
  canEditDailyFinal: boolean;
  canEditStayHistory: boolean;
  isLead: boolean;
  isMember: boolean;
};

const emptyFlags: DelegateFlags = {
  canEditReservations: false,
  canEditDailyFinal: false,
  canEditStayHistory: false,
  isLead: false,
  isMember: false,
};

export function useDelegatePermissions() {
  const { user } = useAuth();
  const { familyGroups } = useFamilyGroups();

  const email = (user?.email || '').toLowerCase();
  const userId = user?.id;

  const permissionsByGroup = useMemo(() => {
    const map = new Map<string, DelegateFlags>();
    if (!email && !userId) return map;

    for (const fg of familyGroups || []) {
      const hosts: any[] = Array.isArray((fg as any).host_members) ? (fg as any).host_members : [];
      let matchedIdx = -1;
      hosts.forEach((m, idx) => {
        if (matchedIdx !== -1) return;
        const mEmail = (m?.email || '').toLowerCase();
        if ((userId && m?.user_id === userId) || (email && mEmail && mEmail === email)) {
          matchedIdx = idx;
        }
      });

      if (matchedIdx === -1) continue;

      const isLead = matchedIdx === 0;
      const m = hosts[matchedIdx] || {};
      map.set(fg.name, {
        isMember: true,
        isLead,
        canEditReservations: isLead ? true : (m.canEditReservations ?? true),
        canEditDailyFinal:   isLead ? true : (m.canEditDailyFinal   ?? true),
        canEditStayHistory:  isLead ? true : (m.canEditStayHistory  ?? true),
      });
    }
    return map;
  }, [familyGroups, email, userId]);

  const forGroup = (groupName?: string | null): DelegateFlags => {
    if (!groupName) return emptyFlags;
    return permissionsByGroup.get(groupName) || emptyFlags;
  };

  // Any group where the user has ANY edit permission
  const hasAnyDelegatePermission = useMemo(() => {
    for (const flags of permissionsByGroup.values()) {
      if (flags.canEditReservations || flags.canEditDailyFinal || flags.canEditStayHistory) {
        return true;
      }
    }
    return false;
  }, [permissionsByGroup]);

  return { permissionsByGroup, forGroup, hasAnyDelegatePermission };
}
