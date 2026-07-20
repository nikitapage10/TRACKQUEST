import { useState } from 'react';
import { PixelButton } from '../../components/widgets/PixelButton';
import { SpriteCanvas } from '../../components/widgets/SpriteCanvas';
import { speak } from '../../engine/coach/speak';
import { useStore } from '../../state/store';
import { UI } from '../../strings/ui';
import type { Stage } from '../../types';

type Phase = 'ask' | 'stage' | 'plan';

const STAGE_OPTS: { label: string; stage: Stage }[] = [
  { label: 'IDEA', stage: 0 },
  { label: 'HALF-BUILT', stage: 1 },
  { label: 'MIXING', stage: 2 },
  { label: 'NEARLY DONE', stage: 3 },
];

export default function Rescue() {
  const character = useStore((s) => s.character);
  const profile = useStore((s) => s.profile);
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [phase, setPhase] = useState<Phase>('ask');
  const [title, setTitle] = useState('');
  const [pickedStage, setPickedStage] = useState<Stage>(1);

  const scale = typeof window !== 'undefined' && window.innerWidth < 520 ? 9 : 11;

  const finishSkip = () => {
    completeOnboarding({ skipped: true });
  };

  const submitTitle = () => {
    const t = title.trim();
    if (!t) return;
    setTitle(t);
    setPhase('stage');
  };

  const pickStage = (stage: Stage) => {
    setPickedStage(stage);
    setPhase('plan');
  };

  const finishRescue = (acceptPlan: boolean) => {
    completeOnboarding({
      rescuedTitle: title.trim(),
      rescuedStage: pickedStage,
      skipped: false,
      acceptPlan,
    });
  };

  const planText = speak('rescue_offer', profile.voice, { song: title.trim() });

  return (
    <div
      className="screen"
      style={{
        background: 'rgba(8, 9, 18, 0.92)',
        minHeight: '100vh',
      }}
    >
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <SpriteCanvas character={character} scale={scale} />
        <div className="stage-floor" style={{ margin: '0 auto' }} />
      </div>

      {phase === 'ask' && (
        <>
          <div
            id="bubble"
            style={{
              position: 'relative',
              bottom: 'auto',
              left: 'auto',
              width: 'min(320px, 90vw)',
              marginBottom: 20,
            }}
          >
            {UI['rescue.ask']}
          </div>
          <input
            maxLength={40}
            placeholder="Song title…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ maxWidth: 360, marginBottom: 16 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitTitle();
            }}
          />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PixelButton onClick={submitTitle} disabled={!title.trim()}>
              THAT ONE
            </PixelButton>
            <PixelButton variant="ghost" onClick={finishSkip}>
              SKIP — START FRESH
            </PixelButton>
          </div>
        </>
      )}

      {phase === 'stage' && (
        <>
          <div
            id="bubble"
            style={{
              position: 'relative',
              bottom: 'auto',
              left: 'auto',
              width: 'min(320px, 90vw)',
              marginBottom: 20,
            }}
          >
            {UI['rescue.stage']}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {STAGE_OPTS.map((o) => (
              <PixelButton key={o.stage} onClick={() => pickStage(o.stage)}>
                {o.label}
              </PixelButton>
            ))}
          </div>
        </>
      )}

      {phase === 'plan' && (
        <>
          <div
            id="bubble"
            style={{
              position: 'relative',
              bottom: 'auto',
              left: 'auto',
              width: 'min(320px, 90vw)',
              marginBottom: 20,
            }}
          >
            {planText}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PixelButton onClick={() => finishRescue(true)}>BREAK IT DOWN</PixelButton>
            <PixelButton variant="ghost" onClick={() => finishRescue(false)}>
              LATER
            </PixelButton>
          </div>
        </>
      )}
    </div>
  );
}
