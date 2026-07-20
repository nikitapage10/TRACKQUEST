import { useEffect } from 'react';
import { useStore } from '../../state/store';

export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div id="toasts">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.kind === 'pink' ? 'pink' : t.kind === 'mint' ? 'mint' : ''}`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}

export function ConfettiLayer() {
  const queue = useStore((s) => s.celebrateQueue);
  const reduced = useStore((s) => s.reducedMotion || s.settings.reducedCelebrations);

  useEffect(() => {
    if (reduced || !queue.length) return;
    const item = queue[0];
    useStore.setState({ celebrateQueue: queue.slice(1) });
    const counts: Record<string, number> = {
      stageclear: 14,
      levelup: 14,
      release: 40,
      quest: 14,
    };
    const n = counts[item.kind] ?? 0;
    if (!n) return;
    const cols = ['#ff4d9d', '#3ee6c2', '#ffd447', '#8b6cff'];
    const buddy = document.getElementById('buddy');
    const b = buddy?.getBoundingClientRect() ?? {
      left: window.innerWidth / 2,
      top: window.innerHeight / 2,
      width: 0,
    };
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'confetti';
      s.style.background = cols[i % 4];
      s.style.left = `${b.left + (b.width || 0) / 2}px`;
      s.style.top = `${b.top}px`;
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
  }, [queue, reduced]);

  return null;
}
