import { useCallback, useMemo, useRef, useState } from 'react';
import { DAY_MS, DECOR_UNLOCKS, STAGE_COLORS, STAGES } from '../../config';
import { isStuck } from '../../engine/energy';
import { useStore } from '../../state/store';
import { CoverCanvas } from '../../components/widgets/CoverCanvas';
import type { Song, Stage } from '../../types';

const FURNITURE: Record<Stage, { label: string; x: number; y: number }[]> = {
  0: [
    { label: 'crate', x: 24, y: 48 },
    { label: 'corkboard', x: 200, y: 32 },
  ],
  1: [
    { label: 'desk', x: 40, y: 44 },
    { label: 'synth', x: 180, y: 52 },
  ],
  2: [
    { label: 'console', x: 36, y: 46 },
    { label: 'monitors', x: 190, y: 38 },
  ],
  3: [
    { label: 'rack', x: 48, y: 42 },
    { label: 'lamp', x: 210, y: 36 },
  ],
  4: [
    { label: 'shutter door', x: 60, y: 28 },
    { label: 'hand truck', x: 200, y: 50 },
  ],
};

const DECOR_NAMES: Record<string, string> = Object.fromEntries(
  DECOR_UNLOCKS.map((d) => [d.id, d.name]),
);

function ticker(title: string): string {
  const t = title.replace(/\s+/g, '').toUpperCase();
  return t.slice(0, 3) || '???';
}

function daysUntil(date: number, now: number): number {
  return Math.max(0, Math.ceil((date - now) / DAY_MS));
}

function Cartridge({
  song,
  now,
  onOpen,
}: {
  song: Song;
  now: number;
  onOpen: (id: string) => void;
}) {
  const stuck = isStuck(song, now);
  return (
    <button
      type="button"
      className={`cartridge${stuck ? ' stuck' : ''}`}
      data-cart={song.id}
      onClick={() => onOpen(song.id)}
      title={song.title}
      style={{ position: 'relative' }}
    >
      {stuck && (
        <span
          style={{
            position: 'absolute',
            top: -10,
            right: 2,
            fontFamily: 'var(--pixel)',
            fontSize: 6,
            color: 'var(--muted)',
            pointerEvents: 'none',
          }}
        >
          zZ
        </span>
      )}
      <div className="cart-body">
        <CoverCanvas seed={song.coverSeed} size={16} />
      </div>
      <div className="ticker">{ticker(song.title)}</div>
    </button>
  );
}

function RoomFloor({
  stage,
  songs,
  now,
  decorPlaced,
  decorUnlocked,
  onOpen,
  onPlaceDecor,
}: {
  stage: Stage;
  songs: Song[];
  now: number;
  decorPlaced: { decorId: string; room: Stage; x: number }[];
  decorUnlocked: string[];
  onOpen: (id: string) => void;
  onPlaceDecor: (decorId: string, room: Stage, x: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visible = expanded ? songs : songs.slice(0, 4);
  const overflow = songs.length - 4;
  const roomDecor = decorPlaced.filter((d) => d.room === stage);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('room-floor')) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    longPressRef.current = setTimeout(() => {
      const placed = new Set(decorPlaced.map((d) => d.decorId));
      const next = decorUnlocked.find((id) => !placed.has(id));
      if (next) onPlaceDecor(next, stage, Math.round(xPct));
    }, 700);
  };

  const clearLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  };

  return (
    <div
      className="room-floor"
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
    >
      {roomDecor.map((d) => (
        <span
          key={d.decorId}
          className="furniture"
          style={{ left: `${d.x}%`, bottom: 44, transform: 'translateX(-50%)' }}
          title={DECOR_NAMES[d.decorId] ?? d.decorId}
        >
          {DECOR_NAMES[d.decorId] ?? d.decorId}
        </span>
      ))}
      {visible.map((song) => (
        <Cartridge key={song.id} song={song} now={now} onOpen={onOpen} />
      ))}
      {!expanded && overflow > 0 && (
        <button
          type="button"
          className="tag"
          style={{ marginBottom: 6, cursor: 'pointer' }}
          onClick={() => setExpanded(true)}
        >
          +{overflow}
        </button>
      )}
      {expanded && overflow > 0 && (
        <button
          type="button"
          className="tag"
          style={{ marginBottom: 6, cursor: 'pointer' }}
          onClick={() => setExpanded(false)}
        >
          −
        </button>
      )}
    </div>
  );
}

export function Studio() {
  const now = Date.now();
  const songs = useStore((s) => s.songs);
  const studio = useStore((s) => s.studio);
  const openSong = useStore((s) => s.openSong);
  const setView = useStore((s) => s.setView);
  const placeDecor = useStore((s) => s.placeDecor);

  const activeSongs = useMemo(
    () => songs.filter((s) => s.status === 'active' && !s.isExample),
    [songs],
  );
  const shelved = useMemo(
    () => songs.filter((s) => s.status === 'shelved' && !s.isExample),
    [songs],
  );
  const released = useMemo(
    () => songs.filter((s) => s.status === 'released' && !s.isExample),
    [songs],
  );

  const bossSongs = useMemo(
    () =>
      activeSongs.filter(
        (s) => s.releaseDate !== undefined && s.releaseDate > now && s.stage < 4,
      ),
    [activeSongs, now],
  );

  const songsInStage = useCallback(
    (stage: Stage) =>
      [...activeSongs.filter((s) => s.stage === stage)].sort(
        (a, b) => b.lastTouchedAt - a.lastTouchedAt,
      ),
    [activeSongs],
  );

  const visibleShelf = shelved.slice(0, 6);
  const shelfOverflow = shelved.length - 6;

  return (
    <div className="studio-strip">
      {STAGES.map((label, i) => {
        const stage = i as Stage;
        const roomSongs = songsInStage(stage);
        const furniture = FURNITURE[stage];

        return (
          <section key={stage} className="room" data-room={stage}>
            <div className="room-label">
              <span>{label.toUpperCase()}</span>
              <span style={{ color: 'var(--muted)' }}>{roomSongs.length}</span>
            </div>
            <div className="room-wall">
              <div
                className="room-stripe"
                style={{ background: STAGE_COLORS[stage] }}
              />
              {furniture.map((f) => (
                <span
                  key={f.label}
                  className="furniture"
                  style={{ left: f.x, top: f.y }}
                >
                  {f.label}
                </span>
              ))}

              {stage === 0 && shelved.length > 0 && (
                <div className="shelf-row">
                  {visibleShelf.map((song) => (
                    <button
                      key={song.id}
                      type="button"
                      className="cartridge"
                      data-cart={song.id}
                      onClick={() => openSong(song.id)}
                      title={song.title}
                      style={{ width: 36 }}
                    >
                      <div className="cart-body" style={{ width: 32, height: 22 }}>
                        <CoverCanvas seed={song.coverSeed} size={12} />
                      </div>
                    </button>
                  ))}
                  {shelfOverflow > 0 && (
                    <span className="tag" style={{ marginBottom: 4 }}>
                      +{shelfOverflow}
                    </span>
                  )}
                </div>
              )}

              {stage === 4 && bossSongs.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 56,
                    left: 16,
                    right: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {bossSongs.map((song) => (
                    <div
                      key={song.id}
                      style={{
                        background: 'var(--panel)',
                        border: '2px solid var(--boss)',
                        borderRadius: 4,
                        padding: '8px 10px',
                        fontFamily: 'var(--pixel)',
                        fontSize: 7,
                        lineHeight: 1.6,
                        color: 'var(--boss)',
                      }}
                    >
                      {song.title} — {daysUntil(song.releaseDate!, now)} DAYS
                    </div>
                  ))}
                </div>
              )}

              {stage === 4 && (
                <button
                  type="button"
                  className="furniture"
                  style={{
                    right: 16,
                    top: 20,
                    left: 'auto',
                    cursor: 'pointer',
                    color: 'var(--gold)',
                    opacity: 1,
                    border: '2px solid var(--line)',
                    padding: '6px 8px',
                    borderRadius: 4,
                    background: 'var(--panel)',
                  }}
                  onClick={() => setView('trophy')}
                >
                  TROPHIES {released.length}
                </button>
              )}
            </div>
            <RoomFloor
              stage={stage}
              songs={roomSongs}
              now={now}
              decorPlaced={studio.decorPlaced}
              decorUnlocked={studio.decorUnlocked}
              onOpen={openSong}
              onPlaceDecor={placeDecor}
            />
          </section>
        );
      })}
    </div>
  );
}
