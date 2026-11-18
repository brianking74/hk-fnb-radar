import { describe, expect, it } from 'vitest';
import { addDaysISO, daysBetween, hktToday } from '../src/worker/util/dates';

describe('hktToday', () => {
  it('rolls over to the Hong Kong date at 16:00 UTC (midnight HKT)', () => {
    const utcBeforeMidnightHK = new Date('2026-11-17T15:59:00Z');
    expect(hktToday(utcBeforeMidnightHK)).toBe('2026-11-17');

    const utcAfterMidnightHK = new Date('2026-11-17T16:00:00Z');
    expect(hktToday(utcAfterMidnightHK)).toBe('2026-11-18');
  });
});

describe('addDaysISO', () => {
  it('adds days across month boundaries', () => {
    expect(addDaysISO('2026-11-18', 90)).toBe('2027-02-16');
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('handles negative days', () => {
    expect(addDaysISO('2026-11-18', -7)).toBe('2026-11-11');
  });
});

describe('daysBetween', () => {
  it('counts whole days forward', () => {
    expect(daysBetween('2026-11-18', '2026-12-04')).toBe(16);
  });

  it('is negative into the past', () => {
    expect(daysBetween('2026-11-18', '2026-11-11')).toBe(-7);
  });
});
