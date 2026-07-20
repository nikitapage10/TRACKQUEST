import { describe, expect, it } from 'vitest';
import { songEnergy, isStuck } from './energy';
import { DAY_MS } from '../config';

describe('energy', () => {
  const now = Date.UTC(2026, 6, 20);
  const base = {
    lastTouchedAt: now,
    status: 'active' as const,
    stage: 1 as const,
    isExample: false,
  };

  it('full when just touched', () => {
    expect(songEnergy(base, now)).toBe(1);
  });

  it('zero at 14 days', () => {
    expect(songEnergy({ ...base, lastTouchedAt: now - 14 * DAY_MS }, now)).toBe(0);
  });

  it('half at 7 days', () => {
    expect(songEnergy({ ...base, lastTouchedAt: now - 7 * DAY_MS }, now)).toBeCloseTo(0.5);
  });

  it('stuck only when energy 0 active <4', () => {
    expect(isStuck({ ...base, lastTouchedAt: now - 14 * DAY_MS }, now)).toBe(true);
    expect(isStuck({ ...base, lastTouchedAt: now - 14 * DAY_MS, isExample: true }, now)).toBe(false);
    expect(isStuck({ ...base, lastTouchedAt: now - 14 * DAY_MS, stage: 4 }, now)).toBe(false);
    expect(isStuck({ ...base, lastTouchedAt: now - 14 * DAY_MS, status: 'shelved' }, now)).toBe(false);
  });
});
