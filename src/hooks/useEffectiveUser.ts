import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

/**
 * Returns the user identity that should drive data scoping in pages that
 * support admin "View as user" mode. When an admin has selected an impersonation
 * target, returns that target's user id / family group. Otherwise returns the
 * authenticated user.
 *
 * Use this in place of `useAuth().user.id` for reservation/receipt/payment
 * filtering. Keep `useAuth()` for genuine auth operations (signOut, etc.).
 */
export const useEffectiveUser = () => {
  const { user } = useAuth();
  const { target, isImpersonating } = useImpersonation();

  if (isImpersonating && target) {
    return {
      id: target.userId,
      email: target.email ?? null,
      displayName: target.displayName,
      familyGroup: target.familyGroup,
      isImpersonated: true as const,
      actingAdminId: user?.id ?? null,
    };
  }

  return {
    id: user?.id ?? null,
    email: user?.email ?? null,
    displayName: user?.user_metadata?.display_name ?? user?.email ?? null,
    familyGroup: null as string | null,
    isImpersonated: false as const,
    actingAdminId: null,
  };
};
