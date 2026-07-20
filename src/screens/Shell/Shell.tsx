import { useStore } from '../../state/store';
import { level, xpIntoLevel, xpForNextLevel } from '../../engine/xp';
import { PixelButton } from '../../components/widgets/PixelButton';

export function Shell({ children }: { children: React.ReactNode }) {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const xp = useStore((s) => s.xp.total);
  const streak = useStore((s) => s.streak.current);
  const setCaptureOpen = useStore((s) => s.setCaptureOpen);
  const activeSessionId = useStore((s) => s.activeSessionId);

  const lv = level(xp);
  const into = xpIntoLevel(xp);
  const need = xpForNextLevel(lv);
  const pct = Math.min(100, (into / need) * 100);

  return (
    <div id="app" className="active">
      <div className="topbar">
        <span
          className="mini-logo"
          onClick={() => setView(useStore.getState().settings.defaultView)}
        >
          TRACK<span className="q">QUEST</span>
        </span>
        <div className="view-tabs">
          <button
            className={view === 'board' ? 'on' : ''}
            onClick={() => setView('board')}
          >
            BOARD
          </button>
          <button
            className={view === 'studio' ? 'on' : ''}
            onClick={() => setView('studio')}
          >
            STUDIO
          </button>
        </div>
        <button className="streak-btn" onClick={() => setView('calendar')} title="Calendar">
          🔥 {streak}
        </button>
        <div className="xpwrap" onClick={() => setView('trophy')}>
          <span className="lv">LV {lv}</span>
          <div className="xpbar">
            <div className="xpfill" style={{ width: `${pct}%` }} />
          </div>
          <span className="xpnum">{into}/{need} XP</span>
        </div>
        <button className="icon-btn" onClick={() => setCaptureOpen(true)} title="Capture">
          +
        </button>
        <button className="icon-btn" onClick={() => setView('settings')} title="Settings">
          ⚙
        </button>
        {activeSessionId && (
          <PixelButton variant="pink" onClick={() => setView('focus')} style={{ padding: '8px 10px', fontSize: 8 }}>
            SESSION
          </PixelButton>
        )}
      </div>
      {children}
    </div>
  );
}
