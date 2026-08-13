import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/hooks/useOrganization";

interface UseOrgAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error?: string | null;
}

// Determines if the current user is an organization admin using a secure RPC.
// Falls back to checking the organization's admin_email against the signed-in user's email.
export const useOrgAdmin = (): UseOrgAdminResult => {
  const { user, loading: authLoading } = useAuth();
  const { organization } = useOrganization();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (authLoading) return;
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Primary: org-scoped check that mirrors the database RLS policies exactly.
        const activeOrgId = organization?.id
          ?? (await supabase.rpc('get_user_organization_id')).data;

        if (activeOrgId) {
          const { data: scoped, error: scopedError } = await (supabase as any)
            .rpc('is_org_admin_for', { p_organization_id: activeOrgId });
          if (!scopedError) {
            setIsAdmin(scoped === true);
            setError(null);
            setLoading(false);
            return;
          }
        }

        // Fallback: legacy primary-organization check
        const { data, error: rpcError } = await supabase.rpc('is_organization_admin');
        if (!rpcError && data === true) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        const userOrgId = activeOrgId;

        if (!userOrgId) {
          // User doesn't have an organization - this is normal for new users
          setIsAdmin(false);
          setError(null); // Don't set an error for new users
          return;
        }


        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('admin_email')
          .eq('id', userOrgId)
          .maybeSingle(); // Use maybeSingle instead of single

        if (orgError) {
          setError(orgError.message);
          setIsAdmin(false);
        } else if (org) {
          const userEmail = (user.email || '').toLowerCase();
          const adminEmail = (org.admin_email || '').toLowerCase();
          setIsAdmin(Boolean(userEmail && adminEmail && userEmail === adminEmail));
        } else {
          // Organization doesn't exist
          setIsAdmin(false);
          setError(null);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to determine admin status');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
    // Only rerun when auth state changes
  }, [user, authLoading, organization?.id]);

  return { isAdmin, loading, error };
};
