/**
 * Annual selection-season readiness check.
 *
 * Pure, read-only projection over already-loaded organization data. It never
 * writes: the caller supplies season, turn, allowance and round-state rows, and
 * this module only reports what is missing, stale or inconsistent.
 */

export type PreflightStatus = "pass" | "warn" | "fail";

export interface PreflightCheck {
  id: string;
  label: string;
  status: PreflightStatus;
  detail: string;
}

export interface PreflightSummary {
  pass: number;
  warn: number;
  fail: number;
}

export interface PreflightResult {
  year: number;
  checks: PreflightCheck[];
  summary: PreflightSummary;
  /** True when nothing blocks the season from opening. */
  ready: boolean;
}

export interface PreflightSeason {
  rotation_year?: number | null;
  rotation_order?: string[] | null;
  selection_days?: number | null;
  max_time_slots?: number | null;
  max_nights?: number | null;
  min_nights_per_booking?: number | null;
  max_consecutive_nights_primary?: number | null;
  max_consecutive_nights_secondary?: number | null;
  enable_secondary_selection?: boolean | null;
  secondary_max_periods?: number | null;
  secondary_selection_days?: number | null;
  enable_post_rotation_selection?: boolean | null;
  post_rotation_hold_days?: number | null;
  post_rotation_open_time?: string | null;
  post_rotation_opens_at?: string | null;
  post_rotation_min_nights?: number | null;
  post_rotation_max_consecutive_nights?: number | null;
  post_rotation_max_weeks?: number | null;
}

export interface PreflightPeriod {
  current_family_group?: string | null;
  selection_start_date?: string | null;
  selection_end_date?: string | null;
  reservations_completed?: boolean | null;
}

export interface PreflightUsage {
  family_group?: string | null;
  time_periods_used?: number | null;
  time_periods_allowed?: number | null;
  secondary_periods_used?: number | null;
  secondary_periods_allowed?: number | null;
  primary_turn_completed?: boolean | null;
  secondary_turn_completed?: boolean | null;
  turn_completed?: boolean | null;
}

export interface PreflightSecondaryStatus {
  current_family_group?: string | null;
  started_at?: string | null;
  turn_completed?: boolean | null;
}

export interface PreflightInput {
  year: number;
  today: Date;
  /** Every family group currently in the organization. */
  familyGroups: string[];
  season: PreflightSeason | null;
  periods: PreflightPeriod[];
  usage: PreflightUsage[];
  secondaryStatus: PreflightSecondaryStatus | null;
}

const MODE_MARKERS = ["static_weeks_mode", "manual_mode"];

/** Parse a plain YYYY-MM-DD value as a local calendar day (no timezone shift). */
export function parseSeasonDate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function inclusiveDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
}

function orderedFamilies(season: PreflightSeason | null): string[] {
  return (season?.rotation_order || []).filter((name) => name && !MODE_MARKERS.includes(name));
}

function check(id: string, label: string, status: PreflightStatus, detail: string): PreflightCheck {
  return { id, label, status, detail };
}

/**
 * Runs every readiness check for one selection season.
 *
 * A "fail" means the season cannot open correctly as configured. A "warn" means
 * it will work but something is worth a look before families start picking.
 */
export function runSelectionPreflight(input: PreflightInput): PreflightResult {
  const { year, today, familyGroups, season, periods, usage, secondaryStatus } = input;
  const checks: PreflightCheck[] = [];
  const todayDay = startOfDay(today);
  const families = orderedFamilies(season);
  const orgFamilies = familyGroups.filter(Boolean);

  // 1. Season record
  if (!season) {
    checks.push(
      check(
        "season-record",
        "Season record",
        "fail",
        `No ${year} season exists yet. Use "Start the ${year} selection season" above.`
      )
    );
    return finish(year, checks);
  }
  checks.push(
    check("season-record", "Season record", "pass", `The ${year} season record exists.`)
  );

  // 2. Family order matches the organization's families
  const missing = orgFamilies.filter((name) => !families.includes(name));
  const unknown = families.filter((name) => !orgFamilies.includes(name));
  const duplicates = families.filter((name, index) => families.indexOf(name) !== index);
  if (missing.length || unknown.length || duplicates.length) {
    const parts: string[] = [];
    if (missing.length) parts.push(`missing: ${missing.join(", ")}`);
    if (unknown.length) parts.push(`not in this organization: ${unknown.join(", ")}`);
    if (duplicates.length) parts.push(`listed twice: ${[...new Set(duplicates)].join(", ")}`);
    checks.push(
      check(
        "family-order",
        "Family order",
        "fail",
        `The ${year} pick order does not match your families (${parts.join("; ")}).`
      )
    );
  } else if (!families.length) {
    checks.push(
      check("family-order", "Family order", "fail", "The pick order is empty.")
    );
  } else {
    checks.push(
      check(
        "family-order",
        "Family order",
        "pass",
        `All ${families.length} families are in the pick order, none duplicated.`
      )
    );
  }

  // 3. Turns scheduled
  if (!periods.length) {
    checks.push(
      check(
        "turns-scheduled",
        "Selection turns",
        "fail",
        `No dated selection turns exist for ${year}. Families would have no assigned window.`
      )
    );
  } else if (families.length && periods.length !== families.length) {
    checks.push(
      check(
        "turns-scheduled",
        "Selection turns",
        "warn",
        `${periods.length} dated turns for ${families.length} families — review for leftovers or gaps.`
      )
    );
  } else {
    checks.push(
      check(
        "turns-scheduled",
        "Selection turns",
        "pass",
        `${periods.length} dated selection turns scheduled.`
      )
    );
  }

  // 4. Turn dates usable
  const parsed = periods.map((period) => ({
    family: period.current_family_group || "Unknown family",
    start: parseSeasonDate(period.selection_start_date),
    end: parseSeasonDate(period.selection_end_date),
  }));
  const broken = parsed.filter((p) => !p.start || !p.end || (p.start && p.end && p.end < p.start));
  if (broken.length) {
    checks.push(
      check(
        "turn-dates",
        "Turn dates",
        "fail",
        `Turn dates are unusable for: ${broken.map((b) => b.family).join(", ")}.`
      )
    );
  } else {
    checks.push(check("turn-dates", "Turn dates", "pass", "Every turn has a start and a later end date."));
  }

  // 5. No overlapping turns
  const usable = parsed
    .filter((p) => p.start && p.end)
    .sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime());
  const overlaps: string[] = [];
  for (let i = 1; i < usable.length; i++) {
    const prev = usable[i - 1];
    const next = usable[i];
    if ((next.start as Date).getTime() < (prev.end as Date).getTime()) {
      overlaps.push(`${prev.family} and ${next.family}`);
    }
  }
  if (overlaps.length) {
    checks.push(
      check(
        "turn-overlaps",
        "Turn overlap",
        "fail",
        `Selection windows overlap: ${overlaps.join("; ")}. One family could be shown another's turn.`
      )
    );
  } else {
    checks.push(check("turn-overlaps", "Turn overlap", "pass", "No selection windows overlap."));
  }

  // 6. Turn lengths vs the configured window
  const expectedDays = Number(season.selection_days ?? 0);
  if (expectedDays > 0 && usable.length) {
    const short = usable.filter(
      (p) => inclusiveDays(p.start as Date, p.end as Date) < expectedDays
    );
    if (short.length) {
      checks.push(
        check(
          "turn-length",
          "Turn length",
          "warn",
          `${short.map((s) => s.family).join(", ")} got less than the ${expectedDays}-day window. Extensions lengthen turns; short ones usually mean a setup mistake.`
        )
      );
    } else {
      checks.push(
        check("turn-length", "Turn length", "pass", `Every turn gives the full ${expectedDays}-day window or longer.`)
      );
    }
  }

  // 7. Season timing
  const firstStart = usable[0]?.start;
  const lastEnd = usable[usable.length - 1]?.end;
  if (firstStart && lastEnd) {
    if (startOfDay(lastEnd).getTime() < todayDay.getTime()) {
      checks.push(
        check(
          "season-timing",
          "Season timing",
          "fail",
          `Every ${year} turn already ended (last ended ${formatDay(lastEnd)}). This looks like an old season.`
        )
      );
    } else if (startOfDay(firstStart).getTime() < todayDay.getTime()) {
      checks.push(
        check(
          "season-timing",
          "Season timing",
          "warn",
          `This season is already running (started ${formatDay(firstStart)}). Readiness is being checked mid-season.`
        )
      );
    } else {
      checks.push(
        check(
          "season-timing",
          "Season timing",
          "pass",
          `First turn opens ${formatDay(firstStart)} — ${Math.round(
            (startOfDay(firstStart).getTime() - todayDay.getTime()) / (1000 * 60 * 60 * 24)
          )} days out.`
        )
      );
    }
  }

  // 8. Allowance records exist for every family
  const usageByFamily = new Map(usage.map((row) => [row.family_group || "", row]));
  const missingUsage = families.filter((name) => !usageByFamily.has(name));
  const extraUsage = usage
    .map((row) => row.family_group || "")
    .filter((name) => name && !families.includes(name));
  if (missingUsage.length) {
    checks.push(
      check(
        "allowances-present",
        "Pick allowances",
        "fail",
        `No allowance record for: ${missingUsage.join(", ")}. Those families cannot pick.`
      )
    );
  } else if (extraUsage.length) {
    checks.push(
      check(
        "allowances-present",
        "Pick allowances",
        "warn",
        `Allowance records exist for families not in the pick order: ${extraUsage.join(", ")}.`
      )
    );
  } else {
    checks.push(
      check("allowances-present", "Pick allowances", "pass", "Every family has an allowance record.")
    );
  }

  // 9. Saved pick limits (a blank or zero limit silently falls back to app defaults)
  const badPrimary = families.filter((name) => {
    const allowed = usageByFamily.get(name)?.time_periods_allowed;
    return allowed === null || allowed === undefined || Number(allowed) < 1;
  });
  if (badPrimary.length) {
    checks.push(
      check(
        "primary-limit",
        "Round 1 allowance",
        "fail",
        `Round 1 pick count is blank or zero for: ${badPrimary.join(", ")}. It would fall back to the app default instead of your setting.`
      )
    );
  } else {
    checks.push(
      check("primary-limit", "Round 1 allowance", "pass", "Round 1 pick counts are saved for every family.")
    );
  }

  // 10. Secondary allowance when Round 2 is turned on
  if (season.enable_secondary_selection) {
    const badSecondary = families.filter((name) => {
      const allowed = usageByFamily.get(name)?.secondary_periods_allowed;
      return allowed === null || allowed === undefined || Number(allowed) < 1;
    });
    if (badSecondary.length) {
      checks.push(
        check(
          "secondary-limit",
          "Round 2 allowance",
          "fail",
          `Round 2 pick count is blank or zero for: ${badSecondary.join(", ")}. Round 2 would fall back to the app default.`
        )
      );
    } else {
      checks.push(
        check("secondary-limit", "Round 2 allowance", "pass", "Round 2 pick counts are saved for every family.")
      );
    }
  }

  // 11. Allowances start clean (nothing carried over from a finished season)
  const seasonStarted = firstStart ? startOfDay(firstStart).getTime() <= todayDay.getTime() : false;
  if (!seasonStarted && usage.length) {
    const dirty = usage.filter(
      (row) =>
        Number(row.time_periods_used || 0) > 0 ||
        Number(row.secondary_periods_used || 0) > 0 ||
        row.primary_turn_completed === true ||
        row.secondary_turn_completed === true ||
        row.turn_completed === true
    );
    if (dirty.length) {
      checks.push(
        check(
          "allowances-clean",
          "Fresh counters",
          "fail",
          `Turns have not opened yet, but picks or Done are already recorded for: ${dirty
            .map((row) => row.family_group || "unknown")
            .join(", ")}. This is leftover state from another season.`
        )
      );
    } else {
      checks.push(
        check("allowances-clean", "Fresh counters", "pass", "All pick counts start at zero with nothing marked Done.")
      );
    }
  }

  // 12. Round 2 state
  if (season.enable_secondary_selection) {
    if (!secondaryStatus) {
      checks.push(
        check(
          "secondary-state",
          "Round 2 state",
          "warn",
          "Round 2 state is created when Round 1 finishes. If Round 1 is already over, this needs attention."
        )
      );
    } else if (secondaryStatus.turn_completed && secondaryStatus.current_family_group) {
      checks.push(
        check(
          "secondary-state",
          "Round 2 state",
          "warn",
          "Round 2 is marked finished but still points at a family — review before the next season."
        )
      );
    } else {
      checks.push(check("secondary-state", "Round 2 state", "pass", "Round 2 state is consistent."));
    }
  }

  // 13. Post-rotation hold settings
  if (season.enable_post_rotation_selection) {
    const holdDays = Number(season.post_rotation_hold_days ?? 0);
    const openTime = (season.post_rotation_open_time || "").trim();
    const problems: string[] = [];
    if (holdDays < 1) problems.push("the hold length is blank or zero");
    if (!openTime) problems.push("no opening time is set");
    if (problems.length) {
      checks.push(
        check(
          "post-rotation",
          "Free selection",
          "fail",
          `Free selection is on but ${problems.join(" and ")}. Update Post Rotation Selection before Round 2 ends.`
        )
      );
    } else {
      checks.push(
        check(
          "post-rotation",
          "Free selection",
          "pass",
          `Calendar holds ${holdDays} days after Round 2, then opens at ${openTime}.${
            season.post_rotation_opens_at ? "" : " The exact opening moment is scheduled automatically when Round 2 finishes."
          }`
        )
      );
    }
  }

  // 14. Booking limits worth a look
  const minNights = Number(season.min_nights_per_booking ?? 0);
  const maxConsecutive = Number(season.max_consecutive_nights_primary ?? 0);
  const limitNotes: string[] = [];
  if (minNights < 1) limitNotes.push("minimum nights is blank or zero");
  if (maxConsecutive < 1) limitNotes.push("maximum consecutive nights is blank or zero");
  if (limitNotes.length) {
    checks.push(
      check(
        "booking-limits",
        "Booking limits",
        "warn",
        `${limitNotes.join(" and ")} — bookings will fall back to app defaults.`
      )
    );
  } else {
    checks.push(
      check(
        "booking-limits",
        "Booking limits",
        "pass",
        `Minimum ${minNights} night${minNights === 1 ? "" : "s"} per booking, up to ${maxConsecutive} consecutive nights.`
      )
    );
  }

  return finish(year, checks);
}

function formatDay(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function finish(year: number, checks: PreflightCheck[]): PreflightResult {
  const summary: PreflightSummary = {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
  };
  return { year, checks, summary, ready: summary.fail === 0 };
}
