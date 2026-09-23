import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';

export interface ImpersonationTarget {
  userId: string;
  displayName: string;
  familyGroup: string | null;
  email?: string | null;
}

interface ImpersonationContextType {
  target: ImpersonationTarget | null;
  isImpersonating: boolean;
  canImpersonate: boolean;
  setTarget: (target: ImpersonationTarget | null) => void;
  clear: () => void;
  logAction: (action: string, context?: Record<string, any>) => Promise<void>;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

const STORAGE_KEY = 'cb_impersonation_target';

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const { isAdmin } = useOrgAdmin();
  const { organization } = useOrganization();
  const [target, setTargetState] = useState<ImpersonationTarget | null>(null);

  // Treasurers get the same read-only "view as" ability as admins.
  const userEmail = (user?.email || '').toLowerCase();
  const treasurerEmail = ((organization as any)?.treasurer_email || '').toLowerCase();
  const isTreasurer = !!userEmail && !!treasurerEmail && userEmail === treasurerEmail;

  const canImpersonate = !!isAdmin || isTreasurer;

  // Hydrate from sessionStorage so the admin's choice persists across nav
  useEffect(() => {
    if (!canImpersonate) {
      setTargetState(null);
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setTargetState(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [canImpersonate]);

  const setTarget = useCallback((t: ImpersonationTarget | null) => {
    setTargetState(t);
    try {
      if (t) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(t));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }, []);

  const clear = useCallback(() => setTarget(null), [setTarget]);

  // Drop the impersonation target when the admin signs out or switches orgs.
  const prevOrgId = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      setTarget(null);
      prevOrgId.current = null;
      return;
    }
    const orgId = organization?.id ?? null;
    if (prevOrgId.current && orgId && prevOrgId.current !== orgId) {
      setTarget(null);
    }
    if (orgId) prevOrgId.current = orgId;
  }, [user, organization?.id, setTarget]);

  const logAction = useCallback(async (action: string, context?: Record<string, any>) => {
    if (!target || !user?.id || !organization?.id) return;
    try {
      await supabase.from('admin_impersonation_log' as any).insert({
        organization_id: organization.id,
        admin_user_id: user.id,
        target_user_id: target.userId,
        action,
        context: context ?? null,
      });
    } catch (e) {
      // Table may not exist yet (SQL not applied). Don't block UX.
      console.warn('[impersonation] audit log skipped:', e);
    }
  }, [target, user?.id, organization?.id]);

  return (
    <ImpersonationContext.Provider value={{
      target,
      isImpersonating: !!target,
      canImpersonate,
      setTarget,
      clear,
      logAction,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
};
