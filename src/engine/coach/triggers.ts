import { DAY_MS, PAIN_TIP, SPEECH_BUDGET, GLOBAL_SPEECH_GAP_MS } from '../../config';
import { ATTR_LABELS } from '../../config';
import { daysUntouched, isStuck, songEnergy } from '../energy';
import { dayKey, isScheduledDay } from '../streak';
import { weakAttrLabel } from './playbooks';
import type { RootState, Song } from '../../types';

export interface TriggerHit {
  id: string;
  songId?: string;
  ctx: Record<string, string | number | undefined>;
  buttons: { id: string; label: string; ghost?: boolean }[];
}

function realSongs(state: RootState): Song[] {
  return state.songs.filter((s) => !s.isExample);
}

function cooldownMs(triggerId: string, dismissals: number): number {
  const base: Record<string, number> = {
    return_absence: 7 * DAY_MS,
    stuck_song: 3 * DAY_MS,
    tweak_spiral: 7 * DAY_MS,
    hoarding: 7 * DAY_MS,
    streak_risk: DAY_MS,
    streak_repair: 30 * DAY_MS,
    seed_replay: 14 * DAY_MS,
    boss_near: 365 * DAY_MS,
    boss_missed: 365 * DAY_MS,
    demo_day: 7 * DAY_MS,
    weekly_report: 7 * DAY_MS,
    rescue_offer: Infinity,
  };
  const b = base[triggerId] ?? 7 * DAY_MS;
  const mult = Math.min(8, Math.pow(2, dismissals));
  return b === Infinity ? Infinity : b * mult;
}

export function activeTriggers(state: RootState, now: number): TriggerHit | null {
  if (state.coach.mutedUntil && now < state.coach.mutedUntil) return null;
  if (state.coach.speaksThisSession >= SPEECH_BUDGET) return null;
  if (now - state.coach.lastSpokeAt < GLOBAL_SPEECH_GAP_MS && state.coach.lastSpokeAt > 0)
    return null;

  const songs = realSongs(state);
  const voice = state.settings.voice;
  const pain = state.profile.pain;

  const tryFire = (id: string, songId?: string): boolean => {
    const cdUntil = state.coach.triggerCooldowns[songId ? `${id}:${songId}` : id] ?? 0;
    if (now < cdUntil) return false;
    const dismissKey = songId ? `${id}:${songId}` : id;
    const d = state.coach.dismissals[dismissKey] ?? 0;
    // cooldown already accounts for backoff via stored next-allowed
    void d;
    void voice;
    return true;
  };

  // 1. return_absence
  const daysAway = Math.floor((now - state.meta.lastOpenedAt) / DAY_MS);
  if (state.meta.lastOpenedAt > 0 && daysAway >= 7 && tryFire('return_absence')) {
    const closest = [...songs]
      .filter((s) => s.status === 'active' && s.stage < 4)
      .sort((a, b) => {
        const pa = a.tasks.filter((t) => t.done).length / Math.max(1, a.tasks.length);
        const pb = b.tasks.filter((t) => t.done).length / Math.max(1, b.tasks.length);
        return pb - pa;
      })[0];
    if (closest) {
      return {
        id: 'return_absence',
        songId: closest.id,
        ctx: { song: closest.title, n: daysAway },
        buttons: [
          { id: 'reentry', label: '2-MIN RE-ENTRY' },
          { id: 'looking', label: 'JUST LOOKING', ghost: true },
        ],
      };
    }
  }

  // 2. stuck_song
  const stuck = songs.find((s) => isStuck(s, now) && tryFire('stuck_song', s.id));
  if (stuck) {
    const n = daysUntouched(stuck, now);
    const weak = weakAttrLabel(pain);
    return {
      id: 'stuck_song',
      songId: stuck.id,
      ctx: {
        song: stuck.title,
        n,
        weakAttr: ATTR_LABELS[weak as keyof typeof ATTR_LABELS].toLowerCase(),
        tip: PAIN_TIP[pain],
      },
      buttons: [
        { id: 'breakdown', label: 'BREAK IT DOWN' },
        { id: 'shelve', label: 'SHELVE IT?', ghost: true },
      ],
    };
  }

  // 3. tweak_spiral
  for (const s of songs.filter((x) => x.status === 'active')) {
    const recent = state.sessions.filter(
      (sess) =>
        sess.songId === s.id &&
        sess.endedAt &&
        now - sess.endedAt < 14 * DAY_MS,
    );
    const tasksDone = s.tasks.filter(
      (t) => t.completedAt && now - t.completedAt < 14 * DAY_MS,
    );
    if (recent.length >= 4 && tasksDone.length === 0 && tryFire('tweak_spiral', s.id)) {
      return {
        id: 'tweak_spiral',
        songId: s.id,
        ctx: { song: s.title },
        buttons: [
          { id: 'rewrite', label: 'REWRITE THE LIST' },
          { id: 'fine', label: "WE'RE FINE", ghost: true },
        ],
      };
    }
  }

  // 4. hoarding
  const weekStart = state.xp.weekStart || now;
  const captures = state.xp.events.filter(
    (e) => e.type === 'capture' && e.at >= weekStart,
  ).length;
  const sessionsWeek = state.sessions.filter(
    (s) => s.endedAt && s.endedAt >= weekStart,
  ).length;
  if (captures >= 6 && sessionsWeek === 0 && tryFire('hoarding')) {
    return {
      id: 'hoarding',
      ctx: { n: captures },
      buttons: [
        { id: 'pick', label: 'PICK ONE' },
        { id: 'notyet', label: 'NOT YET', ghost: true },
      ],
    };
  }

  // 5. streak_risk
  const today = dayKey(new Date(now));
  const hour = new Date(now).getHours();
  if (
    isScheduledDay(state.settings.schedule, new Date(now)) &&
    hour >= 20 &&
    state.streak.lastTouchDay !== today &&
    state.streak.current >= 3 &&
    tryFire('streak_risk')
  ) {
    return {
      id: 'streak_risk',
      ctx: { n: state.streak.current },
      buttons: [
        { id: 'quick', label: 'QUICK TOUCH' },
        { id: 'tomorrow', label: 'TOMORROW', ghost: true },
      ],
    };
  }

  // 6. boss_near / boss_missed
  for (const s of songs) {
    if (!s.releaseDate || s.status === 'released') continue;
    const daysLeft = Math.ceil((s.releaseDate - now) / DAY_MS);
    if (daysLeft < 0 && tryFire('boss_missed', s.id)) {
      return {
        id: 'boss_missed',
        songId: s.id,
        ctx: { song: s.title },
        buttons: [
          { id: 'newdate', label: 'PICK A NEW DATE' },
          { id: 'drop', label: 'DROP THE DATE', ghost: true },
        ],
      };
    }
    if (daysLeft >= 0 && daysLeft <= 3 && tryFire('boss_near', s.id)) {
      return {
        id: 'boss_near',
        songId: s.id,
        ctx: { song: s.title, n: daysLeft },
        buttons: [
          { id: 'tasks', label: 'SHOW TASKS' },
          { id: 'dismiss', label: 'OK', ghost: true },
        ],
      };
    }
  }

  // 7. demo_day
  if (
    state.settings.demoDayCadenceDays > 0 &&
    state.nextDemoDayAt &&
    now >= state.nextDemoDayAt &&
    tryFire('demo_day')
  ) {
    return {
      id: 'demo_day',
      ctx: {},
      buttons: [
        { id: 'bounce', label: "LET'S BOUNCE" },
        { id: 'snooze', label: 'SNOOZE 7D', ghost: true },
      ],
    };
  }

  // seed_replay is evaluated when viewing NOTES — handled by UI calling checkSeedReplay
  return null;
}

export function checkSeedReplay(
  state: RootState,
  songId: string,
  now: number,
): TriggerHit | null {
  if (state.coach.mutedUntil && now < state.coach.mutedUntil) return null;
  if (state.coach.speaksThisSession >= SPEECH_BUDGET) return null;
  const song = state.songs.find((s) => s.id === songId);
  if (!song || song.isExample) return null;
  const seed = song.memos.find((m) => m.isSeed);
  if (!seed) return null;
  if (daysUntouched(song, now) < 21) return null;
  const key = `seed_replay:${songId}`;
  if ((state.coach.triggerCooldowns[key] ?? 0) > now) return null;
  return {
    id: 'seed_replay',
    songId,
    ctx: { song: song.title },
    buttons: [
      { id: 'play', label: '▶ PLAY THE SPARK' },
      { id: 'dismiss', label: 'LATER', ghost: true },
    ],
  };
}

export function nextCooldown(
  triggerId: string,
  songId: string | undefined,
  dismissals: number,
  now: number,
  accepted: boolean,
): { key: string; until: number; dismissals: number } {
  const key = songId ? `${triggerId}:${songId}` : triggerId;
  if (accepted) {
    return { key, until: now + cooldownMs(triggerId, 0), dismissals: 0 };
  }
  const d = dismissals + 1;
  return { key, until: now + cooldownMs(triggerId, d), dismissals: d };
}

export function songEnergySafe(song: Song, now: number) {
  return songEnergy(song, now);
}
