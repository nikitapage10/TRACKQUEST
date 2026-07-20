import { describe, expect, it } from 'vitest';
import {
  level,
  xpForLevel,
  xpIntoLevel,
  xpForNextLevel,
  cumulativeXpForLevel,
  sessionXp,
  walkawayXp,
} from './xp';

describe('xp curve', () => {
  it('xpForLevel matches spec', () => {
    expect(xpForLevel(1)).toBe(100);
    expect(xpForLevel(2)).toBe(115);
    expect(xpForLevel(20)).toBe(385);
  });

  it('level / into / next', () => {
    expect(level(0)).toBe(1);
    expect(level(99)).toBe(1);
    expect(level(100)).toBe(2);
    expect(level(100 + 115)).toBe(3);
    expect(xpIntoLevel(100)).toBe(0);
    expect(xpIntoLevel(150)).toBe(50);
    expect(xpForNextLevel(1)).toBe(100);
    expect(cumulativeXpForLevel(1)).toBe(0);
    expect(cumulativeXpForLevel(2)).toBe(100);
  });

  it('session XP caps and min', () => {
    expect(sessionXp(2)).toBe(0);
    expect(sessionXp(3)).toBe(20);
    expect(sessionXp(15)).toBe(25);
    expect(sessionXp(45)).toBe(35);
    expect(sessionXp(90)).toBe(40);
    expect(sessionXp(240)).toBe(40);
  });

  it('walkaway decays by snooze', () => {
    expect(walkawayXp(0)).toBe(25);
    expect(walkawayXp(1)).toBe(15);
    expect(walkawayXp(2)).toBe(10);
    expect(walkawayXp(3)).toBe(5);
    expect(walkawayXp(4)).toBe(0);
    expect(walkawayXp(99)).toBe(0);
  });
});
