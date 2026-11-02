import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { resolveFamilyRole } from '@/lib/family-role-identity';

const normalize = (str?: string | null) => (str || '').toLowerCase().trim();

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

    const resolved = resolveFamilyRole(familyGroups, identity, isImpersonating ? null : role.claimedProfile);
    const matchedGroup = resolved.group;
    const matchedMember = resolved.member;
    const isGroupLead = resolved.isLead;
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
      userFamilyGroup: matchedGroup,
      userHostInfo: matchedMember,
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
