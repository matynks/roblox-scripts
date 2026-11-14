import type { ComponentType } from 'react';

import type { Perk } from '@/api/types';

export type GameOutcome = 'win' | 'loss';

export type GameFinish = {
  score: number;
  outcome: GameOutcome;
  /** Short human summary, e.g. "Missed on floor 12". */
  summary: string;
};

/** Contract every BloxyBox mini-game implements. */
export type GameProps = {
  seed: number;
  perks: readonly Perk[];
  paused: boolean;
  reduceMotion: boolean;
  onScore: (score: number) => void;
  onFinish: (result: GameFinish) => void;
};

export type GameDefinition = {
  slug: string;
  component: ComponentType<GameProps>;
  /** Label for the HUD score, e.g. "Floors". */
  scoreLabel: string;
  /** Target shown in the HUD, e.g. 30 floors. */
  target: number | null;
  targetLabel: string;
  perkDescriptions: Partial<Record<Perk, string>>;
};
