import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, LEO, MIA } from "../../characters/cast";
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
import { CUE, START, integrate, lipSync } from "./timeline";

const TAU = Math.PI * 2;
const LEO_S = 0.82;
const MIA_S = 0.79;
const LEO_STRIDE = 262 * LEO_S; // world px per walk cycle (feet stay planted)
const MIA_STRIDE = 180 * MIA_S;
const HEAD_H = 326; // ground → head centre for Leo (unscaled)

/** 0→1→0 envelope: rise over [a,b], hold, fall over [c,d]. */
const bump = (T: number, a: number, b: number, c: number, d: number) =>
  Math.min(ease.inOut(invLerp(a, b, T)), 1 - ease.inOut(invLerp(c, d, T)));

/** The same pose seen from the other facing, so a facing flip is invisible. */
const mirrorPose = (p: Pose): Pose => ({
  ...p,
  lean: -p.lean,
  headTilt: -p.headTilt,
  headX: -p.headX,
  shN: -p.shF,
  elN: -p.elF,
  shF: -p.shN,
  elF: -p.elN,
  hipN: -p.hipF,
  knN: -p.knF,
  hipF: -p.hipN,
  knF: -p.knN,
  footN: 180 - p.footF,
  footF: 180 - p.footN,
});

const blendFace = (a: Face, b: Partial<Face>, t: number): Face => {
  const k = clamp(t);
  const out: Face = { ...a };
  (Object.keys(b) as (keyof Face)[]).forEach((key) => {
    const v = b[key];
    if (typeof v === "number") (out as Record<string, unknown>)[key] = lerp(a[key] as number, v, k);
    else if (k >= 0.5) (out as Record<string, unknown>)[key] = v;
  });
  return out;
};

const Shadow: React.FC<{ x: number; y: number; w: number; o?: number }> = ({ x, y, w, o = 0.4 }) => (
  <ellipse cx={x} cy={y + 3} rx={w} ry={w * 0.16} fill="#07040A" opacity={o} />
);

/** Thin rings expanding from Leo's head: the visual motif for "seeing behind". */
const SenseRing: React.FC<{ T: number; at: number; x: number; y: number; r: number; color?: string }> = ({ T, at, x, y, r, color = C.rimWarm }) => (
  <g>
    {[0, 0.16].map((d) => {
      const k = (T - at - d) / 0.75;
      if (k < 0 || k > 1) return null;
      return <circle key={d} cx={x} cy={y} r={r * (0.75 + k * 1.1)} fill="none" stroke={color} strokeWidth={3 * (1 - k) + 0.6} opacity={(1 - k) * 0.85} />;
    })}
  </g>
);

// =============================================================== SHOT A ==
// Wide tracking shot: Leo strolls, sandwich in hand; Mia sulks behind; a
// cyclist rings from behind; Leo side-steps into a front-facing dancer pose
// without looking (eyes closed); the bike passes behind him.

const vLeoA = (T: number) =>
  track(T, [
    [START, 190],
    [16.2, 190],
    [16.5, 95],
    [17.1, 26],
    [17.2, 14],
    [18.3, 14],
    [18.8, 190],
  ]);
const leoXA = (T: number) => 760 + integrate(vLeoA, START, T);
const vMiaA = (T: number) => track(T, [[START, 190], [16.4, 190], [16.95, 0]]);
const miaXA = (T: number) => 430 + integrate(vMiaA, START, T);

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

const ShotA: React.FC<{ T: number }> = ({ T }) => {
  const t = T - START;
  const leoDist = integrate(vLeoA, START, T);
  const leoX = 760 + leoDist;
  const passX = leoXA(CUE.cyclistPass);
  const cycX = passX + 640 * (T - CUE.cyclistPass);
  const miaX = miaXA(T);

  // camera tracks Leo with leading room
  const zoom = track(T, [
    [START, 1.0],
    [16.2, 1.05],
    [16.9, 1.1],
    [18.3, 1.11],
    [18.95, 1.09],
  ]);
  const cam: Cam = { x: leoX - 960 + 150 / zoom, y: track(T, [[START, 0], [18.95, 16]]), zoom };

  // ---- Leo
  const dw = track(T, [[16.22, 0], [16.72, 1], [18.22, 1], [18.62, 0]]);
  const turn = track(T, [[16.3, 1], [16.78, 0], [18.22, 0], [18.56, 1]]);
  const lane = track(T, [[16.35, PROM.laneMid], [16.95, PROM.laneNear]]);
  const sc = track(T, [[16.35, LEO_S], [16.95, LEO_S * 1.05]]);
  const phase = leoDist / LEO_STRIDE;
  const wp = walk(phase, 1);
  const walkPose: Pose = { ...wp, shN: 30 + 3 * Math.sin(phase * TAU * 2), elN: 80 };
  const dancer: Pose = {
    ...FRONT_DANCER,
    elF: FRONT_DANCER.elF + wobble(T, CUE.flourish, 16, 2.2, 2.6),
    headTilt: FRONT_DANCER.headTilt + wobble(T, CUE.flourish, 5, 1.6, 2),
    shN: FRONT_DANCER.shN + 5 * Math.sin((T - 16.8) * 2.4),
  };
  const hop = 0.07 * Math.sin(Math.PI * clamp(invLerp(16.42, 16.8, T))) - 0.04 * Math.sin(Math.PI * clamp(invLerp(16.2, 16.42, T)));
  const leoPose = { ...blendPose(walkPose, dancer, dw), bob: (1 - dw) * wp.bob + hop };
  const leoFace: Partial<Face> =
    T > 16.18 && T < 18.3
      ? { ...FACES.calm, curve: 0.5 }
      : { ...FACES.content, blink: blinkAt(T, [14.55, 15.75, 18.7]) };

  // ---- Mia (far lane, sulking, mask pushed up)
  const miaDist = integrate(vMiaA, START, T);
  const mPhase = miaDist / MIA_STRIDE;
  const mWalkW = 1 - clamp(invLerp(16.5, 16.95, T));
  const flinch = bump(T, 16.48, 16.62, 16.8, 17.15);
  const miaWalk = walk(mPhase, 1.2, "sulk");
  const miaStand: Pose = breathe({ ...STAND, lean: -3, headTilt: 4, shN: 4, shF: -4 }, T);
  let miaPose = blendPose(miaWalk, miaStand, 1 - mWalkW);
  miaPose = blendPose(miaPose, { lean: -10, shN: 58, elN: 50, shF: 48, elF: 54, headTilt: -8 }, flinch);
  const miaFace: Partial<Face> =
    T < 16.45
      ? { ...FACES.grumpy, browY: -0.1, blink: blinkAt(T, [15.2]) }
      : T < 16.9
        ? FACES.shocked
        : { ...FACES.stare, blink: blinkAt(T, [17.6]) };

  // ---- Cyclist
  const bellEnv = (x: number) => (x < 0 ? 0 : Math.exp(-x * 5));
  const ring = Math.max(bellEnv(T - CUE.bell1), bellEnv(T - CUE.bell2));
  const cycDist = 640 * (T - START);

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
          hairSwing={0.35 * Math.sin(mPhase * TAU * 2) * mWalkW + wobble(T, 16.5, 0.9, 2.5, 3)}
          headExtra={<CardboardMask r={MIA.D / 2} state={1} turn={1} />}
        />
        {/* cyclist + motion ghosts */}
        {[2, 1, 0].map((g) => (
          <g key={g} opacity={g === 0 ? 1 : g === 1 ? 0.2 : 0.09}>
            <Cyclist id={`cyc${g}`} x={cycX - g * 34} y={PROM.laneMid} scale={0.84} dist={cycDist} ring={g === 0 ? ring : 0} light={KEY_LIGHT} />
          </g>
        ))}
        {/* Leo */}
        <Shadow x={leoX} y={lane} w={48 * sc} />
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
