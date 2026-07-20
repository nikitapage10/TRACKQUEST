/** 14×18 pixel sprite engine — ported from TrackQuest prototype */

export const SPRITE_W = 14;
export const SPRITE_H = 18;

export const OUTF = [
  '#ff4d9d',
  '#3ee6c2',
  '#ffd447',
  '#8b6cff',
  '#ff7a3d',
  '#4da3ff',
  '#eceef8',
  '#2b2b3d',
];
export const OUTFN = ['Pink', 'Mint', 'Gold', 'Violet', 'Orange', 'Blue', 'White', 'Black'];
export const DARK = '#171827';

export interface SpeciesDef {
  name: string;
  aLabel: string;
  a: string[];
  aN: string[];
  sLabel: string;
  s: string[];
  cLabel: string;
  c: string[];
  cN: string[];
  outLabel: string;
}

export const SPECIES: SpeciesDef[] = [
  {
    name: 'HUMAN',
    aLabel: 'SKIN',
    a: ['#f0c8a0', '#d9a066', '#b07040', '#8a4b2d', '#f6d9c3', '#c98a5b'],
    aN: ['Peach', 'Tan', 'Bronze', 'Deep', 'Fair', 'Amber'],
    sLabel: 'HAIR',
    s: ['Spikes', 'Bob', 'Buzz', 'Long', 'Mohawk', 'Afro', 'Ponytail'],
    cLabel: 'HAIR COLOR',
    c: ['#2b2b3d', '#e8b23a', '#c14a2e', '#8b6cff', '#3ec27a', '#eceef8', '#ff4d9d', '#4da3ff'],
    cN: ['Ink', 'Blonde', 'Copper', 'Violet', 'Green', 'Silver', 'Pink', 'Blue'],
    outLabel: 'OUTFIT',
  },
  {
    name: 'CAT',
    aLabel: 'FUR',
    a: ['#8b8fad', '#e8963a', '#2b2b3d', '#eceef8', '#8a5a2b', '#d9a066'],
    aN: ['Gray', 'Orange', 'Black', 'White', 'Brown', 'Tan'],
    sLabel: 'PATTERN',
    s: ['Solid', 'Stripes', 'Patch'],
    cLabel: 'MARKINGS',
    c: ['#2b2b3d', '#eceef8', '#e8963a', '#c14a2e', '#8b8fad'],
    cN: ['Ink', 'White', 'Orange', 'Rust', 'Gray'],
    outLabel: 'HOODIE',
  },
  {
    name: 'ROBOT',
    aLabel: 'CHASSIS',
    a: ['#aab0c8', '#6a7086', '#d4af37', '#3ee6c2', '#ff9ecb', '#4da3ff'],
    aN: ['Silver', 'Gunmetal', 'Gold', 'Teal', 'Rose', 'Blue'],
    sLabel: 'ANTENNA',
    s: ['Single', 'Twin', 'Dish'],
    cLabel: 'LIGHTS',
    c: ['#3ee6c2', '#ffd447', '#ff4d9d', '#4da3ff', '#b8e04a'],
    cN: ['Mint', 'Gold', 'Pink', 'Blue', 'Lime'],
    outLabel: 'PANEL',
  },
  {
    name: 'ALIEN',
    aLabel: 'SKIN',
    a: ['#3ec27a', '#8b6cff', '#4da3ff', '#ff6ab5', '#b8e04a', '#3ee6c2'],
    aN: ['Green', 'Violet', 'Blue', 'Pink', 'Lime', 'Teal'],
    sLabel: 'EYES',
    s: ['One eye', 'Two eyes', 'Three eyes'],
    cLabel: 'GLOW',
    c: ['#ffd447', '#3ee6c2', '#ff4d9d', '#eceef8', '#ff7a3d'],
    cN: ['Gold', 'Mint', 'Pink', 'White', 'Orange'],
    outLabel: 'SUIT',
  },
  {
    name: 'SLIME',
    aLabel: 'GOO',
    a: ['#3ee6c2', '#ff9ecb', '#7db8ff', '#b28bff', '#b8e04a', '#ffd447'],
    aN: ['Mint', 'Pink', 'Blue', 'Grape', 'Lime', 'Lemon'],
    sLabel: 'FACE',
    s: ['Happy', 'Sleepy', 'Star eyes'],
    cLabel: 'SPARKLE',
    c: ['#eceef8', '#ffd447', '#ff4d9d', '#3ee6c2', '#8b6cff'],
    cN: ['White', 'Gold', 'Pink', 'Mint', 'Violet'],
    outLabel: 'HEADBAND',
  },
  {
    name: 'GHOST',
    aLabel: 'MIST',
    a: ['#eceef8', '#c8d4ff', '#b8e8ff', '#d4c8ff', '#f0f4ff', '#a8b8e8'],
    aN: ['White', 'Fog', 'Sky', 'Lilac', 'Pearl', 'Haze'],
    sLabel: 'FACE',
    s: ['Smile', 'Wink', 'Boo'],
    cLabel: 'AURA',
    c: ['#3ee6c2', '#ffd447', '#ff4d9d', '#8b6cff', '#4da3ff'],
    cN: ['Mint', 'Gold', 'Pink', 'Violet', 'Blue'],
    outLabel: 'RIBBON',
  },
  {
    name: 'FROG',
    aLabel: 'SKIN',
    a: ['#3ec27a', '#5ad48a', '#2a9e5a', '#7db86a', '#4db87a', '#68c878'],
    aN: ['Green', 'Spring', 'Forest', 'Moss', 'Jade', 'Leaf'],
    sLabel: 'MARKING',
    s: ['Solid', 'Spotted', 'Stripe'],
    cLabel: 'BELLY',
    c: ['#eceef8', '#ffd447', '#ff9ecb', '#8b6cff', '#3ee6c2'],
    cN: ['White', 'Gold', 'Pink', 'Violet', 'Mint'],
    outLabel: 'VEST',
  },
];

export const GEARS = ['Headphones', 'Guitar', 'Mic', 'Keytar', 'Drumsticks', 'Boombox', 'None'];

export interface CharacterLike {
  species: number;
  a: number;
  s: number;
  c: number;
  outfit: number;
  gear: number;
}

export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt;
  let g = ((n >> 8) & 255) + amt;
  let b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

type PixelFn = (x: number, y: number, col: string) => void;
type RectFn = (x0: number, y0: number, x1: number, y1: number, col: string) => void;

/** Draw sprite into an existing 14×18 context (frame 0 = pose, frame 1 = walk/squash). */
export function drawSpriteToCtx(
  ctx: CanvasRenderingContext2D,
  chr: CharacterLike,
  frame: number,
): void {
  ctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  paintSprite(ctx, chr, frame);
}

/** Set canvas size/scale and draw frame 0 (prototype signature). */
export function drawSprite(
  canvas: HTMLCanvasElement,
  chr: CharacterLike,
  scale: number,
): void {
  canvas.width = SPRITE_W;
  canvas.height = SPRITE_H;
  canvas.style.width = `${SPRITE_W * scale}px`;
  canvas.style.height = `${SPRITE_H * scale}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  drawSpriteToCtx(ctx, chr, 0);
}

function paintSprite(
  ctx: CanvasRenderingContext2D,
  chr: CharacterLike,
  frame: number,
): void {
  const P: PixelFn = (x, y, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  const R: RectFn = (x0, y0, x1, y1, col) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(x, y, col);
  };

  const sp = SPECIES[chr.species] ?? SPECIES[0];
  const A = sp.a[chr.a % sp.a.length];
  const AC = sp.c[chr.c % sp.c.length];
  const OUT = OUTF[chr.outfit % OUTF.length];
  const style = sp.s[chr.s % sp.s.length];
  const ly = frame === 1 && sp.name !== 'SLIME' && sp.name !== 'GHOST' ? 1 : 0;
  const wy = frame === 1 && sp.name === 'GHOST' ? 1 : 0;
  let headTop = 0;

  if (sp.name === 'HUMAN') {
    R(4, 2, 9, 7, A);
    P(5, 5, DARK);
    P(8, 5, DARK);
    P(6, 7, shade(A, -30));
    P(7, 7, shade(A, -30));
    if (style !== 'Buzz') {
      R(4, 1, 9, 2, AC);
    }
    if (style === 'Spikes') {
      P(4, 0, AC);
      P(6, 0, AC);
      P(8, 0, AC);
    }
    if (style === 'Bob' || style === 'Long' || style === 'Ponytail') {
      R(3, 2, 3, 4, AC);
      R(10, 2, 10, 4, AC);
    }
    if (style === 'Long') {
      R(3, 5, 3, 8, AC);
      R(10, 5, 10, 8, AC);
    }
    if (style === 'Ponytail') {
      P(11, 3, AC);
      P(11, 4, AC);
      P(11, 5, AC);
      P(11, 6, AC);
    }
    if (style === 'Mohawk') {
      R(6, 0, 7, 1, AC);
      P(6, 2, AC);
      P(7, 2, AC);
    }
    if (style === 'Afro') {
      R(3, 0, 10, 2, AC);
      P(2, 1, AC);
      P(11, 1, AC);
      P(3, 3, AC);
      P(10, 3, AC);
    }
    if (style === 'Buzz') {
      R(4, 2, 9, 2, shade(AC, -20));
    }
    R(4, 8, 9, 11, OUT);
    R(4, 12, 9, 12, shade(OUT, -40));
    R(3, 8, 3, 11, OUT);
    R(10, 8, 10, 11, OUT);
    P(3, 12, A);
    P(10, 12, A);
    R(4, 13 + ly, 5, 15 + ly, '#2a2e4a');
    R(8, 13 + ly, 9, 15 + ly, '#2a2e4a');
    R(4, 16 + ly, 5, 16 + ly, '#11121f');
    R(8, 16 + ly, 9, 16 + ly, '#11121f');
  } else if (sp.name === 'CAT') {
    P(4, 0, A);
    P(4, 1, A);
    P(3, 1, A);
    P(9, 0, A);
    P(9, 1, A);
    P(10, 1, A);
    P(4, 1, '#e06a8a');
    P(9, 1, '#e06a8a');
    R(4, 2, 9, 7, A);
    R(6, 5, 7, 6, shade(A, 50));
    P(5, 4, DARK);
    P(8, 4, DARK);
    P(6, 5, '#e06a8a');
    P(7, 5, '#e06a8a');
    if (style === 'Stripes') {
      P(5, 2, AC);
      P(7, 2, AC);
      P(9, 2, AC);
      P(4, 3, AC);
      P(10, 3, AC);
    }
    if (style === 'Patch') {
      R(8, 2, 9, 3, AC);
      P(7, 2, AC);
    }
    R(4, 8, 9, 11, OUT);
    R(4, 12, 9, 12, shade(OUT, -40));
    R(3, 8, 3, 11, OUT);
    R(10, 8, 10, 11, OUT);
    P(3, 12, A);
    P(10, 12, A);
    R(4, 13 + ly, 5, 15 + ly, A);
    R(8, 13 + ly, 9, 15 + ly, A);
    R(4, 16 + ly, 5, 16 + ly, shade(A, -45));
    R(8, 16 + ly, 9, 16 + ly, shade(A, -45));
    P(10, 13, A);
    P(11, 12, A);
    P(11, 11, A);
    P(11, 10, style === 'Solid' ? A : AC);
  } else if (sp.name === 'ROBOT') {
    if (style === 'Single') {
      P(6, 1, '#9aa0b8');
      P(6, 0, AC);
    }
    if (style === 'Twin') {
      P(4, 1, '#9aa0b8');
      P(4, 0, AC);
      P(9, 1, '#9aa0b8');
      P(9, 0, AC);
    }
    if (style === 'Dish') {
      R(5, 0, 8, 0, '#9aa0b8');
      P(6, 1, '#9aa0b8');
      P(7, 1, '#9aa0b8');
    }
    R(4, 2, 9, 7, A);
    R(4, 2, 9, 2, shade(A, 25));
    R(4, 4, 9, 4, '#11121f');
    P(5, 4, AC);
    P(8, 4, AC);
    P(6, 6, DARK);
    P(7, 6, DARK);
    R(4, 8, 9, 11, A);
    R(4, 12, 9, 12, shade(A, -40));
    R(5, 9, 8, 10, OUT);
    P(6, 9, AC);
    R(3, 8, 3, 11, A);
    R(10, 8, 10, 11, A);
    P(3, 12, shade(A, -30));
    P(10, 12, shade(A, -30));
    R(4, 13 + ly, 5, 15 + ly, shade(A, -25));
    R(8, 13 + ly, 9, 15 + ly, shade(A, -25));
    R(4, 16 + ly, 5, 16 + ly, '#11121f');
    R(8, 16 + ly, 9, 16 + ly, '#11121f');
  } else if (sp.name === 'ALIEN') {
    P(5, 1, A);
    P(5, 0, AC);
    P(8, 1, A);
    P(8, 0, AC);
    R(3, 2, 10, 7, A);
    if (style === 'One eye') {
      R(6, 4, 7, 5, DARK);
      P(6, 4, AC);
    }
    if (style === 'Two eyes') {
      R(4, 4, 5, 5, DARK);
      R(8, 4, 9, 5, DARK);
      P(4, 4, AC);
      P(8, 4, AC);
    }
    if (style === 'Three eyes') {
      P(4, 4, DARK);
      P(6, 4, DARK);
      P(9, 4, DARK);
      P(4, 4, AC === DARK ? '#fff' : AC);
      P(4, 4, DARK);
      P(6, 4, DARK);
      P(9, 4, DARK);
      P(4, 5, AC);
      P(6, 5, AC);
      P(9, 5, AC);
    }
    P(6, 6, DARK);
    P(7, 6, DARK);
    R(4, 8, 9, 11, OUT);
    R(4, 12, 9, 12, shade(OUT, -40));
    R(3, 8, 3, 11, OUT);
    R(10, 8, 10, 11, OUT);
    P(3, 12, A);
    P(10, 12, A);
    R(4, 13 + ly, 5, 15 + ly, shade(A, -30));
    R(8, 13 + ly, 9, 15 + ly, shade(A, -30));
    R(4, 16 + ly, 5, 16 + ly, '#11121f');
    R(8, 16 + ly, 9, 16 + ly, '#11121f');
  } else if (sp.name === 'SLIME') {
    headTop = 5;
    const squash = frame === 1;
    R(6, 4, 7, 4, A);
    R(5, 5, 8, 5, A);
    R(4, 6, 9, 6, A);
    if (squash) {
      R(3, 7, 10, 14, A);
      R(3, 15, 10, 15, A);
    } else {
      R(3, 7, 10, 15, A);
      R(4, 16, 9, 16, A);
    }
    P(4, 7, shade(A, 60));
    P(5, 6, shade(A, 60));
    R(4, 5, 9, 5, OUT);
    if (style === 'Happy') {
      P(5, 9, DARK);
      P(8, 9, DARK);
      P(6, 11, DARK);
      P(7, 11, DARK);
    }
    if (style === 'Sleepy') {
      R(4, 9, 5, 9, DARK);
      R(8, 9, 9, 9, DARK);
      P(6, 11, DARK);
      P(7, 11, DARK);
    }
    if (style === 'Star eyes') {
      P(5, 9, AC);
      P(8, 9, AC);
      P(5, 8, shade(AC, -40));
      P(8, 8, shade(AC, -40));
      P(6, 11, DARK);
      P(7, 11, DARK);
    }
    P(4, 13, AC);
    P(9, 10, AC);
    P(6, 14, AC);
  } else if (sp.name === 'GHOST') {
    headTop = 2;
    R(5, 1 + wy, 8, 1 + wy, A);
    R(4, 2 + wy, 9, 12 + wy, A);
    P(3, 4 + wy, A);
    P(10, 4 + wy, A);
    P(3, 8 + wy, shade(A, -25));
    P(10, 9 + wy, shade(A, -25));
    P(5, 5 + wy, DARK);
    P(8, 5 + wy, DARK);
    if (style === 'Smile') {
      P(6, 7 + wy, DARK);
      P(7, 7 + wy, DARK);
    }
    if (style === 'Wink') {
      R(4, 5 + wy, 5, 5 + wy, DARK);
      P(8, 5 + wy, DARK);
      P(6, 7 + wy, DARK);
      P(7, 7 + wy, DARK);
    }
    if (style === 'Boo') {
      R(5, 7 + wy, 8, 8 + wy, DARK);
      P(6, 8 + wy, '#eceef8');
      P(7, 8 + wy, '#eceef8');
    }
    P(3, 6 + wy, AC);
    P(10, 7 + wy, AC);
    R(5, 10 + wy, 8, 10 + wy, OUT);
    P(4, 13 + wy, A);
    P(5, 14 + wy, A);
    P(6, 15 + wy, A);
    P(7, 16 + wy, A);
    P(8, 15 + wy, A);
    P(9, 14 + wy, A);
    P(10, 13 + wy, A);
  } else if (sp.name === 'FROG') {
    R(4, 1, 5, 3, A);
    R(8, 1, 9, 3, A);
    P(4, 2, DARK);
    P(5, 2, DARK);
    P(8, 2, DARK);
    P(9, 2, DARK);
    P(4, 1, AC);
    P(9, 1, AC);
    R(4, 4, 9, 9, A);
    R(5, 7, 8, 9, AC);
    if (style === 'Spotted') {
      P(4, 5, AC);
      P(9, 6, AC);
      P(5, 8, AC);
    }
    if (style === 'Stripe') {
      R(6, 4, 7, 9, AC);
    }
    P(6, 6, DARK);
    P(7, 6, DARK);
    R(4, 10, 9, 12, OUT);
    R(4, 12, 9, 12, shade(OUT, -40));
    R(3, 10, 3, 12, OUT);
    R(10, 10, 10, 12, OUT);
    R(4, 13 + ly, 5, 15 + ly, A);
    R(8, 13 + ly, 9, 15 + ly, A);
    P(3, 14 + ly, shade(A, -30));
    P(10, 14 + ly, shade(A, -30));
    R(3, 15 + ly, 4, 15 + ly, shade(A, -45));
    R(9, 15 + ly, 10, 15 + ly, shade(A, -45));
  }

  const g = GEARS[chr.gear % GEARS.length];
  const hy = headTop;
  if (g === 'Headphones') {
    if (hy === 0) {
      R(4, 0, 9, 0, '#cfd3e8');
      P(3, 1, '#cfd3e8');
      P(10, 1, '#cfd3e8');
      R(3, 3, 3, 5, '#3a3f63');
      R(10, 3, 10, 5, '#3a3f63');
      P(3, 4, '#ff4d9d');
      P(10, 4, '#ff4d9d');
    } else if (hy === 5) {
      R(4, 3, 9, 3, '#cfd3e8');
      P(3, 4, '#cfd3e8');
      P(10, 4, '#cfd3e8');
      R(3, 8, 3, 10, '#3a3f63');
      R(10, 8, 10, 10, '#3a3f63');
      P(3, 9, '#ff4d9d');
      P(10, 9, '#ff4d9d');
    } else {
      R(4, 1, 9, 1, '#cfd3e8');
      P(3, 2, '#cfd3e8');
      P(10, 2, '#cfd3e8');
      R(3, 4, 3, 6, '#3a3f63');
      R(10, 4, 10, 6, '#3a3f63');
      P(3, 5, '#ff4d9d');
      P(10, 5, '#ff4d9d');
    }
  } else if (g === 'Mic') {
    P(11, 9, '#eceef8');
    R(11, 10, 11, 12, '#3a3f63');
  } else if (g === 'Guitar') {
    R(2, 11, 5, 13, '#c14a2e');
    P(3, 12, DARK);
    P(6, 10, '#8a5a2b');
    P(7, 10, '#8a5a2b');
    P(8, 9, '#8a5a2b');
    P(9, 9, '#8a5a2b');
    P(10, 8, '#eceef8');
  } else if (g === 'Keytar') {
    R(2, 10, 9, 11, '#8b6cff');
    for (let x = 2; x <= 9; x += 2) P(x, 11, '#ffffff');
  } else if (g === 'Drumsticks') {
    P(2, 10, '#d9a066');
    P(1, 9, '#d9a066');
    P(1, 8, '#eceef8');
    P(11, 10, '#d9a066');
    P(12, 9, '#d9a066');
    P(12, 8, '#eceef8');
  } else if (g === 'Boombox') {
    R(3, 10, 10, 13, '#3a3f63');
    R(4, 11, 5, 12, DARK);
    R(8, 11, 9, 12, DARK);
    P(4, 11, '#8b8fad');
    P(8, 11, '#8b8fad');
    P(6, 11, '#ff4d9d');
    P(7, 11, '#3ee6c2');
    R(5, 9, 8, 9, '#6a7086');
  }
}
