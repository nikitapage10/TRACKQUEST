import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../state/store';
import { SpriteCanvas } from '../widgets/SpriteCanvas';
import { SPRITE_H, SPRITE_W } from '../../engine/sprites';

export function Companion() {
  const character = useStore((s) => s.character);
  const anim = useStore((s) => s.companionAnim);
  const target = useStore((s) => s.companionTarget);
  const bubble = useStore((s) => s.bubble);
  const completed = useStore((s) => s.onboarding.completed);
  const dismissBubble = useStore((s) => s.dismissBubble);
  const tapCompanion = useStore((s) => s.tapCompanion);
  const muteCoachWeek = useStore((s) => s.muteCoachWeek);
  const reduced = useStore((s) => s.reducedMotion);
  const [pos, setPos] = useState({ x: -120, y: window.innerHeight * 0.55 });
  const [flip, setFlip] = useState(false);
  const [walking, setWalking] = useState(false);
  const [frame, setFrame] = useState(0);
  const posRef = useRef(pos);
  posRef.current = pos;

  const scale = window.innerWidth < 520 ? 4 : 5;

  useEffect(() => {
    if (!completed) return;
    const resolve = () => {
      let x = posRef.current.x;
      let y = posRef.current.y;
      if (!target) {
        // default: near board / studio
        x = Math.min(window.innerWidth - 100, Math.max(20, window.innerWidth * 0.55));
        y = Math.min(window.innerHeight - 100, Math.max(80, window.innerHeight * 0.55));
      } else if (target.kind === 'xy') {
        x = target.x;
        y = target.y;
      } else if (target.kind === 'element') {
        const el = document.querySelector(target.selector);
        if (el) {
          const r = el.getBoundingClientRect();
          x = Math.min(window.innerWidth - SPRITE_W * scale - 10, Math.max(6, r.left - 8));
          y = Math.min(window.innerHeight - SPRITE_H * scale - 10, Math.max(60, r.top - SPRITE_H * scale - 6));
        }
      } else if (target.kind === 'room') {
        const room = document.querySelector(`[data-room="${target.stage}"]`);
        if (room) {
          const r = room.getBoundingClientRect();
          x = r.left + 40;
          y = r.bottom - SPRITE_H * scale - 20;
        }
      }
      setFlip(x < posRef.current.x);
      setWalking(true);
      setPos({ x, y });
      const t = window.setTimeout(() => {
        setWalking(false);
        setFlip(false);
      }, reduced ? 0 : 1250);
      return () => clearTimeout(t);
    };
    return resolve();
  }, [target, completed, scale, reduced]);

  // walk frames
  useEffect(() => {
    if (!walking || reduced) {
      setFrame(0);
      return;
    }
    const id = setInterval(() => setFrame((f) => (f === 0 ? 1 : 0)), 125);
    return () => clearInterval(id);
  }, [walking, reduced]);

  // idle retarget in studio
  useEffect(() => {
    if (!completed || bubble) return;
    const id = setInterval(() => {
      const view = useStore.getState().view;
      if (view !== 'studio') return;
      const songs = useStore.getState().songs.filter((s) => s.status === 'active' && !s.isExample);
      const stuck = songs.find((s) => Date.now() - s.lastTouchedAt > 14 * 86400000);
      if (stuck) {
        useStore.getState().setCompanionTarget({ kind: 'element', selector: `[data-cart="${stuck.id}"]` });
        useStore.getState().setCompanionAnim('sit');
      } else if (songs.length) {
        const recent = [...songs].sort((a, b) => b.lastTouchedAt - a.lastTouchedAt)[0];
        useStore.getState().setCompanionTarget({ kind: 'room', stage: recent.stage });
        useStore.getState().setCompanionAnim('idle');
      }
    }, 25000 + Math.random() * 15000);
    return () => clearInterval(id);
  }, [completed, bubble]);

  if (!completed) return null;

  const animClass =
    walking ? 'walking' : anim === 'jump' ? 'jump' : anim === 'hype' ? 'hype' : anim === 'sit' ? 'sit' : 'idle';

  return (
    <div
      id="buddy"
      className={animClass}
      style={{ left: pos.x, top: pos.y }}
      onClick={() => tapCompanion()}
      onContextMenu={(e) => {
        e.preventDefault();
        muteCoachWeek();
      }}
    >
      {bubble && (
        <div
          id="bubble"
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => {
            e.preventDefault();
            muteCoachWeek();
          }}
        >
          {bubble.text}
          {bubble.buttons.length > 0 && (
            <div className="bbtns">
              {bubble.buttons.map((b) => (
                <button
                  key={b.id}
                  className={b.ghost ? 'ghost' : ''}
                  onClick={() => {
                    const accept = !b.ghost;
                    dismissBubble(accept, b.id);
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flip" style={{ transform: flip ? 'scaleX(-1)' : 'scaleX(1)' }}>
        <SpriteCanvas character={character} scale={scale} frame={frame} />
      </div>
    </div>
  );
}

// dismiss bubble when clicking elsewhere
export function BubbleDismissOverlay() {
  const bubble = useStore((s) => s.bubble);
  const dismiss = useStore((s) => s.dismissBubble);
  if (!bubble) return null;
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 65 }}
      onClick={() => dismiss(false, 'dismiss')}
    />
  );
}
