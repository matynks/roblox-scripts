import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { LEO, MIA } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe, walk } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { CardboardMask, Sandwich } from "../../props/Props";
import { Seagull, type GullState } from "../../props/Seagull";
import { Cyclist } from "../../props/Cyclist";
import { Foreground, Hills, KEY_LIGHT, PROM, PromenadeSet, SkySea } from "../../env/Promenade";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { C } from "../../style/palette";
import { clamp, ease, invLerp, lerp, track, wobble } from "../../lib/anim";
import { Shadow, SenseRing, bump, mirrorPose } from "../../lib/acting";
import { talk } from "../../lib/timing";
import { CUE, START, integrate, lipSync } from "./timeline";

const TAU = Math.PI * 2;
const LEO_S = 0.82;
const MIA_S = 0.79;
const LEO_STRIDE = 262 * LEO_S; // world px per walk cycle (feet stay planted)
const MIA_STRIDE = 180 * MIA_S;
const HEAD_H = 326; // ground → head centre for Leo (unscaled)

// =============================================================== SHOT A ==
// One continuous take from the first word (T = 0):
//  0.0– 5.5  Mia tiptoes up behind Leo, cardboard mask on, arms raised, ready
//  5.8– 9.3  Leo doesn't turn; waves "Hi, Mia" over his shoulder; she groans
//  9.8–13.4  a pigeon dives at his head; he ducks without looking
// 13.2–18.9  (approved POC) walk; cyclist rings; dancer side-step; Mia stares

const LEO_X0 = 708;
const vLeoA = (T: number) =>
  track(T, [
    [13.15, 0],
    [13.7, 190],
    [16.2, 190],
    [16.5, 95],
    [17.1, 26],
    [17.2, 14],
    [18.3, 14],
    [18.8, 190],
  ]);
const leoXA = (T: number) => LEO_X0 + integrate(vLeoA, 13.0, Math.max(13.0, T));
const MIA_X_READY = 560;
const vMiaA = (T: number) => track(T, [[13.4, 0], [13.9, 170], [16.4, 170], [16.95, 0]]);
const miaXA = (T: number) =>
  T < 5.15 ? track(T, [[0, -150], [5.15, MIA_X_READY]], ease.out) : MIA_X_READY + integrate(vMiaA, 13.3, Math.max(13.3, T));

const FRONT_DANCER: Pose = {
  ...STAND,
  headTilt: -9,
  shN: 74,
  elN: 24,
  shF: -158,
  elF: -42,
  hipN: 24,
  knN: 0,
  footN: -48,
  hipF: -3,
  knF: 5,
  footF: 180,
};

const PIGEON_T0 = 9.8;
const PIGEON_PASS = 12.02;
const pigeonAt = (T: number): GullState | null => {
  if (T < PIGEON_T0 || T > 13.2) return null;
  const flap = 30 * Math.sin(TAU * 6.5 * T);
  if (T < PIGEON_PASS) {
    const u = ease.in(invLerp(PIGEON_T0, PIGEON_PASS, T));
    const x = lerp(1560, LEO_X0 + 6, u) + Math.sin(u * Math.PI) * 60;
    const y = lerp(250, 606, u) - Math.sin(u * Math.PI) * 30;
    return { x, y, scale: lerp(0.36, 0.46, u), facing: -1, flap: T > 11.2 ? flap + 10 : 8 + 6 * Math.sin(T * 4), bodyTilt: lerp(-6, -26, u) };
  }
  const u = invLerp(PIGEON_PASS, 13.2, T);
  return { x: lerp(LEO_X0 + 6, -260, u), y: 606 - Math.sin(u * Math.PI * 0.8) * 120 - u * 120, scale: 0.46, facing: -1, flap, bodyTilt: lerp(-10, 14, u) };
};

const ShotA: React.FC<{ T: number }> = ({ T }) => {
  const t = T;
  const leoDist = integrate(vLeoA, 13.0, Math.max(13.0, T));
  const leoX = LEO_X0 + leoDist;
  const passX = leoXA(CUE.cyclistPass);
  const cycX = passX + 640 * (T - CUE.cyclistPass);
  const miaX = miaXA(T);

  // camera: still wide while Leo stands, then tracks him with leading room
  const zoom = track(T, [
    [0, 1.0],
    [5.2, 1.07],
    [9.4, 1.05],
    [12.3, 1.08],
    [13.7, 1.06],
    [16.2, 1.06],
    [16.9, 1.1],
    [18.3, 1.11],
    [18.95, 1.09],
  ]);
  const cam: Cam = { x: leoX - 960 + 150 / zoom, y: track(T, [[0, 0], [18.95, 16]]), zoom };

  // ---- Leo
  const dw = track(T, [[16.22, 0], [16.72, 1], [18.22, 1], [18.62, 0]]);
  const turn = track(T, [[16.3, 1], [16.78, 0], [18.22, 0], [18.56, 1]]);
  const lane = track(T, [[16.35, PROM.laneMid], [16.95, PROM.laneNear]]);
  const sc = track(T, [[16.35, LEO_S], [16.95, LEO_S * 1.05]]);
  const phase = leoDist / LEO_STRIDE;
  const walkAmt = clamp(invLerp(13.12, 13.5, T));
  const wp = walk(phase, walkAmt);
  const eatW = Math.max(bump(T, 1.35, 1.6, 2.0, 2.3), bump(T, 4.2, 4.45, 4.85, 5.1), bump(T, 12.55, 12.8, 13.0, 13.25));
  const walkPose: Pose = { ...wp, shN: lerp(30, 42, eatW) + 3 * Math.sin(phase * TAU * 2) * walkAmt, elN: lerp(80, 106, eatW), headTilt: wp.headTilt - eatW * 4 };
  // "Hi, Mia": backwards wave over the shoulder, without turning
  const wave = bump(T, 7.15, 7.42, 8.25, 8.6);
  let leoPose = blendPose(breathe(walkPose, T, 1 - walkAmt), { shF: -150, elF: -24 + 18 * Math.sin((T - 7.3) * 15) }, wave);
  // duck under the pigeon
  const duck = bump(T, 11.6, 11.84, 12.18, 12.5);
  leoPose = blendPose(leoPose, { ...POSES.crouch, shN: 34, elN: 84, shF: -10, elF: 14, headTilt: 12, lean: 18 }, duck);
  const dancer: Pose = {
    ...FRONT_DANCER,
    elF: FRONT_DANCER.elF + wobble(T, CUE.flourish, 16, 2.2, 2.6),
    headTilt: FRONT_DANCER.headTilt + wobble(T, CUE.flourish, 5, 1.6, 2),
    shN: FRONT_DANCER.shN + 5 * Math.sin((T - 16.8) * 2.4),
  };
  const hop = 0.07 * Math.sin(Math.PI * clamp(invLerp(16.42, 16.8, T))) - 0.04 * Math.sin(Math.PI * clamp(invLerp(16.2, 16.42, T)));
  leoPose = { ...blendPose(leoPose, dancer, dw), bob: (1 - dw) * leoPose.bob + hop };
  const chew = (t0: number) => (T > t0 && T < t0 + 0.9 ? 0.1 + 0.25 * Math.abs(Math.sin((T - t0) * 13)) : 0);
  let leoFace: Partial<Face> = { ...FACES.content, lookX: 0.4, blink: blinkAt(T, [3.1, 9.2, 14.55, 15.75, 18.7]) };
  const chewing = chew(2.0) + chew(4.85) + chew(13.0);
  if (chewing > 0) leoFace = { ...leoFace, mouth: "talk", open: chewing };
  if (T > 5.7 && T < 6.9) leoFace = { ...FACES.calm, curve: 0.45 };
  if (T > 7.2 && T < 8.0) leoFace = { ...FACES.calm, mouth: "talk", open: talk(T, 7.3, 7.95) || 0.12 };
  if (T > 8.0 && T < 9.0) leoFace = { ...FACES.calm, curve: 0.5 };
  if (T > 11.5 && T < 12.55) leoFace = { ...FACES.calm, curve: 0.45 };
  if (T >= 12.55 && T < 13.0) leoFace = FACES.smug;
  if (T > 16.18 && T < 18.3) leoFace = { ...FACES.calm, curve: 0.5 };

  // ---- Mia: tiptoe → ready → groan → sulk → follows (far lane)
  const tiptoe = T < 5.15;
  const mPhase = tiptoe ? (miaX + 150) / (MIA_STRIDE * 0.62) : (miaX - MIA_X_READY) / MIA_STRIDE;
  const scareArms = { shN: 158, elN: 34, shF: 148, elF: 38 };
  let miaPose: Pose;
  if (tiptoe) {
    const w = walk(mPhase, 0.65);
    miaPose = { ...w, ...scareArms, lean: 9, footN: w.footN - 18, footF: w.footF - 18, bob: w.bob + 0.03 };
  } else {
    const ready: Pose = { ...STAND, ...scareArms, lean: 10 + 2 * Math.sin(T * 3), hipN: 14, knN: 26, hipF: -8, knF: 18, shN: 150 + 4 * Math.sin(T * 6), shF: 140 + 4 * Math.sin(T * 6 + 1) };
    const slump: Pose = breathe({ ...STAND, lean: 6, headTilt: 10, shN: 2, elN: 6, shF: -2, elF: 6 }, T);
    miaPose = blendPose(ready, slump, clamp(invLerp(8.25, 8.75, T)));
    const mWalk = clamp(invLerp(13.35, 13.8, T)) * (1 - clamp(invLerp(16.5, 16.95, T)));
    const sulkWalk = walk(mPhase, 1.2, "sulk");
    const stare: Pose = breathe({ ...STAND, lean: -3, headTilt: 4, shN: 4, shF: -4 }, T);
    if (T > 13.3) miaPose = blendPose(T < 16.5 ? miaPose : stare, sulkWalk, mWalk);
    miaPose = blendPose(miaPose, { lean: -8, shN: 50, elN: 50, shF: 44, elF: 54, headTilt: -10 }, bump(T, 12.05, 12.18, 12.35, 12.7));
    miaPose = blendPose(miaPose, { lean: -10, shN: 58, elN: 50, shF: 48, elF: 54, headTilt: -8 }, bump(T, 16.48, 16.62, 16.8, 17.15));
  }
  const maskState = clamp(invLerp(8.3, 8.75, T));
  let miaFace: Partial<Face> = { ...FACES.grumpy, browY: -0.1, blink: blinkAt(T, [10.4, 15.2]) };
  if (T < 8.3) miaFace = { ...FACES.laugh, eye: "lid", open: 0.3 };
  if (T >= 8.3 && T < 9.6) miaFace = { ...FACES.grumpy, mouth: "wobble", eye: "closed", brow: -0.4, browY: -0.2 };
  if (T >= 12.05 && T < 12.6) miaFace = FACES.shocked;
  if (T >= 16.45 && T < 16.9) miaFace = FACES.shocked;
  if (T >= 16.9) miaFace = { ...FACES.stare, blink: blinkAt(T, [17.6]) };
  const mWalkSwing = T > 13.3 && T < 16.95 ? 0.35 * Math.sin(mPhase * TAU * 2) : tiptoe ? 0.25 * Math.sin(mPhase * TAU * 2) : 0;
  const miaHair = mWalkSwing + wobble(T, 8.3, 0.8, 2.4, 3) + wobble(T, 12.05, 0.7, 2.5, 3) + wobble(T, 16.5, 0.9, 2.5, 3);

  // ---- Cyclist
  const bellEnv = (x: number) => (x < 0 ? 0 : Math.exp(-x * 5));
  const ring = Math.max(bellEnv(T - CUE.bell1), bellEnv(T - CUE.bell2));
  const cycDist = 640 * (T - START);
  const pigeon = pigeonAt(T);

  return (
    <AbsoluteFill>
      <SkySea cam={cam} t={t} />
      <Hills cam={cam} t={t} />
      <PromenadeSet cam={cam} t={t}>
        {/* Mia: far lane */}
        <Shadow x={miaX} y={PROM.laneFar} w={40 * MIA_S} />
        <Figure
          spec={MIA}
          id="miaA"
          x={miaX}
          y={PROM.laneFar}
          scale={MIA_S * 0.97}
          turn={1}
          pose={miaPose}
          face={miaFace}
          light={KEY_LIGHT}
          hairSwing={miaHair}
          headExtra={<CardboardMask r={MIA.D / 2} state={maskState} turn={1} />}
        />
        {/* cyclist + motion ghosts */}
        {T > 14.2 &&
          [2, 1, 0].map((g) => (
            <g key={g} opacity={g === 0 ? 1 : g === 1 ? 0.2 : 0.09}>
              <Cyclist id={`cyc${g}`} x={cycX - g * 34} y={PROM.laneMid} scale={0.84} dist={cycDist} ring={g === 0 ? ring : 0} light={KEY_LIGHT} />
            </g>
          ))}
        {/* Leo */}
        <Shadow x={leoX} y={lane} w={48 * sc} />
        <SenseRing T={T} at={5.82} x={leoX} y={lane - HEAD_H * sc} r={LEO.D * sc * 0.62} />
        <SenseRing T={T} at={11.35} x={leoX} y={lane - HEAD_H * sc} r={LEO.D * sc * 0.62} />
        <SenseRing T={T} at={CUE.leoSense} x={leoX} y={lane - HEAD_H * sc} r={LEO.D * sc * 0.62} />
        <Figure
          spec={LEO}
          id="leoA"
          x={leoX}
          y={lane}
          scale={sc}
          turn={turn}
          pose={leoPose}
          face={leoFace}
          light={KEY_LIGHT}
          holdNear={<Sandwich s={0.85} />}
          holdUpright
        />
        {pigeon && <Seagull {...pigeon} kind="pigeon" />}
      </PromenadeSet>
      <Foreground cam={cam} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

// ============================================================= SHOT B/C ==
// Medium two-shot further along the promenade: Mia stares, "How?", hurries
// over; Leo turns and shrugs. A gull dives from behind for the sandwich; Leo
// lifts it without looking; the offended gull lands, glares, leaves.

const LEO_XB0 = 2985;
const vLeoB = (T: number) => track(T, [[CUE.cut1, 150], [19.3, 150], [19.8, 0]]);
const leoXB = (T: number) => LEO_XB0 + integrate(vLeoB, CUE.cut1, T);
const miaXB = (T: number) => track(T, [[21.28, 2700], [22.3, 2848]], ease.inOut);

type V = { x: number; y: number };
const bez2 = (a: V, b: V, c: V, u: number): V => ({
  x: (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * b.x + u * u * c.x,
  y: (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * b.y + u * u * c.y,
});
const bez3 = (a: V, b: V, c: V, d: V, u: number): V => {
  const m = 1 - u;
  return {
    x: m * m * m * a.x + 3 * m * m * u * b.x + 3 * m * u * u * c.x + u * u * u * d.x,
    y: m * m * m * a.y + 3 * m * m * u * b.y + 3 * m * u * u * c.y + u * u * u * d.y,
  };
};

const PERCH: V = { x: 2962, y: PROM.railTop - 21 };

const gullAt = (T: number): GullState | null => {
  if (T < CUE.gullAppear || T > 29.4) return null;
  const flapFast = (f = 5) => 34 * Math.sin(TAU * f * T);
  const snap = Math.max(0, 1 - Math.abs(T - (CUE.gullSnap - 0.05)) / 0.09);
  if (T < CUE.gullSnap) {
    const u = ease.in(invLerp(CUE.gullAppear, CUE.gullSnap, T));
    const p = bez3({ x: 3470, y: 452 }, { x: 3330, y: 440 }, { x: 3180, y: 650 }, { x: 3078, y: 702 }, u);
    return {
      ...p,
      scale: lerp(0.56, 0.68, u),
      facing: -1,
      flap: T > 25.55 ? 40 + 10 * Math.sin(TAU * 6 * T) : 10 + 5 * Math.sin(T * 3),
      bodyTilt: lerp(-6, -24, u),
      beak: snap,
    };
  }
  if (T < 26.3) {
    const u = invLerp(CUE.gullSnap, 26.3, T);
    const p = bez2({ x: 3078, y: 702 }, { x: 2930, y: 790 }, { x: 2722, y: 690 }, u);
    return { ...p, scale: 0.66, facing: -1, flap: flapFast(), bodyTilt: lerp(-10, 12, u), beak: snap };
  }
  if (T < CUE.gullLand) {
    const u = ease.out(invLerp(26.3, CUE.gullLand, T));
    const p = bez2({ x: 2722, y: 690 }, { x: 2760, y: 500 }, PERCH, u);
    return { ...p, scale: 0.64, facing: 1, flap: flapFast(5.5), bodyTilt: lerp(-14, -4, u), legs: invLerp(26.5, 26.72, T), fold: invLerp(26.66, 26.78, T) };
  }
  if (T < CUE.gullTakeoff) {
    const settle = wobble(T, CUE.gullLand, 4, 2.4, 4);
    const ruffle = wobble(T, 27.05, 6, 6, 5);
    return {
      ...PERCH,
      scale: 0.64,
      facing: 1,
      fold: 1,
      legs: 1,
      flap: ruffle,
      bodyTilt: settle,
      glare: clamp(invLerp(CUE.gullGlare, CUE.gullGlare + 0.2, T)),
      headUp: clamp(invLerp(CUE.gullHmph, CUE.gullHmph + 0.18, T)),
    };
  }
  const u = ease.in(invLerp(CUE.gullTakeoff, 29.3, T));
  const p = bez2(PERCH, { x: 3060, y: 520 }, { x: 3420, y: 230 }, u);
  return {
    ...p,
    scale: 0.64,
    facing: 1,
    fold: 1 - invLerp(CUE.gullTakeoff - 0.04, CUE.gullTakeoff + 0.12, T),
    legs: 1 - invLerp(CUE.gullTakeoff, CUE.gullTakeoff + 0.2, T),
    flap: flapFast(5.5),
    bodyTilt: -18,
    headUp: 1 - invLerp(28.7, 29.0, T),
    glare: 1,
  };
};

export const leoHeadB = (T: number) => ({ x: leoXB(T) - 4, y: PROM.laneMid - HEAD_H * LEO_S });

const ShotBC: React.FC<{ T: number }> = ({ T }) => {
  const t = T - START;
  const leoX = leoXB(T);
  const miaX = miaXB(T);
  const head = leoHeadB(T);

  // ---- camera: two-shot, slow push, follow gull, then push into Leo's head
  const push = ease.in(invLerp(CUE.pushIn, 29.3, T));
  const baseZoom = track(T, [
    [CUE.cut1, 1.5],
    [21.2, 1.54],
    [23.3, 1.55],
    [25.8, 1.68],
    [26.6, 1.66],
    [28.8, 1.63],
  ]);
  const baseCX = track(T, [
    [CUE.cut1, 2878],
    [21.3, 2884],
    [22.4, 2955],
    [25.7, 2965],
    [26.3, 2936],
    [27.0, 2985],
    [28.8, 2990],
  ]);
  const baseCY = track(T, [[CUE.cut1, 646], [23.3, 640], [25.6, 616], [26.8, 628], [28.8, 630]]);
  const zoom = lerp(baseZoom, 5.6, push);
  const cx = lerp(baseCX, head.x, ease.inOut(invLerp(CUE.pushIn, 29.15, T)));
  const cy = lerp(baseCY, head.y, ease.inOut(invLerp(CUE.pushIn, 29.15, T)));
  const cam: Cam = { x: cx - 960, y: cy - 540, zoom };

  // ---- Leo
  const leoDist = integrate(vLeoB, CUE.cut1, T);
  const walkW = 1 - clamp(invLerp(19.35, 19.8, T));
  const standHold: Pose = breathe({ ...STAND, shN: 30, elN: 78 }, T);
  let pre = blendPose(walk(leoDist / LEO_STRIDE, 0.8), standHold, 1 - walkW);
  const turnA = track(T, [[CUE.leoTurn, 1], [21.95, 0]]); // to front
  const FLIP = 21.95;
  let facing: 1 | -1 = 1;
  let turn = T < FLIP ? turnA : track(T, [[FLIP, 0], [22.2, 0.42], [22.4, 0.14], [23.05, 0.14], [23.4, 0.52]]);
  let leoPose: Pose;
  if (T < FLIP) {
    leoPose = blendPose(pre, { shN: 18, elN: 74, shF: -10, elF: 8 }, invLerp(CUE.leoTurn, FLIP, T));
  } else {
    facing = -1;
    pre = blendPose(walk(0, 0), standHold, 1);
    const atFlip = mirrorPose(blendPose(pre, { shN: 18, elN: 74, shF: -10, elF: 8 }, 1));
    const hold3q: Pose = breathe({ ...STAND, shN: 8, elN: 10, shF: 26, elF: 76 }, T);
    leoPose = blendPose(atFlip, hold3q, ease.inOut(invLerp(FLIP, 22.3, T)));
    // shrug
    leoPose = blendPose(leoPose, { ...POSES.frontShrug, shF: -30, elF: -82, shN: 30, elN: 82 }, bump(T, 22.36, 22.6, 22.98, 23.32));
    // hold it high (far arm carries the sandwich)
    const high = bump(T, CUE.leoLift - 0.05, CUE.leoLift + 0.22, 26.95, 27.2);
    leoPose = blendPose(leoPose, { shF: 166, elF: 6, headTilt: -3, lean: -2 }, high);
    // bite
    const bite = bump(T, 27.1, 27.32, 27.75, 28.05);
    leoPose = blendPose(leoPose, { shF: 42, elF: 104, headTilt: 6 }, bite);
  }
  let leoFace: Partial<Face> = { ...FACES.content, blink: blinkAt(T, [19.9, 21.2, 23.9, 28.7]) };
  if (T > 22.35 && T < 23.4) leoFace = FACES.sly;
  if (T > 25.3 && T < 26.45) leoFace = { ...FACES.calm, curve: 0.5 };
  if (T > 26.45 && T < 27.2) leoFace = { ...FACES.smug, lookX: -0.6, lookY: -0.4 };
  if (T > 27.2 && T < 28.1) leoFace = { ...FACES.content, eye: "closed", mouth: "talk", open: 0.15 + 0.35 * Math.abs(Math.sin((T - 27.3) * 14)) };
  if (T >= 28.1) leoFace = { ...FACES.smug, lookX: -0.5, lookY: -0.5, blink: blinkAt(T, [28.7]) };

  // ---- Mia
  const miaWalking = T > 21.28 && T < 22.3;
  const miaDist = miaX - 2700;
  let miaPose: Pose = breathe({ ...STAND, lean: -2, headTilt: 3 }, T, 1.2);
  if (miaWalking) {
    const w = walk(miaDist / (MIA_STRIDE * 0.95), 1.15, "brisk");
    miaPose = { ...w, shN: lerp(w.shN, 40, 0.5), elN: 60, shF: lerp(w.shF, 34, 0.5), elF: 60 };
  }
  miaPose = blendPose(miaPose, { ...POSES.palmsOut, bob: 0.03 }, bump(T, 20.5, 20.72, 21.15, 21.4) + bump(T, 22.2, 22.4, 22.6, 22.85) * 0.8);
  miaPose = blendPose(miaPose, { ...POSES.handsOnHips, lean: 4, headTilt: -4 }, bump(T, 22.75, 23.0, 23.85, 24.05));
  miaPose = blendPose(miaPose, { shN: 146, elN: 4, shF: -12, elF: 20, lean: -4, headTilt: -10 }, bump(T, 24.05, 24.3, 25.55, 25.8));
  const duck = bump(T, CUE.miaDuck - 0.12, CUE.miaDuck + 0.1, 26.4, 26.75);
  miaPose = blendPose(miaPose, { ...POSES.crouch, shN: 168, elN: 96, shF: 160, elF: 92, headTilt: 14, lean: 16 }, duck);
  const miaTurn = miaWalking ? 1 : 0.82;
  let miaFace: Partial<Face> = { ...FACES.stare, blink: blinkAt(T, [20.1]) };
  if (T > 20.5 && T < 21.25) miaFace = { ...FACES.shocked, eye: "dot", eyeScale: 1.2, mouth: "o", open: 0.2 + 0.6 * lipSync(T, 20.5, 21.1) };
  if (T >= 21.25 && T < 23.9) miaFace = { ...FACES.worried, brow: 0.5, browY: 0.6, mouth: "talk", open: lipSync(T, 21.5, 22.7), blink: blinkAt(T, [23.2]) };
  if (T >= 23.9 && T < 25.75) miaFace = { ...FACES.shocked, lookY: -0.6, lookX: 0.5 };
  if (duck > 0.5) miaFace = { ...FACES.calm, mouth: "wobble", curve: 0 };
  if (T >= 26.45 && duck <= 0.5) miaFace = { ...FACES.shocked, eye: "dot", eyeScale: 1.15, open: 0.5, lookX: 0.3, lookY: -0.2, blink: blinkAt(T, [27.6]) };
  const miaHair = 0.4 * Math.sin((miaDist / (MIA_STRIDE * 0.95)) * TAU * 2) * (miaWalking ? 1 : 0) + wobble(T, 20.55, 0.6, 2.4, 3) + wobble(T, 25.9, 0.9, 2.6, 3) + wobble(T, 26.6, 0.7, 2.4, 3);

  const gull = gullAt(T);
  const ringAmt = clamp(invLerp(2.4, 4.2, zoom));
  const darken = clamp(invLerp(28.98, 29.3, T));
  // DOF: background blur grows with zoom
  const bgBlur = 3.2 + push * 6;

  return (
    <AbsoluteFill>
      <SkySea cam={cam} t={t} blur={bgBlur} />
      <Hills cam={cam} t={t} blur={bgBlur * 0.9} />
      <PromenadeSet cam={cam} t={t} blur={1.4 + push * 6} />
      <Layer cam={cam} p={1}>
        <Shadow x={miaX} y={PROM.laneMid} w={42 * MIA_S} o={0.45} />
        <Figure
          spec={MIA}
          id="miaB"
          x={miaX}
          y={PROM.laneMid}
          scale={MIA_S}
          turn={miaTurn}
          pose={miaPose}
          face={miaFace}
          light={KEY_LIGHT}
          hairSwing={miaHair}
          headExtra={<CardboardMask r={MIA.D / 2} state={1} turn={miaTurn} />}
        />
        <Shadow x={leoX} y={PROM.laneMid} w={48 * LEO_S} o={0.45} />
        <SenseRing T={T} at={CUE.leoLift - 0.1} x={head.x} y={head.y} r={LEO.D * LEO_S * 0.62} />
        <Figure
          spec={LEO}
          id="leoB"
          x={leoX}
          y={PROM.laneMid}
          scale={LEO_S}
          facing={facing}
          turn={turn}
          pose={leoPose}
          face={leoFace}
          light={KEY_LIGHT}
          ring={ringAmt}
          holdNear={T < FLIP ? <Sandwich s={0.85} /> : undefined}
          holdFar={T >= FLIP ? <Sandwich s={0.85} /> : undefined}
          holdUpright
        />
        {gull && <Seagull {...gull} />}
        {/* transition ring from Leo's head */}
        {T > CUE.pushIn &&
          [0, 0.12].map((d) => {
            const k = clamp((T - CUE.pushIn - 0.15 - d) / 0.45);
            return k > 0 ? (
              <circle key={d} cx={head.x} cy={head.y} r={LEO.D * LEO_S * (0.53 + k * 0.5)} fill="none" stroke={d ? C.lineBlue : C.rimWarm} strokeWidth={2.2 / Math.max(1, zoom * 0.5)} opacity={(1 - k) * 0.9} />
            ) : null;
          })}
      </Layer>
      <Vignette strength={0.5 + 0.3 * push} />
      <AbsoluteFill style={{ background: C.navy, opacity: darken }} />
    </AbsoluteFill>
  );
};

export const PromenadeShots: React.FC<{ T: number }> = ({ T }) => (T < CUE.cut1 ? <ShotA T={T} /> : <ShotBC T={T} />);
