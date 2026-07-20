import { useEffect, useMemo, useRef, useState } from 'react';
import { INTENT_META, WALKAWAY_SNOOZE_MIN } from '../../config';
import { PixelButton } from '../../components/widgets/PixelButton';
import { useStore } from '../../state/store';
import { UI } from '../../strings/ui';
import type { Intent } from '../../types';

function formatTimer(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const WALKAWAY_INTENTS: Intent[] = ['produce', 'mix', 'master'];

function IntentGrid({
  selected,
  onSelect,
}: {
  selected: Intent | null;
  onSelect: (intent: Intent) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        width: '100%',
        maxWidth: 360,
        marginBottom: 16,
      }}
    >
      {(Object.keys(INTENT_META) as Intent[]).map((key) => {
        const meta = INTENT_META[key];
        return (
          <button
            key={key}
            type="button"
            className={`opt${selected === key ? ' sel' : ''}`}
            style={{ padding: '14px 8px', textAlign: 'center' }}
            onClick={() => onSelect(key)}
          >
            <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{meta.icon}</span>
            <small>{meta.label}</small>
          </button>
        );
      })}
    </div>
  );
}

export function FocusSession() {
  const view = useStore((s) => s.view);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const sessions = useStore((s) => s.sessions);
  const songs = useStore((s) => s.songs);
  const settings = useStore((s) => s.settings);
  const walkAwayPrompt = useStore((s) => s.walkAwayPrompt);
  const openSongId = useStore((s) => s.openSongId);
  const startSession = useStore((s) => s.startSession);
  const endSession = useStore((s) => s.endSession);
  const snoozeWalkAway = useStore((s) => s.snoozeWalkAway);
  const setCompanionAnim = useStore((s) => s.setCompanionAnim);

  const session = useMemo(
    () => sessions.find((s) => s.id === activeSessionId),
    [sessions, activeSessionId],
  );

  const [tick, setTick] = useState(0);
  const [ending, setEnding] = useState(false);
  const [walkAwayEnd, setWalkAwayEnd] = useState(false);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [goal, setGoal] = useState('');
  const [songId, setSongId] = useState<string | undefined>(openSongId ?? undefined);
  const [summary, setSummary] = useState('');
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [attachBounce, setAttachBounce] = useState(false);
  const [bounceNote, setBounceNote] = useState('');
  const [audio, setAudio] = useState<File | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);
  const walkAwayFired = useRef(false);

  const activeSongs = useMemo(
    () => songs.filter((s) => s.status === 'active' && !s.isExample),
    [songs],
  );

  const song = useMemo(
    () => (session?.songId ? songs.find((s) => s.id === session.songId) : undefined),
    [session?.songId, songs],
  );

  const openTasks = useMemo(
    () => (song ? song.tasks.filter((t) => !t.done) : []),
    [song],
  );

  const needsSongPicker =
    !session &&
    activeSongs.length > 1 &&
    intent !== 'admin' &&
    intent !== 'play';

  const show = view === 'focus';
  const elapsed = session ? Date.now() - session.startedAt : 0;

  useEffect(() => {
    if (!show || !session) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [show, session?.id]);

  useEffect(() => {
    if (!session || ending) return;
    setCompanionAnim('headphones-desk');
  }, [session?.id, ending, setCompanionAnim]);

  useEffect(() => {
    if (!session || ending || walkAwayPrompt) return;
    if (!settings.walkAwayEnabled) return;
    if (!WALKAWAY_INTENTS.includes(session.intent)) return;

    const thresholdMin =
      settings.walkAwayMinutes + session.snoozes * WALKAWAY_SNOOZE_MIN;
    const elapsedMin = (Date.now() - session.startedAt) / 60000;

    if (elapsedMin >= thresholdMin && !walkAwayFired.current) {
      walkAwayFired.current = true;
      useStore.setState({ walkAwayPrompt: true });
    }
  }, [
    tick,
    session,
    ending,
    walkAwayPrompt,
    settings.walkAwayEnabled,
    settings.walkAwayMinutes,
  ]);

  useEffect(() => {
    if (!session) {
      walkAwayFired.current = false;
      setEnding(false);
      setWalkAwayEnd(false);
    }
  }, [session?.id]);

  useEffect(() => {
    if (!walkAwayPrompt) walkAwayFired.current = false;
  }, [walkAwayPrompt]);

  const toggleTaskId = (id: string) => {
    setTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleStart = () => {
    if (!intent) return;
    const sid =
      intent === 'admin' || intent === 'play'
        ? undefined
        : songId ?? activeSongs[0]?.id;
    startSession(sid, intent, goal.trim() || undefined);
    setIntent(null);
    setGoal('');
  };

  const handleEndClick = () => {
    setEnding(true);
    useStore.setState({ walkAwayPrompt: false });
  };

  const handleBounceStop = () => {
    setWalkAwayEnd(true);
    setEnding(true);
    useStore.setState({ walkAwayPrompt: false });
  };

  const handleLogIt = () => {
    endSession({
      summary: summary.trim() || undefined,
      taskIds: taskIds.length ? taskIds : undefined,
      attachBounce: attachBounce && !walkAwayEnd,
      bounceNote: bounceNote.trim() || undefined,
      audio,
      walkAway: walkAwayEnd,
    });
    setSummary('');
    setTaskIds([]);
    setAttachBounce(false);
    setBounceNote('');
    setAudio(undefined);
    setEnding(false);
    setWalkAwayEnd(false);
  };

  if (!show) return null;

  if (!activeSessionId || !session) {
    return (
      <div
        className="sheet-backdrop center"
        onClick={(e) => {
          if (e.target === e.currentTarget) useStore.getState().setView('board');
        }}
      >
        <div className="sheet" style={{ maxWidth: 420, textAlign: 'center' }}>
          <div className="ph" style={{ marginBottom: 16 }}>
            START SESSION
          </div>
          <IntentGrid selected={intent} onSelect={setIntent} />
          <input
            placeholder="Goal (optional)"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          {needsSongPicker && (
            <select
              value={songId ?? ''}
              onChange={(e) => setSongId(e.target.value || undefined)}
              style={{
                marginBottom: 16,
                background: 'var(--panel)',
                border: '2px solid var(--line)',
                borderRadius: 4,
                padding: '10px 12px',
                color: 'var(--ink)',
                width: '100%',
              }}
            >
              <option value="">Pick a song…</option>
              {activeSongs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
          <PixelButton disabled={!intent} onClick={handleStart}>
            START
          </PixelButton>
        </div>
      </div>
    );
  }

  if (ending) {
    const isPlay = session.intent === 'play';
    return (
      <div className="focus-screen">
        <div className="ph">WHAT HAPPENED?</div>
        <input
          placeholder={isPlay ? 'just played — counts.' : 'One-line summary…'}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          style={{ maxWidth: 400, marginBottom: 20 }}
        />

        {!isPlay && openTasks.length > 0 && (
          <div style={{ width: '100%', maxWidth: 400, textAlign: 'left', marginBottom: 20 }}>
            <div className="ph" style={{ marginBottom: 8 }}>
              OPEN TASKS
            </div>
            {openTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className={`check${taskIds.includes(task.id) ? ' done' : ''}`}
                onClick={() => toggleTaskId(task.id)}
              >
                <span className="box">{taskIds.includes(task.id) ? '✓' : ''}</span>
                <span className="t">{task.text}</span>
              </button>
            ))}
          </div>
        )}

        {!walkAwayEnd && (
          <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={attachBounce}
                onChange={(e) => setAttachBounce(e.target.checked)}
              />
              <span>ATTACH BOUNCE</span>
            </label>
            {attachBounce && (
              <>
                <input
                  placeholder="Bounce note"
                  value={bounceNote}
                  onChange={(e) => setBounceNote(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => setAudio(e.target.files?.[0])}
                />
                <PixelButton
                  variant="ghost"
                  onClick={() => fileRef.current?.click()}
                  style={{ width: '100%' }}
                >
                  {audio ? audio.name : 'CHOOSE AUDIO FILE'}
                </PixelButton>
              </>
            )}
          </div>
        )}

        <PixelButton variant="pink" onClick={handleLogIt}>
          LOG IT
        </PixelButton>
      </div>
    );
  }

  void tick;
  const meta = INTENT_META[session.intent];

  return (
    <div className="focus-screen">
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>
        {meta.icon} {meta.label}
        {song ? ` · ${song.title}` : ''}
      </div>
      <div className="focus-timer">{formatTimer(elapsed)}</div>
      {session.goal && <p className="focus-goal">{session.goal}</p>}

      {walkAwayPrompt && (
        <div
          id="bubble"
          style={{
            position: 'relative',
            bottom: 'auto',
            left: 'auto',
            width: 'min(320px, 90vw)',
            marginTop: 8,
          }}
        >
          {UI['walkaway.ask']}
          <div className="bbtns">
            <button type="button" onClick={handleBounceStop}>
              BOUNCE &amp; STOP
            </button>
            <button type="button" className="ghost" onClick={snoozeWalkAway}>
              +10 MORE MINUTES
            </button>
          </div>
        </div>
      )}

      <PixelButton variant="pink" onClick={handleEndClick} style={{ marginTop: 16 }}>
        ■ END SESSION
      </PixelButton>
    </div>
  );
}
