import { useEffect } from 'react';
import { useStore } from './state/store';
import Onboarding from './screens/Onboarding/Onboarding';
import { Shell } from './screens/Shell/Shell';
import { Board } from './screens/Board/Board';
import { Studio } from './screens/Studio/Studio';
import { SongDetail } from './screens/SongDetail/SongDetail';
import { FocusSession } from './screens/FocusSession/FocusSession';
import { Calendar } from './screens/Calendar/Calendar';
import { Trophy } from './screens/Trophy/Trophy';
import { Settings } from './screens/Settings/Settings';
import Creator from './screens/Onboarding/Creator';
import { QuickCapture } from './components/widgets/QuickCapture';
import { Companion, BubbleDismissOverlay } from './components/Companion/Companion';
import { Toasts, ConfettiLayer } from './components/Celebrations/Celebrations';
import { COACH_EVAL_INTERVAL_MS } from './config';

function Boot() {
  return (
    <div className="boot">
      <div className="eq">
        <span /><span /><span />
      </div>
    </div>
  );
}

export default function App() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useStore((s) => s.hydrated);
  const completed = useStore((s) => s.onboarding.completed);
  const view = useStore((s) => s.view);
  const editingCreator = useStore((s) => s.editingCreator);
  const evalCoach = useStore((s) => s.evalCoach);
  const setView = useStore((s) => s.setView);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!completed) return;
    const id = setInterval(() => evalCoach(), COACH_EVAL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [completed, evalCoach]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => useStore.setState({ reducedMotion: mq.matches });
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  if (!hydrated) return <Boot />;

  if (!completed) {
    return (
      <>
        <Onboarding />
        <Toasts />
        <ConfettiLayer />
      </>
    );
  }

  if (editingCreator || view === 'creator-edit') {
    return (
      <>
        <Creator
          onDone={() => {
            useStore.setState({ editingCreator: false });
            setView('settings');
          }}
        />
        <Toasts />
      </>
    );
  }

  let body: React.ReactNode = null;
  if (view === 'studio') body = <Studio />;
  else if (view === 'calendar') body = <Calendar />;
  else if (view === 'trophy') body = <Trophy />;
  else if (view === 'settings') body = <Settings />;
  else if (view === 'focus') body = <FocusSession />;
  else body = <Board />;

  return (
    <>
      <Shell>
        {body}
      </Shell>
      <SongDetail />
      <QuickCapture />
      <Companion />
      <BubbleDismissOverlay />
      <Toasts />
      <ConfettiLayer />
    </>
  );
}
