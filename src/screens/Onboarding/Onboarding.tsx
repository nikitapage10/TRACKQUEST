import { useState } from 'react';
import Creator from './Creator';
import Egg from './Egg';
import Rescue from './Rescue';
import Signal from './Signal';

type Scene = 'signal' | 'egg' | 'creator' | 'rescue';

export default function Onboarding() {
  const [scene, setScene] = useState<Scene>('signal');

  return (
    <>
      {scene === 'signal' && <Signal onDone={() => setScene('egg')} />}
      {scene === 'egg' && <Egg onDone={() => setScene('creator')} />}
      {scene === 'creator' && <Creator onDone={() => setScene('rescue')} />}
      {scene === 'rescue' && <Rescue />}
    </>
  );
}
