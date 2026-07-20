import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ATTR_COLORS, ATTR_KEYS, ATTR_LABELS, STAGES } from '../../config';
import { allAttrs } from '../../engine/attributes';
import { isStuck } from '../../engine/energy';
import { sparkText } from '../../engine/quests';
import { useStore } from '../../state/store';
import { CoverCanvas } from '../../components/widgets/CoverCanvas';
import { EnergyBar } from '../../components/widgets/EnergyBar';
import { PixelButton } from '../../components/widgets/PixelButton';
import { SpriteCanvas } from '../../components/widgets/SpriteCanvas';
import type { Song, Stage } from '../../types';
import { UI } from '../../strings/ui';

function songProg(song: Song): number {
  if (!song.tasks.length) return 0;
  const done = song.tasks.filter((t) => t.done).length;
  return Math.round((100 * done) / song.tasks.length);
}

function isBoss(song: Song, now: number): boolean {
  return song.releaseDate !== undefined && song.releaseDate > now && song.stage < 4;
}

function hasCoachTasks(song: Song): boolean {
  return song.tasks.some((t) => t.source === 'coach' && !t.done);
}

function BoardCard({
  song,
  now,
  onOpen,
  onMoveStage,
}: {
  song: Song;
  now: number;
  onOpen: (id: string) => void;
  onMoveStage: (id: string, stage: Stage) => void;
}) {
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    dragging: boolean;
    pointerId: number;
  } | null>(null);
  const [lifted, setLifted] = useState(false);
  const stuck = isStuck(song, now);
  const boss = isBoss(song, now);
  const prog = songProg(song);
  const paw = hasCoachTasks(song);

  const finishDrag = useCallback(
    (clientX: number, clientY: number, dragging: boolean) => {
      if (!dragRef.current) return;
      const { id } = dragRef.current;
      dragRef.current = null;
      setLifted(false);
      if (dragging) {
        const el = document.elementFromPoint(clientX, clientY);
        const col = el?.closest('[data-stage]') as HTMLElement | null;
        if (col) {
          const stage = Number(col.dataset.stage) as Stage;
          if (!Number.isNaN(stage)) onMoveStage(id, stage);
        }
      } else {
        onOpen(id);
      }
    },
    [onMoveStage, onOpen],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (song.isExample) return;
    dragRef.current = {
      id: song.id,
      startX: e.clientX,
      startY: e.clientY,
      dragging: false,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = Math.abs(e.clientX - d.startX);
    const dy = Math.abs(e.clientY - d.startY);
    if (!d.dragging && (dx > 6 || dy > 6)) {
      d.dragging = true;
      setLifted(true);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    finishDrag(e.clientX, e.clientY, d.dragging);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setLifted(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (song.isExample) return;
    if (e.key === '[' && song.stage > 0) {
      e.preventDefault();
      onMoveStage(song.id, (song.stage - 1) as Stage);
    }
    if (e.key === ']' && song.stage < 4) {
      e.preventDefault();
      onMoveStage(song.id, (song.stage + 1) as Stage);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(song.id);
    }
  };

  return (
    <button
      type="button"
      className={`card${boss ? ' boss-frame' : ''}${lifted ? ' dragging' : ''}`}
      data-song-id={song.id}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      style={lifted ? { opacity: 0.85, transform: 'scale(1.02)' } : undefined}
    >
      <h4>
        <CoverCanvas seed={song.coverSeed} size={16} />
        <span style={{ flex: 1, minWidth: 0 }}>{song.title}</span>
        {paw && <span className="tag paw" title="Coach tasks open">🐾</span>}
      </h4>
      <div className="tags">
        {song.bpm !== undefined && <span className="tag">{song.bpm} BPM</span>}
        {song.key && <span className="tag">{song.key}</span>}
        {stuck && <span className="tag stuck">STUCK</span>}
        {boss && <span className="tag boss">BOSS</span>}
        {song.stage === 4 && song.plays && <span className="tag play">{song.plays}</span>}
      </div>
      <div className="prog">
        <div className="progfill" style={{ width: `${prog}%` }} />
      </div>
      <EnergyBar song={song} now={now} />
    </button>
  );
}

function ExampleCard({ song, onOpen }: { song: Song; onOpen: (id: string) => void }) {
  const prog = songProg(song);
  return (
    <button type="button" className="card" onClick={() => onOpen(song.id)}>
      <h4>
        <CoverCanvas seed={song.coverSeed} size={16} />
        <span>{song.title}</span>
      </h4>
      <div className="tags">
        {song.bpm !== undefined && <span className="tag">{song.bpm} BPM</span>}
        {song.key && <span className="tag">{song.key}</span>}
      </div>
      <div className="prog">
        <div className="progfill" style={{ width: `${prog}%` }} />
      </div>
    </button>
  );
}

export function Board() {
  const now = Date.now();
  const songs = useStore((s) => s.songs);
  const profile = useStore((s) => s.profile);
  const character = useStore((s) => s.character);
  const xp = useStore((s) => s.xp);
  const attributes = useStore((s) => s.attributes);
  const sessions = useStore((s) => s.sessions);
  const streak = useStore((s) => s.streak);
  const quests = useStore((s) => s.quests);
  const studio = useStore((s) => s.studio);
  const onboarding = useStore((s) => s.onboarding);
  const openSong = useStore((s) => s.openSong);
  const moveSongStage = useStore((s) => s.moveSongStage);
  const setCaptureOpen = useStore((s) => s.setCaptureOpen);
  const completeSpark = useStore((s) => s.completeSpark);
  const skipSpark = useStore((s) => s.skipSpark);
  const rerollWeekly = useStore((s) => s.rerollWeekly);
  const dismissExamples = useStore((s) => s.dismissExamples);
  const reviveSong = useStore((s) => s.reviveSong);

  const [dragOverStage, setDragOverStage] = useState<Stage | null>(null);
  const [showShelf, setShowShelf] = useState(false);

  const realSongs = useMemo(() => songs.filter((s) => !s.isExample), [songs]);
  const examples = useMemo(() => songs.filter((s) => s.isExample), [songs]);
  const activeReal = useMemo(
    () => realSongs.filter((s) => s.status === 'active'),
    [realSongs],
  );
  const shelved = useMemo(
    () => realSongs.filter((s) => s.status === 'shelved'),
    [realSongs],
  );
  const inFlight = useMemo(
    () => activeReal.filter((s) => s.stage < 4).length,
    [activeReal],
  );
  const releasedCount = useMemo(
    () => realSongs.filter((s) => s.status === 'released').length,
    [realSongs],
  );

  const attrs = useMemo(
    () => allAttrs({ attributes, xp, sessions }, now),
    [attributes, xp, sessions, now],
  );

  const spark = quests.dailySpark;
  const showSpark = spark && !spark.done && !spark.skipped;
  const activeTitle = activeReal[0]?.title;
  const weekly = quests.weekly;

  const showExampleShelf =
    examples.length > 0 && !onboarding.exampleShelfDismissed;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!e.buttons) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const col = el?.closest('[data-stage]') as HTMLElement | null;
      if (col) setDragOverStage(Number(col.dataset.stage) as Stage);
      else setDragOverStage(null);
    };
    const onUp = () => setDragOverStage(null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  const songsByStage = useCallback(
    (stage: Stage) =>
      activeReal.filter((s) => s.stage === stage),
    [activeReal],
  );

  return (
    <div className="layout">
      <div className="board">
        <div className="board-head">
          <h2>PIPELINE</h2>
          <span>
            {inFlight} track{inFlight === 1 ? '' : 's'} in flight
          </span>
          {shelved.length > 0 && (
            <button
              type="button"
              className={`tag${showShelf ? ' play' : ''}`}
              style={{ marginLeft: 'auto', cursor: 'pointer' }}
              onClick={() => setShowShelf((v) => !v)}
            >
              SHELF{shelved.length ? ` (${shelved.length})` : ''}
            </button>
          )}
        </div>

        {showSpark && (
          <div className="spark-strip">
            <span style={{ fontFamily: 'var(--pixel)', fontSize: 10 }}>⚡</span>
            <p>{sparkText(spark.promptId, activeTitle)}</p>
            <PixelButton variant="mint" onClick={() => completeSpark()}>
              DONE (+10)
            </PixelButton>
            <button
              type="button"
              className="icon-btn"
              aria-label="Skip spark"
              onClick={() => skipSpark()}
            >
              ✕
            </button>
          </div>
        )}

        {showShelf ? (
          <div className="panelbox" style={{ textAlign: 'left' }}>
            <div className="ph">SHELVED TRACKS</div>
            {shelved.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nothing on the shelf.</p>
            ) : (
              shelved.map((song) => (
                <div
                  key={song.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 0',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <CoverCanvas seed={song.coverSeed} size={16} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: 14 }}>{song.title}</b>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      {STAGES[song.priorStage ?? song.stage]}
                    </div>
                  </div>
                  <PixelButton variant="ghost" onClick={() => reviveSong(song.id)}>
                    ⟳ REVIVE
                  </PixelButton>
                </div>
              ))
            )}
          </div>
        ) : activeReal.length === 0 ? (
          <div className="empty-state">
            <p>{shelved.length > 0 ? UI['board.allShelved'] : UI['board.empty']}</p>
            {shelved.length > 0 ? (
              <PixelButton variant="ghost" onClick={() => setShowShelf(true)}>
                OPEN SHELF
              </PixelButton>
            ) : (
              <PixelButton onClick={() => setCaptureOpen(true)}>+ FIRST IDEA</PixelButton>
            )}
          </div>
        ) : (
          <div className="cols">
            {STAGES.map((label, i) => {
              const stage = i as Stage;
              const colSongs = songsByStage(stage);
              return (
                <div
                  key={stage}
                  className={`col${dragOverStage === stage ? ' drag-over' : ''}`}
                  data-stage={stage}
                >
                  <div className={`colh c${stage}`}>
                    <b>{label}</b>
                    <i>{colSongs.length}</i>
                  </div>
                  {colSongs.map((song) => (
                    <BoardCard
                      key={song.id}
                      song={song}
                      now={now}
                      onOpen={openSong}
                      onMoveStage={moveSongStage}
                    />
                  ))}
                  {stage === 0 && (
                    <button
                      type="button"
                      className="addcard"
                      onClick={() => setCaptureOpen(true)}
                    >
                      + New idea
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showExampleShelf && !showShelf && (
          <section className="example-shelf">
            <h3>EXAMPLE SHELF</h3>
            <div className="cols" style={{ overflowX: 'auto' }}>
              {examples.map((song) => (
                <div key={song.id} style={{ minWidth: 215, width: 215 }}>
                  <ExampleCard song={song} onOpen={openSong} />
                </div>
              ))}
            </div>
            <PixelButton variant="ghost" onClick={() => dismissExamples()} style={{ marginTop: 10 }}>
              ✕ DISMISS EXAMPLES
            </PixelButton>
          </section>
        )}
      </div>

      <aside className="artist">
        <div className="panelbox artist-id">
          <SpriteCanvas character={character} scale={4} />
          <div className="info">
            <b>{profile.artistName || 'ARTIST'}</b>
            <span>
              {profile.genre} · est. {profile.establishedYear}
            </span>
            {studio.equippedTitle && (
              <div className="title">{studio.equippedTitle}</div>
            )}
          </div>
        </div>

        <div className="panelbox">
          <div className="ph">ARTIST STATS</div>
          {ATTR_KEYS.map((key) => (
            <div key={key} className="attr">
              <div className="row">
                <span>{ATTR_LABELS[key]}</span>
                <span>{attrs[key]}</span>
              </div>
              <div className="abar">
                <div
                  className="afill"
                  style={{ width: `${attrs[key]}%`, background: ATTR_COLORS[key] }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="panelbox">
          <div className="ph" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>WEEKLY QUEST</span>
            {weekly && !weekly.done && (
              <button
                type="button"
                style={{ fontFamily: 'var(--pixel)', fontSize: 7, color: 'var(--gold)' }}
                disabled={quests.rerollUsedThisWeek}
                onClick={() => rerollWeekly()}
              >
                ↻ REROLL
              </button>
            )}
          </div>
          {weekly ? (
            <div className="quest">
              <div className="qicon">🎯</div>
              <div>
                <p>{weekly.text}</p>
                <small>
                  {weekly.done
                    ? `DONE · +${weekly.xp} XP`
                    : `${weekly.progress}/${weekly.goal} · +${weekly.xp} XP`}
                </small>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Quest rolls in soon.</p>
          )}
        </div>

        <div className="panelbox">
          <div className="statrow">
            <div>
              <b>{releasedCount}</b>
              <span>released</span>
            </div>
            <div>
              <b>{inFlight}</b>
              <span>in flight</span>
            </div>
            <div>
              <b>{streak.current}d</b>
              <span>streak</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
