import { nanoid } from 'nanoid';
import { SPARKS } from '../strings/sparks';
import { QUEST_TEMPLATES, type QuestTemplate } from '../strings/quests';
import { lowestAttr } from './attributes';
import { dayKey, isoWeekKey } from './streak';
import type { AttrKey, Pain, QuestState, RootState, WeeklyQuest } from '../types';
import { interpolate } from './coach/speak';

export function rollDailySpark(
  pain: Pain,
  dateKey: string,
  recentPromptIds: string[],
  _songTitle?: string,
): QuestState['dailySpark'] {
  const weighted: typeof SPARKS = [];
  for (const s of SPARKS) {
    weighted.push(s);
    if (s.pain === pain) weighted.push(s); // ×2 weight
  }
  const pool = weighted.filter((s) => !recentPromptIds.includes(s.id));
  const pickFrom = pool.length ? pool : SPARKS;
  const pick = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  return {
    dateKey,
    promptId: pick.id,
    done: false,
    skipped: false,
  };
}

export function sparkText(promptId: string, songTitle?: string): string {
  const s = SPARKS.find((x) => x.id === promptId);
  if (!s) return '';
  return interpolate(s.text, { song: songTitle ?? 'your song' });
}

export function generateWeeklyQuest(
  state: RootState,
  now: number,
  excludeTemplateId?: string,
): WeeklyQuest {
  const attr = lowestAttr(state, now);
  const templates = QUEST_TEMPLATES.filter(
    (t) => t.attr === attr && t.id !== excludeTemplateId,
  );
  const pool = templates.length
    ? templates
    : QUEST_TEMPLATES.filter((t) => t.id !== excludeTemplateId);
  const t = pool[Math.floor(Math.random() * pool.length)];
  return instantiateQuest(t, state, now);
}

function instantiateQuest(t: QuestTemplate, state: RootState, now: number): WeeklyQuest {
  const songs = state.songs.filter((s) => !s.isExample && s.status === 'active' && s.stage < 4);
  let songId: string | undefined;
  if (t.needsSong && songs.length) {
    const stuck = songs.find((s) => s.lastTouchedAt < now - 14 * 86400000);
    const lowestProg = [...songs].sort((a, b) => {
      const pa = a.tasks.filter((x) => x.done).length / Math.max(1, a.tasks.length);
      const pb = b.tasks.filter((x) => x.done).length / Math.max(1, b.tasks.length);
      return pa - pb;
    })[0];
    songId = (stuck ?? lowestProg).id;
  }
  const songTitle = songId
    ? state.songs.find((s) => s.id === songId)?.title
    : undefined;
  const text = interpolate(t.text, { n: t.goal, song: songTitle ?? 'a song' });
  return {
    id: nanoid(),
    templateId: t.id,
    targetAttr: t.attr,
    text,
    progress: 0,
    goal: t.goal,
    xp: t.xp,
    weekKey: isoWeekKey(new Date(now)),
    songId,
    done: false,
  };
}

export function questTemplate(id: string): QuestTemplate | undefined {
  return QUEST_TEMPLATES.find((t) => t.id === id);
}

export function ensureDailyAndWeekly(
  state: RootState,
  now: number,
): Partial<Pick<RootState, 'quests'>> {
  const today = dayKey(new Date(now));
  const week = isoWeekKey(new Date(now));
  let quests = { ...state.quests };

  if (!quests.dailySpark || quests.dailySpark.dateKey !== today) {
    const recent: string[] = []; // simplified — no 7-day history store yet
    const activeSong = state.songs.find((s) => s.status === 'active' && !s.isExample);
    quests = {
      ...quests,
      dailySpark: rollDailySpark(state.profile.pain, today, recent, activeSong?.title),
    };
  }

  if (!quests.weekly || quests.weekly.weekKey !== week) {
    quests = {
      ...quests,
      weekly: generateWeeklyQuest(state, now),
      rerollUsedThisWeek: false,
    };
  }

  return { quests };
}

export type { AttrKey };
