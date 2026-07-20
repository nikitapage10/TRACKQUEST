import { nanoid } from 'nanoid';
import type { AttrKey, Pain, Stage, Task } from '../../types';

export function generatePlan(song: { stage: Stage; versions: { length: number }; title: string }, pain: Pain): Task[] {
  const now = Date.now();
  const mk = (text: string, arrangeKit = false): Task => ({
    id: nanoid(),
    text,
    done: false,
    source: 'coach',
    createdAt: now,
    arrangeKit,
  });

  const stage = song.stage;
  const vn = song.versions.length + 1;

  if (pain === 'steam') {
    if (stage <= 1) {
      return [
        mk('15-min pass on ONE section'),
        mk("Leave a note for next-you: what's the very next move?"),
        mk("Book the next touch: add tomorrow's 10-min task"),
      ];
    }
    return [
      mk('15-min pass on ONE section'),
      mk("Leave a note for next-you: what's the very next move?"),
      mk("Book the next touch: add tomorrow's 10-min task"),
    ];
  }

  if (pain === 'tweak') {
    const stageWord = stage >= 3 ? 'master' : stage === 2 ? 'mix' : 'production';
    return [
      mk(`20-min ${stageWord} pass — then stop`),
      mk('One reference track, one listen'),
      mk(`Bounce v${vn} and walk away`),
    ];
  }

  if (pain === 'time') {
    return [
      mk('10-min micro-pass: loudest problem only'),
      mk('Voice-memo your next idea for it'),
      mk('Queue a 25-min session this week'),
    ];
  }

  // arrange
  return [
    mk("Map one reference's arrangement (intro/verse/etc.)", true),
    mk('Copy that skeleton into your project markers', true),
    mk('Fill ONE empty section, ugly is fine', true),
  ];
}

export function defaultTasksForStage(stage: Stage, pain: Pain): Task[] {
  const now = Date.now();
  const mk = (text: string, arrangeKit = false): Task => ({
    id: nanoid(),
    text,
    done: false,
    source: 'user',
    createdAt: now,
    arrangeKit,
  });

  let base: Task[] = [];
  if (stage === 1) {
    base = [mk('Lay down the core idea'), mk('Sketch structure'), mk('Capture a rough bounce')];
  } else if (stage === 2) {
    base = [mk('Balance the mix'), mk('Reference check')];
  } else if (stage === 3) {
    base = [mk('Approve the master'), mk('Write release notes')];
  } else if (stage === 4) {
    base = [{ ...mk('Released'), done: true, completedAt: now }];
  } else {
    base = [mk('Capture the spark before it fades')];
  }

  // playbook may append one signature task
  if (pain === 'tweak' && stage >= 1 && stage <= 3) {
    base.push(mk('Hard stop: bounce and walk away'));
  } else if (pain === 'steam' && stage <= 1) {
    base.push(mk('Schedule tomorrow\'s 10-min touch'));
  } else if (pain === 'time' && stage < 4) {
    base.push(mk('10-min micro-pass queued'));
  } else if (pain === 'arrange' && stage <= 1) {
    base.push(mk('Fill ONE empty section, ugly is fine', true));
  }

  return base;
}

export function painDefaults(pain: Pain): {
  walkAwayEnabled: boolean;
  sessionHint?: string;
} {
  if (pain === 'tweak') return { walkAwayEnabled: true, sessionHint: 'Walk-away bell on by default' };
  if (pain === 'time') return { walkAwayEnabled: false, sessionHint: '10-min micro option pinned' };
  if (pain === 'steam') return { walkAwayEnabled: false, sessionHint: 'Suggested session: 25 min' };
  return { walkAwayEnabled: false };
}

export function weakAttrLabel(pain: Pain): AttrKey {
  const map: Record<Pain, AttrKey> = {
    steam: 'consistency',
    tweak: 'finisher',
    time: 'consistency',
    arrange: 'arrangement',
  };
  return map[pain];
}
