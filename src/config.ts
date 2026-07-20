/** All tunable numbers — single source of truth */

export const DAY_MS = 86_400_000;
export const ENERGY_DECAY_DAYS = 14;
export const STUCK_TRIGGER_MIN_DAYS = 7;
export const SEED_REPLAY_DAYS = 21;
export const REVIVE_BONUS_DAYS = 30;
export const CAPTURE_XP = 5;
export const CAPTURE_WEEKLY_CAP = 25;
export const TASK_XP = 15;
export const SESSION_BASE_XP = 20;
export const SESSION_PER_15_XP = 5;
export const SESSION_XP_CAP = 40;
export const SESSION_MIN_MINUTES_FOR_XP = 3;
export const SESSION_MAX_MINUTES = 240;
export const WALKAWAY_XP = [25, 15, 10, 5, 0] as const;
export const WALKAWAY_SNOOZE_MIN = 10;
export const STAGE_CLEAR_XP = [0, 30, 35, 40, 0] as const; // index = stage being entered
export const RELEASE_XP = 150;
export const SHELVE_XP = 10;
export const REVIVE_XP = 20;
export const DAILY_SPARK_XP = 10;
export const DEMO_DAY_XP = 35;
export const ONBOARD_XP = 40;
export const STREAK_BONUS_XP = 10;
export const STREAK_BONUS_EVERY = 7;

export const XP_EVENT_KEEP = 500;
export const COACH_MEMORY_KEEP = 50;
export const SPEECH_BUDGET = 2;
export const GLOBAL_SPEECH_GAP_MS = 90_000;
export const COACH_EVAL_INTERVAL_MS = 60_000;
export const AWAY_RESET_MS = 30 * 60_000;
export const MUTE_WEEK_MS = 7 * DAY_MS;
export const PERSIST_DEBOUNCE_MS = 500;
export const BLOB_QUOTA_TOAST = 'SAVED WITHOUT AUDIO — STORAGE FULL';

export const ATTR_KEYS = [
  'finisher',
  'consistency',
  'sound',
  'arrangement',
  'hustle',
] as const;

export const ATTR_LABELS: Record<(typeof ATTR_KEYS)[number], string> = {
  finisher: 'Finisher',
  consistency: 'Consistency',
  sound: 'Sound design',
  arrangement: 'Arrangement',
  hustle: 'Hustle',
};

export const ATTR_COLORS: Record<(typeof ATTR_KEYS)[number], string> = {
  finisher: 'var(--pink)',
  consistency: 'var(--gold)',
  sound: 'var(--violet)',
  arrangement: 'var(--mint)',
  hustle: 'var(--orange)',
};

export const PAIN_ATTR: Record<string, (typeof ATTR_KEYS)[number]> = {
  steam: 'consistency',
  tweak: 'finisher',
  time: 'consistency',
  arrange: 'arrangement',
};

export const PAIN_TIP: Record<string, string> = {
  steam: 'shorter sessions, more often',
  tweak: 'deadlines beat perfection',
  time: 'protect two nights a week',
  arrange: 'steal a structure, then bend it',
};

export const STAGES = [
  'Ideas',
  'In production',
  'Mixing',
  'Mastering',
  'Released',
] as const;

export const STAGE_COLORS = [
  'var(--muted)',
  'var(--violet)',
  'var(--pink)',
  'var(--orange)',
  'var(--mint)',
] as const;

export const INTENT_META: Record<
  string,
  { icon: string; label: string }
> = {
  write: { icon: '✏️', label: 'Write' },
  produce: { icon: '🎛', label: 'Produce' },
  mix: { icon: '🎚', label: 'Mix' },
  master: { icon: '📀', label: 'Master' },
  admin: { icon: '📋', label: 'Admin' },
  play: { icon: '🎲', label: 'Play' },
};

export const DECOR_UNLOCKS: { level: number; id: string; name: string }[] = [
  { level: 2, id: 'plant', name: 'Plant' },
  { level: 3, id: 'poster', name: 'Poster' },
  { level: 5, id: 'neon', name: 'Neon Sign' },
  { level: 7, id: 'cattree', name: 'Cat Tree' },
  { level: 9, id: 'modular', name: 'Modular Wall' },
  { level: 12, id: 'lava', name: 'Lava Lamp' },
  { level: 15, id: 'disco', name: 'Disco Ball' },
  { level: 20, id: 'goldcrate', name: 'Gold Record Crate' },
];

export const PLAQUES = [
  { id: 'first_blood', name: 'FIRST BLOOD', hint: 'Release 1 song' },
  { id: 'ep_energy', name: 'EP ENERGY', hint: 'Release 3 songs' },
  { id: 'certified', name: 'CERTIFIED FINISHER', hint: 'Release 5 songs' },
  { id: 'speedrun', name: 'SPEEDRUN', hint: 'Idea→release ≤30 days' },
  { id: 'metronome', name: 'METRONOME', hint: '60-day streak' },
  { id: 'merciless', name: 'MERCILESS', hint: 'Shelve 10 songs' },
  { id: 'crate_digger', name: 'CRATE DIGGER', hint: 'Revive → release' },
] as const;

export const SCHEMA_VERSION = 1 as const;
