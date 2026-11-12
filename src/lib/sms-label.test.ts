import { describe, expect, test } from 'bun:test';
import { SMS_APP_LABEL, withAppLabel } from '../../supabase/functions/_shared/sms-label.ts';

describe('text message label', () => {
  test('puts the app label on the first line', () => {
    const text = withAppLabel('2027 free selection opens Friday, Nov 20 at 7:00 PM');
    expect(text.split('\n')[0]).toBe('Cabin Buddy!');
    expect(text.split('\n')[1]).toBe('2027 free selection opens Friday, Nov 20 at 7:00 PM');
  });

  test('does not stack a second label when one is already there', () => {
    const once = withAppLabel('Your turn to select starts now.');
    expect(withAppLabel(once)).toBe(once);
    expect(withAppLabel('  ' + SMS_APP_LABEL + '\nalready labelled')).toBe(
      '  ' + SMS_APP_LABEL + '\nalready labelled',
    );
  });

  test('leaves the rest of the message untouched', () => {
    const body = 'Hi Dana!\n\nCheck-in: 10/24/2026.\n- Woolf Family';
    expect(withAppLabel(body)).toBe('Cabin Buddy!\n' + body);
  });
});
