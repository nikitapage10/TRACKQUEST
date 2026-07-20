import { useMemo, useState } from 'react';
import { INTENT_META } from '../../config';
import { dayKey, isScheduledDay } from '../../engine/streak';
import { useStore } from '../../state/store';
import { PixelButton } from '../../components/widgets/PixelButton';
import type { Session } from '../../types';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function parseDay(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function isTouchEvent(e: { songId?: string; type: string }): boolean {
  return !!e.songId || e.type === 'capture' || e.type === 'session';
}

function intensityFor(xp: number, t1: number, t2: number): number {
  if (xp <= 0) return 0.35;
  if (xp <= t1) return 0.45;
  if (xp <= t2) return 0.72;
  return 1;
}

function sessionTitle(sess: Session, songs: { id: string; title: string }[]): string {
  if (sess.songId) {
    const song = songs.find((s) => s.id === sess.songId);
    if (song) return song.title;
  }
  return 'Open session';
}

export function Calendar() {
  const setView = useStore((s) => s.setView);
  const streak = useStore((s) => s.streak);
  const settings = useStore((s) => s.settings);
  const xp = useStore((s) => s.xp);
  const sessions = useStore((s) => s.sessions);
  const songs = useStore((s) => s.songs);

  const todayKey = dayKey();
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const touchXpByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of xp.events) {
      if (!isTouchEvent(e)) continue;
      const k = dayKey(new Date(e.at));
      map.set(k, (map.get(k) ?? 0) + e.amount);
    }
    for (const s of sessions) {
      if (!s.endedAt) continue;
      const k = dayKey(new Date(s.startedAt));
      if (!map.has(k)) map.set(k, 0);
    }
    return map;
  }, [xp.events, sessions]);

  const monthDays = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const cells: { key: string; day: number; inMonth: boolean }[] = [];

    for (let i = 0; i < startPad; i++) {
      const d = new Date(y, m, 1 - (startPad - i));
      cells.push({ key: dayKey(d), day: d.getDate(), inMonth: false });
    }
    for (let day = 1; day <= last.getDate(); day++) {
      const d = new Date(y, m, day);
      cells.push({ key: dayKey(d), day, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(y, m + 1, cells.length - startPad - last.getDate() + 1);
      cells.push({ key: dayKey(d), day: d.getDate(), inMonth: false });
    }
    return cells;
  }, [viewMonth]);

  const monthXpValues = useMemo(() => {
    const prefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}`;
    return Array.from(touchXpByDay.entries())
      .filter(([k]) => k.startsWith(prefix))
      .map(([, v]) => v)
      .sort((a, b) => a - b);
  }, [touchXpByDay, viewMonth]);

  const tertiles = useMemo(() => {
    if (monthXpValues.length < 2) return { t1: 0, t2: 0 };
    const t1 = monthXpValues[Math.floor(monthXpValues.length / 3)] ?? 0;
    const t2 = monthXpValues[Math.floor((monthXpValues.length * 2) / 3)] ?? t1;
    return { t1, t2 };
  }, [monthXpValues]);

  const weekSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.endedAt && s.endedAt >= xp.weekStart)
        .sort((a, b) => b.startedAt - a.startedAt),
    [sessions, xp.weekStart],
  );

  const repairsLeft = Math.max(0, 1 - streak.repairsUsedThisMonth);

  const shiftMonth = (delta: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  return (
    <div style={{ padding: '20px 18px 120px', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <PixelButton variant="ghost" onClick={() => setView('board')}>
          ← BACK
        </PixelButton>
        <h2 className="pxhead" style={{ fontSize: 12 }}>
          CALENDAR
        </h2>
      </div>

      <div className="panelbox" style={{ marginBottom: 16, textAlign: 'left' }}>
        <div className="statrow">
          <div>
            <b>{streak.current}</b>
            <span>current</span>
          </div>
          <div>
            <b>{streak.best}</b>
            <span>best</span>
          </div>
          <div>
            <b>{repairsLeft}</b>
            <span>repairs left</span>
          </div>
        </div>
      </div>

      <div className="panelbox" style={{ marginBottom: 16, textAlign: 'left' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            className="icon-btn"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            ‹
          </button>
          <span className="ph" style={{ margin: 0 }}>
            {monthLabel(viewMonth).toUpperCase()}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Next month"
            onClick={() => shiftMonth(1)}
          >
            ›
          </button>
        </div>

        <div className="calendar-grid">
          {WEEKDAYS.map((w, i) => (
            <div
              key={`${w}-${i}`}
              style={{
                fontFamily: 'var(--pixel)',
                fontSize: 7,
                color: 'var(--muted)',
                textAlign: 'center',
                padding: '2px 0',
              }}
            >
              {w}
            </div>
          ))}
          {monthDays.map(({ key, day, inMonth }) => {
            const touched = touchXpByDay.has(key);
            const scheduled = isScheduledDay(settings.schedule, parseDay(key));
            const isToday = key === todayKey;
            const dayXp = touchXpByDay.get(key) ?? 0;
            const classes = ['cal-cell'];
            if (touched) classes.push('touch');
            else if (scheduled && inMonth) classes.push('scheduled');
            if (isToday) classes.push('today');

            return (
              <div
                key={key}
                className={classes.join(' ')}
                style={{
                  opacity: inMonth ? 1 : 0.25,
                  background: touched
                    ? `color-mix(in srgb, var(--mint) ${Math.round(intensityFor(dayXp, tertiles.t1, tertiles.t2) * 100)}%, var(--panel))`
                    : undefined,
                  color: touched ? 'var(--bg)' : 'var(--muted)',
                  fontWeight: isToday ? 700 : 400,
                }}
                title={
                  touched
                    ? `${key} · ${dayXp} XP`
                    : scheduled
                      ? `${key} · scheduled`
                      : key
                }
              >
                {day}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panelbox" style={{ textAlign: 'left' }}>
        <div className="ph">THIS WEEK</div>
        {weekSessions.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>No sessions logged yet this week.</p>
        ) : (
          weekSessions.map((sess) => {
            const meta = INTENT_META[sess.intent];
            const when = new Date(sess.startedAt).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });
            return (
              <div
                key={sess.id}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--line)',
                  fontSize: 13,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{meta?.icon ?? '🎵'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', marginBottom: 2 }}>
                    {sessionTitle(sess, songs)}
                  </b>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                    {when} · {meta?.label ?? sess.intent} · {sess.minutes}m
                  </span>
                  {sess.summary && (
                    <p style={{ marginTop: 4, color: 'var(--muted)', fontSize: 12 }}>
                      {sess.summary}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
