/**
 * Date utility functions for handling date-only strings (YYYY-MM-DD)
 * These utilities prevent timezone shifting issues when parsing dates from the database
 */

/**
 * Safely parse a date-only string (YYYY-MM-DD) as local midnight
 * Prevents timezone shifting issues that occur when new Date() interprets
 * date-only strings as UTC midnight, causing dates to appear one day earlier
 * in timezones west of UTC.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight in the local timezone
 */
export function parseDateOnly(dateString: string | null | undefined): Date {
  if (!dateString) return new Date();
  // Add T00:00:00 to force local timezone interpretation instead of UTC
  return new Date(dateString + 'T00:00:00');
}

/**
 * Calculate the number of nights between two date-only strings
 * Uses parseDateOnly to ensure accurate calculation without timezone shifts
 * 
 * @param startDate - Start date string in YYYY-MM-DD format
 * @param endDate - End date string in YYYY-MM-DD format
 * @returns Number of nights between the dates
 */
export function calculateNights(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Convert a Date object to a date-only string (YYYY-MM-DD)
 * Safe for database storage
 * 
 * @param date - Date object to convert
 * @returns Date string in YYYY-MM-DD format
 */
export function toDateOnlyString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Check if a date is in the past (before today)
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns true if the date is before today
 */
export function isPastDate(dateString: string): boolean {
  const date = parseDateOnly(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date is in the future (after today)
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns true if the date is after today
 */
export function isFutureDate(dateString: string): boolean {
  const date = parseDateOnly(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}
