import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

/**
 * Admin-only "View as user" picker. Lists every claimed family-group member
 * (resolved via member_profile_links → claimed_by_user_id) and lets the admin
 * impersonate them on Daily/Final Checkout, Stay History, the Departure
 * Checklist and the Calendar. Hydrates from ?viewAs=<id> for deep links from
 * Stay History.
 */
export const ViewAsUserPicker = () => {
  const { isAdmin } = useOrgAdmin();
  const { familyGroups } = useFamilyGroups();
  const { organization } = useOrganization();
  const { target, setTarget, clear, isImpersonating } = useImpersonation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [links, setLinks] = useState<Array<{ family_group_name: string; member_name: string; claimed_by_user_id: string | null }>>([]);


  // Load claim links for this org
  useEffect(() => {
    if (!organization?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('member_profile_links')
        .select('family_group_name, member_name, claimed_by_user_id')
        .eq('organization_id', organization.id);
      if (!cancelled && !error && data) setLinks(data as any);
    })();
    return () => { cancelled = true; };
  }, [organization?.id]);

  const linkByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of links) {
      if (!l.claimed_by_user_id) continue;
      map.set(`${l.family_group_name}::${l.member_name}`.toLowerCase(), l.claimed_by_user_id);
    }
    return map;
  }, [links]);

  const members = useMemo(() => {
    const list: Array<{ userId: string; displayName: string; familyGroup: string; email?: string | null }> = [];
    const seen = new Set<string>();
    for (const fg of familyGroups || []) {
      const hosts: any[] = Array.isArray((fg as any).host_members) ? (fg as any).host_members : [];
      for (const m of hosts) {
        const name = m?.name || [m?.firstName, m?.lastName].filter(Boolean).join(' ') || m?.email;
        if (!name) continue;
        let userId: string | undefined = m?.user_id;
        if (!userId) userId = linkByKey.get(`${fg.name}::${name}`.toLowerCase());
        if (!userId) continue;
        if (seen.has(userId)) continue;
        seen.add(userId);
        list.push({
          userId,
          displayName: name,
          familyGroup: fg.name,
          email: m?.email ?? null,
        });
      }
    }
    return list;
  }, [familyGroups, linkByKey]);

  // Hydrate from ?viewAs= deep link
  useEffect(() => {
    const viewAs = searchParams.get('viewAs');
    if (!viewAs) return;
    if (target?.userId === viewAs) return;
    const found = members.find((m) => m.userId === viewAs);
    if (found) {
      setTarget({
        userId: found.userId,
        displayName: found.displayName,
        familyGroup: found.familyGroup,
        email: found.email,
      });
    }
  }, [members, searchParams, target?.userId, setTarget]);

  const grouped = members.reduce<Record<string, typeof members>>((acc, m) => {
    (acc[m.familyGroup] ||= []).push(m);
    return acc;
  }, {});

  const handleSelect = (val: string) => {
    if (val === '__self__') {
      clear();
      const next = new URLSearchParams(searchParams);
      next.delete('viewAs');
      setSearchParams(next, { replace: true });
      return;
    }
    const found = members.find((m) => m.userId === val);
    if (!found) return;
    setTarget({
      userId: found.userId,
      displayName: found.displayName,
      familyGroup: found.familyGroup,
      email: found.email,
    });
    const next = new URLSearchParams(searchParams);
    next.set('viewAs', val);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="mb-3 space-y-2">
      {isImpersonating && target && (
        <div className="sticky top-0 z-40 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-500/60 bg-amber-100 px-4 py-3 text-amber-900 shadow-sm dark:bg-amber-950/60 dark:text-amber-100">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            <span>
              Viewing as <strong>{target.displayName}</strong>
              {target.familyGroup ? <> ({target.familyGroup})</> : null} — you are
              seeing exactly what they see. Changes are disabled.
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => handleSelect('__self__')}>
            <X className="h-3.5 w-3.5 mr-1" /> Return to Admin
          </Button>
        </div>
      )}

      <div className="rounded-md border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4" />
            <span>View as</span>
          </div>
          <Select value={target?.userId ?? '__self__'} onValueChange={handleSelect}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Admin (myself)" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="__self__">Admin (myself)</SelectItem>
              {Object.entries(grouped)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fg, list]) => (
                  <SelectGroup key={fg}>
                    <SelectLabel>{fg}</SelectLabel>
                    {list.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.displayName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
            </SelectContent>
          </Select>
          {members.length === 0 && (
            <span className="text-xs text-muted-foreground">
              No claimed members found in this organization.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
