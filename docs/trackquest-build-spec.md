# TRACKQUEST — Full Build Specification

**Purpose of this document.** This is an implementation spec, written to be handed to a coding agent (Cursor) and built end-to-end. It contains the complete feature set, every screen and flow, the data model, engine logic with exact formulas and thresholds, the full initial copy/string tables, and acceptance criteria. Where the existing prototype (`trackquest-prototype-v2.html`) already implements something correctly, this doc says "as prototype" and only specifies the delta.

**Scope of this build.** Single-player, local-first web app. No accounts, no server, no social features. All state persists in IndexedDB. The existing prototype's sprite engine, visual language, and board mechanics are the foundation — this spec extends them into the full product.

**Suggested stack (not mandatory, but assume unless changed):** Vite + React + TypeScript. Zustand (or equivalent) for the state store with an IndexedDB persistence middleware (e.g., idb-keyval). No CSS framework — port the prototype's handwritten CSS into CSS modules or a single global stylesheet using the same custom properties. Canvas-based sprite engine ported as a pure module. No audio libraries needed beyond the native `<audio>` element and `MediaRecorder` for voice memos.

**Conventions used below.**
- `MUST` = required for acceptance. `SHOULD` = strongly preferred. `MAY` = optional polish.
- All user-facing copy is given verbatim in string tables. Do not paraphrase copy; tone is a feature.
- All numbers (XP values, thresholds, timings) are exact and centralized in a `config.ts` constants file so they are tunable in one place.
- "Companion" = the pixel buddy. "Voice" = one of 4 coaching voices. "Playbook" = pain-point preset.

---

## 1. Design Tokens & Visual System

Port from the prototype verbatim. These are the canonical tokens; everything new derives from them.

```css
:root{
  --bg:#0d0e1a; --panel:#161829; --panel2:#1d2036; --line:#2a2e4a;
  --ink:#eceef8; --muted:#8b8fad;
  --pink:#ff4d9d; --mint:#3ee6c2; --gold:#ffd447; --violet:#8b6cff;
  --orange:#ff7a3d; --blue:#4da3ff;
  --pixel:'Press Start 2P','Courier New',monospace;
  --body:'Space Grotesk',system-ui,-apple-system,sans-serif;
}
```

Rules carried from the prototype and enforced app-wide:
- Pixel font (`--pixel`) is for: headings, buttons, labels, XP/level readouts, toasts, and any "system voice." Body font for descriptions and user content. Never mix within one element.
- All buttons use the `.pxbtn` pressed-shadow style (4px hard shadow, translate on `:active`).
- Borders are always 2px solid `--line`; radii are 2–8px, never larger. No blurs except the topbar backdrop.
- `image-rendering: pixelated` on every canvas.
- `prefers-reduced-motion: reduce` MUST disable: buddy walking animation, bob, confetti, screen-shake, egg wobble, and all ceremonies (replaced by instant state changes + toast).
- Breakpoints: `900px` (layout stacks), `520px` (compact: single-column options, smaller sprites, narrower bubbles) — as prototype.

New tokens for this build:
```css
:root{
  --energy-full:#3ee6c2; --energy-mid:#ffd447; --energy-low:#ff7a3d; --energy-dead:#ff4d9d;
  --shelf:#565a7d;
  --boss:#ff4d9d;
}
```

---

## 2. Data Model

All persisted state lives in one root store. TypeScript interfaces below are canonical — implement exactly, extend only by adding optional fields.

```ts
// ---------- root ----------
interface RootState {
  meta: { schemaVersion: 1; createdAt: number; lastOpenedAt: number };
  profile: Profile;
  character: Character;
  songs: Song[];
  sessions: Session[];          // global log, songId indexed
  xp: XpState;
  attributes: AttributeState;
  streak: StreakState;
  quests: QuestState;
  coach: CoachState;
  studio: StudioState;
  settings: Settings;
  onboarding: OnboardingState;
}

// ---------- profile / onboarding ----------
type Genre = 'Electronic'|'Indie'|'Rock'|'Hip-hop'|'Pop'|'Other';
type Pain  = 'steam'|'tweak'|'time'|'arrange';
type Voice = 'hype'|'real'|'drill'|'facts';
type Schedule = 'weeknights'|'weekends'|'stolen'|'chaos';

interface Profile {
  artistName: string;             // uppercase, max 16 chars
  genre: Genre;
  expTier: 0|1|2|3;               // just starting … longer than I'll admit
  pain: Pain;
  voice: Voice;
  schedule: Schedule;
  establishedYear: number;        // year of onboarding
}

interface OnboardingState {
  completed: boolean;
  rescuedSongId?: string;         // set if the user named a real song
  skippedRescue: boolean;
  exampleShelfDismissed: boolean;
}

// ---------- character ----------
interface Character {
  species: number;                // index into SPECIES (prototype)
  a: number; s: number; c: number; outfit: number; gear: number;
  companionName: string;          // max 10 chars, uppercase
}

// ---------- songs ----------
type Stage = 0|1|2|3|4;           // Ideas | In production | Mixing | Mastering | Released
type SongStatus = 'active'|'shelved'|'released';

interface Song {
  id: string;                     // nanoid
  title: string;
  stage: Stage;
  status: SongStatus;
  bpm?: number; key?: string;
  createdAt: number;
  stageEnteredAt: number;
  lastTouchedAt: number;          // drives the energy meter
  tasks: Task[];
  versions: VersionEntry[];
  memos: Memo[];
  references: Reference[];        // max 3
  coverSeed: string;              // deterministic pixel cover seed (default = id)
  coverImage?: Blob;              // optional user upload, stored in IDB
  releasedAt?: number;
  releaseDate?: number;           // future target ⇒ Boss Mode active
  shelvedAt?: number;
  demoDayStamps: number[];        // timestamps of Demo Day bounces
  isExample?: boolean;            // seeded demo cards
}

interface Task {
  id: string; text: string; done: boolean;
  source: 'user'|'coach';         // coach tasks render a paw icon
  createdAt: number; completedAt?: number;
}

interface VersionEntry {
  id: string; label: string;      // "v3", auto-incremented, editable
  note: string;                   // one line
  createdAt: number;
  audio?: Blob;                   // optional attached bounce
  walkAway?: boolean;             // created via Walk-Away Bell
  demoDay?: boolean;
}

interface Memo   { id: string; kind: 'voice'|'text'; text?: string; audio?: Blob; createdAt: number; isSeed?: boolean; }
interface Reference { id: string; label: string; url?: string; }

// ---------- sessions ----------
type Intent = 'write'|'produce'|'mix'|'master'|'admin'|'play';

interface Session {
  id: string; songId?: string;    // 'play' sessions may be songless
  intent: Intent;
  goal?: string;
  startedAt: number; endedAt?: number;
  minutes: number;                // computed on end, capped at 240
  summary?: string;               // one line
  tasksCompleted: string[];       // task ids checked during end-flow
  walkAwayBounce?: boolean;
  snoozes: number;                // Walk-Away Bell snooze count
}

// ---------- xp / level ----------
interface XpEvent { id: string; type: XpType; amount: number; at: number; songId?: string; }
type XpType = 'capture'|'task'|'session'|'walkaway'|'stageclear'|'release'|'shelve'
            | 'quest_daily'|'quest_weekly'|'demo_day'|'revive'|'onboard'|'streak_bonus';

interface XpState {
  total: number;
  events: XpEvent[];              // keep last 500, prune older
  captureXpThisWeek: number;      // resets weekly, cap enforcement
  weekStart: number;
}

// ---------- attributes (30-day rolling) ----------
type AttrKey = 'finisher'|'consistency'|'sound'|'arrangement'|'hustle';
interface AttributeState {
  base: Record<AttrKey, number>;  // seeded from expTier/pain at onboarding
  // current values are DERIVED, not stored — see §10.3
}

// ---------- streaks ----------
interface StreakState {
  current: number; best: number;
  lastTouchDay: string;           // 'YYYY-MM-DD' local
  repairsUsedThisMonth: number;   // max 1
  monthKey: string;
}

// ---------- quests ----------
interface QuestState {
  dailySpark: { dateKey: string; promptId: string; done: boolean; skipped: boolean } | null;
  weekly: WeeklyQuest | null;
  rerollUsedThisWeek: boolean;
}
interface WeeklyQuest {
  id: string; templateId: string; targetAttr: AttrKey;
  text: string; progress: number; goal: number; xp: number;
  weekKey: string; songId?: string; done: boolean;
}

// ---------- coach ----------
interface CoachState {
  mutedUntil?: number;            // studio silence mode
  lastSpokeAt: number;
  speaksThisSession: number;      // resets on app open, max 2 unprompted
  triggerCooldowns: Record<string, number>;   // triggerId → next-allowed timestamp
  dismissals: Record<string, number>;          // triggerId → count (for backoff)
  memory: CoachMemoryEvent[];     // last 50 notable events, used in copy interpolation
}
interface CoachMemoryEvent { at: number; kind: string; songId?: string; detail?: string; }

// ---------- studio ----------
interface StudioState {
  decorUnlocked: string[]; decorPlaced: { decorId: string; room: Stage; x: number }[];
  gearUnlocked: number[];         // indexes into GEARS
  titlesUnlocked: string[]; equippedTitle?: string;
  speciesUnlocked: number[];      // base 5 unlocked; extras by milestone
}

// ---------- settings ----------
interface Settings {
  voice: Voice;                   // editable post-onboarding
  schedule: Schedule;
  walkAwayEnabled: boolean;       // default: pain==='tweak'
  walkAwayMinutes: number;        // default 45, range 15–90
  notificationsEnabled: boolean;  // browser notifications, off by default
  demoDayCadenceDays: number;     // default 30, 0 = off
  reducedCelebrations: boolean;   // manual override in addition to media query
  defaultView: 'board'|'studio';  // default: studio on <900px, board otherwise
}
```

**Persistence rules.** Store MUST hydrate before first paint (show a 1-frame black screen with the equalizer if needed, never a spinner). Every mutation persists (debounced 500ms). Blobs (audio, cover images) live in a separate IDB object store keyed by id; the main state stores ids only. On schema mismatch, run a versioned migration; never wipe.

**Derived-state selectors (implement as pure functions, unit-test these):**
- `level(xp)` — see §10.1. `xpIntoLevel(xp)`, `xpForNextLevel(level)`.
- `attr(key, now)` — §10.3 rolling computation.
- `songEnergy(song, now)` — §6.4.
- `isStuck(song, now)` — energy === 0 && status === 'active' && stage < 4.
- `streakAlive(streak, schedule, now)` — §9.
- `activeTriggers(state, now)` — §12.4 evaluation order.

---

## 3. App Architecture & Module Map

```
src/
  config.ts            // ALL tunable numbers (XP table, thresholds, timings)
  strings/             // string tables — see §13. One file per domain.
    coach.ts  ui.ts  quests.ts  sparks.ts  names.ts
  engine/
    sprites.ts         // ported prototype sprite engine (pure, canvas-in, no DOM queries)
    covers.ts          // deterministic pixel cover generator (§6.2)
    xp.ts  attributes.ts  streak.ts  energy.ts
    coach/
      triggers.ts      // trigger definitions + evaluator
      speak.ts         // voice rendering + interpolation
      playbooks.ts     // pain → task generators, defaults
    quests.ts          // spark pool, weekly generator
  state/
    store.ts  persistence.ts  migrations.ts
  screens/
    Onboarding/        // Signal, Egg, Creator, Rescue
    Shell/             // topbar, view switch, global capture
    Board/  Studio/  SongDetail/  FocusSession/  Calendar/  Trophy/  Settings/
  components/
    Companion/         // positioned buddy, bubble, pathing
    Celebrations/      // toasts, confetti, ceremonies
    widgets/           // EnergyBar, XpBar, AttrBar, PixelButton, Sheet, WaveformPlayer
```

**Global invariants:**
- The companion is a single mounted component overlaying everything (as prototype's `#buddy`), position driven by a `companionTarget` field in UI state: `{ kind:'element', selector }` | `{ kind:'xy', x, y }` | `{ kind:'room', stage }`.
- One global `celebrate(kind, payload)` bus; screens never spawn confetti directly.
- One global `<QuickCapture/>` reachable from every screen (§6.6).
- Time handling: all "day" logic uses local `YYYY-MM-DD` keys; week key = ISO week; a "touch" is any XP-generating event with a songId, plus session start and memo capture.

---

## 4. Sprite Engine & Companion Animation Spec

Port the prototype's `drawSprite` (14×18 grid, species/palette/gear system) as `engine/sprites.ts` with signature `drawSprite(ctx, character, frame)`. Extend as follows.

**4.1 Frames.** Each species gains a 2-frame system: frame 0 = prototype pose; frame 1 = a minimal variant (legs offset 1px for walk; slime squashes 1px). Animation states map to frame sequences + CSS motion (as prototype's classes):

| State | Frames | CSS | Used when |
|---|---|---|---|
| `idle` | 0 | bob keyframes | default |
| `walk` | 0↔1 @ 8fps | steps() translate | moving to target |
| `jump` | 0 | jump keyframes | task done, stage clear |
| `sit`  | 0, drawn 2px lower, eyes half | none | perched on stuck cartridge |
| `sleep`| 0 + "z" pixels above | slow bob | idle > 90s on screen |
| `headphones-desk` | 0 + desk overlay sprite | tiny head-nod 2fps | during Focus Session |
| `carry`| 0 + cartridge sprite held above head | walk motion | stage-clear ceremony |
| `hype` | 0↔1 @ 12fps | rapid bob | Boss Mode, countdown < 3 days |

**4.2 Reactions (creator + general).** One-shot micro-animations, 300–600ms, implemented as temporary state overrides: `preen` (outfit change), `sneeze` (shuffle), `strum` (gear=guitar equipped), `airdrum` (gear=drumsticks), `nod` (any confirm). MUST fire in the character creator on the corresponding row change.

**4.3 Companion pathing (Studio view).** Simple: companion has a current x within the studio strip; moving = tween x at 60px/s with `walk` state, flip via `scaleX(-1)` when moving left, then `idle`. It re-targets every 20–40s to: (priority) a stuck cartridge → the room of the most recently touched song → random room. When bubble is shown, pathing pauses.

**4.4 Instrument practice (idle life).** When idle in Studio view and gear is an instrument, every ~45s MAY play a 2-note blip using WebAudio square waves; note accuracy scales with the mapped attribute (sound design ≥70 → in-key pentatonic; <40 → random detuned). Volume 10%, off when `settings.reducedCelebrations` or tab unfocused. This is a MAY — cut if time-boxed.

---

## 5. Flow: Onboarding ("The First Session")

A single route with 4 scenes. No skipping scenes except where marked. Total target time ≤ 4 min. All copy verbatim from §13.1.

**5.1 Scene: SIGNAL.**
- Black screen. A thin horizontal waveform line (canvas, 2px, `--violet`) pulses faintly.
- Three lines of pixel text fade in sequentially (700ms apart): `Somewhere on your hard drive, a song is dying.` / `It was good. You know it was good.` / `Let's go get it.`
- The prototype's equalizer bars rise beneath as line 3 lands. Button: `▶ PRESS START` (blink class).
- Reduced motion: all three lines render immediately, no pulse.

**5.2 Scene: EGG.**
- A 14×18 pixel egg sprite (new, per-species-agnostic: off-white with `--violet` speckles) sits center on a `stage-floor` ellipse. Idle: slight wobble every 4s; a music-note pixel drifts up every 6s.
- Below: the 5 questions, one at a time, using the prototype's `.qstep`/`.opts` structure and dots (now 5 dots).
- Q1 GENRE — options as prototype. On hover/focus of each option, play a 300ms genre sting (WebAudio, hardcoded tiny sequences; MAY — silent fallback fine). On select: egg speckle color shifts to genre color (Electronic `--mint`, Indie `--gold`, Rock `--orange`, Hip-hop `--violet`, Pop `--pink`, Other `--blue`).
- Q2 EXPERIENCE — options as prototype. On select: egg gains one ring of pattern per tier.
- Q3 PAIN — options as prototype. On select: egg dims 20% for 500ms, then recovers.
- Q4 VOICE — `HOW DO YOU LIKE TO BE PUSHED?` options: `Hype me up` / `Keep it real` / `Drill sergeant (gentle)` / `Just the facts`, each with the sub-copy from §13.1.
- Q5 SCHEDULE — `WHEN DOES MUSIC HAPPEN FOR YOU?` options: `Weeknights` / `Weekend deep dives` / `Stolen moments` / `Chaos, honestly`.
- On Q5 select: 600ms shake → egg swaps to a random species/palette sprite + one-shot confetti (8 pieces) → auto-advance to CREATOR after 900ms.

**5.3 Scene: CREATOR.**
- As prototype (tabs, rows, shuffle, preview) with the hatched random character pre-loaded. Additions:
  - Reactions per §4.2 on every row change.
  - `ARTIST NAME…` input + a `🎲 ROLL ONE` ghost button. Generator: pick `adj + noun` from genre-keyed lists in `strings/names.ts` (≥12 adjectives + 12 nouns per genre; provided in §13.6). Re-roll cycles without repeating until pool exhausts.
  - After name entry (blur or 8+ chars), companion raises a sign sprite: bubble `"…{SELF_NAME}?"` where SELF_NAME is generated from a 20-name pool (§13.6). Buttons: `KEEP IT` / `RENAME` (inline text input, max 10).
  - CTA: `▶ ENTER THE STUDIO` (pink pxbtn). Disabled until artist name non-empty (roll counts).

**5.4 Scene: RESCUE.**
- Studio backdrop dimmed; companion center; bubble (voice-neutral, same for all voices — this beat is scripted):
  `Okay. That song that's been sitting there. The one you thought about when I asked what kills your songs. What's it called?`
- Text input (max 40) + two buttons: `THAT ONE` (primary) / `SKIP — START FRESH` (ghost).
- On THAT ONE → one-tap stage chooser, 4 pxbtns in a row: `IDEA` / `HALF-BUILT` (stage 1) / `MIXING` / `NEARLY DONE` (stage 3).
- Create the Song: `lastTouchedAt = createdAt = now`, `stageEnteredAt = now - 14d` (so it reads as needing attention without being "stuck"-tagged yet), no bpm/key.
- Companion immediately runs the playbook offer on it (copy per pain + voice, §13.2 trigger `rescue_offer`): accept → generate the 3-task micro-plan (§12.6) and open Song Detail; decline (`LATER`) → proceed to app.
- On SKIP → create `Untitled idea 1` in stage 0 with task `Capture the spark before it fades`, set `skippedRescue = true`.
- Then: `onboarding.completed = true`, grant `onboard` XP **+40**, toast `+40 XP — ARTIST CREATED`, enter the Shell. Seed the **Example Shelf**: 4 demo songs (`Runner`, `Static Hearts`, `Midnight Fuel`, `First Light` with prototype data, `isExample:true`) rendered in a collapsed strip below the board titled `EXAMPLE SHELF` with a `✕ DISMISS EXAMPLES` control (sets `exampleShelfDismissed`, deletes them). Example songs grant **zero XP** from any action and are excluded from all triggers, quests, stats, and counts.

---

## 6. Flow: Main Shell & Workspace

**6.1 Topbar** (as prototype) + additions left-to-right: mini-logo (tap = home view) · view toggle `BOARD | STUDIO` (pixel tabs) · streak flame `🔥 {n}` (tap → Calendar) · XP cluster (LV / bar / n XP, tap → Trophy/Stats) · `+` global capture · `⚙` settings.

**6.2 Board view.** As prototype with these deltas:
- Cards gain: 16×16 generative cover (deterministic from `coverSeed`: 4×4 mirrored pattern, 2 colors picked by hashing seed against the palette; implement in `engine/covers.ts`), the **EnergyBar** replacing the days line (§6.4), coach-task paw badge if any open coach tasks.
- Drag-and-drop between columns MUST work (pointer events, keyboard alternative: card focus + `[`/`]`). Dropping forward ≥1 stage triggers the same advance logic/ceremony as the button. Dropping backward is allowed silently (no XP, tasks kept).
- Column 4 (Released) shows plays field only if user entered one; never auto-displays.
- `+ New idea` as prototype (XP via capture rules §6.6).
- STUCK tag now derives from energy (== 0), not raw days.

**6.3 Studio view.** A horizontally scrollable strip (snap per room), 5 rooms in stage order, each 320px wide, drawn with CSS/pixel-art divs (no heavy canvas scene):
- Room chrome: floor line, wall in `--panel`, room label plaque in pixel font, stage accent color as a wall stripe (reuse `c0–c4` colors).
- Room furniture (static sprites, 1 canvas each): Ideas = crate + corkboard; Production = desk + synth; Mixing = console + monitors; Mastering = rack + lamp; Release Bay = shutter door + hand truck.
- Each active song renders as a **cartridge**: 40×28px rounded rect in `--panel2` with its 16×16 cover + a 3-char title ticker below. Cartridges sit on the room floor, x-ordered by `lastTouchedAt` desc, max 4 visible + `+n` chip opening a room list sheet. Tap cartridge → Song Detail.
- Stuck cartridges dim to 60% and get a `zZ` pixel wisp; the companion prefers sitting on them (§4.3).
- **Shelf**: a wall shelf drawn across the top of the Ideas room holding shelved cartridges (max 6 visible + chip). Trophy Wall: framed 16×16 covers on the Mastering-room wall area scrolls… simpler: Trophy Wall is its own screen (§8.4); studio shows a small `TROPHIES {n}` door in the Release Bay linking to it.
- Decor: placed decor items render at their stored room/x. Placement UI: long-press an empty floor spot → sheet of unlocked decor → tap to place; long-press placed decor → `MOVE / PUT AWAY`.

**6.4 Energy meter.** `energy(song, now) = clamp(1 - (now - lastTouchedAt)/(14 days), 0, 1)`. Bar colors: >0.6 mint, 0.3–0.6 gold, 0.01–0.3 orange, 0 pink + `STUCK` tag. Any touch (task toggle, session, memo, version, reference edit, stage move) sets `lastTouchedAt = now`. Released/shelved songs show no energy bar.

**6.5 Sidebar (Board view desktop only)** — as prototype: identity panel (portrait, name, `{genre} · est. {year}`, equipped title beneath in gold pixel 8px), ARTIST STATS (derived attrs §10.3), WEEKLY QUEST panel (real quest, §11.2), stat row (`released / in flight / streak`). On mobile these collapse into the Trophy/Stats screen.

**6.6 Quick Capture.** Topbar `+` opens a bottom sheet: title input (autofocus) · `● REC` voice memo button (MediaRecorder, max 60s, waveform-less simple timer) · note field · `SAVE TO IDEA CRATE`. Creates a stage-0 song; a recorded memo saves with `isSeed:true`. XP: **+5 capture**, but `captureXpThisWeek` caps at **25/week** — beyond cap, still allowed, toast reads `IDEA SAVED` with no XP. Sheet MUST open in <150ms from any screen.

---

## 7. Flow: Song Detail

Full-screen sheet on mobile, centered modal (as prototype) ≥900px. Header: cover (editable: tap → upload/re-seed) · title (tap to edit) · meta chips (stage, bpm, key — bpm/key tap-editable) · energy bar · overflow menu `⋯` → `SET RELEASE DATE / SHELVE / DELETE` (delete = confirm dialog, permanent-with-undo-toast 6s).

Four tabs (pixel-font tab bar): **TASKS · SESSIONS · VERSIONS · NOTES**.

**7.1 TASKS.** As prototype checklist, plus: add-task input at bottom; drag-reorder (or ▲▼ buttons at ≤520px); coach tasks show 🐾; checking a task = +15 XP, Finisher event, companion `jump`, toast — as prototype. When all done and stage <4: `▶ MOVE TO {NEXT STAGE}` (as prototype). Advancing runs the **stage-clear ceremony**: modal closes → in Studio view the companion walks to the cartridge, `carry` state to the next room, drops it, dusts (600ms), confetti; in Board view the card animates column-to-column (400ms translate). XP: stage clear scales `[30,35,40,50]` by the stage being *entered* (1→4). Entering stage 4 = release flow (§8.3), not this ceremony.
- On advance, seed next-stage default tasks (as prototype for 2/3/4) filtered through the active playbook (§12.6) — playbooks may append one signature task.

**7.2 SESSIONS.** List of this song's sessions (intent icon, minutes, one-line summary, date) + lifetime chair-time total. CTA: `▶ START SESSION` → Focus Session flow (§7.5).

**7.3 VERSIONS.** Reverse-chron entries: label (auto `v{n}`) · note · date · badges (`WALK-AWAY` mint / `DEMO DAY` gold) · inline audio player if attached. `+ LOG A BOUNCE` → sheet: note (one line, required), optional audio file attach (`<input type=file accept=audio/*>`), auto-label. Logging a bounce = a touch; no XP by itself (XP flows via Walk-Away/Demo Day paths).

**7.4 NOTES.** The seed memo pinned top with player and label `THE SPARK`; below: freeform lyrics/notes textarea (autosaved); REFERENCE RACK: up to 3 rows of label+optional URL. If a song has been untouched 21+ days and has a seed memo, the coach `seed_replay` trigger may fire here (§12.4).

**7.5 Focus Session.**
- Start sheet: intent picker (6 icons: ✏️ write · 🎛 produce · 🎚 mix · 📀 master · 📋 admin · 🎲 play) · optional goal (one line) · `START`.
- Session screen (replaces app content, topbar persists): elapsed `MM:SS` big pixel timer · goal text · companion in `headphones-desk` · `■ END SESSION` button · nothing else. State survives reload (persist `startedAt`). If tab hidden, timer keeps true time.
- **Walk-Away Bell** (if enabled and intent ∈ {produce, mix, master}): at `walkAwayMinutes`, gentle chime (MAY) + companion bubble: `Better or just different?` with `⏹ BOUNCE & STOP` / `+10 MORE MINUTES`. Bounce&Stop: opens end-flow with `walkAwayBounce=true` pre-set → creates a version entry flagged `walkAway`, XP **+25** on top of session XP, Finisher event, toast `+25 XP — WALKED AWAY CLEAN`. Snooze: bell re-fires every 10 min; walk-away bonus decays per snooze: 25→15→10→5→0. No other consequence — never force-end.
- End flow (one screen): `What happened?` one-line input (optional) · checklist of the song's open tasks to mark done inline (each grants normal task XP) · `ATTACH BOUNCE` (optional) · `LOG IT`. Session XP: **+20** base, **+5 per full 15 min**, cap **+40** total. `play` intent: same XP, no tasks shown, summary placeholder `just played — counts.` Sessions under 3 minutes log with 0 XP (anti-farm) with toast `LOGGED — TINY BUT REAL`.


---

## 8. Shelf, Revival, Release & Trophy Wall

**8.1 Shelve.** From song overflow: confirm sheet with copy `Shelving isn't quitting. It's curation.` → `SHELVE IT` / `KEEP GRINDING`. On shelve: status='shelved', shelvedAt=now, cartridge animates up to the shelf (Studio) / card fades out (Board), XP **+10**, toast `+10 XP — KNOWING WHEN TO STOP IS A SKILL`. Shelved songs: excluded from stuck detection, quests, in-flight counts; visible on the Shelf and in a `SHELF` filter chip on the Board.

**8.2 Revive.** From a shelved song: `⟳ REVIVE`. Ceremony: companion walks to shelf, "blows dust" (3 gray pixels puff), cartridge returns to its prior stage room. `lastTouchedAt=now`. If `now - shelvedAt ≥ 30d`: XP **+20**, toast `+20 XP — CRATE DIGGER`, unlock title `Crate Digger` progress.

**8.3 Release flow.** Entering stage 4 (via advance with all tasks done, or drag): full-screen release ceremony — studio lights strobe (2 flashes, skipped on reduced motion), companion `jump` ×3, 40-piece confetti, plaque animation. XP **+150**. Prompt sheet (all optional): release date (defaults today) · link · plays field left blank. Song status='released'. If `releaseDate` was set in the future, this is **Boss Mode victory** (§11.4). Toast: `RELEASED! +150 XP` (pink level-style toast).

**8.4 Trophy Wall screen.** Grid of released songs: cover, title, `idea → release: {n} days`, date, private plays (inline-editable). Milestone plaques row (auto-granted): `FIRST BLOOD` (1 release) · `EP ENERGY` (3) · `CERTIFIED FINISHER` (5, grants equippable title) · `SPEEDRUN` (any release ≤30 days idea-to-release) · `METRONOME` (60-day streak) · `MERCILESS` (10 shelved) · `CRATE DIGGER` (revived→released). Plaques are 48×48 pixel sprites; locked ones show as silhouettes with hint text.

---

## 9. Streaks & Calendar

- A **touch day** = any day with ≥1 XP event carrying a songId, or a session, or a capture.
- **Scheduled days** by `schedule`: weeknights = Mon–Fri; weekends = Sat–Sun; stolen & chaos = all days but streak only requires **3 touches per rolling 7 days** instead of consecutive (implement as: for stolen/chaos, streak increments per touch-day and only breaks when the trailing 7 days contain <3 touch days).
- For weeknights/weekends: streak increments on touched scheduled days; non-scheduled days are neutral (neither increment nor break).
- **Repair**: if a streak would break, and `repairsUsedThisMonth < 1`, show one-time companion offer (trigger `streak_repair`, §13.2): accept → streak preserved, repair consumed, companion sign `I COVERED FOR YOU` (memory event). Decline or ignore 24h → quiet reset, no ceremony, no red.
- **Calendar screen**: month heatmap; touched days = mint blocks (intensity by XP tertile), scheduled-but-empty = dim `--panel2` (NEVER red/orange), today outlined. Below: this-week session list. Streak stats: current / best / repairs left.

---

## 10. XP, Levels & Attributes — exact math

**10.1 Level curve.** `xpForLevel(n) = 100 + 15*(n-1)`, cumulative. (L1→2: 100, L2→3: 115, … L20→21: 385.) Level-up: toast `LEVEL UP! LV {n}` (pink), confetti, companion jump — as prototype. Check unlocks (§10.4) on every level-up.

**10.2 XP table (config.ts).**
```
capture 5 (weekly cap 25) · task 15 · session 20 + 5/15min (cap 40) · walkaway 25→15→10→5→0 by snooze
stageclear [–,30,35,40] entering stages 1–3 · release 150 · shelve 10 · revive(30d+) 20
daily spark 10 · weekly quest 40–80 (per template) · demo day 35 · onboarding 40
streak bonus: +10 on every 7th consecutive/qualifying streak day
```

**10.3 Attributes (derived, 30-day rolling).** For each key, `value = clamp(base + Σ weights(events in last 30d), 5, 99)`. Base seeded at onboarding: `base = [25,40,55,65][expTier]` for all keys, then `base[painAttr] -= 18` where painAttr maps steam→consistency, tweak→finisher, time→consistency, arrange→arrangement (floor 10). Event weights:

| Event | finisher | consistency | sound | arrangement | hustle |
|---|---|---|---|---|---|
| task done | +1.5 | +0.3 | | | |
| stage clear | +4 | +1 | | | |
| walk-away bounce | +3 | | | | |
| session intent write/produce | +0.5 | +1 | +0.5 | +1 | |
| session intent mix/master | +1 | +1 | +1.5 | | |
| session on scheduled day | | +1.5 | | | |
| release | +6 | | | | +5 |
| post-release plays edit / link add | | | | | +2 |
| demo day | +2 | | | | +3 |
| capture | | +0.3 | | | |
| arrangement-kit task done | | | | +2.5 | |

Because the window rolls, values decay naturally — no explicit decay code. Weekly report (§11.3) narrates the deltas. Display as prototype's striped bars with per-attr colors.

**10.4 Unlock tracks.**
- Gear (companion): start with prototype list; `Golden Bounce` headphones (gold recolor) at 10 walk-away bounces; `Tour Mic` at 3 releases; `Double Boombox` at LV 15.
- Decor: 2 items per level bracket (L2 plant · L3 poster · L5 neon sign · L7 cat tree · L9 modular wall · L12 lava lamp · L15 disco ball · L20 gold record crate). Seasonal/extra species (`GHOST`, `FROG`) unlock at L10 / first release respectively — implement as additional SPECIES entries gated by `speciesUnlocked`.
- Titles per §8.4 plaques. Equipping happens on Trophy screen.
- Every unlock: toast `UNLOCKED — {NAME}` (gold) + item appears with sparkle in its picker.

---

## 11. Quests

**11.1 Daily Spark.** On first open each day, roll one prompt from `strings/sparks.ts` (pool of 20, §13.4; filter: playbook-tagged prompts weighted ×2 for matching pain; no repeat within 7 days). Render as a small dismissible strip under the board head: `⚡ {prompt}` + `DONE (+10)` / `✕`. Done = +10 XP, Consistency +0.3. Skipping has zero consequence and no tracking UI.

**11.2 Weekly Quest generator.** Every Monday (or first open of the week): compute lowest derived attribute → pick a template targeting it (from §13.5, 3+ templates per attr), instantiate with a target song where needed (prefer: stuck song > lowest-progress active song). Progress auto-tracks from events. One `⟲ REROLL` per week (new template, same or different attr). Completion: XP per template (40–80), companion `jump`, gold toast, memory event.

**11.3 Weekly Studio Report.** Delivered by the companion on first open after the week rolls: bubble (voice-rendered, §13.3) summarizing: quest result, biggest attr delta, sessions count, and one forward nudge. Max 45 words. Also logged to a `REPORTS` list on the Trophy/Stats screen.

**11.4 Boss Mode (Release Countdown).** Setting a future `releaseDate` on a stage-2/3 song activates Boss Mode: song card/cartridge gains a pink `BOSS` frame; a countdown poster renders in the Release Bay (`{title} — {n} DAYS`); Song Detail header shows a boss HP bar = fraction of open tasks (each completed task chips it with a hit flash). Companion enters `hype` state when ≤3 days remain and speaks the `boss_near` trigger. Ship on/before the date → release flow + extra gold toast `ON TIME. LEGEND.` + memory event. Miss the date → single quiet trigger `boss_missed` offering `PICK A NEW DATE` / `DROP THE DATE`; no other penalty, ever.

**11.5 Demo Day.** If `demoDayCadenceDays > 0`: schedule next Demo Day from onboarding completion. On/after the date, companion fires `demo_day` trigger once: pick a focus song → the ask is to bounce current state and mark it heard by a human. Flow: choose song → `LOG DEMO DAY BOUNCE` sheet (note + optional audio + checkbox `a human heard it`) → version entry flagged `demoDay`, XP **+35**, Hustle event, gold stamp on the version row, next Demo Day scheduled. Snoozable 7 days once per cycle.

---

## 12. Companion & Coaching Engine

**12.1 Speech budget.** Max **2 unprompted bubbles per app-session** (reset on load after ≥30 min away). User-initiated interactions (tapping the companion) don't count. Muted (`studio silence`, settings or bubble long-press → `MUTE FOR A WEEK`) suppresses all unprompted speech; scheduled logic still runs silently.

**12.2 Tap interactions.** Tapping the companion: 70% a one-line voice-rendered idle quip (pool §13.3-idle), 20% a contextual stat observation, 10% it just does a trick (jump/strum). Never advice on tap.

**12.3 Bubble UI.** As prototype (`#bubble`): max 2 buttons, always dismissible by tapping elsewhere (counts as dismissal for backoff). Bubble text max ~160 chars post-interpolation.

**12.4 Trigger evaluator.** Runs on app open, on view change, and every 60s while focused. Evaluate in priority order, fire at most one, respecting: speech budget, per-trigger cooldown, global 90s min gap, and backoff (each dismissal of a trigger doubles its cooldown up to ×8; an acceptance resets backoff).

| id | Condition (all times vs now) | Cooldown | Buttons |
|---|---|---|---|
| `return_absence` | lastOpenedAt ≥ 7d ago | 7d | `2-MIN RE-ENTRY` → opens closest-to-done song + generates one 2-min task · `JUST LOOKING` |
| `rescue_offer` | onboarding rescue accepted (scripted, once) | once | `BREAK IT DOWN` → §12.6 plan · `LATER` |
| `stuck_song` | any active song energy==0, ≥7d since last stuck-fire for that song | 3d/song | `BREAK IT DOWN` → plan · `SHELVE IT?` → shelve sheet |
| `tweak_spiral` | one song: ≥4 sessions in 14d AND 0 tasks completed in 14d | 7d | `REWRITE THE LIST` → clears un-done tasks, generates plan · `WE'RE FINE` |
| `hoarding` | captures this week ≥6 AND sessions this week ==0 | 7d | `PICK ONE` → opens oldest idea · `NOT YET` |
| `streak_risk` | scheduled day, local time ≥ 20:00, no touch today, streak ≥3 | 1d | `QUICK TOUCH` → Quick Capture · `TOMORROW` |
| `streak_repair` | streak just broke, repair available | 30d | `COVER ME` · `LET IT GO` |
| `seed_replay` | viewing NOTES of a song untouched ≥21d with seed memo | 14d/song | `▶ PLAY THE SPARK` (plays memo) · dismiss |
| `boss_near` | boss song, ≤3d to date | once/boss | `SHOW TASKS` · dismiss |
| `boss_missed` | boss date passed, not released | once/boss | `PICK A NEW DATE` · `DROP THE DATE` |
| `demo_day` | per §11.5 | cycle | `LET'S BOUNCE` · `SNOOZE 7D` |
| `weekly_report` | first open of new week | weekly | none (auto-dismiss 12s) |

`return_absence` outranks everything and, on the day it fires, consumes the entire speech budget (nothing else piles on a returning user).

**12.5 Memory & interpolation.** Copy templates may reference: `{song}` `{name}` (companion) `{artist}` `{n}` (context number) `{weakAttr}` `{tip}` (pain tip). `speak(triggerId, voice, ctx)` selects the template from `strings/coach.ts[triggerId][voice]`, interpolates, records a memory event.

**12.6 Playbooks & plan generation.** `generatePlan(song, pain)` returns exactly 3 tasks, `source:'coach'`, stage-aware. Tables (stage-2/3 shown; write stage-0/1 variants analogously in strings):

- **steam / Momentum Kit:** `15-min pass on ONE section` · `Leave a note for next-you: what's the very next move?` · `Book the next touch: add tomorrow's 10-min task`
- **tweak / Deadline Kit:** `20-min {stage} pass — then stop` · `One reference track, one listen` · `Bounce v{n+1} and walk away`
- **time / Stolen Moments Kit:** `10-min micro-pass: loudest problem only` · `Voice-memo your next idea for it` · `Queue a 25-min session this week`
- **arrange / Structure Kit:** `Map one reference's arrangement (intro/verse/etc.)` · `Copy that skeleton into your project markers` · `Fill ONE empty section, ugly is fine`

Playbooks also set defaults: tweak → `walkAwayEnabled=true`; time → session start sheet defaults 10-min micro option pinned; steam → default session length suggestion 25 min in start sheet subtext; arrange → arrangement-kit tasks tagged for the +2.5 attr weight.


---

## 13. String Tables (canonical copy)

Implement as typed exports. Everything user-facing lives here; no copy hardcoded in components. `{x}` = interpolation. Where 4 variants exist they are keyed `hype / real / drill / facts`.

**13.1 Onboarding & UI.**
```
signal.1: Somewhere on your hard drive, a song is dying.
signal.2: It was good. You know it was good.
signal.3: Let's go get it.
q4.title: HOW DO YOU LIKE TO BE PUSHED?
q4.hype:  Hype me up | celebration is fuel
q4.real:  Keep it real | honest, warm, direct
q4.drill: Drill sergeant (gentle) | structure, kindly enforced
q4.facts: Just the facts | numbers, no pep talk
q5.title: WHEN DOES MUSIC HAPPEN FOR YOU?
q5.weeknights: Weeknights | after-work sessions
q5.weekends: Weekend deep dives | long hauls
q5.stolen: Stolen moments | 20 minutes here and there
q5.chaos: Chaos, honestly | no pattern and that's fine
rescue.ask: Okay. That song that's been sitting there. The one you thought about when I asked what kills your songs. What's it called?
rescue.stage: Where's it stuck?
shelve.confirm: Shelving isn't quitting. It's curation.
walkaway.ask: Better or just different?
session.tiny: LOGGED — TINY BUT REAL
```

**13.2 Coach triggers — 4 voices each.** (Write all 12 triggers × 4 voices in `strings/coach.ts`; the following six are canonical, match their register for the rest.)
```
return_absence:
 hype:  You're BACK. The studio kept everything warm. {song} is closest to done — want the 2-minute re-entry?
 real:  Hey. Everything's where you left it. {song} is your closest to done — want the 2-minute version?
 drill: Welcome back. Status: intact. Recommended re-entry: {song}, one 2-minute task. Ready?
 facts: {n} days away. All data preserved. Nearest-to-done: {song}. 2-minute re-entry available.
stuck_song:
 hype:  {song} deserves better than {n} days on the bench! Three small moves and it's ALIVE again. Break it down?
 real:  {song} has sat for {n} days. You said {weakAttr} is the fight — {tip}. Want 3 small steps?
 drill: {song}: {n} days idle. Proposal: three tasks, twenty minutes each. Shall I write them?
 facts: {song}: {n} days without a touch. Suggested action: 3-step breakdown. Generate?
tweak_spiral:
 hype:  You've BEEN in there!! Let's aim that energy — new list, 3 moves, we EAT.
 real:  Four sessions, no checkboxes. The plan's wrong, not you. Rewrite the list?
 drill: Session four. Zero objectives cleared. New orders: three tasks, twenty minutes each. Ready?
 facts: 4 sessions / 0 tasks on {song}. Suggested action: revise task list.
hoarding:
 hype:  {n} new sparks this week — your brain is ON FIRE. Pick one and let's make it real?
 real:  {n} ideas in, zero sessions. Collecting is fun; finishing is the game. Open one?
 drill: Intake: {n}. Output: 0. Select one idea for development.
 facts: Ideas this week: {n}. Sessions: 0. Ratio suggests: open one.
streak_risk:
 hype:  {n}-day streak on the line and I KNOW you've got 5 minutes in you!
 real:  Scheduled day, nothing yet. Even a tiny touch keeps the {n}-day streak.
 drill: Today is a music day. Minimum viable touch: one capture. Go.
 facts: Streak: {n}. Today: 0 touches. Window closes at midnight.
streak_repair:
 hype:  Missed one — HAPPENS. I'll cover for you this once. Deal?
 real:  Streak broke. I can cover you once a month. Use it?
 drill: One absence logged. One cover available. Authorize?
 facts: Streak break detected. Repairs available: 1. Apply?
```

**13.3 Idle quips (tap pool, ≥8 per voice, samples).**
```
hype: THAT last bounce though. | We're so close on {song} I can TASTE it.
real: No notes. Just vibes. | {song} misses you a little.
drill: Posture check. | Hydrate, then create.
facts: Chair-time this week: {n} min. | Current level: {n}.
```

**13.4 Daily Sparks (20; ★ = playbook-weighted).**
```
Open your oldest idea and just listen. ★steam
Rename one project file honestly. ★tweak
8 bars, wrong genre, go.
Hum tomorrow's melody into a memo. ★time
Map the arrangement of a song you love. ★arrange
Mute your favorite track element. Better?
Set a 10-minute timer. One problem only. ★time
Write one honest line about {song}.
Steal a drum groove. Legally. Spiritually.
Play your latest bounce in a different room. ★tweak
Delete something you're keeping "just in case." ★tweak
Loop your best 4 bars. Why do they work?
Sketch a chorus with only 3 notes. ★arrange
Voice-memo review: play your seed for {song}. ★steam
Make the worst beat you can. On purpose.
Find one reference for your current stage. 
Turn everything down 6dB. Listen again.
Write the last line of the song first. ★arrange
One-minute clean-up: close old tabs/projects. 
Tell someone what you're working on. 
```

**13.5 Weekly quest templates (3 per attribute; format: text · goal · xp · tracking event).**
```
finisher:  Clear every task on one song ·1·60·all-tasks-done(song) | Complete {n} tasks anywhere ·6·50·task | Walk away clean twice ·2·70·walkaway
consistency: Touch music on {n} scheduled days ·3·50·touch-day | Log {n} sessions, any size ·3·55·session | Three-day touch chain on one song ·3·60·song-touch-days
sound:     Log {n} mix/master sessions ·2·55·session-intent | Reference-check two songs ·2·50·reference-task | One sound-design session over 30 min ·1·60·session
arrangement: Fill one empty section ·1·60·arrange-task | Map two reference arrangements ·2·55·arrange-task | Advance any song out of Ideas ·1·65·stageclear
hustle:    Log a Demo Day bounce ·1·80·demo-day | Set a release date ·1·40·boss-start | Update your Trophy Wall (plays/link) ·1·40·trophy-edit
```

**13.6 Name generators.** Artist = `{adj} {noun}` per genre (12×12 each; sample — Electronic adj: Neon, Voltage, Null, Analog, Midnight, Hyper, Static, Chrome, Phase, Acid, Vapor, Prism · noun: Saint, Signal, Circuit, Bloom, Motor, Index, Tide, Arcade, Pulse, Ghost, District, Halo. Indie adj: Peach, Glass, Paper, Velvet, Sunday, Hollow, Wilted, Copper, Quiet, Bedroom, Foggy, Honest · noun: Static, Porch, Diary, Antler, Sweater, Lantern, Orchard, Motel, Postcard, Comet, Garden, Cassette. Fill remaining genres in-register.) Companion pool (20): BLIP, ECHO, SUB, REVERB, TAPE, PATCH, WUB, FUZZ, MONO, DECAY, CHIRP, GATE, LOOP, PING, RIFF, HISS, DOT, VOLT, NUDGE, CLICK.

---

## 14. Celebrations & Feedback System

Single `celebrate(kind)` API. Kinds & payload:

| kind | toast | confetti | companion | extra |
|---|---|---|---|---|
| task | `+15 XP` gold | – | jump | – |
| session | `+{n} XP — SESSION LOGGED` | – | nod | – |
| walkaway | `+{n} XP — WALKED AWAY CLEAN` mint | – | jump | – |
| stageclear | `+{n} XP — STAGE CLEAR` | 14pc | carry ceremony | card slide |
| levelup | `LEVEL UP! LV {n}` pink | 14pc | jump | – |
| release | `RELEASED! +150 XP` pink | 40pc | jump ×3 | light strobe, plaque |
| unlock | `UNLOCKED — {x}` gold | – | preen | sparkle in picker |
| quest | `QUEST CLEAR +{n} XP` gold | 14pc | jump | – |

Toasts stack max 3, 2.6s each (as prototype). Reduced motion / `reducedCelebrations`: toasts only.

---

## 15. Settings Screen

Groups: **COMPANION** (voice picker with live sample line · rename · mute-for-a-week toggle showing time left) · **SESSIONS** (walk-away on/off, minutes slider 15–90) · **RHYTHM** (schedule picker · demo day cadence: off/monthly/6-weeks · notifications toggle → browser permission; notifications limited to `streak_risk` and `demo_day`, fired only in a 19:00–21:00 local window on scheduled days) · **APPEARANCE** (default view · reduced celebrations) · **DATA** (export JSON+blobs as zip · import · erase everything with typed confirm `DELETE`). Character re-editing: `EDIT COMPANION` reopens the creator (no XP).

---

## 16. Empty States & Edge Cases

- Board with zero songs: companion center-stage, `The board is hungry. Feed it one idea.` + big `+ FIRST IDEA` button.
- All songs shelved: `Clean slate. Suspiciously clean.` + revive shortcut.
- Session already running on app open: jump straight to the session screen with elapsed time correct.
- Two devices/tabs: last-write-wins; MUST NOT corrupt (single-tab lock via `navigator.locks` SHOULD).
- Audio permission denied: memo button shows `MIC BLOCKED — TEXT IT INSTEAD` and swaps to text.
- Blob quota errors: keep entry, drop audio, toast `SAVED WITHOUT AUDIO — STORAGE FULL`.
- Timezone shifts / DST: day keys always local-at-time-of-event; never retro-break streaks.
- 100+ songs: board columns virtualize; Studio shows `+n` chips; no layout break at 500 songs.
- Example songs: excluded from every engine (XP, quests, triggers, stats, streak) — enforce in one guard, test it.

## 17. Acceptance Checklist (build is done when…)

1. Fresh user completes Signal→Egg→Creator→Rescue in ≤4 min; a real song exists; +40 XP granted; refresh restores everything.
2. Rescue playbook plan generates 3 pain-correct tasks; completing one fires full celebration stack.
3. Board and Studio views stay in sync through: drag advance, task completion, shelve, revive, release.
4. Focus session survives reload; Walk-Away Bell fires at the configured minute, bounce creates a flagged version, snooze decays the bonus 25→15→10→5→0.
5. Energy bar hits 0 at 14 untouched days; `stuck_song` fires once, respects cooldown and dismissal backoff; speech budget of 2 is never exceeded; mute silences everything for 7 days.
6. All 4 voices render every trigger; switching voice in settings changes the next bubble.
7. Weekly quest targets the genuinely lowest derived attribute; progress auto-tracks; reroll works once.
8. Streak logic per schedule type behaves as §9 incl. repair; calendar never shows a red/negative state.
9. Boss Mode: countdown renders, HP bar chips per task, on-time release adds the bonus toast, missing fires exactly one gentle follow-up.
10. Shelve grants +10 with the exact copy; 30-day revive grants Crate Digger progress.
11. Level curve, XP caps (capture 25/wk, session 40, <3-min = 0) verified by unit tests on `engine/*`.
12. Reduced-motion mode: zero confetti/ceremonies/bobbing anywhere; all state changes still legible via toasts.
13. Export → wipe → import round-trips losslessly, audio included.
14. Lighthouse mobile: interactive <3s on mid-tier throttling; sprite canvases stay pixelated at all DPRs.

---

## Appendix A — Reference Implementation (complete prototype source)

The spec above says "as prototype" in many places. This appendix makes the document fully self-contained: it is the **entire** `trackquest-prototype-v2.html`, verbatim. It is the canonical reference for: the design-token CSS, the pixel sprite engine (`SPECIES`, `OUTF`, `GEARS`, `shade`, `drawSprite` — port this code as-is into `engine/sprites.ts`), the board/card/detail markup patterns, the companion positioning + bubble system, and the toast/confetti/celebration implementations. Where this appendix and the spec conflict, the spec wins (the appendix is the starting point; the spec is the destination).

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TRACKQUEST — prototype v2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0d0e1a; --panel:#161829; --panel2:#1d2036; --line:#2a2e4a;
  --ink:#eceef8; --muted:#8b8fad;
  --pink:#ff4d9d; --mint:#3ee6c2; --gold:#ffd447; --violet:#8b6cff; --orange:#ff7a3d;
  --pixel:'Press Start 2P','Courier New',monospace;
  --body:'Space Grotesk',system-ui,-apple-system,sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  background:var(--bg);
  background-image:
    radial-gradient(circle at 15% 10%, rgba(139,108,255,.07), transparent 40%),
    radial-gradient(circle at 85% 90%, rgba(255,77,157,.06), transparent 40%);
  color:var(--ink); font-family:var(--body); font-size:16px; line-height:1.45;
  overflow-x:hidden;
}
button{font-family:inherit;color:inherit;background:none;border:none;cursor:pointer}
button:focus-visible,input:focus-visible{outline:2px solid var(--mint);outline-offset:2px}
canvas{image-rendering:pixelated;image-rendering:crisp-edges;display:block}

.pxhead{font-family:var(--pixel);letter-spacing:.5px;line-height:1.7}
.badge-demo{
  position:fixed;top:10px;right:10px;z-index:80;
  font-family:var(--pixel);font-size:8px;color:var(--bg);
  background:var(--gold);padding:5px 7px;border-radius:2px;
}
.pxbtn{
  font-family:var(--pixel);font-size:10px;color:var(--bg);
  background:var(--mint);padding:12px 16px;border-radius:2px;
  box-shadow:0 4px 0 #1d8f77;
  transition:transform .08s, box-shadow .08s;
}
.pxbtn:active{transform:translateY(3px);box-shadow:0 1px 0 #1d8f77}
.pxbtn.pink{background:var(--pink);box-shadow:0 4px 0 #a12a64}
.pxbtn.pink:active{box-shadow:0 1px 0 #a12a64}
.pxbtn.ghost{background:var(--panel2);color:var(--muted);box-shadow:0 4px 0 #0b0c16}
.screen{min-height:100vh;display:none;flex-direction:column;align-items:center;justify-content:center;padding:28px 20px;text-align:center}
.screen.active{display:flex}

/* welcome */
#logo{font-family:var(--pixel);font-size:clamp(20px,6vw,34px);color:var(--ink)}
#logo .q{color:var(--pink)}
.tagline{color:var(--muted);margin:18px 0 34px;max-width:420px}
.blink{animation:blink 1.1s steps(2) infinite}
@keyframes blink{50%{opacity:.25}}
.welcome-eq{display:flex;gap:6px;align-items:flex-end;height:46px;margin-bottom:26px}
.welcome-eq span{width:10px;background:var(--violet);animation:eq 0.9s ease-in-out infinite alternate;border-radius:1px}
.welcome-eq span:nth-child(2){background:var(--pink);animation-delay:.15s}
.welcome-eq span:nth-child(3){background:var(--mint);animation-delay:.3s}
.welcome-eq span:nth-child(4){background:var(--gold);animation-delay:.45s}
.welcome-eq span:nth-child(5){background:var(--violet);animation-delay:.6s}
@keyframes eq{from{height:8px}to{height:46px}}

/* questions */
.qdots{display:flex;gap:8px;margin-bottom:30px;justify-content:center}
.qdots i{width:10px;height:10px;background:var(--panel2);border-radius:1px}
.qdots i.on{background:var(--mint)}
.qstep{display:none;width:100%;max-width:460px}
.qstep.active{display:block;animation:pop .25s ease}
@keyframes pop{from{transform:translateY(8px);opacity:0}}
.qtitle{font-family:var(--pixel);font-size:13px;line-height:1.9;margin-bottom:8px}
.qsub{color:var(--muted);margin-bottom:24px;font-size:14px}
.opts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.opt{
  background:var(--panel);border:2px solid var(--line);border-radius:4px;
  padding:16px 12px;font-weight:500;transition:border-color .12s, transform .12s;
}
.opt:hover{border-color:var(--violet);transform:translateY(-2px)}
.opt.sel{border-color:var(--mint);background:var(--panel2)}
.opt small{display:block;color:var(--muted);font-weight:400;margin-top:4px;font-size:12px}

/* creator */
#screen-creator .wrap{display:flex;flex-wrap:wrap;gap:34px;justify-content:center;align-items:flex-start;max-width:800px;width:100%}
.stage-box{
  background:var(--panel);border:2px solid var(--line);border-radius:6px;
  padding:26px;display:flex;flex-direction:column;align-items:center;gap:14px;
}
.stage-floor{width:150px;height:8px;background:var(--panel2);border-radius:50%;margin-top:-4px}
#previewCv{animation:bob 1.4s ease-in-out infinite}
@keyframes bob{50%{transform:translateY(-4px)}}
.species-tabs{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:4px}
.sptab{
  font-family:var(--pixel);font-size:8px;color:var(--muted);
  background:var(--panel);border:2px solid var(--line);border-radius:3px;padding:8px 9px;
  transition:color .1s,border-color .1s;
}
.sptab:hover{color:var(--ink)}
.sptab.on{color:var(--bg);background:var(--gold);border-color:var(--gold)}
.ctr-rows{display:flex;flex-direction:column;gap:10px;min-width:280px;flex:1;max-width:360px}
.ctr-row{display:flex;align-items:center;gap:10px;background:var(--panel);border:2px solid var(--line);border-radius:4px;padding:10px 12px}
.ctr-row label{font-family:var(--pixel);font-size:8px;color:var(--muted);width:78px;text-align:left;line-height:1.6}
.ctr-row .val{flex:1;font-weight:500;font-size:14px;display:flex;align-items:center;justify-content:center;gap:8px}
.swatch{width:14px;height:14px;border-radius:2px;border:1px solid rgba(255,255,255,.25);flex-shrink:0}
.arrow{font-family:var(--pixel);font-size:12px;color:var(--mint);padding:6px 8px}
.arrow:hover{color:var(--gold)}
#nameInput{
  width:100%;background:var(--panel);border:2px solid var(--line);border-radius:4px;
  color:var(--ink);padding:12px;font-family:var(--pixel);font-size:10px;letter-spacing:1px;
}
#nameInput::placeholder{color:#565a7d}
.ctr-actions{display:flex;gap:12px;margin-top:6px}

/* app */
#app{display:none;min-height:100vh}
#app.active{display:block}
.topbar{
  position:sticky;top:0;z-index:40;display:flex;align-items:center;gap:16px;
  padding:12px 18px;background:rgba(13,14,26,.92);backdrop-filter:blur(6px);
  border-bottom:2px solid var(--line);
}
.topbar .mini-logo{font-family:var(--pixel);font-size:11px}
.topbar .mini-logo .q{color:var(--pink)}
.xpwrap{margin-left:auto;display:flex;align-items:center;gap:10px}
.lv{font-family:var(--pixel);font-size:9px;color:var(--gold)}
.xpbar{width:120px;height:10px;background:var(--panel2);border:2px solid var(--line);border-radius:2px;overflow:hidden}
.xpfill{height:100%;background:linear-gradient(90deg,var(--gold),var(--orange));width:0%;transition:width .5s}
.xpnum{font-size:11px;color:var(--muted)}

.layout{display:flex;gap:20px;padding:20px 18px 120px;max-width:1200px;margin:0 auto;align-items:flex-start}
.board{flex:1;min-width:0}
.board-head{display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
.board-head h2{font-family:var(--pixel);font-size:12px}
.board-head span{color:var(--muted);font-size:13px}
.cols{display:flex;gap:12px;overflow-x:auto;padding-bottom:12px;scroll-snap-type:x proximity}
.col{min-width:215px;width:215px;flex-shrink:0;scroll-snap-align:start}
.colh{
  display:flex;align-items:center;gap:8px;padding:8px 10px;margin-bottom:10px;
  background:var(--panel2);border-radius:4px;border-left:4px solid var(--violet);
}
.colh.c0{border-color:var(--muted)} .colh.c1{border-color:var(--violet)}
.colh.c2{border-color:var(--pink)} .colh.c3{border-color:var(--orange)} .colh.c4{border-color:var(--mint)}
.colh b{font-size:13px;font-weight:700}
.colh i{font-style:normal;font-family:var(--pixel);font-size:8px;color:var(--muted);margin-left:auto}
.card{
  background:var(--panel);border:2px solid var(--line);border-radius:5px;
  padding:12px;margin-bottom:10px;cursor:pointer;transition:transform .12s,border-color .12s;
  text-align:left;width:100%;display:block;
}
.card:hover{transform:translateY(-2px);border-color:var(--violet)}
.card h4{font-size:14px;margin-bottom:6px}
.tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.tag{font-size:11px;color:var(--muted);background:var(--panel2);padding:2px 6px;border-radius:2px}
.tag.stuck{color:var(--bg);background:var(--pink);font-weight:700}
.tag.play{color:var(--bg);background:var(--mint);font-weight:700}
.prog{height:7px;background:var(--panel2);border-radius:2px;overflow:hidden}
.progfill{height:100%;background:var(--mint);transition:width .3s}
.days{font-size:11px;color:var(--muted);margin-top:7px}
.addcard{
  width:100%;border:2px dashed var(--line);border-radius:5px;color:var(--muted);
  padding:10px;font-size:13px;transition:color .12s,border-color .12s;
}
.addcard:hover{color:var(--mint);border-color:var(--mint)}

.artist{width:290px;flex-shrink:0;display:flex;flex-direction:column;gap:14px}
.panelbox{background:var(--panel);border:2px solid var(--line);border-radius:6px;padding:16px}
.artist-id{display:flex;gap:14px;align-items:center}
.artist-id .info b{font-family:var(--pixel);font-size:9px;display:block;line-height:1.7}
.artist-id .info span{font-size:12px;color:var(--muted)}
.attr{margin-bottom:12px}
.attr:last-child{margin-bottom:0}
.attr .row{display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px}
.attr .row b{font-weight:500}
.attr .row span{color:var(--muted);font-family:var(--pixel);font-size:8px}
.abar{height:9px;background:var(--panel2);border-radius:2px;overflow:hidden;
  background-image:repeating-linear-gradient(90deg,transparent 0 9px,var(--bg) 9px 11px)}
.afill{height:100%;transition:width .5s}
.ph{font-family:var(--pixel);font-size:9px;color:var(--muted);margin-bottom:12px;line-height:1.7}
.quest{display:flex;gap:10px;align-items:center}
.quest .qicon{font-size:20px}
.quest p{font-size:13px}
.quest small{color:var(--gold);font-family:var(--pixel);font-size:8px}
.statrow{display:flex;justify-content:space-between;text-align:center}
.statrow div b{display:block;font-family:var(--pixel);font-size:12px;color:var(--mint)}
.statrow div span{font-size:11px;color:var(--muted)}

/* song detail */
#overlay{position:fixed;inset:0;background:rgba(8,9,18,.7);z-index:50;display:none;align-items:center;justify-content:center;padding:18px}
#overlay.open{display:flex}
#detailCard{
  background:var(--panel);border:2px solid var(--line);border-radius:8px;
  width:100%;max-width:480px;padding:22px;animation:pop .2s ease;position:relative;
}
#detailCard .close{position:absolute;top:10px;right:12px;font-family:var(--pixel);font-size:12px;color:var(--muted)}
#detailCard .close:hover{color:var(--pink)}
#dTitle{font-family:var(--pixel);font-size:13px;line-height:1.8;margin-bottom:4px;padding-right:30px}
#dMeta{display:flex;gap:8px;margin:8px 0 16px;flex-wrap:wrap}
.check{display:flex;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);width:100%;text-align:left}
.check:last-of-type{border-bottom:none}
.box{width:18px;height:18px;border:2px solid var(--line);border-radius:2px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:var(--pixel);font-size:9px;color:var(--bg)}
.check.done .box{background:var(--mint);border-color:var(--mint)}
.check .t{font-size:14px}
.check.done .t{color:var(--muted);text-decoration:line-through}
#advanceBtn{margin-top:16px;width:100%;display:none}
#advanceBtn.show{display:block}

/* buddy */
#buddy{position:fixed;left:-120px;top:60vh;z-index:70;transition:left 1.2s steps(18), top 1.2s steps(18)}
#buddy .flip{transition:transform .2s}
#buddyCv{filter:drop-shadow(0 6px 4px rgba(0,0,0,.45))}
#buddy.walking #buddyCv{animation:walkbob .16s steps(2) infinite alternate}
@keyframes walkbob{from{transform:translateY(0)}to{transform:translateY(-3px)}}
#buddy.idle #buddyCv{animation:bob 1.6s ease-in-out infinite}
#buddy.jump #buddyCv{animation:jump .6s ease}
@keyframes jump{30%{transform:translateY(-26px)}60%{transform:translateY(0)}80%{transform:translateY(-10px)}}
#bubble{
  position:absolute;bottom:calc(100% + 12px);left:-20px;width:230px;
  background:var(--ink);color:var(--bg);border-radius:6px;padding:12px;
  font-size:13px;line-height:1.4;display:none;text-align:left;
  box-shadow:4px 4px 0 rgba(0,0,0,.35);
}
#bubble.show{display:block;animation:pop .18s ease}
#bubble:after{content:'';position:absolute;top:100%;left:34px;border:8px solid transparent;border-top-color:var(--ink)}
#bubble b{color:#a1256b}
#bubble .bbtns{display:flex;gap:8px;margin-top:10px}
#bubble .bbtns button{font-family:var(--pixel);font-size:8px;padding:7px 9px;border-radius:2px;background:var(--pink);color:#fff}
#bubble .bbtns button.ghost{background:#d7d9e6;color:#3a3f63}

#toasts{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:90;display:flex;flex-direction:column;gap:8px;align-items:center}
.toast{
  font-family:var(--pixel);font-size:9px;line-height:1.6;color:var(--bg);
  background:var(--gold);padding:10px 14px;border-radius:3px;
  box-shadow:3px 3px 0 rgba(0,0,0,.4);animation:pop .2s ease;text-align:center;
}
.toast.lvl{background:var(--pink);color:#fff;font-size:11px}
.confetti{position:fixed;width:7px;height:7px;z-index:95;pointer-events:none}

@media (max-width:900px){
  .layout{flex-direction:column}
  .artist{width:100%}
}
@media (max-width:520px){
  .opts{grid-template-columns:1fr}
  .xpbar{width:70px}
  #bubble{width:190px}
}
@media (prefers-reduced-motion: reduce){
  *,#buddy{transition:none !important;animation:none !important}
}
</style>
</head>
<body>

<div class="badge-demo">DEMO BUILD</div>

<!-- WELCOME -->
<section class="screen active" id="screen-welcome">
  <div class="welcome-eq"><span></span><span></span><span></span><span></span><span></span></div>
  <h1 id="logo">TRACK<span class="q">QUEST</span></h1>
  <p class="tagline">Finish more music. Track every song from first idea to release — and level up your artist along the way.</p>
  <button class="pxbtn blink" onclick="go('screen-questions')">&#9654; PRESS START</button>
</section>

<!-- QUESTIONS -->
<section class="screen" id="screen-questions">
  <div class="qdots"><i class="on" id="d0"></i><i id="d1"></i><i id="d2"></i></div>

  <div class="qstep active" id="q0">
    <div class="qtitle">WHAT DO YOU MAKE?</div>
    <p class="qsub">Pick your main lane — you can add more later.</p>
    <div class="opts">
      <button class="opt" onclick="answer('genre','Electronic',this)">Electronic<small>house, techno, DnB…</small></button>
      <button class="opt" onclick="answer('genre','Indie',this)">Indie<small>bedroom pop, alt…</small></button>
      <button class="opt" onclick="answer('genre','Rock',this)">Rock<small>bands, riffs, loud</small></button>
      <button class="opt" onclick="answer('genre','Hip-hop',this)">Hip-hop<small>beats, bars</small></button>
      <button class="opt" onclick="answer('genre','Pop',this)">Pop<small>hooks for days</small></button>
      <button class="opt" onclick="answer('genre','Other',this)">Something else<small>genre is a prison</small></button>
    </div>
  </div>

  <div class="qstep" id="q1">
    <div class="qtitle">HOW LONG HAVE YOU BEEN AT IT?</div>
    <p class="qsub">No wrong answers. This tunes your starting stats.</p>
    <div class="opts">
      <button class="opt" onclick="answer('exp',0,this)">Just starting</button>
      <button class="opt" onclick="answer('exp',1,this)">1–3 years</button>
      <button class="opt" onclick="answer('exp',2,this)">3–10 years</button>
      <button class="opt" onclick="answer('exp',3,this)">Longer than I'll admit</button>
    </div>
  </div>

  <div class="qstep" id="q2">
    <div class="qtitle">WHAT KILLS YOUR SONGS?</div>
    <p class="qsub">Be honest — this is where the coaching starts.</p>
    <div class="opts">
      <button class="opt" onclick="answer('pain','steam',this)">I lose steam<small>start hot, fade fast</small></button>
      <button class="opt" onclick="answer('pain','tweak',this)">Endless tweaking<small>v47_FINAL_final.wav</small></button>
      <button class="opt" onclick="answer('pain','time',this)">No time<small>life keeps happening</small></button>
      <button class="opt" onclick="answer('pain','arrange',this)">Arrangements stall<small>great loop, no song</small></button>
    </div>
  </div>
</section>

<!-- CHARACTER CREATOR -->
<section class="screen" id="screen-creator">
  <div class="qtitle" style="margin-bottom:6px">CREATE YOUR COMPANION</div>
  <p class="qsub" style="margin-bottom:20px">This little legend follows you around the studio.</p>
  <div class="species-tabs" id="spTabs"></div>
  <div class="wrap" style="margin-top:20px">
    <div class="stage-box">
      <canvas id="previewCv"></canvas>
      <div class="stage-floor"></div>
      <button class="pxbtn ghost" style="font-size:8px" onclick="shuffle()">&#10227; SHUFFLE</button>
    </div>
    <div class="ctr-rows">
      <input id="nameInput" placeholder="ARTIST NAME…" maxlength="16">
      <div id="ctrRows" style="display:flex;flex-direction:column;gap:10px"></div>
      <div class="ctr-actions">
        <button class="pxbtn pink" style="flex:1" onclick="startApp()">&#9654; ENTER THE STUDIO</button>
      </div>
    </div>
  </div>
</section>

<!-- APP -->
<div id="app">
  <div class="topbar">
    <span class="mini-logo">TRACK<span class="q">QUEST</span></span>
    <div class="xpwrap">
      <span class="lv" id="lvLbl">LV 1</span>
      <div class="xpbar"><div class="xpfill" id="xpFill"></div></div>
      <span class="xpnum" id="xpLbl">0 XP</span>
    </div>
  </div>

  <div class="layout">
    <div class="board">
      <div class="board-head"><h2>PIPELINE</h2><span id="pipeSub">6 tracks in flight</span></div>
      <div class="cols" id="cols"></div>
    </div>

    <aside class="artist">
      <div class="panelbox artist-id">
        <canvas id="portraitCv"></canvas>
        <div class="info">
          <b id="artistName">ARTIST</b>
          <span id="artistMeta">Electronic · est. 2026</span>
        </div>
      </div>

      <div class="panelbox" id="attrBox">
        <div class="ph">ARTIST STATS</div>
        <div id="attrs"></div>
      </div>

      <div class="panelbox">
        <div class="ph">WEEKLY QUEST</div>
        <div class="quest">
          <div class="qicon">&#127919;</div>
          <div>
            <p>Touch <b>Neon Tide</b> three days in a row.</p>
            <small>2/3 DAYS · +40 XP</small>
          </div>
        </div>
      </div>

      <div class="panelbox">
        <div class="statrow">
          <div><b>1</b><span>released</span></div>
          <div><b>4</b><span>in flight</span></div>
          <div><b>4d</b><span>streak</span></div>
        </div>
      </div>
    </aside>
  </div>
</div>

<!-- SONG DETAIL -->
<div id="overlay" onclick="if(event.target===this)closeSong()">
  <div id="detailCard">
    <button class="close" onclick="closeSong()">X</button>
    <div id="dTitle"></div>
    <div id="dMeta"></div>
    <div id="dTasks"></div>
    <button class="pxbtn" id="advanceBtn" onclick="advanceStage()"></button>
  </div>
</div>

<!-- BUDDY -->
<div id="buddy">
  <div id="bubble"></div>
  <div class="flip" id="buddyFlip"><canvas id="buddyCv"></canvas></div>
</div>

<div id="toasts"></div>

<script>
/* ==================== PALETTES & SPECIES ==================== */
const OUTF   =['#ff4d9d','#3ee6c2','#ffd447','#8b6cff','#ff7a3d','#4da3ff','#eceef8','#2b2b3d'];
const OUTFN  =['Pink','Mint','Gold','Violet','Orange','Blue','White','Black'];
const DARK='#171827';

const SPECIES=[
 {name:'HUMAN',
  aLabel:'SKIN',   a:['#f0c8a0','#d9a066','#b07040','#8a4b2d','#f6d9c3','#c98a5b'],
  aN:['Peach','Tan','Bronze','Deep','Fair','Amber'],
  sLabel:'HAIR',   s:['Spikes','Bob','Buzz','Long','Mohawk','Afro','Ponytail'],
  cLabel:'HAIR COLOR', c:['#2b2b3d','#e8b23a','#c14a2e','#8b6cff','#3ec27a','#eceef8','#ff4d9d','#4da3ff'],
  cN:['Ink','Blonde','Copper','Violet','Green','Silver','Pink','Blue'],
  outLabel:'OUTFIT'},
 {name:'CAT',
  aLabel:'FUR',    a:['#8b8fad','#e8963a','#2b2b3d','#eceef8','#8a5a2b','#d9a066'],
  aN:['Gray','Orange','Black','White','Brown','Tan'],
  sLabel:'PATTERN',s:['Solid','Stripes','Patch'],
  cLabel:'MARKINGS', c:['#2b2b3d','#eceef8','#e8963a','#c14a2e','#8b8fad'],
  cN:['Ink','White','Orange','Rust','Gray'],
  outLabel:'HOODIE'},
 {name:'ROBOT',
  aLabel:'CHASSIS',a:['#aab0c8','#6a7086','#d4af37','#3ee6c2','#ff9ecb','#4da3ff'],
  aN:['Silver','Gunmetal','Gold','Teal','Rose','Blue'],
  sLabel:'ANTENNA',s:['Single','Twin','Dish'],
  cLabel:'LIGHTS', c:['#3ee6c2','#ffd447','#ff4d9d','#4da3ff','#b8e04a'],
  cN:['Mint','Gold','Pink','Blue','Lime'],
  outLabel:'PANEL'},
 {name:'ALIEN',
  aLabel:'SKIN',   a:['#3ec27a','#8b6cff','#4da3ff','#ff6ab5','#b8e04a','#3ee6c2'],
  aN:['Green','Violet','Blue','Pink','Lime','Teal'],
  sLabel:'EYES',   s:['One eye','Two eyes','Three eyes'],
  cLabel:'GLOW',   c:['#ffd447','#3ee6c2','#ff4d9d','#eceef8','#ff7a3d'],
  cN:['Gold','Mint','Pink','White','Orange'],
  outLabel:'SUIT'},
 {name:'SLIME',
  aLabel:'GOO',    a:['#3ee6c2','#ff9ecb','#7db8ff','#b28bff','#b8e04a','#ffd447'],
  aN:['Mint','Pink','Blue','Grape','Lime','Lemon'],
  sLabel:'FACE',   s:['Happy','Sleepy','Star eyes'],
  cLabel:'SPARKLE',c:['#eceef8','#ffd447','#ff4d9d','#3ee6c2','#8b6cff'],
  cN:['White','Gold','Pink','Mint','Violet'],
  outLabel:'HEADBAND'},
];
const GEARS=['Headphones','Guitar','Mic','Keytar','Drumsticks','Boombox','None'];

const state={
  ans:{genre:'Electronic',exp:1,pain:'tweak'},
  chr:{species:0,a:0,s:0,c:0,outfit:1,gear:0,name:''},
  xp:0, attrs:{}, songs:[]
};

/* ==================== SPRITE ENGINE ==================== */
const W=14,H=18;
function shade(hex,amt){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)+amt,g=((n>>8)&255)+amt,b=(n&255)+amt;
  r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));
  return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
}
function drawSprite(cv,chr,scale){
  cv.width=W;cv.height=H;
  cv.style.width=(W*scale)+'px';cv.style.height=(H*scale)+'px';
  const c=cv.getContext('2d');c.clearRect(0,0,W,H);
  const P=(x,y,col)=>{c.fillStyle=col;c.fillRect(x,y,1,1)};
  const R=(x0,y0,x1,y1,col)=>{for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)P(x,y,col)};
  const sp=SPECIES[chr.species];
  const A=sp.a[chr.a], AC=sp.c[chr.c], OUT=OUTF[chr.outfit];
  const style=sp.s[chr.s];
  let headTop=0; // for headphone placement

  /* ---- HUMAN ---- */
  if(sp.name==='HUMAN'){
    R(4,2,9,7,A); P(5,5,DARK);P(8,5,DARK);
    P(6,7,shade(A,-30));P(7,7,shade(A,-30));
    if(style!=='Buzz'){R(4,1,9,2,AC);}
    if(style==='Spikes'){P(4,0,AC);P(6,0,AC);P(8,0,AC);}
    if(style==='Bob'||style==='Long'||style==='Ponytail'){R(3,2,3,4,AC);R(10,2,10,4,AC);}
    if(style==='Long'){R(3,5,3,8,AC);R(10,5,10,8,AC);}
    if(style==='Ponytail'){P(11,3,AC);P(11,4,AC);P(11,5,AC);P(11,6,AC);}
    if(style==='Mohawk'){R(6,0,7,1,AC);P(6,2,AC);P(7,2,AC);}
    if(style==='Afro'){R(3,0,10,2,AC);P(2,1,AC);P(11,1,AC);P(3,3,AC);P(10,3,AC);}
    if(style==='Buzz'){R(4,2,9,2,shade(AC,-20));}
    R(4,8,9,11,OUT); R(4,12,9,12,shade(OUT,-40));
    R(3,8,3,11,OUT);R(10,8,10,11,OUT);
    P(3,12,A);P(10,12,A);
    R(4,13,5,15,'#2a2e4a');R(8,13,9,15,'#2a2e4a');
    R(4,16,5,16,'#11121f');R(8,16,9,16,'#11121f');
  }
  /* ---- CAT ---- */
  else if(sp.name==='CAT'){
    P(4,0,A);P(4,1,A);P(3,1,A); P(9,0,A);P(9,1,A);P(10,1,A); // ears
    P(4,1,'#e06a8a');P(9,1,'#e06a8a'); // inner ear
    R(4,2,9,7,A);
    R(6,5,7,6,shade(A,50)); // muzzle
    P(5,4,DARK);P(8,4,DARK); // eyes
    P(6,5,'#e06a8a');P(7,5,'#e06a8a'); // nose
    if(style==='Stripes'){P(5,2,AC);P(7,2,AC);P(9,2,AC);P(4,3,AC);P(10,3,AC);}
    if(style==='Patch'){R(8,2,9,3,AC);P(7,2,AC);}
    R(4,8,9,11,OUT); R(4,12,9,12,shade(OUT,-40));
    R(3,8,3,11,OUT);R(10,8,10,11,OUT);
    P(3,12,A);P(10,12,A); // paws
    R(4,13,5,15,A);R(8,13,9,15,A);
    R(4,16,5,16,shade(A,-45));R(8,16,9,16,shade(A,-45));
    P(10,13,A);P(11,12,A);P(11,11,A);P(11,10,style==='Solid'?A:AC); // tail
  }
  /* ---- ROBOT ---- */
  else if(sp.name==='ROBOT'){
    if(style==='Single'){P(6,1,'#9aa0b8');P(6,0,AC);}
    if(style==='Twin'){P(4,1,'#9aa0b8');P(4,0,AC);P(9,1,'#9aa0b8');P(9,0,AC);}
    if(style==='Dish'){R(5,0,8,0,'#9aa0b8');P(6,1,'#9aa0b8');P(7,1,'#9aa0b8');}
    R(4,2,9,7,A);
    R(4,2,9,2,shade(A,25)); // top plate
    R(4,4,9,4,'#11121f'); // visor
    P(5,4,AC);P(8,4,AC); // eyes
    P(6,6,DARK);P(7,6,DARK); // speaker
    R(4,8,9,11,A); R(4,12,9,12,shade(A,-40));
    R(5,9,8,10,OUT); P(6,9,AC); // chest panel + light
    R(3,8,3,11,A);R(10,8,10,11,A);
    P(3,12,shade(A,-30));P(10,12,shade(A,-30));
    R(4,13,5,15,shade(A,-25));R(8,13,9,15,shade(A,-25));
    R(4,16,5,16,'#11121f');R(8,16,9,16,'#11121f');
  }
  /* ---- ALIEN ---- */
  else if(sp.name==='ALIEN'){
    P(5,1,A);P(5,0,AC); P(8,1,A);P(8,0,AC); // antennae
    R(3,2,10,7,A);
    if(style==='One eye'){R(6,4,7,5,DARK);P(6,4,AC);}
    if(style==='Two eyes'){R(4,4,5,5,DARK);R(8,4,9,5,DARK);P(4,4,AC);P(8,4,AC);}
    if(style==='Three eyes'){P(4,4,DARK);P(6,4,DARK);P(9,4,DARK);P(4,4,AC===DARK?'#fff':AC);
      P(4,4,DARK);P(6,4,DARK);P(9,4,DARK);
      P(4,5,AC);P(6,5,AC);P(9,5,AC);}
    P(6,6,DARK);P(7,6,DARK); // mouth
    R(4,8,9,11,OUT); R(4,12,9,12,shade(OUT,-40));
    R(3,8,3,11,OUT);R(10,8,10,11,OUT);
    P(3,12,A);P(10,12,A);
    R(4,13,5,15,shade(A,-30));R(8,13,9,15,shade(A,-30));
    R(4,16,5,16,'#11121f');R(8,16,9,16,'#11121f');
  }
  /* ---- SLIME ---- */
  else if(sp.name==='SLIME'){
    headTop=5;
    R(6,4,7,4,A); R(5,5,8,5,A); R(4,6,9,6,A);
    R(3,7,10,15,A); R(4,16,9,16,A);
    P(4,7,shade(A,60));P(5,6,shade(A,60)); // shine
    R(4,5,9,5,OUT); // headband
    if(style==='Happy'){P(5,9,DARK);P(8,9,DARK);P(6,11,DARK);P(7,11,DARK);}
    if(style==='Sleepy'){R(4,9,5,9,DARK);R(8,9,9,9,DARK);P(6,11,DARK);P(7,11,DARK);}
    if(style==='Star eyes'){P(5,9,AC);P(8,9,AC);P(5,8,shade(AC,-40));P(8,8,shade(AC,-40));P(6,11,DARK);P(7,11,DARK);}
    P(4,13,AC);P(9,10,AC);P(6,14,AC); // sparkle dots
  }

  /* ---- GEAR (shared, with slime offset for headphones) ---- */
  const g=GEARS[chr.gear];
  const hy=headTop; // 0 normally, 5 for slime
  if(g==='Headphones'){
    if(hy===0){
      R(4,0,9,0,'#cfd3e8');P(3,1,'#cfd3e8');P(10,1,'#cfd3e8');
      R(3,3,3,5,'#3a3f63');R(10,3,10,5,'#3a3f63');
      P(3,4,'#ff4d9d');P(10,4,'#ff4d9d');
    }else{
      R(4,3,9,3,'#cfd3e8');P(3,4,'#cfd3e8');P(10,4,'#cfd3e8');
      R(3,8,3,10,'#3a3f63');R(10,8,10,10,'#3a3f63');
      P(3,9,'#ff4d9d');P(10,9,'#ff4d9d');
    }
  }else if(g==='Mic'){
    P(11,9,'#eceef8');R(11,10,11,12,'#3a3f63');
  }else if(g==='Guitar'){
    R(2,11,5,13,'#c14a2e');P(3,12,DARK);
    P(6,10,'#8a5a2b');P(7,10,'#8a5a2b');P(8,9,'#8a5a2b');P(9,9,'#8a5a2b');P(10,8,'#eceef8');
  }else if(g==='Keytar'){
    R(2,10,9,11,'#8b6cff');
    for(let x=2;x<=9;x+=2)P(x,11,'#ffffff');
  }else if(g==='Drumsticks'){
    P(2,10,'#d9a066');P(1,9,'#d9a066');P(1,8,'#eceef8');
    P(11,10,'#d9a066');P(12,9,'#d9a066');P(12,8,'#eceef8');
  }else if(g==='Boombox'){
    R(3,10,10,13,'#3a3f63');
    R(4,11,5,12,DARK);R(8,11,9,12,DARK);
    P(4,11,'#8b8fad');P(8,11,'#8b8fad');
    P(6,11,'#ff4d9d');P(7,11,'#3ee6c2');
    R(5,9,8,9,'#6a7086'); // handle
  }
}

/* ==================== NAV ==================== */
function go(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
let qi=0;
function answer(key,val,btn){
  state.ans[key]=val;
  btn.classList.add('sel');
  setTimeout(()=>{
    if(qi<2){
      document.getElementById('q'+qi).classList.remove('active');
      qi++;
      document.getElementById('q'+qi).classList.add('active');
      document.getElementById('d'+qi).classList.add('on');
    }else{
      go('screen-creator'); buildCreator();
    }
  },260);
}

/* ==================== CREATOR ==================== */
function buildCreator(){
  const tabs=document.getElementById('spTabs');tabs.innerHTML='';
  SPECIES.forEach((sp,i)=>{
    const b=document.createElement('button');
    b.className='sptab'+(i===state.chr.species?' on':'');
    b.textContent=sp.name;
    b.onclick=()=>{state.chr.species=i;state.chr.a=0;state.chr.s=0;state.chr.c=0;buildCreator();};
    tabs.appendChild(b);
  });
  const sp=SPECIES[state.chr.species];
  const rows=[
    {k:'a',label:sp.aLabel,len:sp.a.length,swatch:sp.a,names:sp.aN},
    {k:'s',label:sp.sLabel,len:sp.s.length,names:sp.s},
    {k:'c',label:sp.cLabel,len:sp.c.length,swatch:sp.c,names:sp.cN},
    {k:'outfit',label:sp.outLabel,len:OUTF.length,swatch:OUTF,names:OUTFN},
    {k:'gear',label:'GEAR',len:GEARS.length,names:GEARS},
  ];
  const host=document.getElementById('ctrRows');host.innerHTML='';
  rows.forEach(r=>{
    const div=document.createElement('div');div.className='ctr-row';
    div.innerHTML=`<label>${r.label}</label>
      <button class="arrow" data-k="${r.k}" data-d="-1">&#9664;</button>
      <span class="val" id="val-${r.k}"></span>
      <button class="arrow" data-k="${r.k}" data-d="1">&#9654;</button>`;
    host.appendChild(div);
  });
  host.querySelectorAll('.arrow').forEach(b=>{
    b.onclick=()=>{cycle(b.dataset.k,parseInt(b.dataset.d),rows)};
  });
  host._rows=rows;
  refreshCreator();
}
function cycle(k,dir,rows){
  const r=rows.find(x=>x.k===k);
  state.chr[k]=(state.chr[k]+dir+r.len)%r.len;
  refreshCreator();
}
function shuffle(){
  state.chr.species=Math.floor(Math.random()*SPECIES.length);
  const sp=SPECIES[state.chr.species];
  state.chr.a=Math.floor(Math.random()*sp.a.length);
  state.chr.s=Math.floor(Math.random()*sp.s.length);
  state.chr.c=Math.floor(Math.random()*sp.c.length);
  state.chr.outfit=Math.floor(Math.random()*OUTF.length);
  state.chr.gear=Math.floor(Math.random()*GEARS.length);
  buildCreator();
}
function refreshCreator(){
  const rows=document.getElementById('ctrRows')._rows;
  rows.forEach(r=>{
    const el=document.getElementById('val-'+r.k);
    const i=state.chr[r.k];
    const sw=r.swatch?`<span class="swatch" style="background:${r.swatch[i]}"></span>`:'';
    el.innerHTML=sw+`<span>${r.names[i]}</span>`;
  });
  const scale=window.innerWidth<520?9:11;
  drawSprite(document.getElementById('previewCv'),state.chr,scale);
}

/* ==================== ATTRS / XP ==================== */
const PAIN_MAP={
  steam:{attr:'Consistency',tip:'shorter sessions, more often'},
  tweak:{attr:'Finisher',tip:'deadlines beat perfection'},
  time:{attr:'Consistency',tip:'protect two nights a week'},
  arrange:{attr:'Arrangement',tip:'steal a structure, then bend it'}
};
const ATTR_COLORS={'Finisher':'var(--pink)','Consistency':'var(--gold)','Sound design':'var(--violet)','Arrangement':'var(--mint)','Hustle':'var(--orange)'};
function seedAttrs(){
  const base=[25,40,55,65][state.ans.exp]||40;
  state.attrs={'Finisher':base,'Consistency':base+3,'Sound design':base+10,'Arrangement':base,'Hustle':base-6};
  const weak=PAIN_MAP[state.ans.pain].attr;
  state.attrs[weak]=Math.max(10,state.attrs[weak]-18);
}
function renderAttrs(){
  const host=document.getElementById('attrs');host.innerHTML='';
  Object.entries(state.attrs).forEach(([k,v])=>{
    v=Math.min(100,Math.round(v));
    host.insertAdjacentHTML('beforeend',
     `<div class="attr"><div class="row"><b>${k}</b><span>${v}</span></div>
      <div class="abar"><div class="afill" style="width:${v}%;background:${ATTR_COLORS[k]}"></div></div></div>`);
  });
}
function bump(attr,n){ state.attrs[attr]=Math.min(100,state.attrs[attr]+n); renderAttrs(); }
function addXP(n){
  const oldLv=Math.floor(state.xp/100)+1;
  state.xp+=n;
  const lv=Math.floor(state.xp/100)+1;
  document.getElementById('lvLbl').textContent='LV '+lv;
  document.getElementById('xpLbl').textContent=(state.xp%100)+'/100 XP';
  document.getElementById('xpFill').style.width=(state.xp%100)+'%';
  if(lv>oldLv){ toast('LEVEL UP! LV '+lv,true); celebrate(); confetti(); }
}
function toast(msg,lvl){
  const t=document.createElement('div');
  t.className='toast'+(lvl?' lvl':'');t.textContent=msg;
  document.getElementById('toasts').appendChild(t);
  setTimeout(()=>t.remove(),2600);
}
function confetti(){
  const b=document.getElementById('buddy').getBoundingClientRect();
  const cols=['#ff4d9d','#3ee6c2','#ffd447','#8b6cff'];
  for(let i=0;i<14;i++){
    const s=document.createElement('div');s.className='confetti';
    s.style.background=cols[i%4];
    s.style.left=(b.left+b.width/2)+'px';s.style.top=(b.top)+'px';
    document.body.appendChild(s);
    const vx=(Math.random()-0.5)*5, vy=-(2+Math.random()*4);
    let x=0,y=0,vY=vy,f=0;
    (function fall(){
      f++; x+=vx; vY+=0.35; y+=vY;
      s.style.transform=`translate(${x}px,${y}px) rotate(${f*14}deg)`;
      if(f<50)requestAnimationFrame(fall);else s.remove();
    })();
  }
}

/* ==================== BOARD ==================== */
const STAGES=['Ideas','In production','Mixing','Mastering','Released'];
state.songs=[
 {id:'glass',title:'Glass Bloom',stage:0,days:3,bpm:'96 BPM',key:'F min',
  tasks:[{t:'Hum the hook into voice memos',d:true},{t:'Pick a drum palette',d:false}]},
 {id:'runner',title:'Runner',stage:1,days:6,bpm:'128 BPM',key:'A min',
  tasks:[{t:'Lay down the bassline',d:true},{t:'Sketch verse 2',d:false},{t:'Record vocal chops',d:false}]},
 {id:'static',title:'Static Hearts',stage:1,days:12,bpm:'140 BPM',key:'C# min',
  tasks:[{t:'Rebuild the intro',d:false},{t:'Sound-design the lead',d:true},{t:'Tighten drums',d:false}]},
 {id:'neon',title:'Neon Tide',stage:2,days:21,bpm:'122 BPM',key:'G min',stuck:true,
  tasks:[{t:'Balance the low end',d:false},{t:'Automate the drop',d:false},{t:'Reference check on monitors',d:false},{t:'Bounce v2',d:false}]},
 {id:'mid',title:'Midnight Fuel',stage:3,days:4,bpm:'174 BPM',key:'E min',
  tasks:[{t:'Approve the master',d:false},{t:'Write release notes',d:false}]},
 {id:'first',title:'First Light',stage:4,days:60,bpm:'118 BPM',key:'B maj',plays:'12.4k plays',
  tasks:[{t:'Released',d:true}]}
];
function songProg(s){const d=s.tasks.filter(t=>t.d).length;return Math.round(100*d/s.tasks.length)}
function renderBoard(){
  const host=document.getElementById('cols');host.innerHTML='';
  STAGES.forEach((st,i)=>{
    const songs=state.songs.filter(s=>s.stage===i);
    const col=document.createElement('div');col.className='col';
    col.innerHTML=`<div class="colh c${i}" id="colh-${i}"><b>${st}</b><i>${songs.length}</i></div>`;
    songs.forEach(s=>{
      const stuckTag=(s.stage<4&&s.days>14)?`<span class="tag stuck">STUCK ${s.days}D</span>`:'';
      const playTag=s.plays?`<span class="tag play">${s.plays}</span>`:'';
      col.insertAdjacentHTML('beforeend',
       `<button class="card" id="card-${s.id}" onclick="openSong('${s.id}')">
          <h4>${s.title}</h4>
          <div class="tags"><span class="tag">${s.bpm}</span><span class="tag">${s.key}</span>${stuckTag}${playTag}</div>
          <div class="prog"><div class="progfill" style="width:${songProg(s)}%"></div></div>
          <div class="days">${s.stage===4?'out in the world':s.days+' days in '+st.toLowerCase()}</div>
        </button>`);
    });
    if(i===0){
      col.insertAdjacentHTML('beforeend',`<button class="addcard" onclick="newIdea()">+ New idea</button>`);
    }
    host.appendChild(col);
  });
  const inFlight=state.songs.filter(s=>s.stage<4).length;
  document.getElementById('pipeSub').textContent=inFlight+' tracks in flight';
}
let ideaN=0;
function newIdea(){
  ideaN++;
  state.songs.push({id:'idea'+ideaN,title:'Untitled idea '+ideaN,stage:0,days:0,bpm:'? BPM',key:'?',
    tasks:[{t:'Capture the spark before it fades',d:false}]});
  renderBoard(); addXP(5); toast('+5 XP - NEW IDEA');
  bump('Consistency',1);
}

/* ==================== SONG DETAIL ==================== */
let openId=null;
function openSong(id){
  openId=id;
  const s=state.songs.find(x=>x.id===id);
  document.getElementById('dTitle').textContent=s.title.toUpperCase();
  document.getElementById('dMeta').innerHTML=
    `<span class="tag">${STAGES[s.stage]}</span><span class="tag">${s.bpm}</span><span class="tag">${s.key}</span>`
    +(s.stage<4&&s.days>14?`<span class="tag stuck">STUCK ${s.days}D</span>`:'');
  renderTasks(s);
  document.getElementById('overlay').classList.add('open');
  setTimeout(()=>{
    const dc=document.getElementById('detailCard').getBoundingClientRect();
    placeBuddyXY(Math.min(window.innerWidth-90,dc.right-70), Math.max(60,dc.top-4));
  },80);
}
function renderTasks(s){
  const host=document.getElementById('dTasks');host.innerHTML='';
  s.tasks.forEach((t,i)=>{
    host.insertAdjacentHTML('beforeend',
     `<button class="check ${t.d?'done':''}" onclick="toggleTask(${i})">
        <span class="box">${t.d?'&#10003;':''}</span><span class="t">${t.t}</span></button>`);
  });
  const btn=document.getElementById('advanceBtn');
  const allDone=s.tasks.every(t=>t.d);
  if(allDone&&s.stage<4){
    btn.innerHTML='&#9654; MOVE TO '+STAGES[s.stage+1].toUpperCase();
    btn.classList.add('show');
  }else btn.classList.remove('show');
}
function toggleTask(i){
  const s=state.songs.find(x=>x.id===openId);
  s.tasks[i].d=!s.tasks[i].d;
  renderTasks(s); renderBoard();
  if(s.tasks[i].d){ addXP(15); toast('+15 XP'); bump('Finisher',2); celebrate(); }
}
function advanceStage(){
  const s=state.songs.find(x=>x.id===openId);
  s.stage++; s.days=0; s.tasks.forEach(t=>t.d=false);
  if(s.stage===2)s.tasks=[{t:'Balance the mix',d:false},{t:'Reference check',d:false}];
  if(s.stage===3)s.tasks=[{t:'Approve the master',d:false}];
  if(s.stage===4){s.tasks=[{t:'Released',d:true}];s.plays='0 plays';}
  addXP(30); bump('Finisher',4); bump('Consistency',2);
  toast(s.stage===4?'RELEASED! +30 XP':'+30 XP - STAGE CLEAR',s.stage===4);
  celebrate(); confetti();
  renderBoard(); closeSong();
}
function closeSong(){
  document.getElementById('overlay').classList.remove('open');
  openId=null; hideBubble();
  setTimeout(()=>anchorBuddyToBoard(),150);
}

/* ==================== BUDDY ==================== */
const buddy=document.getElementById('buddy');
const buddyFlip=document.getElementById('buddyFlip');
let bx=-120,by=window.innerHeight*0.6;
function buddyScale(){return window.innerWidth<520?4:5}
function placeBuddyXY(x,y){
  hideBubble();
  buddyFlip.style.transform=(x<bx)?'scaleX(-1)':'scaleX(1)';
  buddy.classList.remove('idle');buddy.classList.add('walking');
  bx=x;by=y;
  buddy.style.left=x+'px';buddy.style.top=y+'px';
  clearTimeout(buddy._t);
  buddy._t=setTimeout(()=>{
    buddy.classList.remove('walking');buddy.classList.add('idle');
    buddyFlip.style.transform='scaleX(1)';
    if(buddy._onArrive){const f=buddy._onArrive;buddy._onArrive=null;f();}
  },1250);
}
function placeBuddyAt(el,dx,dy){
  const r=el.getBoundingClientRect();
  const h=H*buddyScale(), w=W*buddyScale();
  const x=Math.min(window.innerWidth-w-10, Math.max(6, r.left+dx));
  const y=Math.min(window.innerHeight-h-10, Math.max(60, r.top+dy-h));
  placeBuddyXY(x,y);
}
function celebrate(){
  buddy.classList.add('jump');
  setTimeout(()=>buddy.classList.remove('jump'),650);
}
function say(html,btns){
  const b=document.getElementById('bubble');
  b.innerHTML=html+(btns&&btns.length?
    `<div class="bbtns">${btns.map((x,i)=>`<button class="${x.ghost?'ghost':''}" onclick="bubbleAct(${i})">${x.label}</button>`).join('')}</div>`:'');
  b._btns=btns||[];
  b.classList.add('show');
}
function bubbleAct(i){
  const b=document.getElementById('bubble');
  const act=b._btns[i];hideBubble();
  if(act&&act.cb)act.cb();
}
function hideBubble(){document.getElementById('bubble').classList.remove('show')}
function anchorBuddyToBoard(){
  const stuck=document.getElementById('card-neon');
  const el=stuck||document.getElementById('colh-2');
  if(el)placeBuddyAt(el,-8,-6);
}

/* ==================== COACHING ==================== */
function firstCoach(){
  buddy._onArrive=()=>{
    const p=PAIN_MAP[state.ans.pain];
    say(`<b>Neon Tide</b> has sat in mixing for 21 days. You said ${p.attr.toLowerCase()} is the fight — ${p.tip}. Want me to break it into 3 small steps?`,
      [{label:'BREAK IT DOWN',cb:coachPlan},{label:'LATER',ghost:true}]);
  };
}
function coachPlan(){
  const s=state.songs.find(x=>x.id==='neon');
  s.tasks=[
    {t:'20-min low-end pass — then stop',d:false},
    {t:'One reference track, one listen',d:false},
    {t:'Bounce v2 and walk away',d:false}
  ];
  renderBoard(); addXP(10); toast('+10 XP - PLAN MADE'); celebrate();
  openSong('neon');
}

/* ==================== START ==================== */
function startApp(){
  const name=document.getElementById('nameInput').value.trim()||'NEW ARTIST';
  state.chr.name=name.toUpperCase();
  seedAttrs();
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('app').classList.add('active');
  document.getElementById('artistName').textContent=state.chr.name;
  document.getElementById('artistMeta').textContent=state.ans.genre+' · est. 2026';
  drawSprite(document.getElementById('portraitCv'),state.chr,4);
  drawSprite(document.getElementById('buddyCv'),state.chr,buddyScale());
  renderBoard(); renderAttrs(); addXP(40); toast('+40 XP - ARTIST CREATED');
  setTimeout(()=>{ firstCoach(); anchorBuddyToBoard(); },900);
}

window.addEventListener('resize',()=>{
  if(document.getElementById('app').classList.contains('active')){
    drawSprite(document.getElementById('buddyCv'),state.chr,buddyScale());
    if(!openId)anchorBuddyToBoard();
  }else if(document.getElementById('screen-creator').classList.contains('active')){
    refreshCreator();
  }
});
</script>
</body>
</html>

```

*End of specification. This document plus nothing else is sufficient input for a build agent.*
