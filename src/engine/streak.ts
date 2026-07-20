import type { Schedule, StreakState } from '../types';

export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isoWeekKey(d = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    );
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function isScheduledDay(schedule: Schedule, d = new Date()): boolean {
  const dow = d.getDay(); // 0 Sun … 6 Sat
  if (schedule === 'weeknights') return dow >= 1 && dow <= 5;
  if (schedule === 'weekends') return dow === 0 || dow === 6;
  return true; // stolen / chaos — all days "scheduled" but different break rules
}

export function isFlexibleSchedule(schedule: Schedule): boolean {
  return schedule === 'stolen' || schedule === 'chaos';
}

/** Returns touch days in trailing window as YYYY-MM-DD set */
export function touchDaysInWindow(
  touchDays: string[],
  endKey: string,
  windowDays: number,
): string[] {
  const end = parseDay(endKey);
  const set = new Set(touchDays);
  const out: string[] = [];
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    if (set.has(k)) out.push(k);
  }
  return out;
}

function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function previousDay(key: string): string {
  const d = parseDay(key);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/**
 * Apply a touch on `today`. Mutates conceptually — returns new streak state.
 * touchDayKeys = historical list of days that counted (caller maintains).
 */
export function applyTouchDay(
  streak: StreakState,
  schedule: Schedule,
  today: string,
  recentTouchDays: string[], // includes today already or not
): StreakState {
  const mk = monthKey(parseDay(today));
  let repairs = streak.repairsUsedThisMonth;
  if (streak.monthKey !== mk) {
    repairs = 0;
  }

  if (streak.lastTouchDay === today) {
    return { ...streak, monthKey: mk, repairsUsedThisMonth: repairs };
  }

  const allTouches = Array.from(new Set([...recentTouchDays, today]));

  if (isFlexibleSchedule(schedule)) {
    const in7 = touchDaysInWindow(allTouches, today, 7);
    let current = streak.current;
    if (in7.length >= 3) {
      // increment if today is new qualifying touch
      current = streak.lastTouchDay === today ? current : current + 1;
    } else if (in7.length < 3 && streak.current > 0) {
      // would break — caller handles repair offer; here we still set lastTouchDay
      current = 1; // today starts fresh chain contribution
    } else {
      current = Math.max(1, in7.length);
    }
    return {
      current,
      best: Math.max(streak.best, current),
      lastTouchDay: today,
      repairsUsedThisMonth: repairs,
      monthKey: mk,
    };
  }

  // weeknights / weekends
  if (!isScheduledDay(schedule, parseDay(today))) {
    // neutral day — record touch but don't change streak count
    return {
      ...streak,
      lastTouchDay: today,
      monthKey: mk,
      repairsUsedThisMonth: repairs,
    };
  }

  // scheduled day touch
  let current = 1;
  if (streak.lastTouchDay) {
    // count consecutive scheduled touch days
    current = countConsecutiveScheduled(allTouches, schedule, today);
  }

  return {
    current,
    best: Math.max(streak.best, current),
    lastTouchDay: today,
    repairsUsedThisMonth: repairs,
    monthKey: mk,
  };
}

function countConsecutiveScheduled(
  touchDays: string[],
  schedule: Schedule,
  today: string,
): number {
  const set = new Set(touchDays);
  let count = 0;
  let cursor = today;
  for (let i = 0; i < 400; i++) {
    const d = parseDay(cursor);
    if (isScheduledDay(schedule, d)) {
      if (!set.has(cursor)) break;
      count++;
    }
    cursor = previousDay(cursor);
  }
  return count;
}

/** Detect if streak would break given no touch today on a scheduled day */
export function wouldBreak(
  streak: StreakState,
  schedule: Schedule,
  today: string,
  recentTouchDays: string[],
): boolean {
  if (streak.current <= 0) return false;
  if (streak.lastTouchDay === today) return false;

  if (isFlexibleSchedule(schedule)) {
    const in7 = touchDaysInWindow(recentTouchDays, today, 7);
    return in7.length < 3;
  }

  if (!isScheduledDay(schedule, parseDay(today))) return false;
  // scheduled day with no touch — break if we missed yesterday's scheduled day too
  // Actually: streak breaks when a scheduled day passes with no touch
  // Caller checks at end of day / next open
  return streak.lastTouchDay !== today && isScheduledDay(schedule, parseDay(today));
}

export function applyRepair(streak: StreakState, today: string): StreakState {
  return {
    ...streak,
    lastTouchDay: today,
    repairsUsedThisMonth: streak.repairsUsedThisMonth + 1,
    monthKey: monthKey(parseDay(today)),
  };
}

export function streakAlive(
  streak: StreakState,
  schedule: Schedule,
  now: number,
  recentTouchDays: string[],
): boolean {
  const today = dayKey(new Date(now));
  if (streak.current <= 0) return false;
  if (isFlexibleSchedule(schedule)) {
    return touchDaysInWindow(recentTouchDays, today, 7).length >= 3;
  }
  return true; // for consecutive schedules, current>0 means alive until a miss is processed
}
