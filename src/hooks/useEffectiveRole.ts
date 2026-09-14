import { useMemo } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useImpersonation } from '@/contexts/ImpersonationContext';

/**
 * Role flags adjusted for admin "View as user" mode.
 *
 * While an admin is viewing the app as another member, every *display* decision
 * should behave as if the admin were that person: no admin-only controls, no
 * cross-family visibility, their own family group only.
 *
 * Use `realIsAdmin` only for the impersonation banner / picker itself, so the
 * exit path never disappears.
 */
export const useEffectiveRole = () => {
  const role = useUserRole();
  const { familyGroups } = useFamilyGroups();
  const { target, isImpersonating } = useImpersonation();

  return useMemo(() => {
    if (!isImpersonating || !target) {
      return {
        ...role,
        isImpersonating: false as const,
        realIsAdmin: role.isAdmin,
        target: null as typeof target,
      };
    }

    const group = familyGroups?.find((fg: any) => fg.name === target.familyGroup) || null;
    const email = (target.email || '').toLowerCase();
    const name = (target.displayName || '').toLowerCase().trim();
    const isLead = !!group && (
      ((group as any).lead_email || '').toLowerCase() === email && !!email ||
      ((group as any).lead_name || '').toLowerCase().trim() === name && !!name
    );
    const hostMember = Array.isArray((group as any)?.host_members)
      ? (group as any).host_members.find((m: any) =>
          (m?.email || '').toLowerCase() === email && !!email ||
          (m?.name || '').toLowerCase().trim() === name && !!name)
      : null;

    return {
      ...role,
      isAdmin: false,
      isTreasurer: false,
      isCalendarKeeper: false,
      isGroupLead: isLead,
      isNameMatchedGroupLead: false,
      isGroupMember: !isLead && !!hostMember,
      isNameMatchedMember: false,
      isHost: !isLead && !!hostMember?.canHost,
      userFamilyGroup: group,
      userHostInfo: hostMember || null,
      isImpersonating: true as const,
      realIsAdmin: role.isAdmin,
      target,
    };
  }, [role, familyGroups, isImpersonating, target]);
};

/**
 * Small guard for write actions. While impersonating, saves are blocked so no
 * record is attributed to the wrong person.
 */
export const useImpersonationGuard = () => {
  const { isImpersonating, target, isAdminView, isDelegateMode } = useImpersonation();
  return {
    // Only admin "View as" is read-only. Delegates may save on behalf of the
    // member they are acting for.
    isImpersonating: isImpersonating && isAdminView,
    isAdminView,
    isDelegateMode,
    targetName: target?.displayName ?? null,
    blockedMessage: target
      ? `You are viewing as ${target.displayName}. Return to Admin to make changes.`
      : 'Return to Admin to make changes.',
  };
};
