/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { resolveFamilyRole } from './family-role-identity';
import { validateReservationCreation } from './reservation-create-limits';

const groups = [
  { name: 'Other Family', lead_name: 'Tina', lead_email: 'login@example.test', host_members: [] },
  { name: 'Comeau Family', lead_name: 'Tina Comeau', lead_email: 'contact@example.test', host_members: [
    { name: 'Tina Comeau', user_id: 'tina-account', email: 'contact@example.test', canHost: true },
    { name: 'Family Delegate', user_id: 'delegate-account', canEditReservations: true },
  ] },
];
const claim = { family_group_name: 'Comeau Family', member_name: 'Tina Comeau', member_type: 'group_lead' as const };

describe('Saved family identity for selection', () => {
  test('Tina’s saved claim wins over a different login email and conflicting name match', () => {
    const role = resolveFamilyRole(groups, { id: 'tina-account', email: 'login@example.test', name: 'Tina' }, claim);
    expect(role.group?.name).toBe('Comeau Family');
    expect(role.isLead).toBe(true);
  });
  test('linked account wins over an earlier family’s email match without a claim', () => {
    expect(resolveFamilyRole(groups, { id: 'tina-account', email: 'login@example.test' }).group?.name).toBe('Comeau Family');
  });
  test('a claimed delegate retains their own permissions rather than lead rights', () => {
    const role = resolveFamilyRole(groups, { id: 'delegate-account' }, { ...claim, member_name: 'Family Delegate', member_type: 'host_member' });
    expect(role.isLead).toBe(false);
    expect(role.member?.canEditReservations).toBe(true);
  });
  test('claims outside the loaded organization cannot fall back into another family', () => {
    expect(resolveFamilyRole(groups, { email: 'login@example.test' }, { ...claim, family_group_name: 'Not in this organization' }).group).toBeNull();
  });
  test('View as Tina resolves the target account instead of the admin’s own claim', () => {
    const role = resolveFamilyRole(groups, { id: 'tina-account', email: 'contact@example.test', name: 'Tina Comeau' }, null);
    expect(role.group?.name).toBe('Comeau Family');
    expect(role.isLead).toBe(true);
  });
  test('recognized Tina can book a third week during her saved 2027 secondary turn', () => {
    const role = resolveFamilyRole(groups, { id: 'tina-account', email: 'login@example.test' }, claim);
    expect(validateReservationCreation({
      start: '2027-08-13', end: '2027-08-20', family: role.group?.name || '',
      settings: { rotation_year: 2027, current_primary_turn_family: null, enable_secondary_selection: true, secondary_max_periods: 1 },
      secondary: { started_at: '2026-11-01', current_family_group: 'Comeau Family' },
      reservations: [{ id: 'primary', family_group: 'Comeau Family', start_date: '2027-07-02', end_date: '2027-07-16', selection_round: 'primary' }],
    })).toEqual([]);
  });
});