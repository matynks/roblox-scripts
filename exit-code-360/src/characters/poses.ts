import { clamp, lerp } from "../lib/anim";
import { NEUTRAL_FACE, STAND, type Face, type Pose } from "./types";

const TAU = Math.PI * 2;

export const blendPose = (a: Pose, b: Partial<Pose>, t: number): Pose => {
  const out = { ...a };
  (Object.keys(b) as (keyof Pose)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k] as number, clamp(t));
  });
  return out;
};

/** Natural walk. phase in cycles (1.0 = two steps). amt scales the stride. */
export const walk = (phase: number, amt = 1, mood: "calm" | "brisk" | "sulk" = "calm"): Pose => {
  const p = phase * TAU;
  const stride = (mood === "brisk" ? 28 : mood === "sulk" ? 18 : 24) * amt;
  const thighN = stride * Math.sin(p);
  const thighF = stride * Math.sin(p + Math.PI);
  // knee flexes while the leg swings forward (cos > 0) and slightly on contact
  const knee = (s: number) => {
    const swing = Math.max(0, Math.cos(s));
    return amt * (6 + 44 * Math.pow(swing, 1.6));
  };
  const kN = knee(p);
  const kF = knee(p + Math.PI);
  const armAmp = (mood === "sulk" ? 6 : mood === "brisk" ? 22 : 16) * amt;
  // toe up at heel strike, toe down at push-off
  const foot = (s: number) => amt * (12 * Math.sin(s + 0.6) * (Math.sin(s) > 0 ? 1 : 0.4));
  return {
    ...STAND,
    lean: (mood === "brisk" ? 5 : mood === "sulk" ? 7 : 2.5) * amt,
    headTilt: (mood === "sulk" ? 6 : 0) + 1.2 * Math.sin(p * 2) * amt,
    shN: -armAmp * Math.sin(p) + 2,
    elN: 14 + 8 * Math.max(0, -Math.sin(p)) * amt,
    shF: -armAmp * Math.sin(p + Math.PI) + 2,
    elF: 14 + 8 * Math.max(0, -Math.sin(p + Math.PI)) * amt,
    hipN: thighN,
    knN: kN,
    hipF: thighF,
    knF: kF,
    footN: foot(p),
    footF: foot(p + Math.PI),
    bob: 0.025 * amt * Math.abs(Math.sin(p * 1)) - 0.012 * amt,
  };
};

/** Run cycle. phase in cycles. */
export const run = (phase: number, amt = 1): Pose => {
  const p = phase * TAU;
  const s = Math.sin(p);
  return {
    ...STAND,
    lean: 14 * amt,
    headTilt: -4 * amt,
    shN: -42 * s * amt + 8,
    elN: 70 + 15 * s,
    shF: 42 * s * amt + 8,
    elF: 70 - 15 * s,
    hipN: 44 * s * amt + 6,
    knN: amt * (24 + 84 * Math.max(0, Math.cos(p - 0.6))),
    hipF: -44 * s * amt + 6,
    knF: amt * (24 + 84 * Math.max(0, -Math.cos(p - 0.6))),
    footN: 10 * s,
    footF: -10 * s,
    bob: 0.06 * amt * Math.abs(s),
  };
};

/** Gentle idle breathing / sway on top of any pose. */
export const breathe = (pose: Pose, t: number, amt = 1): Pose => ({
  ...pose,
  lean: pose.lean + Math.sin(t * 1.7) * 0.8 * amt,
  headTilt: pose.headTilt + Math.sin(t * 1.1 + 1) * 1.2 * amt,
  shN: pose.shN + Math.sin(t * 1.7 + 0.4) * 1.5 * amt,
  shF: pose.shF + Math.sin(t * 1.7 + 0.9) * 1.5 * amt,
});

// ---- acting poses (side / 3-4 view) --------------------------------------
export const POSES = {
  stand: STAND,
  standProud: { ...STAND, lean: -2, headTilt: -4, shN: 10, elN: 6, shF: -10, elF: 6 } as Pose,
  crouch: { ...STAND, lean: 10, hipN: 34, knN: 62, hipF: 20, knF: 58, shN: 18, elN: 30, shF: 6, elF: 30 } as Pose,
  armsUp: { ...STAND, shN: 160, elN: 10, shF: 150, elF: 12, headTilt: -6 } as Pose,
  scare: { ...STAND, lean: 6, shN: 140, elN: 40, shF: 128, elF: 45, hipN: 18, knN: 22, hipF: -14, knF: 10 } as Pose,
  shrug: { ...STAND, shN: 22, elN: 108, shF: -22, elF: -96, headTilt: 8 } as Pose,
  palmsOut: { ...STAND, shN: 38, elN: 70, shF: 30, elF: 74, headTilt: -6 } as Pose,
  point: { ...STAND, lean: 4, shN: 88, elN: 4, shF: -6, elF: 12 } as Pose,
  holdHigh: { ...STAND, shN: 158, elN: 12, shF: -8, elF: 12, headTilt: -2, lean: -3 } as Pose,
  holdFront: { ...STAND, shN: 28, elN: 74, shF: -6, elF: 12 } as Pose,
  dancer: { ...STAND, lean: -6, headTilt: -12, shN: 172, elN: 62, shF: -98, elF: 18, hipN: 26, knN: -4, hipF: -4, knF: 8, footN: -38, footF: 0 } as Pose,
  handsOnHips: { ...STAND, shN: 22, elN: -118, shF: -22, elF: 118 } as Pose,
  slump: { ...STAND, lean: 9, headTilt: 12, shN: 2, elN: 4, shF: -2, elF: 4 } as Pose,
  sit: { ...STAND, hipN: 88, knN: 88, hipF: 84, knF: 84, footN: 0, footF: 0, shN: 30, elN: 40, shF: 24, elF: 40 } as Pose,
  cheer: { ...STAND, shN: 155, elN: -25, shF: 205, elF: 25, headTilt: -8 } as Pose,
  // front-view poses (turn = 0): angles are screen-plane, near = screen right
  frontStand: { ...STAND, shN: 8, elN: 6, shF: -8, elF: -6, hipN: 4, knN: 0, hipF: -4, knF: 0, footN: 0, footF: 180 } as Pose,
  frontShrug: { ...STAND, shN: 30, elN: 78, shF: -30, elF: -78, hipN: 5, knN: 0, hipF: -5, knF: 0, footF: 180, headTilt: 7 } as Pose,
  frontArmsOut: { ...STAND, shN: 110, elN: -10, shF: -110, elF: 10, hipN: 12, knN: 0, hipF: -12, knF: 0, footF: 180 } as Pose,
} satisfies Record<string, Pose>;

// ---- expressions ----------------------------------------------------------
export const FACES = {
  neutral: { ...NEUTRAL_FACE, mouth: "flat" } as Face,
  content: { ...NEUTRAL_FACE, mouth: "smile", curve: 0.35 } as Face,
  happy: { ...NEUTRAL_FACE, mouth: "smile", curve: 0.6, eye: "dot" } as Face,
  laugh: { ...NEUTRAL_FACE, eye: "happy", mouth: "grin", open: 0.6 } as Face,
  calm: { ...NEUTRAL_FACE, eye: "closed", mouth: "smile", curve: 0.4 } as Face,
  smug: { ...NEUTRAL_FACE, eye: "lid", mouth: "smirk", brow: -0.2, browShow: 1, browY: 0.1 } as Face,
  worried: { ...NEUTRAL_FACE, mouth: "flat", brow: 0.9, browShow: 1, browY: 0.2 } as Face,
  sad: { ...NEUTRAL_FACE, mouth: "smile", curve: -0.35, brow: 1, browShow: 1, browY: 0.1 } as Face,
  cry: { ...NEUTRAL_FACE, mouth: "o", open: 0.3, brow: 1, browShow: 1, browY: 0.3, tears: 1 } as Face,
  shocked: { ...NEUTRAL_FACE, eye: "wide", mouth: "o", open: 0.6, browShow: 1, browY: 0.8 } as Face,
  stare: { ...NEUTRAL_FACE, eye: "dot", eyeScale: 1.15, mouth: "flat", mouthW: 0.7, browShow: 1, browY: 0.45, brow: 0.15 } as Face,
  angry: { ...NEUTRAL_FACE, mouth: "smile", curve: -0.25, brow: -1, browShow: 1, browY: -0.3 } as Face,
  grumpy: { ...NEUTRAL_FACE, eye: "lid", mouth: "smile", curve: -0.3, brow: -0.6, browShow: 1, browY: -0.1 } as Face,
  determined: { ...NEUTRAL_FACE, mouth: "flat", brow: -0.55, browShow: 1, browY: -0.15 } as Face,
  talk: { ...NEUTRAL_FACE, mouth: "talk", open: 0.4 } as Face,
  sly: { ...NEUTRAL_FACE, eye: "lid", mouth: "smile", curve: 0.25, mouthW: 0.8, brow: -0.15, browShow: 1 } as Face,
} satisfies Record<string, Face>;

/** Blink curve: returns 0..1 (1 = shut) for natural blinks at given times. */
export const blinkAt = (t: number, times: number[], dur = 0.16) => {
  for (const b of times) {
    const x = (t - b) / dur;
    if (x >= 0 && x <= 1) return Math.sin(x * Math.PI);
  }
  return 0;
};
