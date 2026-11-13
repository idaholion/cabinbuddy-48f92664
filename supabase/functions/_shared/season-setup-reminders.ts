// Pure decision logic for the yearly "set up the selection season" reminders
// sent to the Admin and calendar keeper. No I/O, so it is shared by the daily
// job and its tests.

export type SetupReminderKind = "first" | "final";

export interface SetupReminderInput {
  daysUntilStart: number; // whole days from today until the first turn opens
  firstReminderDays: number; // e.g. 14
  finalReminderDays: number; // e.g. 2
  seasonAlreadySetUp: boolean;
  alreadySent: SetupReminderKind[]; // reminders already delivered for this season
}

/** Which reminder (if any) should go out today. Never more than one per day. */
export function setupReminderToSend(input: SetupReminderInput): SetupReminderKind | null {
  const { daysUntilStart, seasonAlreadySetUp, alreadySent } = input;
  if (seasonAlreadySetUp || daysUntilStart < 0) return null;
  const first = Math.max(0, Math.round(input.firstReminderDays));
  const final = Math.max(0, Math.round(input.finalReminderDays));

  if (final > 0 && daysUntilStart <= final) {
    return alreadySent.includes("final") ? null : "final";
  }
  if (first > 0 && daysUntilStart <= first) {
    return alreadySent.includes("first") ? null : "first";
  }
  return null;
}

/** notification_log type used to remember a delivered reminder for a season. */
export const setupReminderType = (kind: SetupReminderKind, targetYear: number) =>
  `season_setup_reminder_${kind}_${targetYear}`;
