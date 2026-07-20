import type { Genre } from '../types';

export const COMPANION_NAMES = [
  'BLIP', 'ECHO', 'SUB', 'REVERB', 'TAPE', 'PATCH', 'WUB', 'FUZZ', 'MONO', 'DECAY',
  'CHIRP', 'GATE', 'LOOP', 'PING', 'RIFF', 'HISS', 'DOT', 'VOLT', 'NUDGE', 'CLICK',
] as const;

const LISTS: Record<Genre, { adj: string[]; noun: string[] }> = {
  Electronic: {
    adj: ['Neon', 'Voltage', 'Null', 'Analog', 'Midnight', 'Hyper', 'Static', 'Chrome', 'Phase', 'Acid', 'Vapor', 'Prism'],
    noun: ['Saint', 'Signal', 'Circuit', 'Bloom', 'Motor', 'Index', 'Tide', 'Arcade', 'Pulse', 'Ghost', 'District', 'Halo'],
  },
  Indie: {
    adj: ['Peach', 'Glass', 'Paper', 'Velvet', 'Sunday', 'Hollow', 'Wilted', 'Copper', 'Quiet', 'Bedroom', 'Foggy', 'Honest'],
    noun: ['Static', 'Porch', 'Diary', 'Antler', 'Sweater', 'Lantern', 'Orchard', 'Motel', 'Postcard', 'Comet', 'Garden', 'Cassette'],
  },
  Rock: {
    adj: ['Rust', 'Cracked', 'Loud', 'Broken', 'Smoke', 'Iron', 'Gritty', 'Wild', 'Faded', 'Amp', 'Crowded', 'Raw'],
    noun: ['Riff', 'Garage', 'Crown', 'Ash', 'Motor', 'Stage', 'Wolf', 'Brick', 'Thunder', 'Knife', 'Anchor', 'Riot'],
  },
  'Hip-hop': {
    adj: ['Gold', 'Cold', 'Night', 'Concrete', 'Smoke', 'Silk', 'Low', 'Hazy', 'Boom', 'Cipher', 'Velvet', 'Street'],
    noun: ['Cipher', 'Crown', 'Block', 'Tape', 'King', 'Mirror', 'Zone', 'Flow', 'Pocket', 'Dusk', 'Vault', 'Signal'],
  },
  Pop: {
    adj: ['Candy', 'Sugar', 'Bright', 'Gloss', 'Summer', 'Cherry', 'Sparkle', 'Radio', 'Honey', 'Crystal', 'Bubble', 'Star'],
    noun: ['Crush', 'Hook', 'Heart', 'Wave', 'Mirror', 'Kiss', 'Fever', 'Dance', 'Glow', 'Dream', 'Flash', 'Sky'],
  },
  Other: {
    adj: ['Strange', 'Hidden', 'Soft', 'Odd', 'Quiet', 'Drift', 'Moon', 'Ashen', 'Tiny', 'Wild', 'Pale', 'Secret'],
    noun: ['Machine', 'Room', 'Atlas', 'Harbor', 'Seed', 'Echo', 'Orbit', 'Sketch', 'Field', 'Lantern', 'River', 'Map'],
  },
};

const used = new Map<Genre, Set<string>>();

export function rollArtistName(genre: Genre): string {
  const { adj, noun } = LISTS[genre];
  const pool = used.get(genre) ?? new Set<string>();
  used.set(genre, pool);
  if (pool.size >= adj.length * noun.length) pool.clear();
  for (let i = 0; i < 200; i++) {
    const a = adj[Math.floor(Math.random() * adj.length)];
    const n = noun[Math.floor(Math.random() * noun.length)];
    const name = `${a} ${n}`.toUpperCase().slice(0, 16);
    if (!pool.has(name)) {
      pool.add(name);
      return name;
    }
  }
  return `${adj[0]} ${noun[0]}`.toUpperCase();
}

export function rollCompanionName(exclude?: string): string {
  const pool = COMPANION_NAMES.filter((n) => n !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}
