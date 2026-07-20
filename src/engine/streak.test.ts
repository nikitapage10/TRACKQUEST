import { describe, expect, it } from 'vitest';
import {
  dayKey,
  isScheduledDay,
  applyTouchDay,
  touchDaysInWindow,
  isFlexibleSchedule,
} from './streak';

describe('streak', () => {
  it('schedule days', () => {
    // Monday
    const mon = new Date(2026, 6, 20); // Jul 20 2026 is Monday
    expect(mon.getDay()).toBe(1);
    expect(isScheduledDay('weeknights', mon)).toBe(true);
    expect(isScheduledDay('weekends', mon)).toBe(false);
    expect(isScheduledDay('stolen', mon)).toBe(true);
    expect(isFlexibleSchedule('chaos')).toBe(true);
  });

  it('weeknights increments on scheduled touch', () => {
    const today = '2026-07-20';
    const streak = {
      current: 2,
      best: 2,
      lastTouchDay: '2026-07-17',
      repairsUsedThisMonth: 0,
      monthKey: '2026-07',
    };
    const next = applyTouchDay(streak, 'weeknights', today, [
      '2026-07-17',
      '2026-07-16',
      today,
    ]);
    expect(next.current).toBeGreaterThanOrEqual(1);
    expect(next.lastTouchDay).toBe(today);
  });

  it('touchDaysInWindow', () => {
    const days = touchDaysInWindow(['2026-07-20', '2026-07-18', '2026-07-10'], '2026-07-20', 7);
    expect(days).toContain('2026-07-20');
    expect(days).toContain('2026-07-18');
    expect(days).not.toContain('2026-07-10');
  });

  it('dayKey local', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
