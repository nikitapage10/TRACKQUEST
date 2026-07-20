/** Deterministic 16×16 pixel cover from seed */

const PALETTE = [
  '#ff4d9d',
  '#3ee6c2',
  '#ffd447',
  '#8b6cff',
  '#ff7a3d',
  '#4da3ff',
  '#eceef8',
  '#2a2e4a',
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 4×4 mirrored pattern → 16×16 (each cell 4px) drawn on canvas */
export function drawCover(
  canvas: HTMLCanvasElement,
  seed: string,
  displayPx = 16,
): void {
  const size = 16;
  canvas.width = size;
  canvas.height = size;
  canvas.style.width = `${displayPx}px`;
  canvas.style.height = `${displayPx}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const h = hash(seed);
  const c1 = PALETTE[h % PALETTE.length];
  const c2 = PALETTE[(h >>> 8) % PALETTE.length];
  const bg = '#1d2036';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // 4×4 pattern, mirrored to 8×8 then scaled ×2
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const bit = (h >>> (y * 4 + x)) & 1;
      const col = bit ? c1 : c2;
      const cells = [
        [x, y],
        [7 - x, y],
        [x, 7 - y],
        [7 - x, 7 - y],
      ];
      for (const [cx, cy] of cells) {
        ctx.fillStyle = col;
        ctx.fillRect(cx * 2, cy * 2, 2, 2);
      }
    }
  }
}

export function coverColors(seed: string): [string, string] {
  const h = hash(seed);
  return [PALETTE[h % PALETTE.length], PALETTE[(h >>> 8) % PALETTE.length]];
}
