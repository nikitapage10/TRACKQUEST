import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { INTENT_META, STAGE_COLORS, STAGES } from '../../config';
import { EnergyBar } from '../../components/widgets/EnergyBar';
import { CoverCanvas } from '../../components/widgets/CoverCanvas';
import { PixelButton } from '../../components/widgets/PixelButton';
import { useStore } from '../../state/store';
import { loadBlob } from '../../state/persistence';
import { UI } from '../../strings/ui';
import type { Intent, Reference, Session, Song } from '../../types';

type DetailTab = 'tasks' | 'sessions' | 'versions' | 'notes';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function taskProgress(song: Song): number {
  if (!song.tasks.length) return 0;
  return song.tasks.filter((t) => t.done).length / song.tasks.length;
}

function isBoss(song: Song, now: number): boolean {
  return song.releaseDate !== undefined && song.releaseDate > now && song.stage < 4;
}

function AudioPlayer({ audioId }: { audioId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | undefined;
    void loadBlob(audioId).then((blob) => {
      if (blob) {
        url = URL.createObjectURL(blob);
        setSrc(url);
      }
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [audioId]);
  if (!src) return <span className="tag">loading…</span>;
  return <audio controls src={src} style={{ width: '100%', marginTop: 6 }} />;
}

function IntentPicker({
  onPick,
  onCancel,
}: {
  onPick: (intent: Intent) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="sheet-backdrop center"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="sheet" style={{ maxWidth: 360 }}>
        <div className="ph" style={{ marginBottom: 12 }}>
          PICK INTENT
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {(Object.keys(INTENT_META) as Intent[]).map((key) => {
            const meta = INTENT_META[key];
            return (
              <button
                key={key}
                type="button"
                className="opt"
                style={{ padding: '12px 8px', textAlign: 'center' }}
                onClick={() => onPick(key)}
              >
                <span style={{ fontSize: 20 }}>{meta.icon}</span>
                <small>{meta.label}</small>
              </button>
            );
          })}
        </div>
        <PixelButton variant="ghost" onClick={onCancel}>
          CANCEL
        </PixelButton>
      </div>
    </div>
  );
}

function ShelveConfirm({ songId }: { songId: string }) {
  const shelveSong = useStore((s) => s.shelveSong);
  const setShelve = useCallback(
    (id: string | null) => useStore.setState({ shelveConfirmId: id }),
    [],
  );
  return (
    <div
      className="sheet-backdrop center"
      onClick={(e) => e.target === e.currentTarget && setShelve(null)}
    >
      <div className="sheet" style={{ maxWidth: 400, textAlign: 'center' }}>
        <p style={{ marginBottom: 20, lineHeight: 1.6 }}>{UI['shelve.confirm']}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <PixelButton variant="pink" onClick={() => shelveSong(songId)}>
            SHELVE IT
          </PixelButton>
          <PixelButton variant="ghost" onClick={() => setShelve(null)}>
            KEEP GRINDING
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

function ReleaseFlow({ songId }: { songId: string }) {
  const song = useStore((s) => s.songs.find((x) => x.id === songId));
  const completeRelease = useStore((s) => s.completeRelease);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [link, setLink] = useState('');
  const [plays, setPlays] = useState('');

  if (!song) return null;

  return (
    <div className="sheet-backdrop center">
      <div className="sheet" style={{ maxWidth: 420 }}>
        <div className="ph" style={{ marginBottom: 14 }}>
          RELEASE — {song.title}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
          Optional details. Ship it when you&apos;re ready.
        </p>
        <label style={{ display: 'block', marginBottom: 12, textAlign: 'left' }}>
          <span className="tag" style={{ display: 'inline-block', marginBottom: 6 }}>
            DATE
          </span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 12, textAlign: 'left' }}>
          <span className="tag" style={{ display: 'inline-block', marginBottom: 6 }}>
            LINK
          </span>
          <input
            type="url"
            placeholder="https://…"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 20, textAlign: 'left' }}>
          <span className="tag" style={{ display: 'inline-block', marginBottom: 6 }}>
            PLAYS
          </span>
          <input
            placeholder="12.4k plays"
            value={plays}
            onChange={(e) => setPlays(e.target.value)}
          />
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <PixelButton
            variant="pink"
            onClick={() =>
              completeRelease(songId, {
                date: date ? new Date(date).getTime() : undefined,
                link: link || undefined,
                plays: plays || undefined,
              })
            }
          >
            RELEASE IT
          </PixelButton>
          <PixelButton
            variant="ghost"
            onClick={() => useStore.setState({ releaseFlowId: null })}
          >
            NOT YET
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

function BounceSheet({
  songId,
  onClose,
}: {
  songId: string;
  onClose: () => void;
}) {
  const addVersion = useStore((s) => s.addVersion);
  const [note, setNote] = useState('');
  const [audio, setAudio] = useState<File | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="sheet-backdrop center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet" style={{ maxWidth: 400 }}>
        <div className="ph" style={{ marginBottom: 12 }}>
          LOG A BOUNCE
        </div>
        <input
          placeholder="What changed?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ marginBottom: 12 }}
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
          style={{ marginBottom: 16, width: '100%' }}
        >
          {audio ? audio.name : 'ATTACH AUDIO'}
        </PixelButton>
        <div style={{ display: 'flex', gap: 10 }}>
          <PixelButton
            disabled={!note.trim()}
            onClick={() => {
              addVersion(songId, note.trim(), { audio });
              onClose();
            }}
          >
            LOG IT
          </PixelButton>
          <PixelButton variant="ghost" onClick={onClose}>
            CANCEL
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

function ReleaseDateSheet({
  songId,
  onClose,
}: {
  songId: string;
  onClose: () => void;
}) {
  const song = useStore((s) => s.songs.find((x) => x.id === songId));
  const setReleaseDate = useStore((s) => s.setReleaseDate);
  const [date, setDate] = useState(() =>
    song?.releaseDate
      ? new Date(song.releaseDate).toISOString().slice(0, 10)
      : '',
  );

  return (
    <div
      className="sheet-backdrop center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet" style={{ maxWidth: 360 }}>
        <div className="ph" style={{ marginBottom: 12 }}>
          SET RELEASE DATE
        </div>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <PixelButton
            onClick={() => {
              setReleaseDate(songId, date ? new Date(date).getTime() : undefined);
              onClose();
            }}
          >
            SAVE
          </PixelButton>
          {song?.releaseDate && (
            <PixelButton
              variant="ghost"
              onClick={() => {
                setReleaseDate(songId, undefined);
                onClose();
              }}
            >
              CLEAR
            </PixelButton>
          )}
          <PixelButton variant="ghost" onClick={onClose}>
            CANCEL
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

export function SongDetail() {
  const view = useStore((s) => s.view);
  const openSongId = useStore((s) => s.openSongId);
  const songs = useStore((s) => s.songs);
  const sessions = useStore((s) => s.sessions);
  const shelveConfirmId = useStore((s) => s.shelveConfirmId);
  const releaseFlowId = useStore((s) => s.releaseFlowId);
  const openSong = useStore((s) => s.openSong);
  const updateSong = useStore((s) => s.updateSong);
  const toggleTask = useStore((s) => s.toggleTask);
  const addTask = useStore((s) => s.addTask);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const advanceStage = useStore((s) => s.advanceStage);
  const deleteSong = useStore((s) => s.deleteSong);
  const setNotes = useStore((s) => s.setNotes);
  const setReferences = useStore((s) => s.setReferences);
  const startSession = useStore((s) => s.startSession);

  const songId = openSongId;
  const song = useMemo(
    () => (songId ? songs.find((s) => s.id === songId) : undefined),
    [songId, songs],
  );

  const [tab, setTab] = useState<DetailTab>('tasks');
  const [menuOpen, setMenuOpen] = useState(false);
  const [intentOpen, setIntentOpen] = useState(false);
  const [bounceOpen, setBounceOpen] = useState(false);
  const [releaseDateOpen, setReleaseDateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [editingBpm, setEditingBpm] = useState(false);
  const [editingKey, setEditingKey] = useState(false);
  const [bpmDraft, setBpmDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 520,
  );
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = Date.now();
  const showDetail = !!songId && !!song && (openSongId !== null || view === 'song');

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= 520);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!song) return;
    setBpmDraft(song.bpm !== undefined ? String(song.bpm) : '');
    setKeyDraft(song.key ?? '');
  }, [song?.id, song?.bpm, song?.key]);

  const songSessions = useMemo(
    () =>
      songId
        ? sessions.filter((s): s is Session & { songId: string } => s.songId === songId)
        : [],
    [sessions, songId],
  );

  const totalMinutes = useMemo(
    () => songSessions.reduce((n, s) => n + (s.endedAt ? s.minutes : 0), 0),
    [songSessions],
  );

  const seedMemo = useMemo(
    () => song?.memos.find((m) => m.isSeed),
    [song?.memos],
  );

  const allTasksDone = song?.tasks.every((t) => t.done) ?? false;
  const boss = song ? isBoss(song, now) : false;
  const bossPct = song ? Math.round(taskProgress(song) * 100) : 0;

  const closeDetail = useCallback(() => {
    openSong(null);
    setMenuOpen(false);
  }, [openSong]);

  const handleNotesChange = (text: string) => {
    if (!songId) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => setNotes(songId, text), 400);
  };

  const updateRef = (index: number, patch: Partial<Reference>) => {
    if (!song) return;
    const refs = [...song.references];
    while (refs.length <= index) refs.push({ id: nanoid(), label: '' });
    refs[index] = { ...refs[index], ...patch };
    setReferences(
      song.id,
      refs.filter((r) => r.label.trim() || r.url?.trim()),
    );
  };

  if (!showDetail && !shelveConfirmId && !releaseFlowId) return null;

  return (
    <>
      {showDetail && song && (
        <div
          className="sheet-backdrop center"
          onClick={(e) => e.target === e.currentTarget && closeDetail()}
        >
          <div
            className="sheet"
            style={{ maxWidth: 520, width: '100%', textAlign: 'left' }}
            onClick={() => setMenuOpen(false)}
          >
            <button
              type="button"
              className="icon-btn"
              style={{ position: 'absolute', top: 12, right: 12 }}
              onClick={closeDetail}
              aria-label="Close"
            >
              ✕
            </button>

            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => updateSong(song.id, { coverSeed: nanoid() })}
                title="Re-seed cover"
                style={{ flexShrink: 0, border: 'none', background: 'none', padding: 0 }}
              >
                <CoverCanvas seed={song.coverSeed} size={32} />
              </button>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 28 }}>
                <input
                  value={song.title}
                  onChange={(e) => updateSong(song.id, { title: e.target.value.slice(0, 40) })}
                  style={{
                    fontFamily: 'var(--pixel)',
                    fontSize: 11,
                    border: 'none',
                    background: 'transparent',
                    padding: '4px 0',
                    marginBottom: 8,
                  }}
                />
                <div className="tags">
                  <span
                    className="tag"
                    style={{ borderLeft: `3px solid ${STAGE_COLORS[song.stage]}` }}
                  >
                    {STAGES[song.stage]}
                  </span>
                  {editingBpm ? (
                    <input
                      autoFocus
                      value={bpmDraft}
                      onChange={(e) => setBpmDraft(e.target.value)}
                      onBlur={() => {
                        const n = parseInt(bpmDraft, 10);
                        updateSong(song.id, { bpm: Number.isFinite(n) ? n : undefined });
                        setEditingBpm(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      style={{ width: 72, padding: '2px 6px', fontSize: 11 }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="tag"
                      onClick={() => setEditingBpm(true)}
                    >
                      {song.bpm !== undefined ? `${song.bpm} BPM` : '+ BPM'}
                    </button>
                  )}
                  {editingKey ? (
                    <input
                      autoFocus
                      value={keyDraft}
                      onChange={(e) => setKeyDraft(e.target.value)}
                      onBlur={() => {
                        updateSong(song.id, { key: keyDraft.trim() || undefined });
                        setEditingKey(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                      style={{ width: 80, padding: '2px 6px', fontSize: 11 }}
                    />
                  ) : (
                    <button type="button" className="tag" onClick={() => setEditingKey(true)}>
                      {song.key || '+ KEY'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn"
                    style={{ marginLeft: 'auto', width: 32, height: 32, fontSize: 14 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen((v) => !v);
                    }}
                    aria-label="Menu"
                  >
                    ⋯
                  </button>
                </div>
                {menuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 22,
                      top: 88,
                      background: 'var(--panel2)',
                      border: '2px solid var(--line)',
                      borderRadius: 4,
                      zIndex: 2,
                      minWidth: 180,
                    }}
                  >
                    <button
                      type="button"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 12,
                      }}
                      onClick={() => {
                        setReleaseDateOpen(true);
                        setMenuOpen(false);
                      }}
                    >
                      SET RELEASE DATE
                    </button>
                    <button
                      type="button"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 12,
                      }}
                      onClick={() => {
                        useStore.setState({ shelveConfirmId: song.id });
                        setMenuOpen(false);
                      }}
                    >
                      SHELVE
                    </button>
                    <button
                      type="button"
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: 12,
                        color: 'var(--pink)',
                      }}
                      onClick={() => {
                        setDeleteConfirm(true);
                        setMenuOpen(false);
                      }}
                    >
                      DELETE
                    </button>
                  </div>
                )}
              </div>
            </div>

            <EnergyBar song={song} now={now} />

            {boss && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    marginBottom: 4,
                  }}
                >
                  <span className="tag boss">BOSS</span>
                  <span style={{ color: 'var(--muted)' }}>
                    {formatDate(song.releaseDate!)} · {bossPct}% tasks done
                  </span>
                </div>
                <div className="boss-hp">
                  <div className="boss-hpfill" style={{ width: `${bossPct}%` }} />
                </div>
              </div>
            )}

            <div className="detail-tabs">
              {(['tasks', 'sessions', 'versions', 'notes'] as DetailTab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={tab === t ? 'on' : ''}
                  onClick={() => setTab(t)}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            {tab === 'tasks' && (
              <div>
                {song.tasks.map((task, i) => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {narrow && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 24, height: 20, fontSize: 8 }}
                          disabled={i === 0}
                          onClick={() => reorderTasks(song.id, i, i - 1)}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ width: 24, height: 20, fontSize: 8 }}
                          disabled={i === song.tasks.length - 1}
                          onClick={() => reorderTasks(song.id, i, i + 1)}
                        >
                          ▼
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      className={`check${task.done ? ' done' : ''}`}
                      onClick={() => toggleTask(song.id, task.id)}
                    >
                      <span className="box">{task.done ? '✓' : ''}</span>
                      <span className="t" style={{ flex: 1 }}>
                        {task.text}
                      </span>
                      {task.source === 'coach' && (
                        <span className="tag paw" title="Coach task">
                          🐾
                        </span>
                      )}
                    </button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <input
                    placeholder="Add a task…"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTask.trim()) {
                        addTask(song.id, newTask.trim());
                        setNewTask('');
                      }
                    }}
                  />
                  <PixelButton
                    disabled={!newTask.trim()}
                    onClick={() => {
                      addTask(song.id, newTask.trim());
                      setNewTask('');
                    }}
                  >
                    +
                  </PixelButton>
                </div>
                {allTasksDone && song.stage < 4 && (
                  <PixelButton
                    onClick={() => advanceStage(song.id)}
                    style={{ marginTop: 16, width: '100%' }}
                  >
                    ▶ MOVE TO {STAGES[song.stage + 1].toUpperCase()}
                  </PixelButton>
                )}
              </div>
            )}

            {tab === 'sessions' && (
              <div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  {totalMinutes} min total chair time
                </p>
                {songSessions.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 16 }}>
                    No sessions yet.
                  </p>
                ) : (
                  songSessions.map((sess) => {
                    const meta = INTENT_META[sess.intent];
                    return (
                      <div
                        key={sess.id}
                        style={{
                          padding: '10px 0',
                          borderBottom: '1px solid var(--line)',
                          fontSize: 13,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span>{meta?.icon}</span>
                          <b>{meta?.label}</b>
                          <span style={{ color: 'var(--muted)', marginLeft: 'auto' }}>
                            {sess.endedAt ? `${sess.minutes}m` : 'active'}
                          </span>
                        </div>
                        {sess.summary && (
                          <p style={{ color: 'var(--muted)', marginTop: 4 }}>{sess.summary}</p>
                        )}
                        <small style={{ color: 'var(--muted)' }}>{formatDate(sess.startedAt)}</small>
                      </div>
                    );
                  })
                )}
                <PixelButton onClick={() => setIntentOpen(true)} style={{ marginTop: 16 }}>
                  ▶ START SESSION
                </PixelButton>
              </div>
            )}

            {tab === 'versions' && (
              <div>
                {song.versions.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid var(--line)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <b>{v.label}</b>
                      {v.walkAway && <span className="tag play">WALK-AWAY</span>}
                      {v.demoDay && <span className="tag" style={{ background: 'var(--gold)', color: 'var(--bg)' }}>DEMO DAY</span>}
                      <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 'auto' }}>
                        {formatDate(v.createdAt)}
                      </span>
                    </div>
                    <p style={{ marginTop: 4, fontSize: 13 }}>{v.note}</p>
                    {v.audioId && <AudioPlayer audioId={v.audioId} />}
                  </div>
                ))}
                {song.versions.length === 0 && (
                  <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
                    No bounces logged yet.
                  </p>
                )}
                <PixelButton variant="ghost" onClick={() => setBounceOpen(true)} style={{ marginTop: 8 }}>
                  + LOG A BOUNCE
                </PixelButton>
              </div>
            )}

            {tab === 'notes' && (
              <div>
                {seedMemo && (
                  <div
                    className="panelbox"
                    style={{ marginBottom: 16, padding: 12, background: 'var(--panel2)' }}
                  >
                    <div className="ph" style={{ marginBottom: 8 }}>
                      THE SPARK
                    </div>
                    {seedMemo.text && <p style={{ fontSize: 13, marginBottom: 8 }}>{seedMemo.text}</p>}
                    {seedMemo.audioId && <AudioPlayer audioId={seedMemo.audioId} />}
                  </div>
                )}
                <label style={{ display: 'block', marginBottom: 16 }}>
                  <span className="tag" style={{ display: 'inline-block', marginBottom: 6 }}>
                    NOTES
                  </span>
                  <textarea
                    rows={5}
                    defaultValue={song.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder="Lyrics, ideas, mix notes…"
                  />
                </label>
                <div className="ph" style={{ marginBottom: 8 }}>
                  REFERENCE RACK
                </div>
                {[0, 1, 2].map((i) => {
                  const ref = song.references[i];
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input
                        placeholder="Label"
                        defaultValue={ref?.label ?? ''}
                        onBlur={(e) => updateRef(i, { id: ref?.id ?? nanoid(), label: e.target.value })}
                      />
                      <input
                        placeholder="URL"
                        defaultValue={ref?.url ?? ''}
                        onBlur={(e) =>
                          updateRef(i, { id: ref?.id ?? nanoid(), url: e.target.value || undefined })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {intentOpen && songId && (
        <IntentPicker
          onPick={(intent) => {
            startSession(songId, intent);
            setIntentOpen(false);
          }}
          onCancel={() => setIntentOpen(false)}
        />
      )}

      {bounceOpen && songId && (
        <BounceSheet songId={songId} onClose={() => setBounceOpen(false)} />
      )}

      {releaseDateOpen && songId && (
        <ReleaseDateSheet songId={songId} onClose={() => setReleaseDateOpen(false)} />
      )}

      {deleteConfirm && song && (
        <div
          className="sheet-backdrop center"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(false)}
        >
          <div className="sheet" style={{ maxWidth: 360, textAlign: 'center' }}>
            <p style={{ marginBottom: 16 }}>Delete &ldquo;{song.title}&rdquo; permanently?</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <PixelButton
                variant="pink"
                onClick={() => {
                  deleteSong(song.id);
                  setDeleteConfirm(false);
                }}
              >
                DELETE
              </PixelButton>
              <PixelButton variant="ghost" onClick={() => setDeleteConfirm(false)}>
                CANCEL
              </PixelButton>
            </div>
          </div>
        </div>
      )}

      {shelveConfirmId && <ShelveConfirm songId={shelveConfirmId} />}
      {releaseFlowId && <ReleaseFlow songId={releaseFlowId} />}
    </>
  );
}
