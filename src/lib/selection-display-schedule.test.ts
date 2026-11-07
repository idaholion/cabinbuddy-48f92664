import { describe, expect, test } from 'bun:test';
import { format } from 'date-fns';
import { selectionDisplaySchedule } from './selection-display-schedule';

const families = [
  { familyGroup: 'Comeau', status: 'completed', isCurrentTurn: false },
  { familyGroup: 'Grandy', status: 'active', isCurrentTurn: true },
  { familyGroup: 'Andrew', status: 'waiting', isCurrentTurn: false },
  { familyGroup: 'Poznanovich', status: 'waiting', isCurrentTurn: false },
];
describe('Read-only selection date projection', () => {
  test('completed families have no dates', () => {
    expect(selectionDisplaySchedule(families, '2026-11-02', null, 7).has('Comeau')).toBe(false);
  });
  test('secondary active dates are Nov 2–9 and waiting dates are Nov 9–16', () => {
    const schedule = selectionDisplaySchedule(families, '2026-11-02', null, 7);
    expect(format(schedule.get('Grandy')?.end ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-11-09');
    expect(format(schedule.get('Andrew')?.start ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-11-09');
    expect(format(schedule.get('Andrew')?.end ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-11-16');
    expect(schedule.get('Andrew')?.estimated).toBe(true);
  });
  test('extension pushes waiting dates back', () => {
    const schedule = selectionDisplaySchedule(families, '2026-11-02', null, 7, '2026-11-12');
    expect(format(schedule.get('Andrew')?.start ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-11-12');
    expect(format(schedule.get('Poznanovich')?.start ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-11-19');
  });
  test('early Done uses the newly active saved start', () => {
    const next = families.map(f => ({ ...f, status: f.familyGroup === 'Grandy' ? 'completed' : f.familyGroup === 'Andrew' ? 'active' : f.status, isCurrentTurn: f.familyGroup === 'Andrew' }));
    const schedule = selectionDisplaySchedule(next, '2026-11-06', null, 7);
    expect(format(schedule.get('Poznanovich')?.start ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-11-13');
    expect(schedule.has('Grandy')).toBe(false);
  });
  test('primary uses saved active end and 14-day waiting windows', () => {
    const schedule = selectionDisplaySchedule(families, '2026-10-05', '2026-10-18', 14);
    expect(format(schedule.get('Grandy')?.end ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-10-18');
    expect(format(schedule.get('Andrew')?.end ?? new Date(0), 'yyyy-MM-dd')).toBe('2026-11-01');
  });
});