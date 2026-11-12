import { expect, test } from 'bun:test';
import {
  runSelectionPreflight,
  parseSeasonDate,
  type PreflightInput,
  type PreflightSeason,
} from './selection-preflight';

const FAMILIES = ['Poznanovich Family', 'Woolf Family', 'Cook Family', 'Andrew Family'];

const season = (overrides: Partial<PreflightSeason> = {}): PreflightSeason => ({
  rotation_year: 2028,
  rotation_order: [...FAMILIES],
  selection_days: 14,
  max_time_slots: 2,
  max_nights: 7,
  min_nights_per_booking: 2,
  max_consecutive_nights_primary: 14,
  enable_secondary_selection: true,
  secondary_max_periods: 1,
  enable_post_rotation_selection: true,
  post_rotation_hold_days: 7,
  post_rotation_open_time: '19:00',
  post_rotation_opens_at: null,
  ...overrides,
});

const periods = (startYear = 2027) => [
  { current_family_group: 'Poznanovich Family', selection_start_date: `${startYear}-10-01`, selection_end_date: `${startYear}-10-14` },
  { current_family_group: 'Woolf Family', selection_start_date: `${startYear}-10-15`, selection_end_date: `${startYear}-10-28` },
  { current_family_group: 'Cook Family', selection_start_date: `${startYear}-10-29`, selection_end_date: `${startYear}-11-11` },
  { current_family_group: 'Andrew Family', selection_start_date: `${startYear}-11-12`, selection_end_date: `${startYear}-11-25` },
];

const usage = () =>
  FAMILIES.map((family_group) => ({
    family_group,
    time_periods_used: 0,
    time_periods_allowed: 2,
    secondary_periods_used: 0,
    secondary_periods_allowed: 1,
    primary_turn_completed: false,
    secondary_turn_completed: false,
    turn_completed: false,
  }));

const input = (overrides: Partial<PreflightInput> = {}): PreflightInput => ({
  year: 2028,
  today: new Date(2026, 10, 12),
  familyGroups: [...FAMILIES],
  season: season(),
  periods: periods(),
  usage: usage(),
  secondaryStatus: null,
  ...overrides,
});

const byId = (result: ReturnType<typeof runSelectionPreflight>, id: string) =>
  result.checks.find((check) => check.id === id);

test('a healthy upcoming season is ready with no blocking items', () => {
  const result = runSelectionPreflight(input());
  expect(result.ready).toBe(true);
  expect(result.summary.fail).toBe(0);
  expect(byId(result, 'season-record')?.status).toBe('pass');
  expect(byId(result, 'family-order')?.status).toBe('pass');
  expect(byId(result, 'turn-overlaps')?.status).toBe('pass');
  expect(byId(result, 'primary-limit')?.status).toBe('pass');
  expect(byId(result, 'secondary-limit')?.status).toBe('pass');
});

test('a missing season record blocks the season and stops further checks', () => {
  const result = runSelectionPreflight(input({ season: null }));
  expect(result.ready).toBe(false);
  expect(result.checks.length).toBe(1);
  expect(byId(result, 'season-record')?.status).toBe('fail');
  expect(byId(result, 'season-record')?.detail).toContain('Start the 2028 selection season');
});

test('a family left out of the pick order is a blocking problem', () => {
  const result = runSelectionPreflight(
    input({ familyGroups: [...FAMILIES, 'Grandy Family'] })
  );
  expect(result.ready).toBe(false);
  expect(byId(result, 'family-order')?.status).toBe('fail');
  expect(byId(result, 'family-order')?.detail).toContain('Grandy Family');
});

test('a family in the order that is no longer in the organization is blocking', () => {
  const result = runSelectionPreflight(input({ familyGroups: FAMILIES.slice(0, 3) }));
  expect(byId(result, 'family-order')?.status).toBe('fail');
  expect(byId(result, 'family-order')?.detail).toContain('Andrew Family');
});

test('overlapping selection windows are blocking', () => {
  const overlapping = periods().map((p) =>
    p.current_family_group === 'Woolf Family'
      ? { ...p, selection_start_date: '2027-10-10', selection_end_date: '2027-10-24' }
      : p
  );
  const result = runSelectionPreflight(input({ periods: overlapping }));
  expect(result.ready).toBe(false);
  expect(byId(result, 'turn-overlaps')?.status).toBe('fail');
  expect(byId(result, 'turn-overlaps')?.detail).toContain('Poznanovich Family and Woolf Family');
});

test('turns that hand over on the same day are not overlaps', () => {
  // Departure and arrival both happen at noon on the handover day.
  const touching = [
    { current_family_group: 'Poznanovich Family', selection_start_date: '2027-10-01', selection_end_date: '2027-10-14' },
    { current_family_group: 'Woolf Family', selection_start_date: '2027-10-14', selection_end_date: '2027-10-27' },
    { current_family_group: 'Cook Family', selection_start_date: '2027-10-28', selection_end_date: '2027-11-10' },
    { current_family_group: 'Andrew Family', selection_start_date: '2027-11-11', selection_end_date: '2027-11-24' },
  ];
  const result = runSelectionPreflight(input({ periods: touching }));
  expect(byId(result, 'turn-overlaps')?.status).toBe('pass');
});

test('a zero saved Round 1 allowance is blocking, not a silent default', () => {
  const dirty = usage().map((row) =>
    row.family_group === 'Cook Family' ? { ...row, time_periods_allowed: 0 } : row
  );
  const result = runSelectionPreflight(input({ usage: dirty }));
  expect(result.ready).toBe(false);
  expect(byId(result, 'primary-limit')?.status).toBe('fail');
  expect(byId(result, 'primary-limit')?.detail).toContain('Cook Family');
});

test('a blank Round 2 allowance is blocking while Round 2 is enabled', () => {
  const dirty = usage().map((row) =>
    row.family_group === 'Woolf Family' ? { ...row, secondary_periods_allowed: null } : row
  );
  const result = runSelectionPreflight(input({ usage: dirty }));
  expect(result.ready).toBe(false);
  expect(byId(result, 'secondary-limit')?.status).toBe('fail');
  expect(byId(result, 'secondary-limit')?.detail).toContain('Woolf Family');
});

test('Round 2 allowance is not checked when Round 2 is turned off', () => {
  const result = runSelectionPreflight(
    input({
      season: season({ enable_secondary_selection: false }),
      usage: usage().map((row) => ({ ...row, secondary_periods_allowed: null })),
    })
  );
  expect(byId(result, 'secondary-limit')).toBeUndefined();
  expect(result.ready).toBe(true);
});

test('picks or Done recorded before the season opens are leftover state', () => {
  const dirty = usage().map((row) =>
    row.family_group === 'Andrew Family' ? { ...row, primary_turn_completed: true } : row
  );
  const result = runSelectionPreflight(input({ usage: dirty }));
  expect(result.ready).toBe(false);
  expect(byId(result, 'allowances-clean')?.status).toBe('fail');
  expect(byId(result, 'allowances-clean')?.detail).toContain('Andrew Family');
});

test('counters are not called stale once the season is running', () => {
  const running = input({ today: new Date(2027, 10, 20) });
  const result = runSelectionPreflight({
    ...running,
    usage: usage().map((row) => ({ ...row, time_periods_used: 1 })),
  });
  expect(byId(result, 'allowances-clean')).toBeUndefined();
  expect(byId(result, 'season-timing')?.status).toBe('warn');
});

test('a season whose turns have all ended is blocking', () => {
  const result = runSelectionPreflight(input({ today: new Date(2028, 0, 5) }));
  expect(result.ready).toBe(false);
  expect(byId(result, 'season-timing')?.status).toBe('fail');
});

test('a family with no allowance record cannot pick', () => {
  const result = runSelectionPreflight(
    input({ usage: usage().filter((row) => row.family_group !== 'Cook Family') })
  );
  expect(result.ready).toBe(false);
  expect(byId(result, 'allowances-present')?.status).toBe('fail');
  expect(byId(result, 'allowances-present')?.detail).toContain('Cook Family');
});

test('free selection without a hold length or opening time is blocking', () => {
  const result = runSelectionPreflight(
    input({ season: season({ post_rotation_hold_days: 0, post_rotation_open_time: '' }) })
  );
  expect(result.ready).toBe(false);
  expect(byId(result, 'post-rotation')?.status).toBe('fail');
  expect(byId(result, 'post-rotation')?.detail).toContain('hold length');
});

test('free selection with a hold and opening time is ready and says when it opens', () => {
  const result = runSelectionPreflight(input());
  expect(byId(result, 'post-rotation')?.status).toBe('pass');
  expect(byId(result, 'post-rotation')?.detail).toContain('7 days');
});

test('a turn shorter than the configured window is a warning, not a blocker', () => {
  const short = periods().map((p) =>
    p.current_family_group === 'Cook Family'
      ? { ...p, selection_end_date: '2027-11-02' }
      : p
  );
  const result = runSelectionPreflight(input({ periods: short }));
  expect(byId(result, 'turn-length')?.status).toBe('warn');
  expect(byId(result, 'turn-length')?.detail).toContain('Cook Family');
});

test('blank booking limits warn instead of blocking', () => {
  const result = runSelectionPreflight(
    input({ season: season({ min_nights_per_booking: null, max_consecutive_nights_primary: null }) })
  );
  expect(byId(result, 'booking-limits')?.status).toBe('warn');
  expect(result.ready).toBe(true);
});

test('Round 2 marked finished while still pointing at a family warns', () => {
  const result = runSelectionPreflight(
    input({
      secondaryStatus: {
        current_family_group: 'Cook Family',
        started_at: '2027-11-12T18:00:00Z',
        turn_completed: true,
      },
    })
  );
  expect(byId(result, 'secondary-state')?.status).toBe('warn');
});

test('turn dates that cannot be read are blocking', () => {
  const result = runSelectionPreflight(
    input({
      periods: periods().map((p) =>
        p.current_family_group === 'Woolf Family'
          ? { ...p, selection_end_date: null }
          : p
      ),
    })
  );
  expect(result.ready).toBe(false);
  expect(byId(result, 'turn-dates')?.status).toBe('fail');
});

test('dates parse as local calendar days', () => {
  const parsed = parseSeasonDate('2027-10-01');
  expect(parsed?.getFullYear()).toBe(2027);
  expect(parsed?.getMonth()).toBe(9);
  expect(parsed?.getDate()).toBe(1);
  expect(parseSeasonDate(null)).toBeNull();
  expect(parseSeasonDate('not-a-date')).toBeNull();
});
