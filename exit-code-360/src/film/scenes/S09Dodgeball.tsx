// S09 "Dodgeball" (95.86–106.99): 12 balls from every angle, dodged facing the wall;
// scoreboard 04:00 GAME OVER; teammates cheer; the other team writes a complaint.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, LEO } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { Ball, GYM, GYM_LIGHT, GymSet } from "../../env/Gym";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, SenseRing, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, invLerp, lerp, rand, track } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const t0 = P(62).start; // 95.86
const tTwelve = P(63).start; // 96.98
const tWall = P(65).start; // 100.18
const tOver = P(66).start; // 101.46
const tCheer = P(67).start; // 103.39
const tComplaint = P(68).start; // 104.75
const S = 0.82;
const LEO_X = 1800;
const HEAD_Y = GYM.lane - 326 * S;
const throwers = [360, 520, 680, 840, 1000];
type Kind = "head" | "torso" | "legs";
const KINDS: Kind[] = ["head", "torso", "legs", "torso", "head", "legs", "head", "torso", "legs", "head", "torso", "head"];
const balls = KINDS.map((k, i) => {
  const launch = 97.05 + i * 0.31;
  const lob = i % 4 === 2; // a few high lobs: "from every angle"
  const flight = lob ? 0.62 : 0.42;
  const passY = k === "head" ? HEAD_Y : k === "torso" ? GYM.lane - 200 * S : GYM.lane - 60;
  return { i, k, launch, pass: launch + flight, from: throwers[i % 5], passY, lob };
});

const ballPos = (b: (typeof balls)[number], T: number) => {
  if (T < b.launch) return null;
  const fx = b.from + 40;
  const fy = GYM.lane - 230 * 0.8;
  if (T <= b.pass) {
    const u = (T - b.launch) / (b.pass - b.launch);
    const arc = b.lob ? 320 : 40;
    return { x: lerp(fx, LEO_X, u), y: lerp(fy, b.passY, u) - arc * Math.sin(Math.PI * u), rot: u * 400 };
  }
  // continue to the wall, rebound and drop to the floor with a bounce
  const v = (LEO_X - fx) / (b.pass - b.launch);
  const tw = b.pass + (GYM.endWall - 22 - LEO_X) / v;
  if (T <= tw) return { x: LEO_X + v * (T - b.pass), y: b.passY, rot: 400 };
  const k = T - tw;
  const x = GYM.endWall - 22 - v * 0.28 * k;
  let y = b.passY + 1400 * k * k;
  const floorY = GYM.floor - 22 + 20;
  if (y > floorY) {
    const tb = Math.sqrt((floorY - b.passY) / 1400);
    const k2 = k - tb;
    y = floorY - Math.max(0, 420 * k2 - 1400 * k2 * k2);
  }
  return { x: Math.max(x, LEO_X - 260), y, rot: 400 - k * 500 };
};

export const S09Dodgeball: React.FC<{ T: number }> = ({ T }) => {
  // ---- camera: wide → push on Leo → tilt to scoreboard → teammates → whip to the other team
  const cx = track(T, [[t0 - 0.2, 1120], [tTwelve, 1250], [99.0, 1560], [tOver, 1580], [tOver + 0.4, GYM.board.x], [tCheer - 0.3, GYM.board.x], [tCheer + 0.05, 1640], [tComplaint - 0.1, 1640], [tComplaint + 0.18, 640]]);
  // keep the scoreboard (y 145–315) wholly inside the letterboxed frame during the push-in
  const cy = track(T, [[t0 - 0.2, 600], [99.0, 545], [tOver, 545], [tOver + 0.4, 330], [tCheer - 0.3, 330], [tCheer + 0.05, 725]]); // cheer + complaint shots: board fully out of frame
  const zoom = track(T, [[t0 - 0.2, 0.9], [tTwelve, 0.95], [99.0, 1.14], [tOver, 1.16], [tOver + 0.4, 1.7], [tCheer - 0.3, 1.75], [tCheer + 0.05, 1.2], [tComplaint + 0.18, 1.3]]);
  const cam: Cam = { x: cx - 960, y: cy - 540, zoom };
  const whip = bump(T, tComplaint - 0.1, tComplaint, tComplaint + 0.1, tComplaint + 0.2);

  // ---- Leo dodges (eyes closed, facing the wall)
  let leoPose: Pose = breathe({ ...STAND, shN: 8, elN: 14, shF: -8, elF: 14 }, T);
  let lane = GYM.lane;
  let sc = S;
  for (const b of balls) {
    const w = bump(T, b.pass - 0.17, b.pass - 0.06, b.pass + 0.06, b.pass + 0.17);
    if (w <= 0) continue;
    if (b.k === "head") leoPose = blendPose(leoPose, { ...POSES.crouch, lean: 22, headTilt: 10 }, w);
    if (b.k === "legs") leoPose = blendPose(leoPose, { ...STAND, hipN: 60, knN: 100, hipF: 40, knF: 90, shN: 50, elN: 30, shF: -40, elF: 30, bob: 0.55 }, w);
    if (b.k === "torso") {
      lane = lerp(GYM.lane, GYM.near, w);
      sc = lerp(S, S * 1.05, w);
      leoPose = blendPose(leoPose, { lean: -10, shN: 40, shF: -50, headTilt: -6 }, w);
    }
  }
  const cheer = step(T, tCheer - 0.1, tCheer + 0.2);
  leoPose = blendPose(leoPose, { ...POSES.standProud }, step(T, tOver - 0.2, tOver + 0.3));
  let leoFace: Partial<Face> = { ...FACES.calm, curve: 0.45 };
  if (T > tOver) leoFace = { ...FACES.smug, blink: blinkAt(T, [102.4, 105.6]) };

  // ---- opponents throw, then huddle to write a complaint
  const huddle = step(T, tOver + 0.2, tOver + 1.2);
  const opp = throwers.map((x0, j) => {
    const myThrows = balls.filter((b) => b.i % 5 === j);
    let pose: Pose = breathe({ ...STAND, lean: 6 }, T + j);
    for (const b of myThrows) {
      pose = blendPose(pose, { shN: -120, elN: -40, lean: -6, hipN: -10, hipF: 14 }, bump(T, b.launch - 0.3, b.launch - 0.1, b.launch - 0.1, b.launch - 0.05));
      pose = blendPose(pose, { shN: 70, elN: 6, lean: 14, hipN: 20, hipF: -14 }, bump(T, b.launch - 0.05, b.launch + 0.02, b.launch + 0.15, b.launch + 0.35));
    }
    const writer = j === 2;
    const hx = lerp(x0, 560 + j * 70, huddle);
    if (huddle > 0.5) pose = blendPose(pose, writer ? { ...STAND, lean: 24, shN: 60, elN: 50, shF: 50, elF: 40 } : { ...STAND, lean: 14, shN: 30, elN: 60, shF: 20, elF: 60, headTilt: 10 }, 1);
    const face: Partial<Face> = huddle > 0.5 ? { ...FACES.angry, mouth: T > tComplaint && writer ? "talk" : "smile", open: 0.2 + 0.2 * Math.abs(Math.sin(T * 9 + j)), curve: -0.3, lookY: 0.4 } : { ...FACES.determined, eye: "dot" };
    return { x: hx, pose, face, j, facing: (huddle > 0.5 && j > 2 ? -1 : 1) as 1 | -1 };
  });
  const dodged = balls.filter((b) => T > b.pass + 0.05).length;
  const mates = [1440, 1550, 1660];

  return (
    <AbsoluteFill style={{ filter: whip > 0.05 ? `blur(${(whip * 10).toFixed(1)}px)` : undefined }}>
      <GymSet cam={cam} t={T} clock={T < tOver ? "03:5" + Math.min(9, Math.floor(((T - t0) / (tOver - t0)) * 10)) : "04:00"} gameOver={step(T, tOver + 0.3, tOver + 0.5)}>
        {mates.map((x, k) => {
          const c = bump(T, tCheer - 0.05 + k * 0.06, tCheer + 0.15, 106.6, 107.2);
          const pose = blendPose(breathe({ ...STAND, shN: 6, shF: -6 }, T + k), { ...POSES.cheer, bob: 0.08 * Math.abs(Math.sin((T - tCheer) * 8 + k)) }, c);
          return (
            <g key={k}>
              <Shadow x={x} y={GYM.far} w={30} o={0.3} />
              <Figure spec={EXTRA} id={`s9m${k}`} x={x} y={GYM.far} scale={0.74} facing={1} turn={0.6} pose={pose} face={c > 0.3 ? FACES.laugh : FACES.shocked} light={GYM_LIGHT} />
            </g>
          );
        })}
      </GymSet>
      <Layer cam={cam} p={1}>
        {opp.map((o) => (
          <g key={o.j}>
            <Shadow x={o.x} y={GYM.lane} w={34} />
            <Figure spec={EXTRA} id={`s9o${o.j}`} x={o.x} y={o.j % 2 ? GYM.far + 18 : GYM.lane} scale={0.8} facing={o.facing} turn={1} pose={o.pose} face={o.face} light={GYM_LIGHT} />
          </g>
        ))}
        {/* complaint sheet */}
        {huddle > 0.5 && (
          <g transform={`translate(${lerp(700, 690, step(T, tComplaint, tComplaint + 1))},${GYM.lane - 200}) rotate(-6)`} opacity={step(T, tOver + 0.8, tOver + 1.2)}>
            <rect x={-70} y={-50} width={140} height={100} rx={4} fill="#EDE8DF" />
            <text x={0} y={-24} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={17} fill="#C23A48" letterSpacing="2">
              COMPLAINT
            </text>
            {[0, 1, 2, 3].map((k) => (
              <path key={k} d={`M-54,${-6 + k * 14} L${-54 + Math.min(108, Math.max(0, (T - tComplaint - k * 0.35) * 160))},${-6 + k * 14}`} stroke="#3A3A4A" strokeWidth={2} />
            ))}
          </g>
        )}
        <Shadow x={LEO_X} y={lane} w={46} />
        {balls.map((b) => (
          <SenseRing key={b.i} T={T} at={b.pass - 0.3} x={LEO_X} y={HEAD_Y} r={LEO.D * S * 0.62} />
        ))}
        <Figure spec={LEO} id="s9leo" x={LEO_X} y={lane} scale={sc} pose={blendPose(leoPose, POSES.cheer, cheer * 0.4)} face={leoFace} light={GYM_LIGHT} />
        {balls.map((b) => {
          const p = ballPos(b, T);
          return p ? <Ball key={b.i} x={p.x} y={p.y} rot={p.rot} /> : null;
        })}
      </Layer>
      <Vignette strength={0.5} />
      <Label x={1780} y={100} text={`dodged ${dodged}/12`} size={24} color={C.gold} align="right" o={bump(T, 97.2, 97.5, tOver - 0.1, tOver + 0.2)} />
    </AbsoluteFill>
  );
};

export const _r = rand;
export const _e = ease;
export const _c = clamp;
export const _i = invLerp;
