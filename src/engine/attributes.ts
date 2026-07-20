import { ATTR_KEYS, DAY_MS, PAIN_ATTR } from '../config';
import type { AttrKey, Intent, RootState, XpType } from '../types';

export type AttrWeights = Partial<Record<AttrKey, number>>;

export function seedAttributeBase(
  expTier: 0 | 1 | 2 | 3,
  pain: string,
): Record<AttrKey, number> {
  const base = [25, 40, 55, 65][expTier] ?? 40;
  const out: Record<AttrKey, number> = {
    finisher: base,
    consistency: base,
    sound: base,
    arrangement: base,
    hustle: base,
  };
  const weak = PAIN_ATTR[pain];
  if (weak) out[weak] = Math.max(10, out[weak] - 18);
  return out;
}

function weightsForEvent(
  type: XpType,
  meta?: { intent?: Intent; scheduledDay?: boolean; arrangeKit?: boolean },
): AttrWeights {
  switch (type) {
    case 'task':
      return meta?.arrangeKit
        ? { finisher: 1.5, consistency: 0.3, arrangement: 2.5 }
        : { finisher: 1.5, consistency: 0.3 };
    case 'stageclear':
      return { finisher: 4, consistency: 1 };
    case 'walkaway':
      return { finisher: 3 };
    case 'session': {
      const w: AttrWeights = {};
      const intent = meta?.intent;
      if (intent === 'write' || intent === 'produce') {
        w.finisher = 0.5;
        w.consistency = 1;
        w.sound = 0.5;
        w.arrangement = 1;
      } else if (intent === 'mix' || intent === 'master') {
        w.finisher = 1;
        w.consistency = 1;
        w.sound = 1.5;
      } else {
        w.consistency = 0.5;
      }
      if (meta?.scheduledDay) w.consistency = (w.consistency ?? 0) + 1.5;
      return w;
    }
    case 'release':
      return { finisher: 6, hustle: 5 };
    case 'demo_day':
      return { finisher: 2, hustle: 3 };
    case 'capture':
      return { consistency: 0.3 };
    case 'quest_daily':
      return { consistency: 0.3 };
    default:
      return {};
  }
}

/** Extra hustle for trophy edits (plays/link) — call with synthetic type via applyTrophyEdit */
export function trophyEditWeights(): AttrWeights {
  return { hustle: 2 };
}

export function attr(
  key: AttrKey,
  state: Pick<RootState, 'attributes' | 'xp' | 'sessions'>,
  now: number,
  extraEvents: { at: number; weights: AttrWeights }[] = [],
): number {
  const windowStart = now - 30 * DAY_MS;
  let sum = state.attributes.base[key] ?? 25;

  for (const ev of state.xp.events) {
    if (ev.at < windowStart) continue;
    // Reconstruct intent from sessions if possible
    let intent: Intent | undefined;
    let scheduledDay = false;
    if (ev.type === 'session' && ev.songId) {
      const sess = state.sessions.find(
        (s) => s.songId === ev.songId && Math.abs(s.endedAt! - ev.at) < 60_000,
      );
      intent = sess?.intent;
    }
    const w = weightsForEvent(ev.type, { intent, scheduledDay });
    sum += w[key] ?? 0;
  }

  for (const e of extraEvents) {
    if (e.at < windowStart) continue;
    sum += e.weights[key] ?? 0;
  }

  return Math.max(5, Math.min(99, Math.round(sum)));
}

export function allAttrs(
  state: Pick<RootState, 'attributes' | 'xp' | 'sessions'>,
  now: number,
): Record<AttrKey, number> {
  const out = {} as Record<AttrKey, number>;
  for (const k of ATTR_KEYS) out[k] = attr(k, state, now);
  return out;
}

export function lowestAttr(
  state: Pick<RootState, 'attributes' | 'xp' | 'sessions'>,
  now: number,
): AttrKey {
  const vals = allAttrs(state, now);
  let lowest: AttrKey = 'finisher';
  let min = Infinity;
  for (const k of ATTR_KEYS) {
    if (vals[k] < min) {
      min = vals[k];
      lowest = k;
    }
  }
  return lowest;
}

export function eventWeights(
  type: XpType,
  meta?: { intent?: Intent; scheduledDay?: boolean; arrangeKit?: boolean },
): AttrWeights {
  return weightsForEvent(type, meta);
}
