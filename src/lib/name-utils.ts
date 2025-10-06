/**
 * Name utility functions for consistent name handling throughout the app
 */

export interface NameParts {
  firstName: string;
  lastName: string;
  displayName: string;
}

/**
 * Parse a full name into first name, last name, and display name
 * Automatically sanitizes the input by trimming and removing extra spaces
 */
export const parseFullName = (fullName: string): NameParts => {
  const sanitized = sanitizeName(fullName);
  if (!sanitized) {
    return { firstName: '', lastName: '', displayName: '' };
  }

  const parts = sanitized.split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  const displayName = sanitized;

  return { firstName, lastName, displayName };
};

/**
 * Format first and last name into a display name
 */
export const formatFullName = (firstName: string, lastName: string): string => {
  return [firstName, lastName].filter(Boolean).join(' ').trim();
};

/**
 * Get initials from a name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .join('')
    .substring(0, 3); // Limit to 3 characters for display
};

/**
 * Sanitize a name by trimming and removing extra whitespace
 */
export const sanitizeName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

/**
 * Normalize a name for comparison (lowercase, trimmed, no extra spaces)
 */
export const normalizeName = (name: string): string => {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
};

/**
 * Check if two names match (fuzzy matching)
 */
export const namesMatch = (name1: string, name2: string): boolean => {
  if (!name1 || !name2) return false;
  
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Check if one name is contained within the other (for partial matches)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  // Check if first names match (for cases where last names might differ)
  const parts1 = normalized1.split(' ');
  const parts2 = normalized2.split(' ');
  
  if (parts1[0] && parts2[0] && parts1[0] === parts2[0]) {
    return true;
  }
  
  return false;
};

/**
 * Validate that a name has both first and last name parts
 */
export const validateFullName = (name: string): boolean => {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  return parts.length >= 2 && parts.every(part => part.length > 0);
};

/**
 * Format a name for display with proper capitalization
 */
export const formatNameForDisplay = (name: string): string => {
  return name
    .trim()
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};