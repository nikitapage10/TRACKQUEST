export type Genre = 'Electronic' | 'Indie' | 'Rock' | 'Hip-hop' | 'Pop' | 'Other';
export type Pain = 'steam' | 'tweak' | 'time' | 'arrange';
export type Voice = 'hype' | 'real' | 'drill' | 'facts';
export type Schedule = 'weeknights' | 'weekends' | 'stolen' | 'chaos';
export type Stage = 0 | 1 | 2 | 3 | 4;
export type SongStatus = 'active' | 'shelved' | 'released';
export type Intent = 'write' | 'produce' | 'mix' | 'master' | 'admin' | 'play';
export type AttrKey = 'finisher' | 'consistency' | 'sound' | 'arrangement' | 'hustle';
export type XpType =
  | 'capture'
  | 'task'
  | 'session'
  | 'walkaway'
  | 'stageclear'
  | 'release'
  | 'shelve'
  | 'quest_daily'
  | 'quest_weekly'
  | 'demo_day'
  | 'revive'
  | 'onboard'
  | 'streak_bonus';

export interface Profile {
  artistName: string;
  genre: Genre;
  expTier: 0 | 1 | 2 | 3;
  pain: Pain;
  voice: Voice;
  schedule: Schedule;
  establishedYear: number;
}

export interface OnboardingState {
  completed: boolean;
  rescuedSongId?: string;
  skippedRescue: boolean;
  exampleShelfDismissed: boolean;
}

export interface Character {
  species: number;
  a: number;
  s: number;
  c: number;
  outfit: number;
  gear: number;
  companionName: string;
}

export interface Task {
  id: string;
  text: string;
  done: boolean;
  source: 'user' | 'coach';
  createdAt: number;
  completedAt?: number;
  arrangeKit?: boolean;
}

export interface VersionEntry {
  id: string;
  label: string;
  note: string;
  createdAt: number;
  audioId?: string;
  walkAway?: boolean;
  demoDay?: boolean;
}

export interface Memo {
  id: string;
  kind: 'voice' | 'text';
  text?: string;
  audioId?: string;
  createdAt: number;
  isSeed?: boolean;
}

export interface Reference {
  id: string;
  label: string;
  url?: string;
}

export interface Song {
  id: string;
  title: string;
  stage: Stage;
  status: SongStatus;
  bpm?: number;
  key?: string;
  plays?: string;
  releaseLink?: string;
  createdAt: number;
  stageEnteredAt: number;
  lastTouchedAt: number;
  tasks: Task[];
  versions: VersionEntry[];
  memos: Memo[];
  references: Reference[];
  notes: string;
  coverSeed: string;
  coverImageId?: string;
  releasedAt?: number;
  releaseDate?: number;
  shelvedAt?: number;
  priorStage?: Stage;
  demoDayStamps: number[];
  isExample?: boolean;
}

export interface Session {
  id: string;
  songId?: string;
  intent: Intent;
  goal?: string;
  startedAt: number;
  endedAt?: number;
  minutes: number;
  summary?: string;
  tasksCompleted: string[];
  walkAwayBounce?: boolean;
  snoozes: number;
}

export interface XpEvent {
  id: string;
  type: XpType;
  amount: number;
  at: number;
  songId?: string;
}

export interface XpState {
  total: number;
  events: XpEvent[];
  captureXpThisWeek: number;
  weekStart: number;
}

export interface AttributeState {
  base: Record<AttrKey, number>;
}

export interface StreakState {
  current: number;
  best: number;
  lastTouchDay: string;
  repairsUsedThisMonth: number;
  monthKey: string;
}

export interface WeeklyQuest {
  id: string;
  templateId: string;
  targetAttr: AttrKey;
  text: string;
  progress: number;
  goal: number;
  xp: number;
  weekKey: string;
  songId?: string;
  done: boolean;
}

export interface QuestState {
  dailySpark: {
    dateKey: string;
    promptId: string;
    done: boolean;
    skipped: boolean;
  } | null;
  weekly: WeeklyQuest | null;
  rerollUsedThisWeek: boolean;
}

export interface CoachMemoryEvent {
  at: number;
  kind: string;
  songId?: string;
  detail?: string;
}

export interface CoachState {
  mutedUntil?: number;
  lastSpokeAt: number;
  speaksThisSession: number;
  triggerCooldowns: Record<string, number>;
  dismissals: Record<string, number>;
  memory: CoachMemoryEvent[];
}

export interface StudioState {
  decorUnlocked: string[];
  decorPlaced: { decorId: string; room: Stage; x: number }[];
  gearUnlocked: number[];
  titlesUnlocked: string[];
  equippedTitle?: string;
  speciesUnlocked: number[];
}

export interface Settings {
  voice: Voice;
  schedule: Schedule;
  walkAwayEnabled: boolean;
  walkAwayMinutes: number;
  notificationsEnabled: boolean;
  demoDayCadenceDays: number;
  reducedCelebrations: boolean;
  defaultView: 'board' | 'studio';
}

export interface WeeklyReport {
  id: string;
  weekKey: string;
  text: string;
  at: number;
}

export interface RootState {
  meta: { schemaVersion: 1; createdAt: number; lastOpenedAt: number };
  profile: Profile;
  character: Character;
  songs: Song[];
  sessions: Session[];
  xp: XpState;
  attributes: AttributeState;
  streak: StreakState;
  quests: QuestState;
  coach: CoachState;
  studio: StudioState;
  settings: Settings;
  onboarding: OnboardingState;
  reports: WeeklyReport[];
  activeSessionId?: string;
  nextDemoDayAt?: number;
}

export type CompanionTarget =
  | { kind: 'element'; selector: string }
  | { kind: 'xy'; x: number; y: number }
  | { kind: 'room'; stage: Stage }
  | null;

export type CompanionAnimState =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'sit'
  | 'sleep'
  | 'headphones-desk'
  | 'carry'
  | 'hype'
  | 'preen'
  | 'nod';

export type ViewId =
  | 'board'
  | 'studio'
  | 'calendar'
  | 'trophy'
  | 'settings'
  | 'focus'
  | 'song'
  | 'capture'
  | 'creator-edit';

export type CelebrateKind =
  | 'task'
  | 'session'
  | 'walkaway'
  | 'stageclear'
  | 'levelup'
  | 'release'
  | 'unlock'
  | 'quest';
