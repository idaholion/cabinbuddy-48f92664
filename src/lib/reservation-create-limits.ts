import { freeSelectionState, formatOpening, type HoldSettings } from './post-rotation-hold';
import { stayNights, type EditableStay, type EditRoundSettings } from './reservation-edit-limits';

export interface BookingSettings extends EditRoundSettings, HoldSettings {
  rotation_year: number;
  max_time_slots?: number;
  secondary_max_periods?: number;
}

export function resolveBookingTurn(settings: BookingSettings, secondary?: { started_at?: string | null; current_family_group?: string | null } | null, now = new Date()): { phase: 'primary' | 'secondary' | 'post_rotation' | 'post_rotation_hold'; family: string | null; opensAt?: Date | null } {
  // An explicit active primary turn always wins, even if both later rounds
  // are enabled. Using all picks never hands the turn to another family.
  if (settings.current_primary_turn_family) return { phase: 'primary' as const, family: settings.current_primary_turn_family };
  if (secondary?.current_family_group) return { phase: 'secondary' as const, family: secondary.current_family_group };
  if (settings.enable_post_rotation_selection && secondary?.started_at) {
    const free = freeSelectionState(settings, secondary, now);
    if (free.state === 'locked') return { phase: 'post_rotation_hold' as const, family: null, opensAt: free.opensAt };
    if (free.state === 'awaiting_date') return { phase: 'post_rotation_hold' as const, family: null, opensAt: null };
    return { phase: 'post_rotation' as const, family: null };
  }
  return { phase: 'primary' as const, family: null };
}

export function validateReservationCreation({ start, end, family, settings, secondary, reservations, privileged = false }: {
  start: string; end: string; family: string; settings: BookingSettings;
  secondary?: { started_at?: string | null; current_family_group?: string | null } | null;
  reservations: (EditableStay & { status?: string })[]; privileged?: boolean;
}) {
  const errors: string[] = [];
  const nights = stayNights(start, end);
  if (!Number.isFinite(nights) || nights < 1) return ['Departure must be after arrival.'];
  if (Number(start.slice(0, 4)) !== settings.rotation_year) return ['Selection settings do not match the booking year. Please try again.'];
  const turn = resolveBookingTurn(settings, secondary);
  if (!privileged && turn.phase === 'post_rotation_hold') {
    errors.push(turn.opensAt ? `Free selection opens ${formatOpening(turn.opensAt)}. The calendar is on hold until then so every family has an equal chance.` : 'Free selection has not opened yet. The calendar keeper will announce the opening date.');
  } else if (!privileged && turn.phase !== 'post_rotation' && turn.family !== family) {
    errors.push(turn.family ? `It is ${turn.family}’s selection turn for ${settings.rotation_year}. Please wait until your family’s turn.` : `Selection is not open for your family for ${settings.rotation_year}. Contact the calendar keeper.`);
  }
  const free = turn.phase === 'post_rotation' || turn.phase === 'post_rotation_hold';
  const second = turn.phase === 'secondary';
  const min = free ? settings.post_rotation_min_nights || 2 : settings.min_nights_per_booking || 2;
  const max = free ? settings.post_rotation_max_consecutive_nights || 14 : second ? settings.max_consecutive_nights_secondary || 7 : settings.max_consecutive_nights_primary || 14;
  if (nights < min) errors.push(`The stay must be at least ${min} nights.`);
  if (nights > max) errors.push(`A single stay cannot exceed ${max} consecutive nights.`);
  const stays = reservations.filter(r => r.family_group === family && r.status !== 'cancelled' && Number(r.start_date.slice(0, 4)) === settings.rotation_year
    && (free || (second ? r.time_period_number === -1 : r.time_period_number !== -1 && (!secondary?.started_at || !r.created_at || r.created_at < secondary.started_at))));
  const total = stays.reduce((sum, r) => sum + stayNights(r.start_date, r.end_date), nights);
  const picks = stays.reduce((sum, r) => sum + Math.max(1, Math.round(stayNights(r.start_date, r.end_date) / 7)), Math.max(1, Math.round(nights / 7)));
  const weekLimit = free ? settings.post_rotation_max_weeks : second ? settings.total_weeks_allowed_secondary || settings.secondary_max_periods || 1 : settings.total_weeks_allowed_primary || settings.max_time_slots || 2;
  const nightLimit = free ? null : second ? (weekLimit || 1) * 7 : settings.total_nights_allowed_primary || 14;
  if (nightLimit && total > nightLimit) errors.push(`This booking exceeds your family’s ${nightLimit}-night allowance.`);
  if (weekLimit && picks > weekLimit) errors.push(`This booking exceeds your family’s ${weekLimit}-selection allowance.`);
  return errors;
}