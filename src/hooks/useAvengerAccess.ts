import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Server-checked access to the private Avenger Initiative hub. */
export function useAvengerAccess() {
  const { user } = useAuth();
  const [isAvenger, setIsAvenger] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!user) { setIsAvenger(false); setLoading(false); return; }
    setLoading(true);
    (supabase.rpc as any)("is_avenger_member").then(({ data, error }: any) => {
      if (cancelled) return;
      setIsAvenger(!error && data === true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]);
  return { isAvenger, loading };
}
