import { DAY_MS, ENERGY_DECAY_DAYS } from '../config';
import type { Song } from '../types';

/** energy ∈ [0,1]; 0 = STUCK */
export function songEnergy(song: Pick<Song, 'lastTouchedAt' | 'status' | 'stage'>, now: number): number {
  if (song.status !== 'active' || song.stage >= 4) return 1;
  const elapsed = now - song.lastTouchedAt;
  const frac = 1 - elapsed / (ENERGY_DECAY_DAYS * DAY_MS);
  return Math.max(0, Math.min(1, frac));
}

export function energyColor(e: number): string {
  if (e > 0.6) return 'var(--energy-full)';
  if (e >= 0.3) return 'var(--energy-mid)';
  if (e > 0) return 'var(--energy-low)';
  return 'var(--energy-dead)';
}

export function isStuck(
  song: Pick<Song, 'lastTouchedAt' | 'status' | 'stage' | 'isExample'>,
  now: number,
): boolean {
  if (song.isExample) return false;
  return songEnergy(song, now) === 0 && song.status === 'active' && song.stage < 4;
}

export function daysUntouched(
  song: Pick<Song, 'lastTouchedAt'>,
  now: number,
): number {
  return Math.floor((now - song.lastTouchedAt) / DAY_MS);
}
