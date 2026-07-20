import { useCallback, useState } from 'react';
import { PixelButton } from '../../components/widgets/PixelButton';
import { SpriteCanvas } from '../../components/widgets/SpriteCanvas';
import { GEARS, OUTF, OUTFN, SPECIES } from '../../engine/sprites';
import { rollArtistName, rollCompanionName } from '../../strings/names';
import { useStore } from '../../state/store';
import type { Character } from '../../types';

type RowKey = 'a' | 's' | 'c' | 'outfit' | 'gear';

interface RowDef {
  k: RowKey;
  label: string;
  len: number;
  swatch?: string[];
  names: string[];
}

function jumpCompanion() {
  const { setCompanionAnim } = useStore.getState();
  setCompanionAnim('jump');
  setTimeout(() => setCompanionAnim('idle'), 650);
}

export default function Creator({ onDone }: { onDone: () => void }) {
  const character = useStore((s) => s.character);
  const profile = useStore((s) => s.profile);
  const speciesUnlocked = useStore((s) => s.studio.speciesUnlocked);
  const setCharacter = useStore((s) => s.setCharacter);
  const setOnboardingAnswer = useStore((s) => s.setOnboardingAnswer);

  const [artistName, setArtistName] = useState(profile.artistName);
  const [companionDraft, setCompanionDraft] = useState(character.companionName);
  const [showCompanionBubble, setShowCompanionBubble] = useState(false);
  const [renamingCompanion, setRenamingCompanion] = useState(false);

  const unlocked = speciesUnlocked.filter((i) => i <= 4);
  const sp = SPECIES[character.species] ?? SPECIES[0];

  const rows: RowDef[] = [
    { k: 'a', label: sp.aLabel, len: sp.a.length, swatch: sp.a, names: sp.aN },
    { k: 's', label: sp.sLabel, len: sp.s.length, names: sp.s },
    { k: 'c', label: sp.cLabel, len: sp.c.length, swatch: sp.c, names: sp.cN },
    { k: 'outfit', label: sp.outLabel, len: OUTF.length, swatch: OUTF, names: OUTFN },
    { k: 'gear', label: 'GEAR', len: GEARS.length, names: GEARS },
  ];

  const scale = typeof window !== 'undefined' && window.innerWidth < 520 ? 9 : 11;

  const patchCharacter = useCallback(
    (patch: Partial<Character>) => {
      setCharacter(patch);
      jumpCompanion();
    },
    [setCharacter],
  );

  const cycle = (k: RowKey, dir: number) => {
    const r = rows.find((x) => x.k === k);
    if (!r) return;
    const cur = character[k] as number;
    patchCharacter({ [k]: (cur + dir + r.len) % r.len });
  };

  const selectSpecies = (i: number) => {
    patchCharacter({ species: i, a: 0, s: 0, c: 0 });
  };

  const shuffle = () => {
    const species = unlocked[Math.floor(Math.random() * unlocked.length)] ?? 0;
    const speciesDef = SPECIES[species];
    patchCharacter({
      species,
      a: Math.floor(Math.random() * speciesDef.a.length),
      s: Math.floor(Math.random() * speciesDef.s.length),
      c: Math.floor(Math.random() * speciesDef.c.length),
      outfit: Math.floor(Math.random() * OUTF.length),
      gear: Math.floor(Math.random() * GEARS.length),
    });
  };

  const rollName = () => {
    const name = rollArtistName(profile.genre);
    setArtistName(name);
    setOnboardingAnswer({ artistName: name });
    maybeShowCompanion(name);
  };

  const maybeShowCompanion = (name: string) => {
    if (name.trim().length >= 8) {
      const rolled = rollCompanionName(character.companionName);
      setCompanionDraft(rolled);
      setShowCompanionBubble(true);
    }
  };

  const onNameChange = (v: string) => {
    const upper = v.toUpperCase().slice(0, 16);
    setArtistName(upper);
    setOnboardingAnswer({ artistName: upper });
  };

  const onNameBlur = () => {
    if (artistName.trim().length >= 8) maybeShowCompanion(artistName);
  };

  const keepCompanion = () => {
    setCharacter({ companionName: companionDraft.slice(0, 10) });
    setRenamingCompanion(false);
    setShowCompanionBubble(false);
  };

  const enterStudio = () => {
    const name = artistName.trim();
    if (!name) return;
    setOnboardingAnswer({ artistName: name });
    if (companionDraft) setCharacter({ companionName: companionDraft.slice(0, 10) });
    onDone();
  };

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: 40 }}>
      <div className="qtitle" style={{ marginBottom: 6 }}>
        CREATE YOUR COMPANION
      </div>
      <p className="qsub" style={{ marginBottom: 20 }}>
        This little legend follows you around the studio.
      </p>

      <div className="species-tabs">
        {unlocked.map((i) => (
          <button
            key={i}
            type="button"
            className={`sptab${character.species === i ? ' on' : ''}`}
            onClick={() => selectSpecies(i)}
          >
            {SPECIES[i].name}
          </button>
        ))}
      </div>

      <div className="creator-wrap" style={{ marginTop: 20 }}>
        <div className="stage-box">
          <SpriteCanvas character={character} scale={scale} />
          <div className="stage-floor" />
          <PixelButton variant="ghost" style={{ fontSize: 8 }} onClick={shuffle}>
            ↻ SHUFFLE
          </PixelButton>
        </div>

        <div className="ctr-rows">
          <div className="name-row">
            <input
              className="name-row"
              placeholder="ARTIST NAME…"
              maxLength={16}
              value={artistName}
              onChange={(e) => onNameChange(e.target.value)}
              onBlur={onNameBlur}
            />
            <PixelButton variant="ghost" style={{ fontSize: 8, flexShrink: 0 }} onClick={rollName}>
              🎲 ROLL ONE
            </PixelButton>
          </div>

          {showCompanionBubble && (
            <div
              id="bubble"
              style={{
                position: 'relative',
                bottom: 'auto',
                left: 'auto',
                width: '100%',
                marginBottom: 8,
              }}
            >
              {renamingCompanion ? (
                <input
                  maxLength={10}
                  value={companionDraft}
                  onChange={(e) => setCompanionDraft(e.target.value.toUpperCase())}
                  style={{ marginBottom: 10 }}
                />
              ) : (
                <span>…{companionDraft}?</span>
              )}
              <div className="bbtns">
                <button type="button" onClick={keepCompanion}>
                  KEEP IT
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => {
                    if (renamingCompanion) {
                      setCompanionDraft(rollCompanionName(companionDraft));
                      setRenamingCompanion(false);
                    } else {
                      setRenamingCompanion(true);
                    }
                  }}
                >
                  RENAME
                </button>
              </div>
            </div>
          )}

          {rows.map((r) => {
            const i = character[r.k] as number;
            return (
              <div key={r.k} className="ctr-row">
                <label>{r.label}</label>
                <button type="button" className="arrow" onClick={() => cycle(r.k, -1)} aria-label="Previous">
                  ◀
                </button>
                <span className="val">
                  {r.swatch && (
                    <span className="swatch" style={{ background: r.swatch[i] }} />
                  )}
                  <span>{r.names[i]}</span>
                </span>
                <button type="button" className="arrow" onClick={() => cycle(r.k, 1)} aria-label="Next">
                  ▶
                </button>
              </div>
            );
          })}

          <PixelButton
            variant="pink"
            style={{ width: '100%', marginTop: 6 }}
            disabled={!artistName.trim()}
            onClick={enterStudio}
          >
            ▶ ENTER THE STUDIO
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
