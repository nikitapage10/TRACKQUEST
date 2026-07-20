import { describe, expect, it } from 'vitest';
import { seedAttributeBase, attr } from './attributes';
import type { RootState } from '../types';

describe('attributes', () => {
  it('seeds base from exp and pain', () => {
    const b = seedAttributeBase(1, 'tweak');
    expect(b.finisher).toBe(22); // 40-18
    expect(b.consistency).toBe(40);
  });

  it('floors pain dump at 10', () => {
    const b = seedAttributeBase(0, 'steam');
    expect(b.consistency).toBe(10); // 25-18 = 7 → 10
  });

  it('rolls 30-day window', () => {
    const now = Date.now();
    const state = {
      attributes: { base: seedAttributeBase(1, 'tweak') },
      xp: {
        total: 15,
        events: [
          { id: '1', type: 'task' as const, amount: 15, at: now - 1000 },
          { id: '2', type: 'task' as const, amount: 15, at: now - 40 * 86400000 },
        ],
        captureXpThisWeek: 0,
        weekStart: now,
      },
      sessions: [],
    } as Pick<RootState, 'attributes' | 'xp' | 'sessions'>;
    const finisher = attr('finisher', state, now);
    // base 22 + 1.5 from recent task only
    expect(finisher).toBe(24);
  });
});
