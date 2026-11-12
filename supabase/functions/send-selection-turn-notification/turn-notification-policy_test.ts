import { assertEquals } from 'https://deno.land/std@0.190.0/testing/asserts.ts';
import { getTurnNotificationPolicy } from './turn-notification-policy.ts';

for (const family of ['Cook Family', 'Woolf Family', 'Poznanovich Family']) {
  Deno.test(`${family}: completed primary turn does not block active secondary notice`, () => {
    assertEquals(getTurnNotificationPolicy(family, {
      started_at: '2026-11-09T03:52:56Z', current_family_group: family, turn_completed: false,
    }, true), { secondaryPhase: true, skip: false });
  });
}
Deno.test('waiting secondary family is not notified before handoff', () => {
  assertEquals(getTurnNotificationPolicy('Woolf Family', {
    started_at: '2026-11-09T03:52:56Z', current_family_group: 'Cook Family', turn_completed: false,
  }, true).skip, true);
});
Deno.test('completed secondary turn is not notified', () => {
  assertEquals(getTurnNotificationPolicy('Cook Family', {
    started_at: '2026-11-09T03:52:56Z', current_family_group: 'Cook Family', turn_completed: true,
  }, false).skip, true);
});
Deno.test('finished secondary round does not fall back to primary', () => {
  assertEquals(getTurnNotificationPolicy('Cook Family', {
    started_at: '2026-11-09T03:52:56Z', current_family_group: null, turn_completed: true,
  }, false).skip, true);
});
Deno.test('primary completion still blocks primary notification', () => {
  assertEquals(getTurnNotificationPolicy('Cook Family', null, true).skip, true);
});
Deno.test('unstarted secondary placeholder does not hide active primary turn', () => {
  assertEquals(getTurnNotificationPolicy('Cook Family', {
    started_at: null, current_family_group: null, turn_completed: false,
  }, false), { secondaryPhase: false, skip: false });
});

Deno.test('independent secondary Done blocks a notice even if its pointer is stale', () => {
  assertEquals(getTurnNotificationPolicy('Cook Family', {
    started_at: '2026-11-09T03:52:56Z', current_family_group: 'Cook Family', turn_completed: false,
  }, true, true).skip, true);
});
Deno.test('primary notice only belongs to the saved active family', () => {
  assertEquals(getTurnNotificationPolicy('Cook Family', null, false, false, 'Woolf Family').skip, true);
  assertEquals(getTurnNotificationPolicy('Woolf Family', null, false, false, 'Woolf Family').skip, false);
});