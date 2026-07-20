import { useEffect, useState } from 'react';
import { PixelButton } from '../../components/widgets/PixelButton';
import { useStore } from '../../state/store';
import { UI } from '../../strings/ui';

const LINES = [UI['signal.1'], UI['signal.2'], UI['signal.3']] as const;

export default function Signal({ onDone }: { onDone: () => void }) {
  const reduced = useStore((s) => s.reducedMotion);
  const [visibleCount, setVisibleCount] = useState(reduced ? 3 : 0);

  useEffect(() => {
    if (reduced) return;
    const timers = [
      setTimeout(() => setVisibleCount(1), 0),
      setTimeout(() => setVisibleCount(2), 700),
      setTimeout(() => setVisibleCount(3), 1400),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  const showEq = visibleCount >= 3;
  const showBtn = visibleCount >= 3;

  return (
    <div className="boot" style={{ flexDirection: 'column', textAlign: 'center' }}>
      <div className={`signal-line${reduced ? '' : ' pulse'}`} />
      <div className="signal-lines">
        {LINES.map((line, i) => (
          <p
            key={line}
            style={
              reduced
                ? { opacity: 1 }
                : {
                    opacity: i < visibleCount ? 1 : 0,
                    animation: i < visibleCount ? 'fadein 0.5s forwards' : undefined,
                  }
            }
          >
            {line}
          </p>
        ))}
      </div>
      {showEq && (
        <div className="welcome-eq" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      )}
      {showBtn && (
        <PixelButton className="blink" onClick={onDone} style={{ marginTop: 24 }}>
          ▶ PRESS START
        </PixelButton>
      )}
    </div>
  );
}
