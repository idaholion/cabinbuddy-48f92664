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