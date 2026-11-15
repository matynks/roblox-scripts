import { useEffect, useRef } from 'react';

import type { GameEvent } from './engines/common';
import { haptic } from '@/ui/haptics';

/** requestAnimationFrame loop delivering dt (seconds) while `running` is true. */
export function useGameLoop(running: boolean, tick: (dt: number) => void) {
  const cb = useRef(tick);
  cb.current = tick;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = 0;
    const frame = (ts: number) => {
      const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
      last = ts;
      if (dt > 0) cb.current(dt);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

export function feedback(events: GameEvent[]) {
  for (const e of events) {
    if (e === 'hit' || e === 'place' || e === 'collect' || e === 'mismatch') haptic.light();
    else if (e === 'perfect' || e === 'match' || e === 'golden') haptic.success();
    else if (e === 'combo') haptic.medium();
    else if (e === 'bomb' || e === 'gameover') haptic.error();
    else if (e === 'miss') haptic.warning();
  }
}

export interface EngineViewProps {
  config: Record<string, any>;
  perks: Record<string, number>;
  running: boolean;
  seed: number;
  onScore: (score: number) => void;
  onOver: (score: number, stats: Record<string, unknown>) => void;
}
