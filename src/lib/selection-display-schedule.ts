import { addDays, parseISO, startOfDay } from 'date-fns';

export interface DisplayFamily {
  familyGroup: string;
  status: string;
  isCurrentTurn: boolean;
}
export interface DisplayWindow { start: Date; end: Date; estimated: boolean }

// Pure projection only: never persist estimated dates or infer a handoff.
export function selectionDisplaySchedule(
  families: DisplayFamily[],
  activeStart: string | null | undefined,
  activeEnd: string | null | undefined,
  days: number,
  extendedUntil?: string | null,
): Map<string, DisplayWindow> {
  const windows = new Map<string, DisplayWindow>();
  if (!activeStart) return windows;
  const start = startOfDay(parseISO(activeStart));
  let end = activeEnd ? startOfDay(parseISO(activeEnd)) : addDays(start, days);
  if (extendedUntil) {
    const extended = startOfDay(parseISO(extendedUntil));
    if (extended > end) end = extended;
  }
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return windows;
  const activeIndex = families.findIndex(f => f.isCurrentTurn);
  if (activeIndex < 0) return windows;
  const active = families[activeIndex];
  if (active.status !== 'completed') windows.set(active.familyGroup, { start, end, estimated: false });
  let nextStart = end;
  for (const family of families.slice(activeIndex + 1)) {
    if (family.status === 'completed') continue;
    const nextEnd = addDays(nextStart, days);
    windows.set(family.familyGroup, { start: nextStart, end: nextEnd, estimated: true });
    nextStart = nextEnd;
  }
  return windows;
}