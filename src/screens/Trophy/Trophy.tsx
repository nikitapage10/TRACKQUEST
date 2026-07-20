import { useMemo } from 'react';
import { ATTR_COLORS, ATTR_KEYS, ATTR_LABELS, DAY_MS, PLAQUES } from '../../config';
import { allAttrs } from '../../engine/attributes';
import { useStore } from '../../state/store';
import { CoverCanvas } from '../../components/widgets/CoverCanvas';
import { PixelButton } from '../../components/widgets/PixelButton';
import { SpriteCanvas } from '../../components/widgets/SpriteCanvas';
import type { RootState, Song } from '../../types';

function ideaToReleaseDays(song: Song): number | null {
  if (!song.releasedAt) return null;
  return Math.max(0, Math.floor((song.releasedAt - song.createdAt) / DAY_MS));
}

function formatReleaseDate(ts?: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isPlaqueUnlocked(
  studio: RootState['studio'],
  songs: RootState['songs'],
  streak: RootState['streak'],
  plaque: (typeof PLAQUES)[number],
): boolean {
  if (studio.titlesUnlocked.includes(plaque.name)) return true;

  const released = songs.filter((s) => s.status === 'released' && !s.isExample);
  const shelvedEver = songs.filter((s) => !s.isExample && (s.status === 'shelved' || s.shelvedAt)).length;

  switch (plaque.id) {
    case 'first_blood':
      return released.length >= 1;
    case 'ep_energy':
      return released.length >= 3;
    case 'certified':
      return released.length >= 5;
    case 'speedrun':
      return released.some((s) => {
        const days = ideaToReleaseDays(s);
        return days !== null && days <= 30;
      });
    case 'metronome':
      return streak.best >= 60;
    case 'merciless':
      return shelvedEver >= 10;
    case 'crate_digger':
      return released.some((s) => s.priorStage !== undefined || s.shelvedAt !== undefined);
    default:
      return false;
  }
}

export function Trophy() {
  const now = Date.now();
  const setView = useStore((s) => s.setView);
  const profile = useStore((s) => s.profile);
  const character = useStore((s) => s.character);
  const songs = useStore((s) => s.songs);
  const sessions = useStore((s) => s.sessions);
  const xp = useStore((s) => s.xp);
  const attributes = useStore((s) => s.attributes);
  const streak = useStore((s) => s.streak);
  const studio = useStore((s) => s.studio);
  const reports = useStore((s) => s.reports);
  const quests = useStore((s) => s.quests);
  const updateSong = useStore((s) => s.updateSong);
  const equipTitle = useStore((s) => s.equipTitle);

  const released = useMemo(
    () =>
      songs
        .filter((s) => s.status === 'released' && !s.isExample)
        .sort((a, b) => (b.releasedAt ?? 0) - (a.releasedAt ?? 0)),
    [songs],
  );

  const inFlight = useMemo(
    () => songs.filter((s) => s.status === 'active' && !s.isExample && s.stage < 4).length,
    [songs],
  );

  const attrs = useMemo(
    () => allAttrs({ attributes, xp, sessions }, now),
    [attributes, xp, sessions, now],
  );

  return (
    <div style={{ padding: '20px 18px 120px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <PixelButton variant="ghost" onClick={() => setView('board')}>
          ← BACK
        </PixelButton>
        <h2 className="pxhead" style={{ fontSize: 12 }}>
          TROPHY WALL
        </h2>
      </div>

      <div className="artist show-mobile" style={{ marginBottom: 16 }}>
        <div className="panelbox artist-id">
          <SpriteCanvas character={character} scale={4} />
          <div className="info">
            <b>{profile.artistName || 'ARTIST'}</b>
            <span>
              {profile.genre} · est. {profile.establishedYear}
            </span>
            {studio.equippedTitle && <div className="title">{studio.equippedTitle}</div>}
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
          <div className="statrow">
            <div>
              <b>{released.length}</b>
              <span>released</span>
            </div>
            <div>
              <b>{inFlight}</b>
              <span>in flight</span>
            </div>
            <div>
              <b>{streak.current}</b>
              <span>streak</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panelbox" style={{ marginBottom: 16, textAlign: 'left' }}>
        <div className="ph">RELEASED</div>
        {released.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nothing on the wall yet. Ship one.</p>
        ) : (
          <div className="trophy-grid">
            {released.map((song) => {
              const days = ideaToReleaseDays(song);
              return (
                <div key={song.id} className="trophy-card">
                  <CoverCanvas seed={song.coverSeed} size={16} />
                  <h4 style={{ fontSize: 14, margin: '8px 0 4px' }}>{song.title}</h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                    idea → release: {days ?? '—'} days
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    {formatReleaseDate(song.releasedAt)}
                  </p>
                  <input
                    type="text"
                    placeholder="plays (private)"
                    value={song.plays ?? ''}
                    onChange={(e) => updateSong(song.id, { plays: e.target.value })}
                    style={{ fontSize: 12, padding: '6px 8px' }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panelbox" style={{ marginBottom: 16, textAlign: 'left' }}>
        <div className="ph">MILESTONE PLAQUES</div>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          Tap an unlocked plaque to equip as your title.
        </p>
        <div className="plaque-row">
          {PLAQUES.map((plaque) => {
            const unlocked = isPlaqueUnlocked(studio, songs, streak, plaque);
            const equipped = studio.equippedTitle === plaque.name;
            return (
              <button
                key={plaque.id}
                type="button"
                className={`plaque${unlocked ? '' : ' locked'}`}
                disabled={!unlocked}
                onClick={() => equipTitle(equipped ? undefined : plaque.name)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: unlocked ? 'pointer' : 'default',
                  outline: equipped ? '2px solid var(--gold)' : undefined,
                  borderRadius: 4,
                  padding: 4,
                }}
                title={unlocked ? plaque.name : plaque.hint}
              >
                <div className="box48">{unlocked ? '🏆' : '?'}</div>
                <small>{plaque.name}</small>
                {!unlocked && (
                  <small style={{ display: 'block', marginTop: 2, fontSize: 9 }}>{plaque.hint}</small>
                )}
                {equipped && (
                  <small style={{ display: 'block', color: 'var(--gold)', fontSize: 9 }}>EQUIPPED</small>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="panelbox" style={{ textAlign: 'left' }}>
        <div className="ph">WEEKLY REPORTS</div>
        {reports.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Reports appear after your companion delivers the weekly studio summary.
          </p>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              style={{
                padding: '12px 0',
                borderBottom: '1px solid var(--line)',
                fontSize: 13,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--pixel)',
                  fontSize: 8,
                  color: 'var(--gold)',
                  marginBottom: 6,
                }}
              >
                {r.weekKey}
              </div>
              <p style={{ lineHeight: 1.5 }}>{r.text}</p>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {new Date(r.at).toLocaleDateString()}
              </span>
            </div>
          ))
        )}
        {quests.weekly && (
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
            Current quest: {quests.weekly.done ? 'cleared' : `${quests.weekly.progress}/${quests.weekly.goal}`}
          </p>
        )}
      </div>
    </div>
  );
}
