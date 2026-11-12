// Every automated text message starts with this line so recipients can tell
// right away that it came from Cabin Buddy instead of a marketing blast.
export const SMS_APP_LABEL = "Cabin Buddy!";

/**
 * Prefix a text message with the app label, unless it already carries one
 * (keeps retries and calendar-keeper copies from stacking duplicate headers).
 */
export function withAppLabel(message: string): string {
  const text = message ?? "";
  if (text.trimStart().startsWith(SMS_APP_LABEL)) return text;
  return `${SMS_APP_LABEL}\n${text}`;
}
