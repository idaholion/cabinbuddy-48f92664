export interface EditableStay {
  id: string;
  family_group: string;
  start_date: string;
  end_date: string;
  time_period_number?: number | null;
  created_at?: string;
  allocated_start_date?: string | null;
  allocated_end_date?: string | null;
}

export interface EditRoundSettings {
  enable_secondary_selection?: boolean;
  enable_post_rotation_selection?: boolean;
  min_nights_per_booking?: number;
  post_rotation_min_nights?: number;
  post_rotation_max_consecutive_nights?: number | null;
  post_rotation_max_weeks?: number | null;
  max_consecutive_nights_primary?: number;
  max_consecutive_nights_secondary?: number;
  total_nights_allowed_primary?: number;
  total_weeks_allowed_primary?: number;
  total_weeks_allowed_secondary?: number;
  current_primary_turn_family?: string | null;
}

// Calendar-day arithmetic avoids partial-day and daylight-saving rounding errors.
export const stayNights = (start: string, end: string) =>
  Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);

export function addsReservedDates(original: EditableStay, start: string, end: string) {
  return start < original.start_date || end > original.end_date;
}

export function validateReservationEditLimits({ original, start, end, settings, reservations,
  secondaryStartedAt, secondaryCurrentFamily, primaryCurrentFamily,
}: {
  original: EditableStay;
  start: string;
  end: string;
  settings: EditRoundSettings;
  reservations: EditableStay[];
  secondaryStartedAt?: string | null;
  secondaryCurrentFamily?: string | null;
  primaryCurrentFamily?: string | null;
}): string[] {
  const errors: string[] = [];
  const nights = stayNights(start, end);
  if (!Number.isFinite(nights) || nights < 1) return ['Departure must be after arrival.'];
  // Changes which release dates, or only change hosts, cannot claim extra time.
  if (!addsReservedDates(original, start, end)) return errors;
  if (start.slice(0, 4) !== original.start_date.slice(0, 4) || end.slice(0, 4) !== start.slice(0, 4)) {
    return ['An extension must remain in the original selection year. Contact the calendar keeper for a stay across years.'];
  }
  if (original.allocated_start_date && start < original.allocated_start_date) errors.push('Arrival must remain within the assigned dates.');
  if (original.allocated_end_date && end > original.allocated_end_date) errors.push('Departure must remain within the assigned dates.');

  const free = (settings.enable_secondary_selection && settings.enable_post_rotation_selection)
    || (settings.enable_post_rotation_selection && secondaryStartedAt && !secondaryCurrentFamily);
  const phase = free ? 'third' : secondaryStartedAt ? 'second' : 'first';
  const currentFamily = phase === 'second' ? secondaryCurrentFamily : primaryCurrentFamily;
  if (!free && currentFamily !== original.family_group) errors.push('You can add or move reserved dates only during your family’s selection turn.');
  const min = free ? settings.post_rotation_min_nights || 2 : settings.min_nights_per_booking || 2;
  const max = free ? settings.post_rotation_max_consecutive_nights || 14
    : phase === 'second' ? settings.max_consecutive_nights_secondary || 7 : settings.max_consecutive_nights_primary || 14;
  if (nights < min) errors.push(`The stay must be at least ${min} nights.`);
  if (nights > max) errors.push(`A single stay cannot exceed ${max} consecutive nights during ${phase}-round selection.`);

  const familyStays = reservations.filter(r => r.id !== original.id && r.family_group === original.family_group
    && r.start_date.slice(0, 4) === start.slice(0, 4));
  const isSecond = (r: EditableStay) => r.time_period_number === -1;
  const isFirst = (r: EditableStay) => !isSecond(r) && (!secondaryStartedAt || !r.created_at || r.created_at < secondaryStartedAt);
  const roundStays = free ? familyStays : familyStays.filter(phase === 'first' ? isFirst : isSecond);
  // Count the complete edited stay, even if created in an earlier round: repeated
  // one-night extensions must not evade the current allowance. Unused stays count.
  const chargedNights = nights;
  const totalNights = roundStays.reduce((sum, r) => sum + stayNights(r.start_date, r.end_date), 0) + chargedNights;
  const weeks = roundStays.reduce((sum, r) => sum + Math.max(1, Math.round(stayNights(r.start_date, r.end_date) / 7)), 0)
    + Math.max(1, Math.round(chargedNights / 7));
  const weekLimit = free ? settings.post_rotation_max_weeks
    : phase === 'second' ? settings.total_weeks_allowed_secondary || 1 : settings.total_weeks_allowed_primary || 2;
  const nightLimit = phase === 'first' ? settings.total_nights_allowed_primary || 14
    : phase === 'second' ? (settings.total_weeks_allowed_secondary || 1) * 7 : null;
  if (nightLimit && totalNights > nightLimit) errors.push(`This change exceeds your family’s ${nightLimit}-night ${phase}-round allowance.`);
  if (weekLimit && weeks > weekLimit) errors.push(`This change exceeds your family’s ${weekLimit}-selection ${phase}-round allowance.`);
  return errors;
}