import { BoxStackGame } from './box-stack/BoxStackGame';
import { STACK } from './box-stack/logic';
import { LaneDashGame } from './lane-dash/LaneDashGame';
import { DASH } from './lane-dash/logic';
import type { GameDefinition } from './types';

/**
 * Every playable experience the app can run. To add a game: implement GameProps,
 * add an entry here, and add a matching `experiences` row (status 'playable').
 */
export const GAMES: Record<string, GameDefinition> = {
  'box-stack': {
    slug: 'box-stack',
    component: BoxStackGame,
    scoreLabel: 'Floors',
    target: STACK.targetFloors,
    targetLabel: `Reach ${STACK.targetFloors} floors to win`,
    perkDescriptions: {
      double_coins: 'Double Coins: rewards x2',
      wide_start: 'Wide Base: 30% wider first box',
      slow_motion: 'Steady Hands: boxes 20% slower',
    },
  },
  'lane-dash': {
    slug: 'lane-dash',
    component: LaneDashGame,
    scoreLabel: 'Points',
    target: null,
    targetLabel: `Reach the ${DASH.finish.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} m finish line to win`,
    perkDescriptions: {
      double_coins: 'Double Coins: rewards x2',
      extra_life: 'Second Wind: survive one crash',
      coin_magnet: 'Coin Magnet: grab coins in nearby lanes',
    },
  },
};

export function getGame(slug: string): GameDefinition | undefined {
  return GAMES[slug];
}

export function isGameImplemented(slug: string): boolean {
  return slug in GAMES;
}
