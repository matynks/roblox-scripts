/**
 * Hidden Modify Menu access sequence:
 *   tap the build number TAP_COUNT times within TAP_WINDOW_MS,
 *   then long-press the logo within LONG_PRESS_WINDOW_MS.
 *
 * This only decides whether to ASK the server. Access is granted solely by the
 * server-side developer role (dev_whoami); the sequence is not a security control.
 */
export const TAP_COUNT = 7;
export const TAP_WINDOW_MS = 4000;
export const LONG_PRESS_WINDOW_MS = 6000;

export type SequenceState = {
  taps: number[];
  armedAt: number | null;
};

export const initialSequenceState: SequenceState = { taps: [], armedAt: null };

export function registerTap(state: SequenceState, now: number): { state: SequenceState; armed: boolean } {
  const taps = [...state.taps.filter((t) => now - t <= TAP_WINDOW_MS), now];
  if (taps.length >= TAP_COUNT) {
    return { state: { taps: [], armedAt: now }, armed: true };
  }
  return { state: { taps, armedAt: state.armedAt }, armed: false };
}

export function registerLongPress(state: SequenceState, now: number): { state: SequenceState; triggered: boolean } {
  const triggered = state.armedAt !== null && now - state.armedAt <= LONG_PRESS_WINDOW_MS;
  return { state: initialSequenceState, triggered };
}
