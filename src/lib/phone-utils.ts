/**
 * Formats a phone number string to (xxx) xxx-xxxx format
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Apply formatting based on length
  if (digits.length <= 3) {
    return digits;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

/**
 * Strips formatting from phone number to get raw digits
 */
export function unformatPhoneNumber(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Validates if a phone number is complete (10 digits)
 */
export function isValidPhoneNumber(value: string): boolean {
  const digits = unformatPhoneNumber(value);
  return digits.length === 10;
}