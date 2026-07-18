import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import { useOrganization } from '@/hooks/useOrganization';
import { useDelegatePermissions } from '@/hooks/useDelegatePermissions';
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
 * impersonate them on Daily/Final Checkout. Also hydrates from ?viewAs=<id>
 * for deep links from Stay History.
 */
export type DelegateScope = 'reservations' | 'dailyFinal' | 'stayHistory';

interface Props {
  /** Which delegate permission the page requires. Delegates without this
   *  permission won't see the picker. Admins always see it. */
  scope?: DelegateScope;
}

export const ViewAsUserPicker = ({ scope = 'dailyFinal' }: Props) => {
  const { isAdmin } = useOrgAdmin();
  const { familyGroups } = useFamilyGroups();
  const { organization } = useOrganization();
  const { target, setTarget, clear, isImpersonating } = useImpersonation();
  const { permissionsByGroup } = useDelegatePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [links, setLinks] = useState<Array<{ family_group_name: string; member_name: string; claimed_by_user_id: string | null }>>([]);

  // Determine which family groups this non-admin user can act as a delegate on
  // for the requested scope.
  const delegateGroups = useMemo(() => {
    const permKey = scope === 'reservations'
      ? 'canEditReservations'
      : scope === 'stayHistory'
        ? 'canEditStayHistory'
        : 'canEditDailyFinal';
    const set = new Set<string>();
    permissionsByGroup.forEach((flags, name) => {
      if ((flags as any)[permKey]) set.add(name);
    });
    return set;
  }, [permissionsByGroup, scope]);

  const canUsePicker = isAdmin || delegateGroups.size > 0;

  // Load claim links for this org (admins see all; delegates only need their groups' members)
  useEffect(() => {
    if (!canUsePicker || !organization?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('member_profile_links')
        .select('family_group_name, member_name, claimed_by_user_id')
        .eq('organization_id', organization.id);
      if (!cancelled && !error && data) setLinks(data as any);
    })();
    return () => { cancelled = true; };
  }, [canUsePicker, organization?.id]);

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
      // Delegates: restrict to family groups where they hold the required permission
      if (!isAdmin && !delegateGroups.has(fg.name)) continue;

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
  }, [familyGroups, linkByKey, isAdmin, delegateGroups]);

  // Hydrate from ?viewAs= deep link
  useEffect(() => {
    if (!canUsePicker) return;
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
  }, [canUsePicker, members, searchParams, target?.userId, setTarget]);

  if (!canUsePicker) return null;

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

  const label = isAdmin ? 'Admin view' : 'Delegate view';
  const placeholder = isAdmin ? 'View as user...' : 'Act on behalf of...';

  return (
    <div className="mb-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <Select value={target?.userId ?? '__self__'} onValueChange={handleSelect}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="__self__">Myself</SelectItem>
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
            {isAdmin
              ? 'No claimed members found in this organization.'
              : 'No other claimed members in your family group yet.'}
          </span>
        )}
        {isImpersonating && target && (
          <Button variant="outline" size="sm" onClick={() => handleSelect('__self__')}>
            <X className="h-3.5 w-3.5 mr-1" /> Exit
          </Button>
        )}
      </div>
      {isImpersonating && target && (
        <div className="mt-2 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          ⚠️ You are viewing this page as <strong>{target.displayName}</strong>
          {target.familyGroup ? <> ({target.familyGroup})</> : null}. Saves on this
          page will be recorded as actions performed on their behalf.
        </div>
      )}
    </div>
  );
};
