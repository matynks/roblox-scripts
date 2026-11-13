// S04 "Here's the rule" (43.34–59.10)
//  a) navy: eyes got wider (Leo's 360° ring) → funnel → brain stayed the same
//  b) first-person promenade: thumb at arm's length = the only sharp patch (≈2°)
//  c) saccades ≈3/s, brain stitches the rest, see everything / look at one thing
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, MIA } from "../../characters/cast";
import { FACES, breathe, walk, blinkAt } from "../../characters/poses";
import { STAND } from "../../characters/types";
import { CardboardMask } from "../../props/Props";
import { Seagull } from "../../props/Seagull";
import { Hills, KEY_LIGHT, PROM, PromenadeSet, SkySea } from "../../env/Promenade";
import { Vignette } from "../../env/Atmosphere";
import { NavySpace, VisionDiagram, type DiagramState } from "../../graphics/VisionField";
import { BrainIcon, Glow, IconDefs } from "../../graphics/Icons";
import { Label, Shadow, bump, step } from "../../lib/acting";
import { Layer, toScreen, type Cam } from "../../lib/camera";
import { clamp, ease, invLerp, lerp, rand, track } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";

const tRule = P(30).start; // 43.34
const tWider = P(31).start; // 44.30
const tBrain = P(32).start; // 45.58
const tThumb = P(33).start; // 47.14
const tSharp = P(34).start; // 48.98
const tJump = P(35).start; // 51.38
const tStitch = P(36).start; // 53.94
const tAll = P(37).start; // 55.86
const tOne = P(38).start; // 57.26
const IRIS = 46.75; // circular wipe from graphic to first-person view

// ------------------------------------------------------------ part a
const Funnel: React.FC<{ T: number }> = ({ T }) => {
  const k = step(T, tRule - 0.1, tRule + 0.6);
  const lx = lerp(1360, 520, k);
  const ls = lerp(0.7, 0.6, k);
  const leo: DiagramState = {
    who: "leo", x: lx, y: lerp(548, 560, k), scale: ls, appear: 1, fov: 360, ahead: 0, sides: 0, blind: 0, blindFill: 0, question: 0, ghost: 0, shatter: 0,
    ripple: T > tWider ? T - tWider : -1,
    glow: bump(T, tWider - 0.1, tWider + 0.2, tWider + 0.6, tWider + 1.2), t: T,
  };
  const funnelK = step(T, tWider + 0.3, tWider + 1.0);
  const brainK = step(T, tBrain - 0.2, tBrain + 0.35);
  // information dots stream from the ring into the funnel; most jam at the neck
  const dots = Array.from({ length: 70 }).map((_, i) => {
    const born = tWider + 0.3 + rand(i) * 2.2;
    const age = T - born;
    if (age < 0) return null;
    const yy0 = 560 + (rand(i * 3.3) - 0.5) * 380;
    const neckX = 1110;
    const u = clamp(age / 1.1);
    const through = rand(i * 7.7) < 0.12; // only a few make it through
    let x = lerp(800, neckX - 20, ease.out(u));
    let y = lerp(yy0, 560 + (yy0 - 560) * 0.08, ease.inOut(u));
    let o = 1;
    if (through && age > 1.1) {
      const v = clamp((age - 1.1) / 0.6);
      x = lerp(neckX - 20, 1300, v);
      y = 560;
      o = 1 - clamp((age - 1.5) / 0.3);
    } else if (!through && age > 1.1) {
      x = neckX - 30 - rand(i * 5) * 60 - (age - 1.1) * 8;
      y += Math.sin(age * 5 + i) * 3;
      o = Math.max(0.25, 1 - (age - 1.1) * 0.3);
    }
    return <circle key={i} cx={x} cy={y} r={4} fill={C.gold} opacity={o * funnelK} />;
  });
  return (
    <AbsoluteFill>
      <NavySpace drift={T * 6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <IconDefs />
        <VisionDiagram s={leo} id="s4leo" />
        <g opacity={funnelK}>
          <Glow d="M780,330 C960,340 1060,520 1110,548 L1300,548" color={C.lineBlueDim} w={2.4} />
          <Glow d="M780,790 C960,780 1060,600 1110,572 L1300,572" color={C.lineBlueDim} w={2.4} />
        </g>
        {dots}
        <g opacity={brainK}>
          <circle cx={1440} cy={560} r={118} fill="none" stroke={C.grid} strokeWidth={10} />
          <circle cx={1440} cy={560} r={118} fill="none" stroke={C.lineBlue} strokeWidth={2.4} opacity={0.8} />
          <BrainIcon x={1440} y={560} s={1.25} />
        </g>
      </svg>
      <Label x={960} y={100} text="The rule" size={26} color={C.gold} o={step(T, tRule - 0.1, tRule + 0.3)} />
      <Label x={520} y={830} text="Eyes · wider" size={22} color={C.gold} o={step(T, tWider, tWider + 0.4)} />
      <Label x={1440} y={830} text="Brain · same" size={22} color={C.number} o={brainK} />
      <Label x={1112} y={470} text="bottleneck" size={15} color={C.label} o={step(T, tBrain + 0.4, tBrain + 0.8)} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ part b/c
const POV_CAM = (T: number): Cam => ({ x: 640 + (T - IRIS) * 6, y: -30, zoom: lerp(1.2, 1.26, clamp((T - IRIS) / 12)) });

const PovScene: React.FC<{ T: number; cam: Cam }> = ({ T, cam }) => {
  const extraX = 2380 - (T - 46) * 60;
  const ph = (2380 - extraX) / (262 * 0.62);
  return (
    <AbsoluteFill>
      <SkySea cam={cam} t={T} />
      <Hills cam={cam} t={T} />
      <PromenadeSet cam={cam} t={T}>
        <Shadow x={extraX} y={PROM.laneFar} w={30} />
        <Figure spec={EXTRA} id="povEx" x={extraX} y={PROM.laneFar} scale={0.62} facing={-1} turn={1} pose={walk(ph, 0.9)} face={FACES.content} light={KEY_LIGHT} />
        <Shadow x={1560} y={PROM.laneMid} w={32} />
        <Figure
          spec={MIA}
          id="povMia"
          x={1560}
          y={PROM.laneMid}
          scale={0.86}
          turn={0.1}
          pose={breathe({ ...STAND, shN: 150 + 12 * Math.sin(T * 7), elN: 30, shF: -8, elF: -6 }, T)}
          face={{ ...FACES.happy, blink: blinkAt(T, [50.2, 54.1, 57.9]) }}
          light={KEY_LIGHT}
          hairSwing={0.2 * Math.sin(T * 2)}
          headExtra={<CardboardMask r={MIA.D / 2} state={1} turn={0.1} />}
        />
        <Seagull x={1905} y={PROM.railTop - 21} scale={0.6} facing={-1} fold={1} legs={1} flap={Math.sin(T * 9) * 3} />
      </PromenadeSet>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

/** Points of interest for saccades (screen coordinates at time T). */
const targets = (cam: Cam) => [
  toScreen(cam, 1, 1560, PROM.laneMid - 250), // Mia's face
  toScreen(cam, 1, 2266, 302), // lamp
  toScreen(cam, 1, 1905, PROM.railTop - 30), // gull
  toScreen(cam, 0.04, PROM.sunX, PROM.horizon - 10), // sun
  toScreen(cam, 0.04, 560, PROM.horizon + 10), // sailboat
  toScreen(cam, 0.09, 1930, PROM.horizon - 90), // lighthouse
  toScreen(cam, 1, 1240, 330), // near lamp
];

const Pov: React.FC<{ T: number }> = ({ T }) => {
  const cam = POV_CAM(T);
  const tg = targets(cam);
  // thumb + fovea patch
  const arm = bump(T, tThumb - 0.2, tThumb + 0.55, tJump - 0.35, tJump + 0.1);
  const thumbTip = { x: 1180, y: lerp(1250, 470, ease.outQuint(arm)) };
  const blur = 11 * Math.max(step(T, tSharp - 0.1, tSharp + 0.5), 0) * (1 - step(T, tStitch + 1.1, tAll + 0.1));
  // fovea position: thumb, then saccades between targets at ~3 Hz
  const jumps = Array.from({ length: 7 }).map((_, i) => tJump + 0.15 + i * 0.32);
  let fov = { x: thumbTip.x, y: thumbTip.y + 10 };
  let lastJump = -1;
  jumps.forEach((j, i) => {
    if (T >= j) lastJump = i;
  });
  if (lastJump >= 0) {
    const j = jumps[lastJump];
    const from = lastJump === 0 ? { x: 1180, y: 480 } : tg[(lastJump - 1) % tg.length];
    const to = tg[lastJump % tg.length];
    const u = ease.inOut(clamp((T - j) / 0.06));
    fov = { x: lerp(from.x, to.x, u), y: lerp(from.y, to.y, u) };
  }
  const R = 64;
  // stitched patches: visited targets + a sweep of tiles
  const visited = lastJump >= 0 ? tg.slice(0, Math.min(tg.length, lastJump + 1)) : [];
  const stitch = step(T, tStitch, tStitch + 1.3);
  const tiles: { x: number; y: number; k: number }[] = [];
  for (let gy = 0; gy < 7; gy++)
    for (let gx = 0; gx < 13; gx++) {
      const x = 80 + gx * 150 + (gy % 2) * 75;
      const y = 80 + gy * 150;
      const order = (Math.hypot(x - 960, y - 540) / 1100) * 0.8 + rand(gx * 13 + gy) * 0.2;
      tiles.push({ x, y, k: clamp((stitch * 1.3 - order) * 4) });
    }
  const masks: string[] = [];
  if (blur > 0.2) {
    masks.push(`radial-gradient(circle ${R}px at ${fov.x}px ${fov.y}px, #000 70%, transparent 100%)`);
    if (T > tStitch - 0.2) visited.forEach((v) => masks.push(`radial-gradient(circle ${R}px at ${v.x}px ${v.y}px, #000 70%, transparent 100%)`));
    tiles.forEach((tt) => tt.k > 0 && masks.push(`radial-gradient(circle ${110 * tt.k}px at ${tt.x}px ${tt.y}px, #000 60%, transparent 100%)`));
  }
  // attention spotlight on Mia at the end
  const spot = step(T, tOne - 0.05, tOne + 0.45);
  const miaFace = tg[0];
  const wipe = step(T, IRIS, IRIS + 0.6);
  return (
    <AbsoluteFill style={{ clipPath: wipe < 1 ? `circle(${wipe * 1200}px at 960px 540px)` : undefined }}>
      <AbsoluteFill style={{ filter: blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : undefined }}>
        <PovScene T={T} cam={cam} />
      </AbsoluteFill>
      {blur > 0.2 && (
        <AbsoluteFill style={{ WebkitMaskImage: masks.join(","), maskImage: masks.join(",") }}>
          <PovScene T={T} cam={cam} />
        </AbsoluteFill>
      )}
      {/* stitch tile outlines */}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {tiles.map((tt, i) =>
          tt.k > 0 && tt.k < 1 ? <circle key={i} cx={tt.x} cy={tt.y} r={110 * tt.k} fill="none" stroke={C.lineBlue} strokeWidth={1.5} opacity={(1 - tt.k) * 0.8} /> : null,
        )}
        {/* fovea ring + saccade trail */}
        {blur > 0.2 && T < tStitch + 0.4 && <circle cx={fov.x} cy={fov.y} r={R} fill="none" stroke={C.gold} strokeWidth={2.4} opacity={0.9} />}
        {lastJump > 0 &&
          T < tStitch + 0.6 &&
          tg.slice(0, lastJump + 1).map((p, i) =>
            i > 0 ? <line key={i} x1={tg[i - 1].x} y1={tg[i - 1].y} x2={p.x} y2={p.y} stroke={C.gold} strokeWidth={1.6} strokeDasharray="4 8" opacity={0.6 * (1 - step(T, tStitch, tStitch + 0.6))} /> : null,
          )}
        {/* thumb (first person, right hand seen from behind, rim-lit from the sun side) */}
        {arm > 0.01 && (
          <g transform={`translate(${thumbTip.x},${thumbTip.y}) rotate(-6)`}>
            <path d="M70,170 C96,330 128,520 170,760" stroke={C.rimWarm} strokeWidth={104} fill="none" strokeLinecap="round" opacity={0.85} transform="translate(5,-3)" />
            <path d="M70,170 C96,330 128,520 170,760" stroke={C.ink} strokeWidth={100} fill="none" strokeLinecap="round" />
            <rect x={-30} y={66} width={128} height={132} rx={40} fill={C.rimWarm} opacity={0.85} transform="translate(5,-3)" />
            <rect x={-30} y={66} width={128} height={132} rx={40} fill={C.ink} />
            <path d="M-6,104 Q34,96 84,108 M-4,138 Q36,130 86,142 M0,170 Q38,164 84,174" stroke="#2C2533" strokeWidth={5} fill="none" strokeLinecap="round" />
            <rect x={-24} y={-2} width={44} height={112} rx={22} fill={C.rimWarm} opacity={0.85} transform="translate(4,-3)" />
            <rect x={-24} y={-2} width={44} height={112} rx={22} fill={C.ink} />
            <rect x={-14} y={8} width={24} height={30} rx={10} fill="#2E2836" />
          </g>
        )}
        {/* dim everything but one thing */}
        {spot > 0 && (
          <g>
            <defs>
              <radialGradient id="s4spot" cx={miaFace.x} cy={miaFace.y + 80} r={230} gradientUnits="userSpaceOnUse">
                <stop offset="0.6" stopColor="#000" stopOpacity="0" />
                <stop offset="1" stopColor="#000" stopOpacity="1" />
              </radialGradient>
            </defs>
            <rect width={1920} height={1080} fill="url(#s4spot)" opacity={0.72 * spot} />
            <circle cx={miaFace.x} cy={miaFace.y + 80} r={210} fill="none" stroke={C.gold} strokeWidth={2.5} opacity={spot} />
          </g>
        )}
      </svg>
      <Label x={thumbTip.x + 110} y={thumbTip.y - 20} text="sharp ≈ 2°" size={20} color={C.gold} align="left" o={step(T, tSharp + 0.3, tSharp + 0.7) * (1 - step(T, tJump - 0.4, tJump))} />
      <Label x={960} y={96} text="≈ 3 jumps per second" size={22} color={C.gold} o={bump(T, tJump + 0.1, tJump + 0.5, tStitch - 0.1, tStitch + 0.2)} />
      <Label x={960} y={96} text="the brain stitches the rest" size={22} color={C.lineBlue} o={bump(T, tStitch + 0.1, tStitch + 0.5, tAll - 0.1, tAll + 0.2)} />
      <Label x={960} y={96} text="you can see everything" size={22} color={C.number} o={bump(T, tAll, tAll + 0.4, tOne - 0.1, tOne + 0.2)} />
      <Label x={miaFace.x} y={miaFace.y - 200} text="look at · one thing" size={22} color={C.gold} o={spot} />
    </AbsoluteFill>
  );
};

export const S04Rule: React.FC<{ T: number }> = ({ T }) => (
  <AbsoluteFill>
    {T < IRIS + 0.7 && <Funnel T={T} />}
    {T >= IRIS && <Pov T={T} />}
  </AbsoluteFill>
);
