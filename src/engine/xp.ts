/** XP / level math */

export function xpForLevel(n: number): number {
  // XP needed to go from level n to n+1
  return 100 + 15 * (n - 1);
}

export function cumulativeXpForLevel(level: number): number {
  // total XP required to REACH this level (level 1 = 0)
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

export function level(xp: number): number {
  let lv = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(lv)) {
    remaining -= xpForLevel(lv);
    lv++;
    if (lv > 999) break;
  }
  return lv;
}

export function xpIntoLevel(xp: number): number {
  const lv = level(xp);
  return xp - cumulativeXpForLevel(lv);
}

export function xpForNextLevel(lv: number): number {
  return xpForLevel(lv);
}

export function sessionXp(minutes: number): number {
  if (minutes < 3) return 0;
  const bonus = Math.floor(minutes / 15) * 5;
  return Math.min(40, 20 + bonus);
}

export function walkawayXp(snoozes: number): number {
  const table = [25, 15, 10, 5, 0];
  return table[Math.min(snoozes, table.length - 1)];
}
