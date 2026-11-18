import { describe, expect, test } from 'bun:test';
import { RECENT_RELEASE_COUNT, splitChangelog, type ChangelogEntry } from './changelog';

const entry = (version: string): ChangelogEntry => ({ version, date: '2026-11-18', sections: [] });

describe('changelog recent/older split', () => {
  test('keeps the three newest releases in the default view', () => {
    const entries = ['2.5.0', '2.4.1', '2.4.0', '2.3.9', '2.3.8'].map(entry);
    const { recent, older } = splitChangelog(entries);
    expect(RECENT_RELEASE_COUNT).toBe(3);
    expect(recent.map((e) => e.version)).toEqual(['2.5.0', '2.4.1', '2.4.0']);
    expect(older.map((e) => e.version)).toEqual(['2.3.9', '2.3.8']);
  });

  test('hides the older-updates button when there are three or fewer releases', () => {
    const { recent, older } = splitChangelog(['2.4.1', '2.4.0'].map(entry));
    expect(recent.map((e) => e.version)).toEqual(['2.4.1', '2.4.0']);
    expect(older).toEqual([]);
  });

  test('shows the button as soon as a fourth release exists', () => {
    const { older } = splitChangelog(['2.4.1', '2.4.0', '2.3.9', '2.3.8'].map(entry));
    expect(older.map((e) => e.version)).toEqual(['2.3.8']);
  });
});
