import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  CelebrateKind,
  Character,
  CompanionAnimState,
  CompanionTarget,
  Intent,
  Profile,
  RootState,
  Song,
  Stage,
  Task,
  ViewId,
  XpType,
} from '../types';
import {
  CAPTURE_XP,
  CAPTURE_WEEKLY_CAP,
  DAY_MS,
  DEMO_DAY_XP,
  DECOR_UNLOCKS,
  ONBOARD_XP,
  PERSIST_DEBOUNCE_MS,
  RELEASE_XP,
  REVIVE_BONUS_DAYS,
  REVIVE_XP,
  SESSION_MAX_MINUTES,
  SHELVE_XP,
  SPEECH_BUDGET,
  STAGE_CLEAR_XP,
  STREAK_BONUS_EVERY,
  STREAK_BONUS_XP,
  TASK_XP,
  XP_EVENT_KEEP,
} from '../config';
import { seedAttributeBase } from '../engine/attributes';
import { level } from '../engine/xp';
import { sessionXp, walkawayXp } from '../engine/xp';
import { dayKey, applyTouchDay, applyRepair, monthKey } from '../engine/streak';
import { defaultTasksForStage, generatePlan, painDefaults } from '../engine/coach/playbooks';
import { ensureDailyAndWeekly, generateWeeklyQuest, questTemplate, sparkText } from '../engine/quests';
import { loadState, saveState, saveBlob } from './persistence';
import { speak } from '../engine/coach/speak';
import { IDLE_QUIPS } from '../strings/coach';
import { activeTriggers, nextCooldown, checkSeedReplay } from '../engine/coach/triggers';
import type { TriggerHit } from '../engine/coach/triggers';

export interface ToastItem {
  id: string;
  msg: string;
  kind?: 'gold' | 'pink' | 'mint';
}

export interface UiState {
  hydrated: boolean;
  view: ViewId;
  previousView: ViewId;
  openSongId: string | null;
  companionTarget: CompanionTarget;
  companionAnim: CompanionAnimState;
  bubble: { text: string; buttons: { id: string; label: string; ghost?: boolean }[]; triggerId?: string; songId?: string } | null;
  toasts: ToastItem[];
  celebrateQueue: { kind: CelebrateKind; payload?: Record<string, unknown> }[];
  captureOpen: boolean;
  shelveConfirmId: string | null;
  releaseFlowId: string | null;
  walkAwayPrompt: boolean;
  reducedMotion: boolean;
  editingCreator: boolean;
}

type Store = RootState &
  UiState & {
    hydrate: () => Promise<void>;
    setView: (v: ViewId) => void;
    setCompanionTarget: (t: CompanionTarget) => void;
    setCompanionAnim: (a: CompanionAnimState) => void;
    pushToast: (msg: string, kind?: ToastItem['kind']) => void;
    celebrate: (kind: CelebrateKind, payload?: Record<string, unknown>) => void;
    // onboarding
    setOnboardingAnswer: (partial: Partial<Profile>) => void;
    setCharacter: (c: Partial<Character>) => void;
    completeOnboarding: (opts: {
      rescuedTitle?: string;
      rescuedStage?: Stage;
      skipped: boolean;
      acceptPlan?: boolean;
    }) => void;
    dismissExamples: () => void;
    // songs
    createIdea: (title: string, memo?: { text?: string; audio?: Blob }) => string;
    openSong: (id: string | null) => void;
    updateSong: (id: string, patch: Partial<Song>) => void;
    toggleTask: (songId: string, taskId: string) => void;
    addTask: (songId: string, text: string) => void;
    reorderTasks: (songId: string, from: number, to: number) => void;
    advanceStage: (songId: string) => void;
    moveSongStage: (songId: string, stage: Stage) => void;
    shelveSong: (songId: string) => void;
    reviveSong: (songId: string) => void;
    deleteSong: (songId: string) => void;
    setReleaseDate: (songId: string, date: number | undefined) => void;
    completeRelease: (songId: string, opts?: { date?: number; link?: string; plays?: string }) => void;
    addVersion: (songId: string, note: string, opts?: { audio?: Blob; walkAway?: boolean; demoDay?: boolean }) => void;
    addMemo: (songId: string, memo: { kind: 'voice' | 'text'; text?: string; audio?: Blob; isSeed?: boolean }) => void;
    setNotes: (songId: string, notes: string) => void;
    setReferences: (songId: string, refs: Song['references']) => void;
    // sessions
    startSession: (songId: string | undefined, intent: Intent, goal?: string) => void;
    snoozeWalkAway: () => void;
    endSession: (opts: {
      summary?: string;
      taskIds?: string[];
      attachBounce?: boolean;
      bounceNote?: string;
      audio?: Blob;
      walkAway?: boolean;
    }) => void;
    // quests / coach
    completeSpark: () => void;
    skipSpark: () => void;
    rerollWeekly: () => void;
    evalCoach: () => void;
    dismissBubble: (accepted?: boolean, buttonId?: string) => void;
    tapCompanion: () => void;
    muteCoachWeek: () => void;
    applyStreakRepair: (accept: boolean) => void;
    // settings
    updateSettings: (partial: Partial<RootState['settings']>) => void;
    updateProfile: (partial: Partial<Profile>) => void;
    equipTitle: (title?: string) => void;
    placeDecor: (decorId: string, room: Stage, x: number) => void;
    removeDecor: (decorId: string) => void;
    // capture
    setCaptureOpen: (open: boolean) => void;
    // demo day
    logDemoDay: (songId: string, note: string, audio?: Blob, heard?: boolean) => void;
    snoozeDemoDay: () => void;
    // data
    eraseAll: () => Promise<void>;
    replaceState: (s: RootState) => void;
    touchSong: (songId: string) => void;
  };

function emptyWeekStart(now = Date.now()): number {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}

function exampleSongs(now: number): Song[] {
  const mk = (
    id: string,
    title: string,
    stage: Stage,
    daysAgo: number,
    tasks: { text: string; done: boolean }[],
    extra: Partial<Song> = {},
  ): Song => ({
    id,
    title,
    stage,
    status: stage === 4 ? 'released' : 'active',
    bpm: 120,
    key: 'A min',
    createdAt: now - daysAgo * DAY_MS,
    stageEnteredAt: now - daysAgo * DAY_MS,
    lastTouchedAt: now - daysAgo * DAY_MS,
    tasks: tasks.map((t) => ({
      id: nanoid(),
      text: t.text,
      done: t.done,
      source: 'user' as const,
      createdAt: now,
      completedAt: t.done ? now : undefined,
    })),
    versions: [],
    memos: [],
    references: [],
    notes: '',
    coverSeed: id,
    demoDayStamps: [],
    isExample: true,
    ...extra,
  });
  return [
    mk('ex-runner', 'Runner', 1, 6, [
      { text: 'Lay down the bassline', done: true },
      { text: 'Sketch verse 2', done: false },
      { text: 'Record vocal chops', done: false },
    ], { bpm: 128, key: 'A min' }),
    mk('ex-static', 'Static Hearts', 1, 12, [
      { text: 'Rebuild the intro', done: false },
      { text: 'Sound-design the lead', done: true },
      { text: 'Tighten drums', done: false },
    ], { bpm: 140, key: 'C# min' }),
    mk('ex-mid', 'Midnight Fuel', 3, 4, [
      { text: 'Approve the master', done: false },
      { text: 'Write release notes', done: false },
    ], { bpm: 174, key: 'E min' }),
    mk('ex-first', 'First Light', 4, 60, [{ text: 'Released', done: true }], {
      bpm: 118,
      key: 'B maj',
      plays: '12.4k plays',
      releasedAt: now - 60 * DAY_MS,
    }),
  ];
}

export function createInitialRoot(now = Date.now()): RootState {
  return {
    meta: { schemaVersion: 1, createdAt: now, lastOpenedAt: now },
    profile: {
      artistName: '',
      genre: 'Electronic',
      expTier: 1,
      pain: 'tweak',
      voice: 'real',
      schedule: 'weeknights',
      establishedYear: new Date(now).getFullYear(),
    },
    character: {
      species: 0,
      a: 0,
      s: 0,
      c: 0,
      outfit: 1,
      gear: 0,
      companionName: 'BLIP',
    },
    songs: [],
    sessions: [],
    xp: { total: 0, events: [], captureXpThisWeek: 0, weekStart: emptyWeekStart(now) },
    attributes: { base: seedAttributeBase(1, 'tweak') },
    streak: {
      current: 0,
      best: 0,
      lastTouchDay: '',
      repairsUsedThisMonth: 0,
      monthKey: monthKey(new Date(now)),
    },
    quests: { dailySpark: null, weekly: null, rerollUsedThisWeek: false },
    coach: {
      lastSpokeAt: 0,
      speaksThisSession: 0,
      triggerCooldowns: {},
      dismissals: {},
      memory: [],
    },
    studio: {
      decorUnlocked: [],
      decorPlaced: [],
      gearUnlocked: [0, 1, 2, 3, 4, 5, 6],
      titlesUnlocked: [],
      speciesUnlocked: [0, 1, 2, 3, 4],
    },
    settings: {
      voice: 'real',
      schedule: 'weeknights',
      walkAwayEnabled: true,
      walkAwayMinutes: 45,
      notificationsEnabled: false,
      demoDayCadenceDays: 30,
      reducedCelebrations: false,
      defaultView: typeof window !== 'undefined' && window.innerWidth < 900 ? 'studio' : 'board',
    },
    onboarding: {
      completed: false,
      skippedRescue: false,
      exampleShelfDismissed: false,
    },
    reports: [],
  };
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist(get: () => Store) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const s = get();
    const root = extractRoot(s);
    void saveState(root);
  }, PERSIST_DEBOUNCE_MS);
}

function extractRoot(s: Store): RootState {
  return {
    meta: s.meta,
    profile: s.profile,
    character: s.character,
    songs: s.songs,
    sessions: s.sessions,
    xp: s.xp,
    attributes: s.attributes,
    streak: s.streak,
    quests: s.quests,
    coach: s.coach,
    studio: s.studio,
    settings: s.settings,
    onboarding: s.onboarding,
    reports: s.reports,
    activeSessionId: s.activeSessionId,
    nextDemoDayAt: s.nextDemoDayAt,
  };
}

function isExampleGuard(song?: Song): boolean {
  return !!song?.isExample;
}

export const useStore = create<Store>((set, get) => {
  const grantXp = (
    type: XpType,
    amount: number,
    songId?: string,
    opts?: { forceToast?: string; celebrate?: CelebrateKind },
  ) => {
    if (amount <= 0) return;
    const song = songId ? get().songs.find((s) => s.id === songId) : undefined;
    if (isExampleGuard(song)) return;

    const now = Date.now();
    const oldLv = level(get().xp.total);
    let xp = { ...get().xp };
    if (xp.weekStart && now - xp.weekStart > 7 * DAY_MS) {
      xp = { ...xp, weekStart: emptyWeekStart(now), captureXpThisWeek: 0 };
    }
    if (type === 'capture') {
      if (xp.captureXpThisWeek >= CAPTURE_WEEKLY_CAP) {
        get().pushToast('IDEA SAVED');
        return;
      }
      amount = Math.min(amount, CAPTURE_WEEKLY_CAP - xp.captureXpThisWeek);
      xp.captureXpThisWeek += amount;
    }
    const ev = { id: nanoid(), type, amount, at: now, songId };
    xp = {
      ...xp,
      total: xp.total + amount,
      events: [ev, ...xp.events].slice(0, XP_EVENT_KEEP),
    };
    set({ xp });
    const newLv = level(xp.total);
    if (opts?.forceToast) get().pushToast(opts.forceToast, type === 'release' ? 'pink' : 'gold');
    else if (amount) get().pushToast(`+${amount} XP`, type === 'release' || type === 'onboard' ? 'pink' : 'gold');
    if (opts?.celebrate) get().celebrate(opts.celebrate, { amount, level: newLv });
    if (newLv > oldLv) {
      get().celebrate('levelup', { level: newLv });
      get().pushToast(`LEVEL UP! LV ${newLv}`, 'pink');
      // unlocks
      const unlocked: string[] = [];
      for (const d of DECOR_UNLOCKS) {
        if (d.level === newLv && !get().studio.decorUnlocked.includes(d.id)) {
          unlocked.push(d.name);
          set({
            studio: {
              ...get().studio,
              decorUnlocked: [...get().studio.decorUnlocked, d.id],
            },
          });
        }
      }
      if (newLv === 10 && !get().studio.speciesUnlocked.includes(5)) {
        set({
          studio: {
            ...get().studio,
            speciesUnlocked: [...get().studio.speciesUnlocked, 5],
          },
        });
        unlocked.push('GHOST');
      }
      if (newLv === 15) {
        // Double Boombox gear index — append synthetic
        unlocked.push('Double Boombox');
      }
      for (const u of unlocked) {
        get().celebrate('unlock', { name: u });
        get().pushToast(`UNLOCKED — ${u}`, 'gold');
      }
    }

    // streak touch
    if (songId || type === 'capture' || type === 'session') {
      applyStreakTouch(now, songId);
    }
    // weekly quest progress hooks
    bumpQuest(type, songId);
    schedulePersist(get);
  };

  const applyStreakTouch = (now: number, _songId?: string) => {
    const today = dayKey(new Date(now));
    const touchDays = get()
      .xp.events.filter((e) => e.songId || e.type === 'capture' || e.type === 'session')
      .map((e) => dayKey(new Date(e.at)));
    const sessions = get().sessions.filter((s) => s.endedAt).map((s) => dayKey(new Date(s.startedAt)));
    const all = Array.from(new Set([...touchDays, ...sessions, today]));
    const streak = applyTouchDay(get().streak, get().settings.schedule, today, all);
    // streak bonus
    if (streak.current > 0 && streak.current % STREAK_BONUS_EVERY === 0 && streak.lastTouchDay === today && get().streak.current !== streak.current) {
      // grant after set
      set({ streak });
      grantXp('streak_bonus', STREAK_BONUS_XP, undefined, {
        forceToast: `+${STREAK_BONUS_XP} XP — STREAK BONUS`,
      });
      return;
    }
    set({ streak });
  };

  const bumpQuest = (type: XpType, songId?: string) => {
    const q = get().quests.weekly;
    if (!q || q.done) return;
    const tmpl = questTemplate(q.templateId);
    if (!tmpl) return;
    let inc = 0;
    const track = tmpl.track;
    if (track === 'task' && type === 'task') inc = 1;
    if (track === 'walkaway' && type === 'walkaway') inc = 1;
    if (track === 'session' && type === 'session') inc = 1;
    if (track === 'stageclear' && type === 'stageclear') inc = 1;
    if (track === 'demo-day' && type === 'demo_day') inc = 1;
    if (track === 'boss-start' && type === 'capture') inc = 0; // handled elsewhere
    if (track === 'all-tasks-done' && type === 'task' && songId === q.songId) {
      const song = get().songs.find((s) => s.id === songId);
      if (song && song.tasks.every((t) => t.done)) inc = 1;
    }
    if (track === 'touch-day' && (type === 'task' || type === 'session' || type === 'capture')) {
      // count unique days — simplified: +1 once per call if progress < goal
      const today = dayKey();
      const key = `tq-touch-${q.id}`;
      const last = sessionStorage.getItem(key);
      if (last !== today) {
        sessionStorage.setItem(key, today);
        inc = 1;
      }
    }
    if (!inc) return;
    const progress = Math.min(q.goal, q.progress + inc);
    const done = progress >= q.goal;
    set({ quests: { ...get().quests, weekly: { ...q, progress, done } } });
    if (done) {
      grantXp('quest_weekly', q.xp, q.songId, {
        forceToast: `QUEST CLEAR +${q.xp} XP`,
        celebrate: 'quest',
      });
    }
  };

  const touchSong = (songId: string) => {
    const song = get().songs.find((s) => s.id === songId);
    if (!song || song.isExample) return;
    set({
      songs: get().songs.map((s) =>
        s.id === songId ? { ...s, lastTouchedAt: Date.now() } : s,
      ),
    });
    schedulePersist(get);
  };

  return {
    ...createInitialRoot(),
    hydrated: false,
    view: 'board',
    previousView: 'board',
    openSongId: null,
    companionTarget: null,
    companionAnim: 'idle',
    bubble: null,
    toasts: [],
    celebrateQueue: [],
    captureOpen: false,
    shelveConfirmId: null,
    releaseFlowId: null,
    walkAwayPrompt: false,
    reducedMotion:
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    editingCreator: false,

    hydrate: async () => {
      const loaded = await loadState();
      const now = Date.now();
      if (loaded && loaded.onboarding.completed) {
        const away = now - (loaded.meta.lastOpenedAt || now);
        const speaks = away >= 30 * 60_000 ? 0 : loaded.coach.speaksThisSession;
        const patched = {
          ...loaded,
          meta: { ...loaded.meta, lastOpenedAt: now },
          coach: { ...loaded.coach, speaksThisSession: speaks },
        };
        const eq = ensureDailyAndWeekly(patched, now);
        set({
          ...patched,
          ...eq,
          hydrated: true,
          view: loaded.activeSessionId
            ? 'focus'
            : loaded.settings.defaultView,
          companionAnim: 'idle',
        });
        // resume session view
        if (loaded.activeSessionId) set({ view: 'focus' });
        setTimeout(() => get().evalCoach(), 800);
      } else {
        set({ hydrated: true, onboarding: createInitialRoot().onboarding });
      }
      schedulePersist(get);
    },

    setView: (v) => {
      set({ previousView: get().view, view: v });
      setTimeout(() => get().evalCoach(), 200);
    },
    setCompanionTarget: (t) => set({ companionTarget: t }),
    setCompanionAnim: (a) => set({ companionAnim: a }),
    pushToast: (msg, kind = 'gold') => {
      const id = nanoid();
      set({ toasts: [...get().toasts.slice(-2), { id, msg, kind }] });
      setTimeout(() => {
        set({ toasts: get().toasts.filter((t) => t.id !== id) });
      }, 2600);
    },
    celebrate: (kind, payload) => {
      if (get().reducedMotion || get().settings.reducedCelebrations) return;
      set({ celebrateQueue: [...get().celebrateQueue, { kind, payload }] });
      if (kind === 'task' || kind === 'levelup' || kind === 'quest' || kind === 'walkaway') {
        set({ companionAnim: 'jump' });
        setTimeout(() => set({ companionAnim: 'idle' }), 650);
      }
      if (kind === 'session') {
        set({ companionAnim: 'nod' });
        setTimeout(() => set({ companionAnim: 'idle' }), 400);
      }
    },

    setOnboardingAnswer: (partial) => {
      set({ profile: { ...get().profile, ...partial } });
      if (partial.voice) set({ settings: { ...get().settings, voice: partial.voice } });
      if (partial.schedule) set({ settings: { ...get().settings, schedule: partial.schedule } });
      if (partial.pain) {
        const d = painDefaults(partial.pain);
        set({
          settings: {
            ...get().settings,
            walkAwayEnabled: d.walkAwayEnabled,
          },
        });
      }
    },
    setCharacter: (c) => set({ character: { ...get().character, ...c } }),

    completeOnboarding: ({ rescuedTitle, rescuedStage, skipped, acceptPlan }) => {
      const now = Date.now();
      const profile = get().profile;
      const base = seedAttributeBase(profile.expTier, profile.pain);
      const defaults = painDefaults(profile.pain);
      let songs = exampleSongs(now);
      let rescuedSongId: string | undefined;
      let openId: string | null = null;

      if (!skipped && rescuedTitle) {
        const id = nanoid();
        const stage = (rescuedStage ?? 1) as Stage;
        const song: Song = {
          id,
          title: rescuedTitle.slice(0, 40),
          stage,
          status: 'active',
          createdAt: now,
          stageEnteredAt: now - 14 * DAY_MS,
          lastTouchedAt: now,
          tasks: acceptPlan
            ? generatePlan({ stage, versions: [], title: rescuedTitle }, profile.pain)
            : defaultTasksForStage(stage, profile.pain),
          versions: [],
          memos: [],
          references: [],
          notes: '',
          coverSeed: id,
          demoDayStamps: [],
        };
        songs = [song, ...songs];
        rescuedSongId = id;
        if (acceptPlan) openId = id;
      } else {
        const id = nanoid();
        songs = [
          {
            id,
            title: 'Untitled idea 1',
            stage: 0,
            status: 'active',
            createdAt: now,
            stageEnteredAt: now,
            lastTouchedAt: now,
            tasks: [
              {
                id: nanoid(),
                text: 'Capture the spark before it fades',
                done: false,
                source: 'user',
                createdAt: now,
              },
            ],
            versions: [],
            memos: [],
            references: [],
            notes: '',
            coverSeed: id,
            demoDayStamps: [],
          },
          ...songs,
        ];
      }

      const cadence = get().settings.demoDayCadenceDays;
      set({
        attributes: { base },
        songs,
        onboarding: {
          completed: true,
          rescuedSongId,
          skippedRescue: skipped,
          exampleShelfDismissed: false,
        },
        settings: {
          ...get().settings,
          voice: profile.voice,
          schedule: profile.schedule,
          walkAwayEnabled: defaults.walkAwayEnabled,
        },
        meta: { ...get().meta, createdAt: now, lastOpenedAt: now },
        nextDemoDayAt: cadence > 0 ? now + cadence * DAY_MS : undefined,
        view: get().settings.defaultView,
        openSongId: openId,
      });
      const eq = ensureDailyAndWeekly(extractRoot(get()), now);
      set(eq);
      grantXp('onboard', ONBOARD_XP, undefined, {
        forceToast: '+40 XP — ARTIST CREATED',
      });
      schedulePersist(get);
    },

    dismissExamples: () => {
      set({
        songs: get().songs.filter((s) => !s.isExample),
        onboarding: { ...get().onboarding, exampleShelfDismissed: true },
      });
      schedulePersist(get);
    },

    createIdea: (title, memo) => {
      const now = Date.now();
      const id = nanoid();
      let audioId: string | undefined;
      if (memo?.audio) {
        audioId = nanoid();
        void saveBlob(audioId, memo.audio).catch(() => {
          get().pushToast('SAVED WITHOUT AUDIO — STORAGE FULL');
          audioId = undefined;
        });
      }
      const song: Song = {
        id,
        title: (title || 'Untitled idea').slice(0, 40),
        stage: 0,
        status: 'active',
        createdAt: now,
        stageEnteredAt: now,
        lastTouchedAt: now,
        tasks: [
          {
            id: nanoid(),
            text: 'Capture the spark before it fades',
            done: false,
            source: 'user',
            createdAt: now,
          },
        ],
        versions: [],
        memos: memo
          ? [
              {
                id: nanoid(),
                kind: memo.audio ? 'voice' : 'text',
                text: memo.text,
                audioId,
                createdAt: now,
                isSeed: true,
              },
            ]
          : [],
        references: [],
        notes: '',
        coverSeed: id,
        demoDayStamps: [],
      };
      set({ songs: [song, ...get().songs], captureOpen: false });
      grantXp('capture', CAPTURE_XP, id);
      schedulePersist(get);
      return id;
    },

    openSong: (id) => {
      set({ openSongId: id, view: id ? 'song' : get().previousView === 'song' ? 'board' : get().view });
      if (id) {
        setTimeout(() => {
          const hit = checkSeedReplay(extractRoot(get()), id, Date.now());
          if (hit) showTrigger(hit);
        }, 400);
      }
    },

    updateSong: (id, patch) => {
      set({
        songs: get().songs.map((s) => (s.id === id ? { ...s, ...patch, lastTouchedAt: Date.now() } : s)),
      });
      schedulePersist(get);
    },

    toggleTask: (songId, taskId) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song || song.isExample) {
        // still allow UI toggle on examples but no XP
        if (song?.isExample) {
          set({
            songs: get().songs.map((s) => {
              if (s.id !== songId) return s;
              return {
                ...s,
                tasks: s.tasks.map((t) =>
                  t.id === taskId ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined } : t,
                ),
              };
            }),
          });
        }
        return;
      }
      let becameDone = false;
      let arrangeKit = false;
      set({
        songs: get().songs.map((s) => {
          if (s.id !== songId) return s;
          return {
            ...s,
            lastTouchedAt: Date.now(),
            tasks: s.tasks.map((t) => {
              if (t.id !== taskId) return t;
              becameDone = !t.done;
              arrangeKit = !!t.arrangeKit;
              return {
                ...t,
                done: !t.done,
                completedAt: !t.done ? Date.now() : undefined,
              };
            }),
          };
        }),
      });
      if (becameDone) {
        grantXp('task', TASK_XP, songId, { celebrate: 'task', forceToast: '+15 XP' });
        void arrangeKit;
      }
      schedulePersist(get);
    },

    addTask: (songId, text) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song || song.isExample) return;
      const task: Task = {
        id: nanoid(),
        text,
        done: false,
        source: 'user',
        createdAt: Date.now(),
      };
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? { ...s, tasks: [...s.tasks, task], lastTouchedAt: Date.now() }
            : s,
        ),
      });
      schedulePersist(get);
    },

    reorderTasks: (songId, from, to) => {
      set({
        songs: get().songs.map((s) => {
          if (s.id !== songId) return s;
          const tasks = [...s.tasks];
          const [item] = tasks.splice(from, 1);
          tasks.splice(to, 0, item);
          return { ...s, tasks };
        }),
      });
      schedulePersist(get);
    },

    advanceStage: (songId) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song || song.isExample || song.stage >= 4) return;
      if (!song.tasks.every((t) => t.done)) return;
      const next = (song.stage + 1) as Stage;
      if (next === 4) {
        set({ releaseFlowId: songId });
        return;
      }
      const tasks = defaultTasksForStage(next, get().profile.pain);
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                stage: next,
                stageEnteredAt: Date.now(),
                lastTouchedAt: Date.now(),
                tasks,
              }
            : s,
        ),
        openSongId: null,
        view: 'studio',
        companionAnim: 'carry',
      });
      const xpAmt = STAGE_CLEAR_XP[next] ?? 30;
      grantXp('stageclear', xpAmt, songId, {
        forceToast: `+${xpAmt} XP — STAGE CLEAR`,
        celebrate: 'stageclear',
      });
      setTimeout(() => set({ companionAnim: 'idle' }), 1200);
      schedulePersist(get);
    },

    moveSongStage: (songId, stage) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song || song.isExample) return;
      if (stage > song.stage) {
        // forward — same as advance if +1 and tasks done, else force move with ceremony if tasks done
        if (stage === 4) {
          set({ releaseFlowId: songId });
          return;
        }
        const tasks =
          stage > song.stage
            ? defaultTasksForStage(stage, get().profile.pain)
            : song.tasks;
        set({
          songs: get().songs.map((s) =>
            s.id === songId
              ? {
                  ...s,
                  stage,
                  stageEnteredAt: Date.now(),
                  lastTouchedAt: Date.now(),
                  tasks,
                }
              : s,
          ),
        });
        if (stage > song.stage) {
          const xpAmt = STAGE_CLEAR_XP[stage] ?? 30;
          grantXp('stageclear', xpAmt, songId, {
            forceToast: `+${xpAmt} XP — STAGE CLEAR`,
            celebrate: 'stageclear',
          });
        }
      } else {
        // backward silent
        set({
          songs: get().songs.map((s) =>
            s.id === songId ? { ...s, stage, stageEnteredAt: Date.now() } : s,
          ),
        });
      }
      schedulePersist(get);
    },

    shelveSong: (songId) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song || song.isExample) return;
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                status: 'shelved',
                shelvedAt: Date.now(),
                priorStage: s.stage,
              }
            : s,
        ),
        openSongId: null,
        shelveConfirmId: null,
      });
      grantXp('shelve', SHELVE_XP, songId, {
        forceToast: '+10 XP — KNOWING WHEN TO STOP IS A SKILL',
      });
      // merciless plaque
      const shelved = get().songs.filter((s) => s.status === 'shelved' && !s.isExample).length;
      if (shelved >= 10 && !get().studio.titlesUnlocked.includes('MERCILESS')) {
        set({
          studio: {
            ...get().studio,
            titlesUnlocked: [...get().studio.titlesUnlocked, 'MERCILESS'],
          },
        });
        get().pushToast('UNLOCKED — MERCILESS', 'gold');
      }
      schedulePersist(get);
    },

    reviveSong: (songId) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song || song.status !== 'shelved') return;
      const now = Date.now();
      const long = song.shelvedAt && now - song.shelvedAt >= REVIVE_BONUS_DAYS * DAY_MS;
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                status: 'active',
                stage: s.priorStage ?? s.stage,
                lastTouchedAt: now,
                shelvedAt: undefined,
              }
            : s,
        ),
        companionAnim: 'jump',
      });
      if (long) {
        grantXp('revive', REVIVE_XP, songId, {
          forceToast: '+20 XP — CRATE DIGGER',
        });
        if (!get().studio.titlesUnlocked.includes('CRATE DIGGER')) {
          set({
            studio: {
              ...get().studio,
              titlesUnlocked: [...get().studio.titlesUnlocked, 'CRATE DIGGER'],
            },
          });
        }
      }
      setTimeout(() => set({ companionAnim: 'idle' }), 650);
      schedulePersist(get);
    },

    deleteSong: (songId) => {
      set({
        songs: get().songs.filter((s) => s.id !== songId),
        openSongId: null,
      });
      get().pushToast('SONG DELETED — UNDO?', 'pink');
      schedulePersist(get);
    },

    setReleaseDate: (songId, date) => {
      set({
        songs: get().songs.map((s) =>
          s.id === songId ? { ...s, releaseDate: date, lastTouchedAt: Date.now() } : s,
        ),
      });
      const q = get().quests.weekly;
      if (q && !q.done && questTemplate(q.templateId)?.track === 'boss-start') {
        set({
          quests: {
            ...get().quests,
            weekly: { ...q, progress: Math.min(q.goal, q.progress + 1), done: q.progress + 1 >= q.goal },
          },
        });
        if (q.progress + 1 >= q.goal) {
          grantXp('quest_weekly', q.xp, songId, {
            forceToast: `QUEST CLEAR +${q.xp} XP`,
            celebrate: 'quest',
          });
        }
      }
      schedulePersist(get);
    },

    completeRelease: (songId, opts) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song) return;
      const now = Date.now();
      const onTime =
        song.releaseDate !== undefined && now <= song.releaseDate + DAY_MS;
      const ideaToRelease = Math.floor((now - song.createdAt) / DAY_MS);
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                stage: 4 as Stage,
                status: 'released' as const,
                releasedAt: opts?.date ?? now,
                releaseLink: opts?.link,
                plays: opts?.plays,
                lastTouchedAt: now,
                tasks: [
                  {
                    id: nanoid(),
                    text: 'Released',
                    done: true,
                    source: 'user',
                    createdAt: now,
                    completedAt: now,
                  },
                ],
              }
            : s,
        ),
        releaseFlowId: null,
        openSongId: null,
        companionAnim: 'jump',
      });
      grantXp('release', RELEASE_XP, songId, {
        forceToast: 'RELEASED! +150 XP',
        celebrate: 'release',
      });
      if (onTime) get().pushToast('ON TIME. LEGEND.', 'gold');

      // plaques
      const released = get().songs.filter((s) => s.status === 'released' && !s.isExample).length;
      const titles = [...get().studio.titlesUnlocked];
      const unlocks: string[] = [];
      if (released >= 1 && !titles.includes('FIRST BLOOD')) {
        titles.push('FIRST BLOOD');
        unlocks.push('FIRST BLOOD');
      }
      if (released >= 3 && !titles.includes('EP ENERGY')) {
        titles.push('EP ENERGY');
        unlocks.push('EP ENERGY');
      }
      if (released >= 5 && !titles.includes('CERTIFIED FINISHER')) {
        titles.push('CERTIFIED FINISHER');
        unlocks.push('CERTIFIED FINISHER');
      }
      if (ideaToRelease <= 30 && !titles.includes('SPEEDRUN')) {
        titles.push('SPEEDRUN');
        unlocks.push('SPEEDRUN');
      }
      if (released >= 1 && !get().studio.speciesUnlocked.includes(6)) {
        set({
          studio: {
            ...get().studio,
            speciesUnlocked: [...get().studio.speciesUnlocked, 6],
            titlesUnlocked: titles,
          },
        });
        unlocks.push('FROG');
      } else {
        set({ studio: { ...get().studio, titlesUnlocked: titles } });
      }
      for (const u of unlocks) {
        get().pushToast(`UNLOCKED — ${u}`, 'gold');
        get().celebrate('unlock', { name: u });
      }
      if (released >= 3) {
        // Tour Mic
        get().pushToast('UNLOCKED — Tour Mic', 'gold');
      }
      schedulePersist(get);
    },

    addVersion: (songId, note, opts) => {
      const song = get().songs.find((s) => s.id === songId);
      if (!song || song.isExample) return;
      let audioId: string | undefined;
      if (opts?.audio) {
        audioId = nanoid();
        void saveBlob(audioId, opts.audio).catch(() => {
          get().pushToast('SAVED WITHOUT AUDIO — STORAGE FULL');
          audioId = undefined;
        });
      }
      const label = `v${song.versions.length + 1}`;
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                lastTouchedAt: Date.now(),
                versions: [
                  {
                    id: nanoid(),
                    label,
                    note,
                    createdAt: Date.now(),
                    audioId,
                    walkAway: opts?.walkAway,
                    demoDay: opts?.demoDay,
                  },
                  ...s.versions,
                ],
              }
            : s,
        ),
      });
      schedulePersist(get);
    },

    addMemo: (songId, memo) => {
      let audioId: string | undefined;
      if (memo.audio) {
        audioId = nanoid();
        void saveBlob(audioId, memo.audio).catch(() => {
          get().pushToast('SAVED WITHOUT AUDIO — STORAGE FULL');
          audioId = undefined;
        });
      }
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? {
                ...s,
                lastTouchedAt: Date.now(),
                memos: [
                  {
                    id: nanoid(),
                    kind: memo.kind,
                    text: memo.text,
                    audioId,
                    createdAt: Date.now(),
                    isSeed: memo.isSeed,
                  },
                  ...s.memos,
                ],
              }
            : s,
        ),
      });
      schedulePersist(get);
    },

    setNotes: (songId, notes) => {
      set({
        songs: get().songs.map((s) =>
          s.id === songId ? { ...s, notes, lastTouchedAt: Date.now() } : s,
        ),
      });
      schedulePersist(get);
    },

    setReferences: (songId, refs) => {
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? { ...s, references: refs.slice(0, 3), lastTouchedAt: Date.now() }
            : s,
        ),
      });
      schedulePersist(get);
    },

    startSession: (songId, intent, goal) => {
      const id = nanoid();
      set({
        sessions: [
          {
            id,
            songId,
            intent,
            goal,
            startedAt: Date.now(),
            minutes: 0,
            tasksCompleted: [],
            snoozes: 0,
          },
          ...get().sessions,
        ],
        activeSessionId: id,
        view: 'focus',
        companionAnim: 'headphones-desk',
        walkAwayPrompt: false,
      });
      schedulePersist(get);
    },

    snoozeWalkAway: () => {
      const id = get().activeSessionId;
      if (!id) return;
      set({
        sessions: get().sessions.map((s) =>
          s.id === id ? { ...s, snoozes: s.snoozes + 1 } : s,
        ),
        walkAwayPrompt: false,
      });
      schedulePersist(get);
    },

    endSession: (opts) => {
      const id = get().activeSessionId;
      if (!id) return;
      const sess = get().sessions.find((s) => s.id === id);
      if (!sess) return;
      const now = Date.now();
      const minutes = Math.min(
        SESSION_MAX_MINUTES,
        Math.round((now - sess.startedAt) / 60000),
      );
      const walkAway = opts.walkAway ?? sess.walkAwayBounce;
      // complete tasks
      if (opts.taskIds && sess.songId) {
        for (const tid of opts.taskIds) {
          get().toggleTask(sess.songId, tid);
        }
      }
      if (walkAway && sess.songId) {
        get().addVersion(sess.songId, opts.bounceNote || 'Walk-away bounce', {
          audio: opts.audio,
          walkAway: true,
        });
        const wx = walkawayXp(sess.snoozes);
        if (wx > 0) {
          grantXp('walkaway', wx, sess.songId, {
            forceToast: `+${wx} XP — WALKED AWAY CLEAN`,
            celebrate: 'walkaway',
          });
        }
        // golden bounce unlock at 10
        const waCount = get().songs.reduce(
          (n, s) => n + s.versions.filter((v) => v.walkAway).length,
          0,
        );
        if (waCount >= 10) get().pushToast('UNLOCKED — Golden Bounce', 'gold');
      } else if (opts.attachBounce && sess.songId) {
        get().addVersion(sess.songId, opts.bounceNote || 'Session bounce', {
          audio: opts.audio,
        });
      }

      const xpAmt = sessionXp(minutes);
      set({
        sessions: get().sessions.map((s) =>
          s.id === id
            ? {
                ...s,
                endedAt: now,
                minutes,
                summary:
                  opts.summary ||
                  (sess.intent === 'play' ? 'just played — counts.' : opts.summary),
                walkAwayBounce: walkAway,
                tasksCompleted: opts.taskIds ?? [],
              }
            : s,
        ),
        activeSessionId: undefined,
        view: 'board',
        companionAnim: 'idle',
        walkAwayPrompt: false,
      });

      if (minutes < 3) {
        get().pushToast('LOGGED — TINY BUT REAL');
      } else if (xpAmt > 0) {
        grantXp('session', xpAmt, sess.songId, {
          forceToast: `+${xpAmt} XP — SESSION LOGGED`,
          celebrate: 'session',
        });
      }
      if (sess.songId) touchSong(sess.songId);
      schedulePersist(get);
    },

    completeSpark: () => {
      const spark = get().quests.dailySpark;
      if (!spark || spark.done) return;
      set({
        quests: {
          ...get().quests,
          dailySpark: { ...spark, done: true },
        },
      });
      grantXp('quest_daily', 10, undefined, { forceToast: '+10 XP' });
      schedulePersist(get);
    },
    skipSpark: () => {
      const spark = get().quests.dailySpark;
      if (!spark) return;
      set({
        quests: {
          ...get().quests,
          dailySpark: { ...spark, skipped: true },
        },
      });
      schedulePersist(get);
    },
    rerollWeekly: () => {
      if (get().quests.rerollUsedThisWeek) return;
      const now = Date.now();
      const weekly = generateWeeklyQuest(
        extractRoot(get()),
        now,
        get().quests.weekly?.templateId,
      );
      set({
        quests: { ...get().quests, weekly, rerollUsedThisWeek: true },
      });
      schedulePersist(get);
    },

    evalCoach: () => {
      if (!get().onboarding.completed) return;
      if (get().bubble) return;
      const hit = activeTriggers(extractRoot(get()), Date.now());
      if (hit) showTrigger(hit);
    },

    dismissBubble: (accepted, buttonId) => {
      const b = get().bubble;
      if (!b) return;
      const now = Date.now();
      if (b.triggerId) {
        const dKey = b.songId ? `${b.triggerId}:${b.songId}` : b.triggerId;
        const prev = get().coach.dismissals[dKey] ?? 0;
        const { key, until, dismissals } = nextCooldown(
          b.triggerId,
          b.songId,
          prev,
          now,
          !!accepted,
        );
        let speaks = get().coach.speaksThisSession;
        if (b.triggerId === 'return_absence') speaks = SPEECH_BUDGET;
        else if (!accepted || true) {
          // unprompted counted when shown
        }
        set({
          coach: {
            ...get().coach,
            triggerCooldowns: { ...get().coach.triggerCooldowns, [key]: until },
            dismissals: {
              ...get().coach.dismissals,
              [key]: accepted ? 0 : dismissals,
            },
            lastSpokeAt: now,
            speaksThisSession: speaks,
            memory: [
              {
                at: now,
                kind: b.triggerId,
                songId: b.songId,
                detail: buttonId,
              },
              ...get().coach.memory,
            ].slice(0, 50),
          },
          bubble: null,
        });

        // handle button actions
        if (accepted && buttonId) handleCoachButton(b.triggerId, buttonId, b.songId);
      } else {
        set({ bubble: null });
      }
      schedulePersist(get);
    },

    tapCompanion: () => {
      const voice = get().settings.voice;
      const roll = Math.random();
      if (roll < 0.1) {
        set({ companionAnim: 'jump' });
        setTimeout(() => set({ companionAnim: 'idle' }), 650);
        return;
      }
      void speak;
      const pool = IDLE_QUIPS[voice];
      const active = get().songs.find((s) => s.status === 'active' && !s.isExample);
      const weekMin = get()
        .sessions.filter((s) => s.endedAt && s.endedAt >= get().xp.weekStart)
        .reduce((a, s) => a + s.minutes, 0);
      const text = pool[Math.floor(Math.random() * pool.length)]
        .replace('{song}', active?.title ?? 'that track')
        .replace('{n}', String(roll < 0.2 ? weekMin : level(get().xp.total)));
      set({
        bubble: { text, buttons: [] },
      });
      setTimeout(() => {
        if (get().bubble?.text === text) set({ bubble: null });
      }, 5000);
    },

    muteCoachWeek: () => {
      set({
        coach: {
          ...get().coach,
          mutedUntil: Date.now() + 7 * DAY_MS,
        },
        bubble: null,
      });
      get().pushToast('MUTED FOR A WEEK');
      schedulePersist(get);
    },

    applyStreakRepair: (accept) => {
      if (accept) {
        set({ streak: applyRepair(get().streak, dayKey()) });
        set({
          bubble: {
            text: 'I COVERED FOR YOU',
            buttons: [],
          },
          coach: {
            ...get().coach,
            memory: [
              { at: Date.now(), kind: 'streak_repair' },
              ...get().coach.memory,
            ],
          },
        });
        setTimeout(() => set({ bubble: null }), 3000);
      } else {
        set({
          streak: { ...get().streak, current: 0 },
        });
      }
      schedulePersist(get);
    },

    updateSettings: (partial) => {
      set({ settings: { ...get().settings, ...partial } });
      if (partial.voice) set({ profile: { ...get().profile, voice: partial.voice } });
      if (partial.schedule) set({ profile: { ...get().profile, schedule: partial.schedule } });
      schedulePersist(get);
    },
    updateProfile: (partial) => {
      set({ profile: { ...get().profile, ...partial } });
      schedulePersist(get);
    },
    equipTitle: (title) => {
      set({ studio: { ...get().studio, equippedTitle: title } });
      schedulePersist(get);
    },
    placeDecor: (decorId, room, x) => {
      const placed = get().studio.decorPlaced.filter((d) => d.decorId !== decorId);
      placed.push({ decorId, room, x });
      set({ studio: { ...get().studio, decorPlaced: placed } });
      schedulePersist(get);
    },
    removeDecor: (decorId) => {
      set({
        studio: {
          ...get().studio,
          decorPlaced: get().studio.decorPlaced.filter((d) => d.decorId !== decorId),
        },
      });
      schedulePersist(get);
    },

    setCaptureOpen: (open) => set({ captureOpen: open }),

    logDemoDay: (songId, note, audio, _heard) => {
      get().addVersion(songId, note, { audio, demoDay: true });
      set({
        songs: get().songs.map((s) =>
          s.id === songId
            ? { ...s, demoDayStamps: [...s.demoDayStamps, Date.now()] }
            : s,
        ),
        nextDemoDayAt:
          Date.now() + get().settings.demoDayCadenceDays * DAY_MS,
      });
      grantXp('demo_day', DEMO_DAY_XP, songId, {
        forceToast: '+35 XP — DEMO DAY',
        celebrate: 'quest',
      });
      schedulePersist(get);
    },
    snoozeDemoDay: () => {
      set({ nextDemoDayAt: Date.now() + 7 * DAY_MS });
      schedulePersist(get);
    },

    eraseAll: async () => {
      const { clearState } = await import('./persistence');
      await clearState();
      const fresh = createInitialRoot();
      set({ ...fresh, hydrated: true, view: 'board', bubble: null, toasts: [], openSongId: null });
    },

    replaceState: (s) => {
      set({ ...s, hydrated: true });
      schedulePersist(get);
    },

    touchSong,
  };

  function showTrigger(hit: TriggerHit) {
    const text = speak(hit.id, get().settings.voice, hit.ctx);
    set({
      bubble: {
        text,
        buttons: hit.buttons,
        triggerId: hit.id,
        songId: hit.songId,
      },
      coach: {
        ...get().coach,
        speaksThisSession: get().coach.speaksThisSession + (hit.id === 'weekly_report' ? 0 : 1),
        lastSpokeAt: Date.now(),
      },
    });
    if (hit.id === 'weekly_report') {
      setTimeout(() => get().dismissBubble(true), 12000);
    }
  }

  function handleCoachButton(triggerId: string, buttonId: string, songId?: string) {
    const g = get();
    if (triggerId === 'stuck_song' || triggerId === 'rescue_offer') {
      if (buttonId === 'breakdown' && songId) {
        const song = g.songs.find((s) => s.id === songId);
        if (!song) return;
        const plan = generatePlan(song, g.profile.pain);
        set({
          songs: g.songs.map((s) =>
            s.id === songId ? { ...s, tasks: plan, lastTouchedAt: Date.now() } : s,
          ),
          openSongId: songId,
          view: 'song',
        });
      }
      if (buttonId === 'shelve' && songId) set({ shelveConfirmId: songId });
    }
    if (triggerId === 'tweak_spiral' && buttonId === 'rewrite' && songId) {
      const song = g.songs.find((s) => s.id === songId);
      if (!song) return;
      const plan = generatePlan(song, g.profile.pain);
      set({
        songs: g.songs.map((s) =>
          s.id === songId ? { ...s, tasks: plan } : s,
        ),
        openSongId: songId,
        view: 'song',
      });
    }
    if (triggerId === 'hoarding' && buttonId === 'pick') {
      const oldest = [...g.songs]
        .filter((s) => s.stage === 0 && s.status === 'active' && !s.isExample)
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      if (oldest) {
        set({ openSongId: oldest.id, view: 'song' });
      }
    }
    if (triggerId === 'streak_risk' && buttonId === 'quick') {
      set({ captureOpen: true });
    }
    if (triggerId === 'streak_repair') {
      g.applyStreakRepair(buttonId === 'COVER ME' || buttonId === 'cover');
    }
    if (triggerId === 'return_absence' && buttonId === 'reentry' && songId) {
      const song = g.songs.find((s) => s.id === songId);
      if (song) {
        const task: Task = {
          id: nanoid(),
          text: '2-min re-entry: open the project and listen once',
          done: false,
          source: 'coach',
          createdAt: Date.now(),
        };
        set({
          songs: g.songs.map((s) =>
            s.id === songId ? { ...s, tasks: [task, ...s.tasks] } : s,
          ),
          openSongId: songId,
          view: 'song',
        });
      }
    }
    if (triggerId === 'boss_near' && buttonId === 'tasks' && songId) {
      set({ openSongId: songId, view: 'song' });
    }
    if (triggerId === 'boss_missed') {
      if (buttonId === 'drop' && songId) g.setReleaseDate(songId, undefined);
      if (buttonId === 'newdate' && songId) {
        set({ openSongId: songId, view: 'song' });
      }
    }
    if (triggerId === 'demo_day') {
      if (buttonId === 'snooze') g.snoozeDemoDay();
      if (buttonId === 'bounce') set({ view: 'board', captureOpen: false });
    }
    if (triggerId === 'seed_replay' && buttonId === 'play' && songId) {
      // UI plays audio — mark handled
    }
  }
});

// helper export for spark text in UI
export { sparkText, extractRoot };
