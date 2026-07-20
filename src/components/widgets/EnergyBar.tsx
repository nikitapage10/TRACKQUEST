import { energyColor, songEnergy } from '../../engine/energy';
import type { Song } from '../../types';

export function EnergyBar({ song, now = Date.now() }: { song: Song; now?: number }) {
  if (song.status !== 'active' || song.stage >= 4) return null;
  const e = songEnergy(song, now);
  return (
    <div className="energy" title={`Energy ${Math.round(e * 100)}%`}>
      <div
        className="energyfill"
        style={{ width: `${Math.max(e * 100, e === 0 ? 100 : 2)}%`, background: energyColor(e) }}
      />
    </div>
  );
}
