import { describe, expect, test } from "bun:test";
import { setupReminderToSend } from "../../supabase/functions/_shared/season-setup-reminders";

const base = { firstReminderDays: 14, finalReminderDays: 2, seasonAlreadySetUp: false, alreadySent: [] as ("first" | "final")[] };

describe("season setup reminders", () => {
  test("nothing before 14 days out", () => {
    expect(setupReminderToSend({ ...base, daysUntilStart: 15 })).toBeNull();
  });
  test("first reminder at 14 days out", () => {
    expect(setupReminderToSend({ ...base, daysUntilStart: 14 })).toBe("first");
  });
  test("first reminder is sent only once", () => {
    expect(setupReminderToSend({ ...base, daysUntilStart: 10, alreadySent: ["first"] })).toBeNull();
  });
  test("final reminder at 2 days out", () => {
    expect(setupReminderToSend({ ...base, daysUntilStart: 2, alreadySent: ["first"] })).toBe("final");
  });
  test("final reminder skipped when Admin already set up the season", () => {
    expect(setupReminderToSend({ ...base, daysUntilStart: 2, seasonAlreadySetUp: true, alreadySent: ["first"] })).toBeNull();
  });
});
