/**
 * Box Stack: pure game rules. Units are abstract: the play area is 100 units wide.
 * Functions marked 'worklet' also run on the UI thread inside the frame callback.
 */
import type { Perk } from '@/api/types';

export const STACK = {
  worldWidth: 100,
  baseWidth: 60,
  wideBaseWidth: 78,
  targetFloors: 30,
  perfectTolerance: 1.6,
  perfectGrowth: 3,
  minWidth: 0.5,
  baseSpeed: 45,
  speedPerFloor: 2.2,
  maxSpeed: 110,
  slowFactor: 0.8,
} as const;

export type Block = { id: number; x: number; width: number; perfect: boolean };

export type StackState = {
  blocks: Block[];
  floors: number;
  perfects: number;
  streak: number;
  startWidth: number;
  status: 'playing' | 'won' | 'lost';
};

export type Mover = { x: number; dir: 1 | -1; width: number };

export type PlaceResult =
  | { kind: 'perfect'; placed: Block }
  | { kind: 'trim'; placed: Block; debris: { x: number; width: number } }
  | { kind: 'miss'; debris: { x: number; width: number } };

export function createStack(perks: readonly Perk[]): StackState {
  const width = perks.includes('wide_start') ? STACK.wideBaseWidth : STACK.baseWidth;
  return {
    blocks: [{ id: 0, x: (STACK.worldWidth - width) / 2, width, perfect: false }],
    floors: 0,
    perfects: 0,
    streak: 0,
    startWidth: width,
    status: 'playing',
  };
}

export function topBlock(state: StackState): Block {
  return state.blocks[state.blocks.length - 1]!;
}

export function speedFor(floors: number, slowMotion: boolean): number {
  const speed = Math.min(STACK.maxSpeed, STACK.baseSpeed + STACK.speedPerFloor * floors);
  return slowMotion ? speed * STACK.slowFactor : speed;
}

/** New blocks enter from the edge farthest from the block below, so every drop needs travel time. */
export function spawnMover(state: StackState): Mover {
  const top = topBlock(state);
  const centre = top.x + top.width / 2;
  if (centre < STACK.worldWidth / 2) {
    return { x: STACK.worldWidth - top.width, dir: -1, width: top.width };
  }
  return { x: 0, dir: 1, width: top.width };
}

/** Advances the moving block, bouncing off both walls. */
export function stepMover(x: number, dir: number, width: number, speed: number, dtSeconds: number): { x: number; dir: number } {
  'worklet';
  const max = STACK.worldWidth - width;
  let nx = x + dir * speed * dtSeconds;
  let ndir = dir;
  // Loop handles very long frames (e.g. after a hitch) without escaping the area.
  for (let i = 0; i < 4 && (nx < 0 || nx > max); i += 1) {
    if (nx > max) {
      nx = max - (nx - max);
      ndir = -1;
    } else if (nx < 0) {
      nx = -nx;
      ndir = 1;
    }
  }
  return { x: Math.min(Math.max(nx, 0), Math.max(max, 0)), dir: ndir };
}

/** Drops the moving block at x and returns the new state plus what happened. */
export function placeBlock(state: StackState, x: number, width: number): { state: StackState; result: PlaceResult } {
  if (state.status !== 'playing') {
    return { state, result: { kind: 'miss', debris: { x, width } } };
  }
  const below = topBlock(state);
  const id = state.blocks.length;
  const offset = x - below.x;

  if (Math.abs(offset) <= STACK.perfectTolerance) {
    const grown = Math.min(state.startWidth, below.width + STACK.perfectGrowth);
    const placed: Block = { id, x: below.x - (grown - below.width) / 2, width: grown, perfect: true };
    placed.x = Math.min(Math.max(placed.x, 0), STACK.worldWidth - placed.width);
    return advance(state, placed, { kind: 'perfect', placed }, true);
  }

  const left = Math.max(x, below.x);
  const right = Math.min(x + width, below.x + below.width);
  const overlap = right - left;

  if (overlap < STACK.minWidth) {
    return {
      state: { ...state, status: 'lost', streak: 0 },
      result: { kind: 'miss', debris: { x, width } },
    };
  }

  const placed: Block = { id, x: left, width: overlap, perfect: false };
  const debris = offset > 0 ? { x: right, width: x + width - right } : { x, width: left - x };
  return advance(state, placed, { kind: 'trim', placed, debris }, false);
}

function advance(state: StackState, placed: Block, result: PlaceResult, perfect: boolean): { state: StackState; result: PlaceResult } {
  const floors = state.floors + 1;
  return {
    state: {
      ...state,
      blocks: [...state.blocks, placed],
      floors,
      perfects: state.perfects + (perfect ? 1 : 0),
      streak: perfect ? state.streak + 1 : 0,
      status: floors >= STACK.targetFloors ? 'won' : 'playing',
    },
    result,
  };
}

/** Score submitted to the server: floors placed. */
export function stackScore(state: StackState): number {
  return state.floors;
}

/** Colour of a floor: a smooth hue walk so the tower reads as one piece. */
export function floorColor(index: number): string {
  const hue = (38 + index * 9) % 360;
  return `hsl(${hue}, 85%, ${index % 2 === 0 ? 62 : 56}%)`;
}
