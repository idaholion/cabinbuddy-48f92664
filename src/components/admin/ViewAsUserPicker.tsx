import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useFamilyGroups } from '@/hooks/useFamilyGroups';
import { useImpersonation } from '@/contexts/ImpersonationContext';
import { useOrgAdmin } from '@/hooks/useOrgAdmin';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

/**
 * Admin-only dropdown + banner shown on the Daily/Final Checkout pages.
 * Lets an admin pick any family-group member and view that page as if they
 * were logged in as them. Reads/writes `?viewAs=<user_id>` on the URL so the
 * choice can be deep-linked from Stay History.
 */
export const ViewAsUserPicker = () => {
  const { isAdmin } = useOrgAdmin();
  const { familyGroups } = useFamilyGroups();
  const { target, setTarget, clear, isImpersonating } = useImpersonation();
  const [searchParams, setSearchParams] = useSearchParams();

  const members = useMemo(() => {
    const list: Array<{ userId: string; displayName: string; familyGroup: string; email?: string | null }> = [];
    for (const fg of familyGroups || []) {
      const hosts: any[] = Array.isArray((fg as any).host_members) ? (fg as any).host_members : [];
      for (const m of hosts) {
        if (!m?.user_id) continue;
        const name = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.name || m.email || 'Member';
        list.push({
          userId: m.user_id,
          displayName: name,
          familyGroup: fg.name,
          email: m.email ?? null,
        });
      }
    }
    return list;
  }, [familyGroups]);

  // Hydrate from ?viewAs= deep link
  useEffect(() => {
    if (!isAdmin) return;
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
  }, [isAdmin, members, searchParams, target?.userId, setTarget]);

  if (!isAdmin) return null;

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
    <div className="mb-3 rounded-md border bg-card p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="h-4 w-4" />
          <span>Admin view</span>
        </div>
        <Select value={target?.userId ?? '__self__'} onValueChange={handleSelect}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="View as user..." />
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
