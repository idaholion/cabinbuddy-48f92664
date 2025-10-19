/**
 * Date utility functions for handling date-only strings (YYYY-MM-DD)
 * These utilities prevent timezone shifting issues when parsing dates from the database
 * 
 * CRITICAL: Always use parseDateOnly() when converting database date strings to Date objects.
 * Never use new Date(dateString) directly on YYYY-MM-DD strings!
 * 
 * Why? Database date fields are stored as "YYYY-MM-DD" strings.
 * new Date("2025-10-06") interprets this as UTC midnight, which shifts to the previous day
 * in timezones west of UTC (e.g., America/New_York shows Oct 5 instead of Oct 6).
 * 
 * Pattern to follow:
 * ❌ BAD:  new Date(reservation.start_date)
 * ✅ GOOD: parseDateOnly(reservation.start_date)
 */

import { DateOnlyString } from '@/types/date-types';

/**
 * Safely parse a date-only string (YYYY-MM-DD) as local noon (12:00:00)
 * This is used for check-in/check-out times to represent Friday noon to Friday noon bookings
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing noon in the local timezone
 */
export function parseDateAtNoon(dateString: string | DateOnlyString | null | undefined): Date {
  if (!dateString) return new Date();
  // Add T12:00:00 to force local noon interpretation
  return new Date(dateString + 'T12:00:00');
}

/**
 * Safely parse a date-only string (YYYY-MM-DD) as local midnight
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object representing midnight in the local timezone
 * 
 * @example
 * // Correct usage
 * const checkIn = parseDateOnly(reservation.start_date);
 * const checkOut = parseDateOnly(reservation.end_date);
 * 
 * // Display
 * checkIn.toLocaleDateString(); // Shows correct date
 */
export function parseDateOnly(dateString: string | DateOnlyString | null | undefined): Date {
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
/**
 * Calculate the number of nights between two date strings
 * Only counts nights spent (excludes checkout day)
 */
export function calculateNights(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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
