import type { AttrKey } from '../types';

export type QuestTrackEvent =
  | 'all-tasks-done'
  | 'task'
  | 'walkaway'
  | 'touch-day'
  | 'session'
  | 'song-touch-days'
  | 'session-intent'
  | 'reference-task'
  | 'arrange-task'
  | 'stageclear'
  | 'demo-day'
  | 'boss-start'
  | 'trophy-edit';

export interface QuestTemplate {
  id: string;
  attr: AttrKey;
  text: string; // may include {n} {song}
  goal: number;
  xp: number;
  track: QuestTrackEvent;
  needsSong?: boolean;
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  { id: 'f1', attr: 'finisher', text: 'Clear every task on one song', goal: 1, xp: 60, track: 'all-tasks-done', needsSong: true },
  { id: 'f2', attr: 'finisher', text: 'Complete {n} tasks anywhere', goal: 6, xp: 50, track: 'task' },
  { id: 'f3', attr: 'finisher', text: 'Walk away clean twice', goal: 2, xp: 70, track: 'walkaway' },
  { id: 'c1', attr: 'consistency', text: 'Touch music on {n} scheduled days', goal: 3, xp: 50, track: 'touch-day' },
  { id: 'c2', attr: 'consistency', text: 'Log {n} sessions, any size', goal: 3, xp: 55, track: 'session' },
  { id: 'c3', attr: 'consistency', text: 'Three-day touch chain on one song', goal: 3, xp: 60, track: 'song-touch-days', needsSong: true },
  { id: 's1', attr: 'sound', text: 'Log {n} mix/master sessions', goal: 2, xp: 55, track: 'session-intent' },
  { id: 's2', attr: 'sound', text: 'Reference-check two songs', goal: 2, xp: 50, track: 'reference-task' },
  { id: 's3', attr: 'sound', text: 'One sound-design session over 30 min', goal: 1, xp: 60, track: 'session' },
  { id: 'a1', attr: 'arrangement', text: 'Fill one empty section', goal: 1, xp: 60, track: 'arrange-task' },
  { id: 'a2', attr: 'arrangement', text: 'Map two reference arrangements', goal: 2, xp: 55, track: 'arrange-task' },
  { id: 'a3', attr: 'arrangement', text: 'Advance any song out of Ideas', goal: 1, xp: 65, track: 'stageclear' },
  { id: 'h1', attr: 'hustle', text: 'Log a Demo Day bounce', goal: 1, xp: 80, track: 'demo-day' },
  { id: 'h2', attr: 'hustle', text: 'Set a release date', goal: 1, xp: 40, track: 'boss-start' },
  { id: 'h3', attr: 'hustle', text: 'Update your Trophy Wall (plays/link)', goal: 1, xp: 40, track: 'trophy-edit' },
];
