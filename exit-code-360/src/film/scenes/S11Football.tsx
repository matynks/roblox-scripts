// S11 "Football next" (115.83–125.62): 22 players; the referee's view misses a foul
// behind him; Leo (linesman, 360° ring) flags every foul, shove and dive.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { LEO } from "../../characters/cast";
import { FACES, POSES, blendPose, breathe, run } from "../../characters/poses";
import { STAND, type CharacterSpec, type Face, type Pose } from "../../characters/types";
import { LinesmanFlag, PITCH, PITCH_LIGHT, PitchGround, RED, REF, Stands, WHITE } from "../../env/Pitch";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, Ping, SenseRing, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, rand, track } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";

const t0 = P(75).start; // 115.83
const t22 = P(76).start; // 117.11
const tRef = P(77).start; // 119.03
const tYou = P(78).start; // 121.03
const tFoul = P(79).start; // 121.99
const tShove = P(80).start; // 123.11
const tDive = P(81).start; // 124.23

type Pl = { spec: CharacterSpec; x: number; lane: number; s: number; facing: 1 | -1; speed: number; ph: number };
const crowd: Pl[] = Array.from({ length: 22 }).map((_, i) => ({
  spec: i % 2 ? RED : WHITE,
  x: -200 + (i * 173) % 3200 + rand(i) * 80,
  lane: [PITCH.far, PITCH.mid - 20, PITCH.far + 22][i % 3],
  s: [0.6, 0.7, 0.64][i % 3],
  facing: (rand(i * 7) > 0.5 ? 1 : -1) as 1 | -1,
  speed: 90 + rand(i * 3) * 160,
  ph: rand(i * 5),
}));

/** A player who falls over (rotated about the feet). */
const Fall: React.FC<{ spec: CharacterSpec; id: string; x: number; y: number; s: number; facing: 1 | -1; k: number; pose: Pose; face: Partial<Face> }> = ({ spec, id, x, y, s, facing, k, pose, face }) => (
  <g transform={`rotate(${facing * 84 * ease.in(clamp(k))},${x},${y})`}>
    <Figure spec={spec} id={id} x={x} y={y} scale={s} facing={facing} pose={pose} face={face} light={PITCH_LIGHT} rim="#DDE4FF" />
  </g>
);

export const S11Football: React.FC<{ T: number }> = ({ T }) => {
  const zoom = track(T, [[t0 - 0.2, 0.92], [t22 + 1, 0.95], [tRef - 0.2, 1.2], [tYou - 0.3, 1.2], [tYou + 0.3, 1.05], [125.6, 1.08]]);
  const cx = track(T, [[t0 - 0.2, 1000], [tRef - 0.2, 1300], [tYou - 0.3, 1300], [tYou + 0.3, 1050], [125.6, 1100]]);
  const cam: Cam = { x: cx - 960, y: track(T, [[t0, -40], [tRef, 40], [tYou + 0.3, 30]]), zoom };
  const light = PITCH_LIGHT;
  const rim = "#DDE4FF";

  // referee + his view cone; a foul behind him he cannot see
  const refX = 1380;
  const refPose = breathe({ ...STAND, shN: 20, elN: 30 }, T);
  const cone = bump(T, tRef - 0.1, tRef + 0.3, tYou - 0.2, tYou + 0.1);
  const hidden = clamp((T - tRef - 0.4) / 0.6);

  // Leo the linesman with a flag on the touchline
  const leoX = 900;
  const flagUp = Math.max(bump(T, tFoul - 0.05, tFoul + 0.1, tFoul + 0.6, tFoul + 0.8), bump(T, tShove - 0.05, tShove + 0.1, tShove + 0.6, tShove + 0.8), bump(T, tDive - 0.05, tDive + 0.1, tDive + 0.7, tDive + 0.9));
  const leoPose: Pose = blendPose(breathe({ ...STAND, shN: 14, elN: 10 }, T), { shN: 165, elN: 6 }, flagUp);
  const leoFace: Partial<Face> = T > tYou - 0.1 ? { ...FACES.calm, curve: 0.45 } : FACES.content;
  const leoIn = step(T, tYou - 0.35, tYou + 0.1);
  const ring = step(T, tYou - 0.1, tYou + 0.4);

  // incidents
  const foulK = clamp((T - tFoul - 0.1) / 0.45);
  const shoveK = clamp((T - tShove - 0.15) / 0.5);
  const diveK = clamp((T - tDive - 0.05) / 0.5);

  return (
    <AbsoluteFill>
      <Stands cam={cam} t={T} />
      <PitchGround cam={cam} t={T}>
        {crowd.map((p, i) => {
          const x = p.x + p.facing * p.speed * (T - t0);
          const dim = 1 - 0.6 * step(T, tYou - 0.3, tYou + 0.2);
          return (
            <g key={i} opacity={dim}>
              <Shadow x={x} y={p.lane} w={22} o={0.3} />
              <Figure spec={p.spec} id={`s11p${i}`} x={x} y={p.lane} scale={p.s} facing={p.facing} pose={p.speed > 170 ? run((T - t0) * 2.4 + p.ph, 0.8) : run((T - t0) * 1.6 + p.ph, 0.45)} face={FACES.determined} light={light} rim={rim} rimAmt={0.6} />
            </g>
          );
        })}
        {/* referee */}
        <Shadow x={refX} y={PITCH.mid} w={34} />
        {cone > 0 && (
          <g opacity={cone}>
            <path d={`M${refX + 18},${PITCH.mid - 268} L${refX + 640},${PITCH.mid - 470} L${refX + 640},${PITCH.mid + 40}Z`} fill={C.lineBlue} opacity={0.16} />
            <path d={`M${refX + 18},${PITCH.mid - 268} L${refX + 640},${PITCH.mid - 470} M${refX + 18},${PITCH.mid - 268} L${refX + 640},${PITCH.mid + 40}`} stroke={C.lineBlue} strokeWidth={2.4} opacity={0.8} />
          </g>
        )}
        <Figure spec={REF} id="s11ref" x={refX} y={PITCH.mid} scale={0.8} pose={refPose} face={{ ...FACES.determined, lookX: 0.6 }} light={light} rim={rim} />
        {/* the hidden foul behind the referee */}
        {T > tRef && T < tYou + 0.6 && (
          <g opacity={1 - step(T, tYou, tYou + 0.6)}>
            <Fall spec={RED} id="s11h1" x={1040} y={PITCH.mid} s={0.78} facing={1} k={hidden} pose={run(T * 2, 0.6)} face={FACES.shocked} />
            <Figure spec={WHITE} id="s11h2" x={940} y={PITCH.mid} scale={0.78} pose={{ ...STAND, hipN: 60, knN: 0, lean: -10 }} face={FACES.sly} light={light} rim={rim} />
            <text x={1000} y={PITCH.mid - 330} textAnchor="middle" fontFamily="Montserrat" fontSize={80} fontWeight={800} fill={C.coral} opacity={hidden}>
              ?
            </text>
          </g>
        )}
        {/* incidents Leo spots */}
        {T > tYou && (
          <g>
            <Fall spec={WHITE} id="s11f1" x={1460} y={PITCH.far + 10} s={0.66} facing={1} k={foulK} pose={run(T * 2.2, 0.7)} face={FACES.shocked} />
            <Figure spec={RED} id="s11f2" x={1390} y={PITCH.far + 10} scale={0.66} pose={{ ...STAND, hipN: 60, knN: 0, lean: -12 }} face={FACES.sly} light={light} rim={rim} />
            <Figure spec={RED} id="s11s1" x={480 - shoveK * 10} y={PITCH.far} scale={0.62} pose={{ ...STAND, shN: 86, elN: 0, shF: 80, elF: 0, lean: 14 }} face={FACES.angry} light={light} rim={rim} />
            <g transform={`rotate(${shoveK * 26},${560 + shoveK * 50},${PITCH.far})`}>
              <Figure spec={WHITE} id="s11s2" x={560 + shoveK * 50} y={PITCH.far} scale={0.62} facing={-1} pose={{ ...STAND, shN: 60, elN: 20, shF: 70, elF: 20 }} face={FACES.shocked} light={light} rim={rim} />
            </g>
            <Fall spec={WHITE} id="s11d1" x={1660} y={PITCH.mid - 10} s={0.74} facing={-1} k={diveK} pose={{ ...STAND, shN: 120, elN: 10, shF: 120, elF: 10 }} face={diveK > 0.5 ? { ...FACES.cry, tears: 0 } : FACES.sly} />
          </g>
        )}
        {/* Leo */}
        <g opacity={leoIn}>
          <Shadow x={leoX} y={PITCH.near} w={48} />
          {ring > 0 && <circle cx={leoX} cy={PITCH.near - 326 * 0.86} r={70 + ring * 40} fill="none" stroke={C.gold} strokeWidth={3} opacity={ring * 0.8} />}
          <SenseRing T={T} at={tFoul - 0.3} x={leoX} y={PITCH.near - 326 * 0.86} r={LEO.D * 0.86 * 0.62} />
          <SenseRing T={T} at={tShove - 0.3} x={leoX} y={PITCH.near - 326 * 0.86} r={LEO.D * 0.86 * 0.62} />
          <SenseRing T={T} at={tDive - 0.3} x={leoX} y={PITCH.near - 326 * 0.86} r={LEO.D * 0.86 * 0.62} />
          <Figure spec={LEO} id="s11leo" x={leoX} y={PITCH.near} scale={0.86} turn={0.75} pose={leoPose} face={leoFace} light={light} rim={rim} holdNear={<LinesmanFlag up={flagUp} />} />
        </g>
        <Ping T={T} at={tFoul + 0.35} x={1440} y={PITCH.far - 110} r={80} label="FOUL" hold={0.95} />
        <Ping T={T} at={tShove + 0.4} x={530} y={PITCH.far - 150} r={84} label="SHOVE" hold={0.95} />
        <Ping T={T} at={tDive + 0.4} x={1640} y={PITCH.mid - 130} r={88} label="DIVE" hold={1.1} color={C.coral} />
      </PitchGround>
      <Vignette strength={0.55} />
      <Label x={960} y={100} text="22 players" size={24} color={C.number} o={bump(T, t22, t22 + 0.3, tRef - 0.3, tRef)} />
      <Label x={960} y={100} text="the referee can't see behind him" size={22} color={C.lineBlue} o={bump(T, tRef + 0.1, tRef + 0.4, tYou - 0.3, tYou)} />
      <Label x={960} y={100} text="you can" size={26} color={C.gold} o={bump(T, tYou, tYou + 0.3, tFoul - 0.1, tFoul + 0.2)} />
    </AbsoluteFill>
  );
};

export const _l = lerp;
export const _p = POSES;
