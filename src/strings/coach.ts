import type { Voice } from '../types';

type VoiceMap = Record<Voice, string>;

export const COACH: Record<string, VoiceMap> = {
  return_absence: {
    hype: "You're BACK. The studio kept everything warm. {song} is closest to done — want the 2-minute re-entry?",
    real: "Hey. Everything's where you left it. {song} is your closest to done — want the 2-minute version?",
    drill: 'Welcome back. Status: intact. Recommended re-entry: {song}, one 2-minute task. Ready?',
    facts: '{n} days away. All data preserved. Nearest-to-done: {song}. 2-minute re-entry available.',
  },
  rescue_offer: {
    hype: "YES. Let's break {song} into three tiny wins right now!",
    real: "Good. Want me to break {song} into three small next steps?",
    drill: 'Song logged. Proposal: three-task micro-plan for {song}. Authorize?',
    facts: '{song} saved. Generate 3-step plan?',
  },
  stuck_song: {
    hype: '{song} deserves better than {n} days on the bench! Three small moves and it\'s ALIVE again. Break it down?',
    real: '{song} has sat for {n} days. You said {weakAttr} is the fight — {tip}. Want 3 small steps?',
    drill: '{song}: {n} days idle. Proposal: three tasks, twenty minutes each. Shall I write them?',
    facts: '{song}: {n} days without a touch. Suggested action: 3-step breakdown. Generate?',
  },
  tweak_spiral: {
    hype: "You've BEEN in there!! Let's aim that energy — new list, 3 moves, we EAT.",
    real: "Four sessions, no checkboxes. The plan's wrong, not you. Rewrite the list?",
    drill: 'Session four. Zero objectives cleared. New orders: three tasks, twenty minutes each. Ready?',
    facts: '4 sessions / 0 tasks on {song}. Suggested action: revise task list.',
  },
  hoarding: {
    hype: '{n} new sparks this week — your brain is ON FIRE. Pick one and let\'s make it real?',
    real: '{n} ideas in, zero sessions. Collecting is fun; finishing is the game. Open one?',
    drill: 'Intake: {n}. Output: 0. Select one idea for development.',
    facts: 'Ideas this week: {n}. Sessions: 0. Ratio suggests: open one.',
  },
  streak_risk: {
    hype: "{n}-day streak on the line and I KNOW you've got 5 minutes in you!",
    real: 'Scheduled day, nothing yet. Even a tiny touch keeps the {n}-day streak.',
    drill: 'Today is a music day. Minimum viable touch: one capture. Go.',
    facts: 'Streak: {n}. Today: 0 touches. Window closes at midnight.',
  },
  streak_repair: {
    hype: "Missed one — HAPPENS. I'll cover for you this once. Deal?",
    real: 'Streak broke. I can cover you once a month. Use it?',
    drill: 'One absence logged. One cover available. Authorize?',
    facts: 'Streak break detected. Repairs available: 1. Apply?',
  },
  seed_replay: {
    hype: "This is the SPARK that started {song}. Want to hear it again?",
    real: "You've got a seed memo on {song}. Replay the spark?",
    drill: 'Seed memo available for {song}. Play?',
    facts: 'Seed memo on {song}. Age ≥21d. Playback available.',
  },
  boss_near: {
    hype: '{song} drops in {n} days!! We are LOCKED IN. Show tasks?',
    real: '{song} is due in {n} days. Want to see what\'s left?',
    drill: 'Boss countdown: {n} days. Review open objectives?',
    facts: 'Release date for {song}: {n} days. Open tasks remain.',
  },
  boss_missed: {
    hype: "Date slipped — no shame. New date or drop it?",
    real: "The release date passed. Pick a new one, or drop the date?",
    drill: 'Deadline missed. Options: reschedule or clear date.',
    facts: 'Boss date passed for {song}. Reschedule or clear?',
  },
  demo_day: {
    hype: "DEMO DAY!! Bounce something and let a human hear it!",
    real: "It's Demo Day. Bounce current state and mark it heard?",
    drill: 'Demo Day scheduled. Produce bounce + human-heard confirmation.',
    facts: 'Demo Day due. Log bounce + heard checkbox.',
  },
  weekly_report: {
    hype: "Week wrap!! {tip}",
    real: "Quick studio report: {tip}",
    drill: 'Weekly status: {tip}',
    facts: 'Weekly summary: {tip}',
  },
};

export const IDLE_QUIPS: Record<Voice, string[]> = {
  hype: [
    'THAT last bounce though.',
    "We're so close on {song} I can TASTE it.",
    'Hydrate. Then DOMINATE.',
    'Your future self is already dancing.',
    'Tiny move. Huge vibe.',
    'The board loves you today.',
    'Finisher energy incoming.',
    'I believe in this chorus.',
  ],
  real: [
    'No notes. Just vibes.',
    '{song} misses you a little.',
    'One honest pass beats ten perfect ones.',
    "You're allowed to shelve it.",
    'Quiet day is still a day.',
    'Trust the ugly version.',
    'Keep the spark warm.',
    'Progress is uneven. That\'s fine.',
  ],
  drill: [
    'Posture check.',
    'Hydrate, then create.',
    'Objective: one touch.',
    'Timer. Task. Done.',
    'No spiral. Bounce.',
    'Schedule adherence: recommended.',
    'Close the tabs. Open the project.',
    'Execute the next small move.',
  ],
  facts: [
    'Chair-time this week: {n} min.',
    'Current level: {n}.',
    'Active songs: {n}.',
    'Streak: {n}.',
    'Open tasks: {n}.',
    'Sessions logged: {n}.',
    'Energy lowest on {song}.',
    'XP to next level: {n}.',
  ],
};
