// Utility functions for reservation data handling

// Helper function to get the primary host's first name from a reservation
export const getHostFirstName = (reservation: any): string => {
  // Check if there are host assignments and get the primary host (first one)
  if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
    const primaryHost = reservation.host_assignments[0];
    if (primaryHost?.host_name) {
      // Extract first name (everything before the first space)
      return primaryHost.host_name.split(' ')[0];
    }
  }
  
  // Fallback to family group name if no host assignments
  return reservation.family_group || 'Unknown';
};

// Helper function to get the primary host's full name from a reservation
export const getHostFullName = (reservation: any): string => {
  if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
    const primaryHost = reservation.host_assignments[0];
    if (primaryHost?.host_name) {
      return primaryHost.host_name;
    }
  }
  return reservation.family_group || 'Unknown';
};

// Get the family group name from host assignments or fallback to family_group field
export const getEffectiveFamilyGroup = (reservation: any): string => {
  // If there are host assignments, try to determine family group from the host
  if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
    const primaryHost = reservation.host_assignments[0];
    if (primaryHost?.host_name) {
      // For now, return the full name as family identifier
      // This could be enhanced to map host names to family groups
      return primaryHost.host_name;
    }
  }
  
  // Fallback to the family_group field
  return reservation.family_group || 'Unknown';
};

// Get the first name from a full name string
export const getFirstNameFromFullName = (fullName: string): string => {
  if (!fullName) return 'Guest';
  // Extract first name (everything before the first space)
  return fullName.split(' ')[0];
};

// ---- Consecutive stay helpers (notification layer only) ----
// Two back-to-back reservations are treated as ONE continuous visit only when
// the SAME primary host is listed on both. Different hosts = separate visits.

export const getPrimaryHostKey = (reservation: any): string => {
  const assignments = Array.isArray(reservation?.host_assignments) ? reservation.host_assignments : [];
  const primary = assignments[0];
  const email = typeof primary?.host_email === 'string' ? primary.host_email.trim().toLowerCase() : '';
  if (email) return `email:${email}`;
  const name = typeof primary?.host_name === 'string' ? primary.host_name.trim().toLowerCase() : '';
  if (name) return `name:${name}`;
  return `fg:${String(reservation?.family_group || '').trim().toLowerCase()}`;
};

const isActiveReservation = (r: any): boolean => !r?.status || r.status === 'confirmed';

/** True when the same host is already at the cabin the day this reservation starts. */
export const isContinuationOfPreviousStay = (reservation: any, all: any[]): boolean => {
  const key = getPrimaryHostKey(reservation);
  return (all || []).some(
    (o) => o && o.id !== reservation.id && isActiveReservation(o) &&
      o.end_date === reservation.start_date && getPrimaryHostKey(o) === key
  );
};

/** True when the same host stays on past this reservation's end date. */
export const hasConsecutiveNextStay = (reservation: any, all: any[]): boolean => {
  const key = getPrimaryHostKey(reservation);
  return (all || []).some(
    (o) => o && o.id !== reservation.id && isActiveReservation(o) &&
      o.start_date === reservation.end_date && getPrimaryHostKey(o) === key
  );
};

/** Walk forward through back-to-back stays by the same host and return the true final end date. */
export const getChainedEndDate = (reservation: any, all: any[]): string => {
  const key = getPrimaryHostKey(reservation);
  let end = reservation.end_date;
  const seen = new Set<string>([reservation.id]);
  for (let i = 0; i < 52; i++) {
    const next = (all || []).find(
      (o) => o && !seen.has(o.id) && isActiveReservation(o) &&
        o.start_date === end && getPrimaryHostKey(o) === key
    );
    if (!next) break;
    seen.add(next.id);
    end = next.end_date;
  }
  return end;
};

// Get the primary host's email from host assignments
export const getHostEmail = (reservation: any): string => {
  // Check if there are host assignments and get the primary host's email
  if (reservation.host_assignments && Array.isArray(reservation.host_assignments) && reservation.host_assignments.length > 0) {
    const primaryHost = reservation.host_assignments[0];
    if (primaryHost?.host_email) {
      return primaryHost.host_email;
    }
  }
  
  return '';
};