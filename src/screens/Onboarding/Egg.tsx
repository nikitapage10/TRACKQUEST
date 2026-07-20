import { useCallback, useEffect, useRef, useState } from 'react';
import { SpriteCanvas } from '../../components/widgets/SpriteCanvas';
import { GEARS, OUTF, SPECIES } from '../../engine/sprites';
import { useStore } from '../../state/store';
import { UI } from '../../strings/ui';
import type { Genre, Pain, Schedule, Voice } from '../../types';

const GENRE_COLORS: Record<Genre, string> = {
  Electronic: '#3ee6c2',
  Indie: '#ffd447',
  Rock: '#ff7a3d',
  'Hip-hop': '#8b6cff',
  Pop: '#ff4d9d',
  Other: '#4da3ff',
};

const EGG_W = 14;
const EGG_H = 18;
const EGG_SCALE = 10;

function drawEgg(
  ctx: CanvasRenderingContext2D,
  speckle: string,
  rings: number,
  dimmed: boolean,
) {
  const P = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  const R = (x0: number, y0: number, x1: number, y1: number, col: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(x, y, col);
  };

  ctx.clearRect(0, 0, EGG_W, EGG_H);
  const egg = '#eceef8';
  const shade = '#d4d6e8';

  R(6, 2, 7, 2, egg);
  R(5, 3, 8, 3, egg);
  R(4, 4, 9, 4, egg);
  R(4, 5, 9, 14, egg);
  R(5, 15, 8, 15, egg);
  R(6, 16, 7, 16, egg);
  P(5, 6, shade);
  P(8, 10, shade);

  const specks: [number, number][] = [
    [5, 7],
    [8, 5],
    [6, 11],
    [4, 9],
    [9, 12],
    [7, 8],
    [5, 13],
    [8, 14],
  ];
  for (const [x, y] of specks) P(x, y, speckle);

  const ringColors = ['#3ee6c2', '#8b6cff', '#ffd447'];
  for (let r = 0; r < rings; r++) {
    const c = ringColors[r % ringColors.length];
    const inset = r + 1;
    P(4 - inset, 5 + r, c);
    P(9 + inset, 5 + r, c);
    P(4 - inset, 14 - r, c);
    P(9 + inset, 14 - r, c);
  }

  if (dimmed) {
    ctx.fillStyle = 'rgba(13, 14, 26, 0.2)';
    ctx.fillRect(0, 0, EGG_W, EGG_H);
  }
}

function spawnConfetti(n: number) {
  const cols = ['#ff4d9d', '#3ee6c2', '#ffd447', '#8b6cff'];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.38;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('div');
    s.className = 'confetti';
    s.style.background = cols[i % 4];
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    document.body.appendChild(s);
    const vx = (Math.random() - 0.5) * 5;
    let x = 0;
    let y = 0;
    let vY = -(2 + Math.random() * 4);
    let f = 0;
    (function fall() {
      f++;
      x += vx;
      vY += 0.35;
      y += vY;
      s.style.transform = `translate(${x}px,${y}px) rotate(${f * 14}deg)`;
      if (f < 50) requestAnimationFrame(fall);
      else s.remove();
    })();
  }
}

function randomCharacter() {
  const species = Math.floor(Math.random() * 5);
  const sp = SPECIES[species];
  return {
    species,
    a: Math.floor(Math.random() * sp.a.length),
    s: Math.floor(Math.random() * sp.s.length),
    c: Math.floor(Math.random() * sp.c.length),
    outfit: Math.floor(Math.random() * OUTF.length),
    gear: Math.floor(Math.random() * GEARS.length),
  };
}

export default function Egg({ onDone }: { onDone: () => void }) {
  const setOnboardingAnswer = useStore((s) => s.setOnboardingAnswer);
  const setCharacter = useStore((s) => s.setCharacter);
  const character = useStore((s) => s.character);
  const reduced = useStore((s) => s.reducedMotion);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const [speckle, setSpeckle] = useState('#8b6cff');
  const [rings, setRings] = useState(0);
  const [dimmed, setDimmed] = useState(false);
  const [hatched, setHatched] = useState(false);
  const [shaking, setShaking] = useState(false);

  const paintEgg = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = EGG_W;
    cv.height = EGG_H;
    cv.style.width = `${EGG_W * EGG_SCALE}px`;
    cv.style.height = `${EGG_H * EGG_SCALE}px`;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    drawEgg(ctx, speckle, rings, dimmed);
  }, [speckle, rings, dimmed]);

  useEffect(() => {
    if (!hatched) paintEgg();
  }, [paintEgg, hatched]);

  const advance = (next: number) => {
    setTimeout(() => setStep(next), 260);
  };

  const hatch = () => {
    const chr = randomCharacter();
    setCharacter(chr);
    if (!reduced) {
      setShaking(true);
      setTimeout(() => {
        setHatched(true);
        setShaking(false);
        spawnConfetti(8);
      }, 600);
      setTimeout(() => onDone(), 900);
    } else {
      setHatched(true);
      onDone();
    }
  };

  const pickGenre = (genre: Genre) => {
    setSpeckle(GENRE_COLORS[genre]);
    setOnboardingAnswer({ genre });
    advance(1);
  };

  const pickExp = (tier: 0 | 1 | 2 | 3) => {
    setRings(tier + 1);
    setOnboardingAnswer({ expTier: tier });
    advance(2);
  };

  const pickPain = (pain: Pain) => {
    setOnboardingAnswer({ pain });
    setDimmed(true);
    setTimeout(() => setDimmed(false), 500);
    advance(3);
  };

  const pickVoice = (voice: Voice) => {
    setOnboardingAnswer({ voice });
    advance(4);
  };

  const pickSchedule = (schedule: Schedule) => {
    setOnboardingAnswer({ schedule });
    hatch();
  };

  const scale = typeof window !== 'undefined' && window.innerWidth < 520 ? 9 : EGG_SCALE;

  return (
    <div className="screen">
      <div className="qdots">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={i <= step ? 'on' : ''} />
        ))}
      </div>

      <div className={`egg-wrap${!hatched && !reduced ? ' wobble' : ''}`}>
        {hatched ? (
          <SpriteCanvas character={character} scale={scale} />
        ) : (
          <canvas
            ref={canvasRef}
            style={
              shaking
                ? { animation: 'wobble 0.12s ease-in-out 5' }
                : undefined
            }
          />
        )}
        <div className="stage-floor" />
      </div>

      {step === 0 && (
        <div className="qstep">
          <div className="qtitle">{UI['q1.title']}</div>
          <p className="qsub">{UI['q1.sub']}</p>
          <div className="opts">
            <button type="button" className="opt" onClick={() => pickGenre('Electronic')}>
              Electronic<small>house, techno, DnB…</small>
            </button>
            <button type="button" className="opt" onClick={() => pickGenre('Indie')}>
              Indie<small>bedroom pop, alt…</small>
            </button>
            <button type="button" className="opt" onClick={() => pickGenre('Rock')}>
              Rock<small>bands, riffs, loud</small>
            </button>
            <button type="button" className="opt" onClick={() => pickGenre('Hip-hop')}>
              Hip-hop<small>beats, bars</small>
            </button>
            <button type="button" className="opt" onClick={() => pickGenre('Pop')}>
              Pop<small>hooks for days</small>
            </button>
            <button type="button" className="opt" onClick={() => pickGenre('Other')}>
              Something else<small>genre is a prison</small>
            </button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="qstep">
          <div className="qtitle">{UI['q2.title']}</div>
          <p className="qsub">{UI['q2.sub']}</p>
          <div className="opts">
            <button type="button" className="opt" onClick={() => pickExp(0)}>
              Just starting
            </button>
            <button type="button" className="opt" onClick={() => pickExp(1)}>
              1–3 years
            </button>
            <button type="button" className="opt" onClick={() => pickExp(2)}>
              3–10 years
            </button>
            <button type="button" className="opt" onClick={() => pickExp(3)}>
              Longer than I&apos;ll admit
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="qstep">
          <div className="qtitle">{UI['q3.title']}</div>
          <p className="qsub">{UI['q3.sub']}</p>
          <div className="opts">
            <button type="button" className="opt" onClick={() => pickPain('steam')}>
              I lose steam<small>start hot, fade fast</small>
            </button>
            <button type="button" className="opt" onClick={() => pickPain('tweak')}>
              Endless tweaking<small>v47_FINAL_final.wav</small>
            </button>
            <button type="button" className="opt" onClick={() => pickPain('time')}>
              No time<small>life keeps happening</small>
            </button>
            <button type="button" className="opt" onClick={() => pickPain('arrange')}>
              Arrangements stall<small>great loop, no song</small>
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="qstep">
          <div className="qtitle">{UI['q4.title']}</div>
          <div className="opts">
            <button type="button" className="opt" onClick={() => pickVoice('hype')}>
              {UI['q4.hype']}<small>{UI['q4.hype.sub']}</small>
            </button>
            <button type="button" className="opt" onClick={() => pickVoice('real')}>
              {UI['q4.real']}<small>{UI['q4.real.sub']}</small>
            </button>
            <button type="button" className="opt" onClick={() => pickVoice('drill')}>
              {UI['q4.drill']}<small>{UI['q4.drill.sub']}</small>
            </button>
            <button type="button" className="opt" onClick={() => pickVoice('facts')}>
              {UI['q4.facts']}<small>{UI['q4.facts.sub']}</small>
            </button>
          </div>
        </div>
      )}

      {step === 4 && !hatched && (
        <div className="qstep">
          <div className="qtitle">{UI['q5.title']}</div>
          <div className="opts">
            <button type="button" className="opt" onClick={() => pickSchedule('weeknights')}>
              {UI['q5.weeknights']}<small>{UI['q5.weeknights.sub']}</small>
            </button>
            <button type="button" className="opt" onClick={() => pickSchedule('weekends')}>
              {UI['q5.weekends']}<small>{UI['q5.weekends.sub']}</small>
            </button>
            <button type="button" className="opt" onClick={() => pickSchedule('stolen')}>
              {UI['q5.stolen']}<small>{UI['q5.stolen.sub']}</small>
            </button>
            <button type="button" className="opt" onClick={() => pickSchedule('chaos')}>
              {UI['q5.chaos']}<small>{UI['q5.chaos.sub']}</small>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
