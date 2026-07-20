import { useEffect, useRef } from 'react';
import { drawCover } from '../../engine/covers';

export function CoverCanvas({ seed, size = 16 }: { seed: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) drawCover(ref.current, seed, size);
  }, [seed, size]);
  return <canvas ref={ref} className="card-cover" />;
}
