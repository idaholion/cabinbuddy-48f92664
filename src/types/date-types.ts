/**
 * Branded type for date-only strings (YYYY-MM-DD format)
 * This helps TypeScript catch cases where we might accidentally use new Date() directly
 */
export type DateOnlyString = string & { readonly __brand: 'DateOnlyString' };

/**
 * Type guard to check if a string is in YYYY-MM-DD format
 */
export function isDateOnlyString(str: string): str is DateOnlyString {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

/**
 * Convert a regular string to a DateOnlyString (with runtime validation)
 */
export function toDateOnlyString(str: string): DateOnlyString {
  if (!isDateOnlyString(str)) {
    throw new Error(`Invalid date format: ${str}. Expected YYYY-MM-DD`);
  }
  return str;
}

/**
 * Database field types that should be handled with parseDateOnly
 */
export interface DateOnlyFields {
  start_date: DateOnlyString;
  end_date: DateOnlyString;
  check_date: DateOnlyString;
  date: DateOnlyString;
  requested_start_date: DateOnlyString;
  requested_end_date: DateOnlyString;
  allocated_start_date: DateOnlyString;
  allocated_end_date: DateOnlyString;
  issue_date: DateOnlyString;
  due_date: DateOnlyString;
  paid_date: DateOnlyString;
}
