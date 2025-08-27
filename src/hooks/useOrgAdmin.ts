import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseOrgAdminResult {
  isAdmin: boolean;
  loading: boolean;
  error?: string | null;
}

// Determines if the current user is an organization admin using a secure RPC.
// Falls back to checking the organization's admin_email against the signed-in user's email.
export const useOrgAdmin = (): UseOrgAdminResult => {
  const { user, loading: authLoading } = useAuth();
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
        // Primary: use secure RPC which respects RLS
        const { data, error: rpcError } = await supabase.rpc('is_organization_admin');
        if (!rpcError && data === true) {
          setIsAdmin(true);
          setLoading(false);
          return;
        }

        // Fallback: read organization's admin_email and compare to current user
        // First get the user's organization ID
        const { data: userOrgId, error: userOrgError } = await supabase
          .rpc('get_user_organization_id');

        if (userOrgError || !userOrgId) {
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
  }, [user, authLoading]);

  return { isAdmin, loading, error };
};
