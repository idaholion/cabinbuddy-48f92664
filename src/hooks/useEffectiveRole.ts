import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useImpersonation } from '@/contexts/ImpersonationContext';

const normalize = (str?: string | null) => (str || '').toLowerCase().trim();

const isNameMatch = (a?: string | null, b?: string | null): boolean => {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const aw = na.split(/\s+/).filter(Boolean);
  const bw = nb.split(/\s+/).filter(Boolean);
  if (aw.length > 1 && bw.length > 1) {
    const matches = aw.filter(w => bw.includes(w));
    return matches.length >= 2;
  }
  return aw.some(w => bw.includes(w)) || bw.some(w => aw.includes(w));
};

interface ResolvedIdentity {
  id?: string | null;
  email: string;
  name: string;
}

const resolveIdentity = (
  user: ReturnType<typeof useAuth>['user'],
  target: ReturnType<typeof useImpersonation>['target']
): ResolvedIdentity => {
  if (target) {
    return {
      id: target.userId,
      email: (target.email || '').toLowerCase().trim(),
      name: normalize(target.displayName),
    };
  }
  const meta = user?.user_metadata || {};
  const displayName =
    meta.display_name ||
    meta.full_name ||
    `${meta.first_name || ''} ${meta.last_name || ''}`.trim();
  return {
    id: user?.id,
    email: (user?.email || '').toLowerCase().trim(),
    name: normalize(displayName),
  };
};

/**
 * Role flags adjusted for admin "View as user" mode.
 *
 * While an admin is viewing the app as another member, every *display* decision
 * should behave as if the admin were that person: no admin-only controls, no
 * cross-family visibility, their own family group only.
 *
 * Use `realIsAdmin` only for the impersonation banner / picker itself, so the
 * exit path never disappears.
 *
 * This hook also resolves family-group delegate permissions. A non-lead member
 * whose host_members record has canEditReservations / canEditDailyFinal /
 * canEditStayHistory set to true is treated as having the group lead's edit
 * rights for that area only.
 */
export const useEffectiveRole = () => {
  const { user } = useAuth();
  const role = useUserRole();
  const { familyGroups } = useFamilyGroups();
  const { target, isImpersonating } = useImpersonation();

  return useMemo(() => {
    const identity = resolveIdentity(user, isImpersonating ? target : null);

    let matchedGroup: any = null;
    let matchedMember: any = null;
    let matchedIndex = -1;

    for (const fg of familyGroups || []) {
      if (identity.email && normalize(fg.lead_email) === identity.email) {
        matchedGroup = fg;
        matchedIndex = -2; // lead by email
        break;
      }
      if (identity.name && isNameMatch(fg.lead_name, identity.name)) {
        matchedGroup = fg;
        matchedIndex = -2; // lead by name
        break;
      }
      const hosts: any[] = Array.isArray(fg.host_members) ? fg.host_members : [];
      const idx = hosts.findIndex((m: any) => {
        if (identity.id && (m?.user_id || '').toString() === identity.id) return true;
        if (identity.email && normalize(m?.email) === identity.email) return true;
        if (identity.name && isNameMatch(m?.name, identity.name)) return true;
        const fullName = [m?.firstName, m?.lastName].filter(Boolean).join(' ');
        if (identity.name && isNameMatch(fullName, identity.name)) return true;
        return false;
      });
      if (idx !== -1) {
        matchedGroup = fg;
        matchedMember = hosts[idx];
        matchedIndex = idx;
        break;
      }
    }

    const isGroupLead = matchedIndex === -2 || matchedIndex === 0;
    const isGroupMember = !isGroupLead && !!matchedMember;
    const isHost = isGroupMember && !!matchedMember?.canHost;

    const canEditReservations = isGroupLead || !!matchedMember?.canEditReservations;
    const canEditDailyFinal = isGroupLead || !!matchedMember?.canEditDailyFinal;
    const canEditStayHistory = isGroupLead || !!matchedMember?.canEditStayHistory;

    // Preserve original isGroupLead from useUserRole when not impersonating so
    // existing code that depends on it (e.g. calendar keeper lead names) keeps
    // working; delegate permissions are exposed separately.
    const baseIsGroupLead = isImpersonating ? isGroupLead : (role.isGroupLead || isGroupLead);

    return {
      ...role,
      isAdmin: isImpersonating ? false : role.isAdmin,
      isTreasurer: isImpersonating ? false : role.isTreasurer,
      isCalendarKeeper: isImpersonating ? false : role.isCalendarKeeper,
      isGroupLead: baseIsGroupLead,
      isNameMatchedGroupLead: isImpersonating ? false : role.isNameMatchedGroupLead,
      isGroupMember: isImpersonating ? isGroupMember : (role.isGroupMember || isGroupMember),
      isNameMatchedMember: isImpersonating ? false : role.isNameMatchedMember,
      isHost: isImpersonating ? isHost : (role.isHost || isHost),
      userFamilyGroup: isImpersonating ? matchedGroup : (role.userFamilyGroup || matchedGroup),
      userHostInfo: isImpersonating ? matchedMember : (role.userHostInfo || matchedMember),
      canEditReservations,
      canEditDailyFinal,
      canEditStayHistory,
      isImpersonating: isImpersonating as boolean,
      realIsAdmin: role.isAdmin,
      target: isImpersonating ? target : null,
    };
  }, [role, familyGroups, user, target, isImpersonating]);
};

/**
 * Small guard for write actions. While impersonating, saves are blocked so no
 * record is attributed to the wrong person.
 */
export const useImpersonationGuard = () => {
  const { isImpersonating, target } = useImpersonation();
  return {
    isImpersonating,
    targetName: target?.displayName ?? null,
    blockedMessage: target
      ? `You are viewing as ${target.displayName}. Return to Admin to make changes.`
      : 'Return to Admin to make changes.',
  };
};
