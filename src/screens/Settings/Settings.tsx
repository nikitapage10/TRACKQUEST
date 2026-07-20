import { useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { DAY_MS } from '../../config';
import { exportBundle, importBundle } from '../../state/persistence';
import { extractRoot, useStore } from '../../state/store';
import { PixelButton } from '../../components/widgets/PixelButton';
import { IDLE_QUIPS } from '../../strings/coach';
import { UI } from '../../strings/ui';
import type { Schedule, Voice } from '../../types';

const VOICES: { id: Voice; label: string; sub: string }[] = [
  { id: 'hype', label: UI['q4.hype'], sub: UI['q4.hype.sub'] },
  { id: 'real', label: UI['q4.real'], sub: UI['q4.real.sub'] },
  { id: 'drill', label: UI['q4.drill'], sub: UI['q4.drill.sub'] },
  { id: 'facts', label: UI['q4.facts'], sub: UI['q4.facts.sub'] },
];

const SCHEDULES: { id: Schedule; label: string; sub: string }[] = [
  { id: 'weeknights', label: UI['q5.weeknights'], sub: UI['q5.weeknights.sub'] },
  { id: 'weekends', label: UI['q5.weekends'], sub: UI['q5.weekends.sub'] },
  { id: 'stolen', label: UI['q5.stolen'], sub: UI['q5.stolen.sub'] },
  { id: 'chaos', label: UI['q5.chaos'], sub: UI['q5.chaos.sub'] },
];

const DEMO_CADENCE = [
  { days: 0, label: 'Off' },
  { days: 30, label: 'Monthly (30d)' },
  { days: 42, label: '6 weeks (42d)' },
] as const;

function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: '2px solid var(--line)',
        background: on ? 'var(--mint)' : 'var(--panel2)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 22 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: on ? 'var(--bg)' : 'var(--muted)',
          transition: 'left .15s',
        }}
      />
    </button>
  );
}

function formatMutedUntil(ts?: number): string {
  if (!ts || ts <= Date.now()) return '';
  const left = ts - Date.now();
  const days = Math.ceil(left / DAY_MS);
  return `muted ${days}d left`;
}

export function Settings() {
  const setView = useStore((s) => s.setView);
  const settings = useStore((s) => s.settings);
  const character = useStore((s) => s.character);
  const coach = useStore((s) => s.coach);
  const updateSettings = useStore((s) => s.updateSettings);
  const setCharacter = useStore((s) => s.setCharacter);
  const muteCoachWeek = useStore((s) => s.muteCoachWeek);
  const eraseAll = useStore((s) => s.eraseAll);
  const replaceState = useStore((s) => s.replaceState);
  const pushToast = useStore((s) => s.pushToast);

  const [eraseInput, setEraseInput] = useState('');
  const [voiceSample, setVoiceSample] = useState('');
  const [exporting, setExporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const mutedLabel = formatMutedUntil(coach.mutedUntil);
  const isMuted = !!coach.mutedUntil && coach.mutedUntil > Date.now();

  const pickVoice = (voice: Voice) => {
    updateSettings({ voice });
    const pool = IDLE_QUIPS[voice];
    setVoiceSample(pool[Math.floor(Math.random() * pool.length)]);
  };

  const onNotifications = async (enabled: boolean) => {
    updateSettings({ notificationsEnabled: enabled });
    if (enabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const blob = await exportBundle(extractRoot(useStore.getState()));
      const stamp = new Date().toISOString().slice(0, 10);
      saveAs(blob, `trackquest-${stamp}.zip`);
      pushToast('EXPORT READY', 'gold');
    } catch {
      pushToast('EXPORT FAILED', 'pink');
    } finally {
      setExporting(false);
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const root = await importBundle(file);
      replaceState(root);
      pushToast('IMPORT COMPLETE', 'gold');
    } catch {
      pushToast('IMPORT FAILED', 'pink');
    }
    if (importRef.current) importRef.current.value = '';
  };

  const onErase = async () => {
    if (eraseInput !== 'DELETE') return;
    await eraseAll();
    setEraseInput('');
    pushToast('ALL DATA ERASED', 'pink');
  };

  const editCompanion = () => {
    useStore.setState({ editingCreator: true });
    setView('creator-edit');
  };

  return (
    <div style={{ padding: '20px 18px 120px', maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <PixelButton variant="ghost" onClick={() => setView('board')}>
          ← BACK
        </PixelButton>
        <h2 className="pxhead" style={{ fontSize: 12 }}>
          SETTINGS
        </h2>
      </div>

      <div className="settings-group">
        <h3>COMPANION</h3>
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>Voice</span>
          <div className="opts" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {VOICES.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`opt${settings.voice === v.id ? ' on' : ''}`}
                onClick={() => pickVoice(v.id)}
              >
                {v.label}
                <small>{v.sub}</small>
              </button>
            ))}
          </div>
          {voiceSample && (
            <p style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>"{voiceSample}"</p>
          )}
        </div>
        <div className="settings-row">
          <span>Companion name</span>
          <input
            type="text"
            value={character.companionName}
            maxLength={12}
            onChange={(e) => setCharacter({ companionName: e.target.value.toUpperCase().slice(0, 12) })}
            style={{ maxWidth: 140, fontFamily: 'var(--pixel)', fontSize: 9 }}
          />
        </div>
        <div className="settings-row">
          <div>
            <span>Mute coach for a week</span>
            {isMuted && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{mutedLabel}</div>
            )}
          </div>
          <PixelButton variant="ghost" onClick={() => muteCoachWeek()} disabled={isMuted}>
            {isMuted ? 'MUTED' : 'MUTE 7D'}
          </PixelButton>
        </div>
        <PixelButton variant="gold" onClick={editCompanion} style={{ marginTop: 12, width: '100%' }}>
          EDIT COMPANION
        </PixelButton>
      </div>

      <div className="settings-group">
        <h3>SESSIONS</h3>
        <div className="settings-row">
          <span>Walk-away bell</span>
          <Toggle
            label="Walk-away bell"
            on={settings.walkAwayEnabled}
            onChange={(v) => updateSettings({ walkAwayEnabled: v })}
          />
        </div>
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Minutes until bell</span>
            <span style={{ fontFamily: 'var(--pixel)', fontSize: 9, color: 'var(--gold)' }}>
              {settings.walkAwayMinutes}m
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={90}
            step={5}
            value={settings.walkAwayMinutes}
            disabled={!settings.walkAwayEnabled}
            onChange={(e) => updateSettings({ walkAwayMinutes: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>RHYTHM</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {SCHEDULES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`opt${settings.schedule === s.id ? ' on' : ''}`}
              style={{ textAlign: 'left' }}
              onClick={() => updateSettings({ schedule: s.id })}
            >
              {s.label}
              <small>{s.sub}</small>
            </button>
          ))}
        </div>
        <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <span>Demo day cadence</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {DEMO_CADENCE.map((c) => (
              <button
                key={c.days}
                type="button"
                className={`tag${settings.demoDayCadenceDays === c.days ? ' play' : ''}`}
                style={{ cursor: 'pointer', padding: '6px 10px' }}
                onClick={() => updateSettings({ demoDayCadenceDays: c.days })}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <span>Notifications (streak & demo day)</span>
          <Toggle
            label="Notifications"
            on={settings.notificationsEnabled}
            onChange={onNotifications}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>APPEARANCE</h3>
        <div className="settings-row">
          <span>Default view</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['board', 'studio'] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`tag${settings.defaultView === v ? ' play' : ''}`}
                style={{ cursor: 'pointer', padding: '6px 10px', textTransform: 'uppercase' }}
                onClick={() => updateSettings({ defaultView: v })}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-row">
          <span>Reduced celebrations</span>
          <Toggle
            label="Reduced celebrations"
            on={settings.reducedCelebrations}
            onChange={(v) => updateSettings({ reducedCelebrations: v })}
          />
        </div>
      </div>

      <div className="settings-group">
        <h3>DATA</h3>
        <div className="settings-row">
          <span>Export backup (.zip)</span>
          <PixelButton variant="mint" onClick={() => void onExport()} disabled={exporting}>
            {exporting ? '…' : 'EXPORT'}
          </PixelButton>
        </div>
        <div className="settings-row">
          <span>Import backup</span>
          <label style={{ cursor: 'pointer' }}>
            <PixelButton variant="ghost" type="button" onClick={() => importRef.current?.click()}>
              CHOOSE FILE
            </PixelButton>
            <input
              ref={importRef}
              type="file"
              accept=".zip,application/zip"
              style={{ display: 'none' }}
              onChange={(e) => void onImport(e.target.files?.[0])}
            />
          </label>
        </div>
        <div style={{ marginTop: 16, padding: 12, border: '2px solid var(--pink)', borderRadius: 6 }}>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
            Erase everything on this device. Type DELETE to confirm.
          </p>
          <input
            type="text"
            placeholder="DELETE"
            value={eraseInput}
            onChange={(e) => setEraseInput(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          <PixelButton
            variant="pink"
            disabled={eraseInput !== 'DELETE'}
            onClick={() => void onErase()}
            style={{ width: '100%' }}
          >
            ERASE ALL DATA
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
