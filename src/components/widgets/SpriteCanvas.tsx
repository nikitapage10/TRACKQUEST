import { useEffect, useRef } from 'react';
import { drawSprite, drawSpriteToCtx, type CharacterLike } from '../../engine/sprites';

export function SpriteCanvas({
  character,
  scale = 4,
  frame = 0,
  className,
}: {
  character: CharacterLike;
  scale?: number;
  frame?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    if (frame === 0) {
      drawSprite(cv, character, scale);
    } else {
      cv.width = 14;
      cv.height = 18;
      cv.style.width = `${14 * scale}px`;
      cv.style.height = `${18 * scale}px`;
      const ctx = cv.getContext('2d')!;
      ctx.clearRect(0, 0, 14, 18);
      drawSpriteToCtx(ctx, character, frame);
    }
  }, [character, scale, frame, character.species, character.a, character.s, character.c, character.outfit, character.gear]);
  return <canvas ref={ref} className={className} />;
}
