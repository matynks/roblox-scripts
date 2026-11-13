// S10 "Basketball" (106.99–115.83): top-down court, 9 sight lines at once;
// side view behind-the-back pass → swish; the coach drops his clipboard.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, LEO } from "../../characters/cast";
import { FACES, blendPose, blinkAt, breathe, walk } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { Cap, Clipboard } from "../../props/Accessories";
import { Ball, GYM, GYM_LIGHT, GymSet } from "../../env/Gym";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, SenseRing, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, invLerp, lerp, rand, track } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";

const t0 = P(69).start; // 106.99 "Basketball."
const tTen = P(70).start; // 108.11
const tNine = P(71).start; // 109.79
const tPass = P(72).start; // 111.47
const tPerfect = P(73).start; // 113.07
const tCoach = P(74).start; // 113.99
const X_SIDE = 111.2;

// ------------------------------------------------------------- top-down court
const CourtTop: React.FC<{ T: number }> = ({ T }) => {
  const appear = step(T, t0 - 0.1, t0 + 0.4);
  const players = Array.from({ length: 10 }).map((_, i) => {
    const team = i < 5 ? 0 : 1;
    const bx = 560 + (i % 5) * 200 + team * 90 + (rand(i) - 0.5) * 80;
    const by = 330 + (team ? 300 : 120) + (rand(i * 3) - 0.5) * 160;
    return { i, team, x: bx + Math.sin(T * 1.3 + i) * 30, y: by + Math.cos(T * 1.1 + i * 2) * 24, ang: Math.sin(T + i) * 40 + (team ? 180 : 0) };
  });
  const leo = players[2];
  const lines = step(T, tNine - 0.1, tNine + 0.5);
  const ring = step(T, tNine - 0.3, tNine + 0.2);
  return (
    <AbsoluteFill style={{ opacity: appear, background: "#1A120E" }}>
      <svg width={1920} height={1080}>
        <defs>
          <linearGradient id="ctWood" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8A5A36" />
            <stop offset="1" stopColor="#A66E42" />
          </linearGradient>
          <radialGradient id="ctRing">
            <stop offset="0" stopColor={C.gold} stopOpacity="0.28" />
            <stop offset="1" stopColor={C.gold} stopOpacity="0.02" />
          </radialGradient>
        </defs>
        <g transform={`translate(960 540) scale(${lerp(1.08, 1.0, ease.out(clamp((T - t0) / 4)))}) translate(-960 -540)`}>
          <rect x={300} y={160} width={1320} height={760} rx={8} fill="url(#ctWood)" />
          {Array.from({ length: 30 }).map((_, k) => (
            <rect key={k} x={300} y={160 + k * 25.3} width={1320} height={1.5} fill="#5A3A22" opacity={0.35} />
          ))}
          <g stroke="#F3EAD8" strokeWidth={4} fill="none" opacity={0.75}>
            <rect x={320} y={180} width={1280} height={720} />
            <path d="M960,180 L960,900" />
            <circle cx={960} cy={540} r={90} />
            <path d="M320,380 L520,380 L520,700 L320,700 M1600,380 L1400,380 L1400,700 L1600,700" />
            <path d="M320,250 A290,290 0 0 1 320,830 M1600,250 A290,290 0 0 0 1600,830" />
          </g>
          {ring > 0 && <circle cx={leo.x} cy={leo.y} r={1400 * ring} fill="url(#ctRing)" opacity={0.8} />}
          {ring > 0 && <circle cx={leo.x} cy={leo.y} r={60 + 30 * ring} fill="none" stroke={C.gold} strokeWidth={3} opacity={ring} />}
          {players.map((p) =>
            p.i !== leo.i && lines > 0 ? (
              <line key={`l${p.i}`} x1={leo.x} y1={leo.y} x2={lerp(leo.x, p.x, lines)} y2={lerp(leo.y, p.y, lines)} stroke={C.gold} strokeWidth={2.4} strokeDasharray="10 8" opacity={0.9} />
            ) : null,
          )}
          {players.map((p) => (
            <g key={p.i} transform={`translate(${p.x},${p.y}) rotate(${p.ang})`}>
              <rect x={-40} y={-14} width={80} height={30} rx={15} fill={p.i === leo.i ? C.leoBlue : p.team ? "#C9473F" : "#3E5A7A"} stroke={p.i === leo.i ? C.gold : "#00000055"} strokeWidth={p.i === leo.i ? 3 : 1.5} />
              <circle r={22} fill={C.ink} stroke={p.i === leo.i ? C.gold : "#00000000"} strokeWidth={2.5} />
              <path d="M-4,-21 Q0,-28 4,-21Z" fill={C.ink} />
            </g>
          ))}
          {players.map((p) => (p.i !== leo.i && lines > 0.9 ? <circle key={`d${p.i}`} cx={p.x} cy={p.y} r={34} fill="none" stroke={C.gold} strokeWidth={2} opacity={0.8} /> : null))}
        </g>
      </svg>
      <Label x={960} y={96} text={T < tNine ? "10 players" : "you see the other 9 at once"} size={24} color={T < tNine ? C.number : C.gold} o={step(T, tTen - 0.1, tTen + 0.3)} />
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------- side view
const Side: React.FC<{ T: number }> = ({ T }) => {
  const S = 0.82;
  const leoX = track(T, [[X_SIDE, 1180], [tPass, 1300], [tPass + 0.4, 1320]]);
  const mateX = track(T, [[X_SIDE, 860], [tPass + 0.5, 930]]);
  const relX = tPass + 0.12;
  const catchT = relX + 0.55;
  const shotT = catchT + 0.45;
  const swishT = tPerfect + 0.02;
  // ball: dribble → behind-the-back pass → teammate → shot → swish → bounce
  let ball = { x: leoX + 46, y: GYM.lane - 120 - Math.abs(Math.sin((T - X_SIDE) * Math.PI * 3)) * 100 };
  if (T > relX) {
    const u = clamp((T - relX) / (catchT - relX));
    ball = { x: lerp(leoX - 50, mateX + 40, u), y: lerp(GYM.lane - 150, GYM.lane - 210, u) - 90 * Math.sin(Math.PI * u) };
  }
  if (T > catchT) ball = { x: mateX + 40, y: GYM.lane - 230 - (T > catchT + 0.25 ? (T - catchT - 0.25) * 400 : 0) };
  if (T > shotT) {
    const u = clamp((T - shotT) / (swishT - shotT));
    ball = { x: lerp(mateX + 30, GYM.hoopX - 30, u), y: lerp(GYM.lane - 300, GYM.hoopY - 10, u) - 380 * Math.sin(Math.PI * u) };
  }
  if (T > swishT) {
    const k = T - swishT;
    ball = { x: GYM.hoopX - 30 - k * 40, y: Math.min(GYM.floor - 2, GYM.hoopY + 20 + 900 * k * k) };
  }
  const leoPose: Pose = blendPose(
    { ...walk((T - X_SIDE) * 1.4, 0.35), shN: 40 + Math.sin((T - X_SIDE) * Math.PI * 6) * 14, elN: 40 },
    { shN: -70, elN: -30, lean: 6, headTilt: 0 },
    bump(T, relX - 0.25, relX - 0.02, relX + 0.15, relX + 0.45),
  );
  const leoFace: Partial<Face> = T > relX - 0.3 && T < catchT + 0.3 ? { ...FACES.calm, curve: 0.5 } : { ...FACES.smug, blink: blinkAt(T, [112.9]) };
  const matePose: Pose = blendPose(
    blendPose(breathe({ ...STAND, shN: 30, elN: 60 }, T), { shN: 70, elN: 40, shF: 60, elF: 40 }, bump(T, catchT - 0.15, catchT, catchT + 0.2, catchT + 0.3)),
    { shN: 160, elN: 20, shF: 150, elF: 26, bob: 0.08 },
    bump(T, shotT - 0.2, shotT, shotT + 0.2, shotT + 0.6),
  );
  // coach at the sideline
  const coachX = 520;
  const drop = T - tCoach - 0.25;
  const coachPose: Pose = blendPose(breathe({ ...STAND, shN: 40, elN: 70, shF: 10, elF: 20 }, T), { ...STAND, shN: 8, elN: 4, shF: 4, elF: 4, lean: -4 }, step(T, tCoach + 0.1, tCoach + 0.35));
  const coachFace: Partial<Face> = T > tCoach ? { ...FACES.shocked, open: 0.9, lookX: 0.8 } : { ...FACES.neutral, eye: "dot", lookX: 0.8 };
  const zoom = track(T, [[X_SIDE, 1.08], [shotT, 1.1], [swishT, 1.04], [tCoach - 0.25, 1.06], [tCoach + 0.05, 1.35]]);
  const cx = track(T, [[X_SIDE, 1160], [shotT, 1200], [swishT, 1560], [tCoach - 0.25, 1560], [tCoach + 0.05, 640]]);
  const cam: Cam = { x: cx - 960, y: track(T, [[X_SIDE, 70], [swishT, 10], [tCoach + 0.05, 140]]), zoom }; // coach shot: scoreboard (y ≤ 315) fully out of frame
  const whip = bump(T, tCoach - 0.25, tCoach - 0.12, tCoach - 0.04, tCoach + 0.05);
  const swish = clamp((T - swishT) / 0.4);
  return (
    <AbsoluteFill style={{ opacity: step(T, X_SIDE, X_SIDE + 0.3), filter: whip > 0.05 ? `blur(${(whip * 10).toFixed(1)}px)` : undefined }}>
      <GymSet cam={cam} t={T} clock="12:40">
        <Shadow x={mateX} y={GYM.far} w={32} />
        <Figure spec={EXTRA} id="s10mate" x={mateX} y={GYM.far} scale={0.8} pose={matePose} face={T > catchT ? FACES.happy : FACES.shocked} light={GYM_LIGHT} />
      </GymSet>
      <Layer cam={cam} p={1}>
        <Shadow x={coachX} y={GYM.near} w={40} />
        <Figure spec={EXTRA} id="s10coach" x={coachX} y={GYM.near} scale={0.86} facing={1} turn={0.8} pose={coachPose} face={coachFace} light={GYM_LIGHT} headExtra={<Cap r={EXTRA.D / 2} color="#3E5A7A" />} holdNear={drop < 0 ? <Clipboard s={1.1} rot={-20} /> : undefined} />
        {drop >= 0 && (
          <g transform={`translate(${coachX + 70 + drop * 60},${Math.min(GYM.near - 10, GYM.near - 190 + 1500 * drop * drop)}) rotate(${Math.min(drop * 500, 95)})`}>
            <Clipboard s={1.1} />
          </g>
        )}
        <Shadow x={leoX} y={GYM.lane} w={46} />
        <SenseRing T={T} at={relX - 0.3} x={leoX} y={GYM.lane - 326 * S} r={LEO.D * S * 0.62} />
        <Figure spec={LEO} id="s10leo" x={leoX} y={GYM.lane} scale={S} pose={leoPose} face={leoFace} light={GYM_LIGHT} />
        <Ball x={ball.x} y={ball.y} r={20} kind="basket" rot={T * 300} />
        {swish > 0 && swish < 1 && <circle cx={GYM.hoopX - 22} cy={GYM.hoopY + 20} r={30 + swish * 50} fill="none" stroke={C.gold} strokeWidth={3} opacity={1 - swish} />}
      </Layer>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

export const S10Basketball: React.FC<{ T: number }> = ({ T }) => (
  <AbsoluteFill>
    {T < X_SIDE + 0.4 && <CourtTop T={T} />}
    {T >= X_SIDE && <Side T={T} />}
  </AbsoluteFill>
);

export const _u = invLerp;
