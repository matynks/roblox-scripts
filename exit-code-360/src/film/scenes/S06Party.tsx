// S06 "Nobody sneaks up on you… your surprise party is ruined" (62.30–73.72)
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, LEO } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe, walk } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { PartyHat } from "../../props/Accessories";
import { ROOM, RoomBack, RoomForeground, Sofa, roomLight } from "../../env/LivingRoom";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, Ping, SenseRing, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, invLerp, lerp, rand, track } from "../../lib/anim";
import { P, talk } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const t0 = P(40).start; // 62.30 "Plus,"
const tRuined = P(43).start; // 65.82
const tHide = P(44).start; // 67.88
const tSpotted = P(45).start; // 69.96
const tLights = 71.0;
const tMate = P(46).start; // 71.32
const tPretend = P(47).end; // 73.35
const S = 0.82;
const STRIDE = 262 * S;
const HATS = ["#F27BAA", "#6FB6E8", "#F2C55C", "#8FD18A", "#C49AF0"];

const heads = Array.from({ length: 40 }).map((_, i) => {
  const row = i % 2;
  const k = Math.floor(i / 2);
  return {
    x: ROOM.sofaX0 + 60 + k * 42 + row * 21 + (rand(i) - 0.5) * 10,
    y: ROOM.sofaTop + 30 + row * 10 + rand(i * 3) * 8,
    s: 0.5 + row * 0.04 + rand(i * 5) * 0.05,
    hat: HATS[i % HATS.length],
    tilt: (rand(i * 7) - 0.5) * 40,
    ping: tSpotted + (k / 20) * 0.78 + row * 0.04,
    rise: tLights + 0.05 + rand(i * 11) * 0.25,
  };
});

const PeekHead: React.FC<{ h: (typeof heads)[number]; T: number; lights: number; rim: string; i: number }> = ({ h, T, lights, rim, i }) => {
  const up = ease.outBack(clamp((T - h.rise) / 0.35));
  const r = 42 * h.s;
  const y = h.y - up * 70 * h.s - Math.sin(T * 2 + i) * 1.5;
  const eyes = T > tSpotted + 0.9 && T < tLights ? 0.4 : 1; // sheepish squint once spotted
  return (
    <g transform={`translate(${h.x},${y})`}>
      {up > 0.05 && (
        <g opacity={up}>
          <path d={`M${-r * 0.5},${r * 1.2} L${-r * 1.3},${r * 0.1 - up * r * 0.6}`} stroke={C.ink} strokeWidth={r * 0.32} strokeLinecap="round" />
          <path d={`M${r * 0.5},${r * 1.2} L${r * 1.3},${r * 0.1 - up * r * 0.6}`} stroke={C.ink} strokeWidth={r * 0.32} strokeLinecap="round" />
        </g>
      )}
      <circle cx={-r * 0.06} cy={-r * 0.06} r={r} fill={rim} opacity={0.7} />
      <circle r={r} fill={C.ink} />
      <g transform={`rotate(${h.tilt})`}>
        <PartyHat r={r} color={h.hat} tilt={0} />
      </g>
      <ellipse cx={-r * 0.3} cy={-r * 0.1} rx={r * 0.17} ry={r * 0.17 * eyes} fill={C.eyeWhite} />
      <ellipse cx={r * 0.3} cy={-r * 0.1} rx={r * 0.17} ry={r * 0.17 * eyes} fill={C.eyeWhite} />
      {up > 0.5 && <path d={`M${-r * 0.2},${r * 0.4} Q0,${r * (0.4 - lights * 0.05)} ${r * 0.2},${r * 0.4}`} stroke={C.eyeWhite} strokeWidth={r * 0.1} fill="none" strokeLinecap="round" />}
    </g>
  );
};

export const S06Party: React.FC<{ T: number }> = ({ T }) => {
  const lights = step(T, tLights - 0.05, tLights + 0.25);
  const { light, rim } = roomLight(lights);
  const doorOpen = step(T, t0 - 0.05, t0 + 0.45);
  // Leo enters from the door and stops
  const leoX = track(T, [[t0 + 0.2, ROOM.doorX + 90], [tRuined - 0.3, 760]], ease.linear);
  const walking = T > t0 + 0.2 && T < tRuined - 0.3;
  const vEase = clamp(invLerp(t0 + 0.2, t0 + 0.6, T)) * (1 - clamp(invLerp(tRuined - 0.6, tRuined - 0.3, T)));
  const phase = (leoX - ROOM.doorX - 90) / STRIDE;
  let leoPose: Pose = walking ? walk(phase, vEase) : breathe({ ...STAND }, T);
  leoPose = blendPose(leoPose, { ...POSES.point, shN: 70, elN: 6 }, bump(T, tSpotted - 0.2, tSpotted + 0.1, tLights - 0.1, tLights + 0.2));
  const shrug = bump(T, tMate + 0.4, tMate + 0.7, tPretend - 0.2, tPretend + 0.3);
  const turn = lerp(1, 0.15, shrug);
  leoPose = blendPose(leoPose, POSES.frontShrug, shrug);
  let leoFace: Partial<Face> = { ...FACES.content, blink: blinkAt(T, [63.6, 67.2]) };
  if (T > tRuined && T < tHide) leoFace = { ...FACES.calm, curve: 0.5 };
  if (T >= tHide && T < tLights) leoFace = { ...FACES.smug, lookX: 0.8 };
  if (T >= tLights && T < tMate + 0.3) leoFace = { ...FACES.happy, eye: "dot", lookX: 0.7 };
  if (T >= tMate + 0.3) leoFace = { ...FACES.sly, lookX: 0.6 };
  if (T > tPretend + 0.05) leoFace = { ...FACES.laugh, open: 0.3 };

  // friend: hides behind the sofa's right end, pops up, flips the lights, complains
  // hides behind the sofa's right end, then steps out beside it to the light switch
  const fx = track(T, [[tLights - 0.45, 1585], [tLights - 0.02, 1730]]);
  const fBehind = T < tLights - 0.02;
  const fUp = step(T, tLights - 0.45, tLights - 0.1);
  const fPose: Pose = blendPose(
    blendPose({ ...POSES.crouch, lean: 20 }, { ...STAND, shN: 160, elN: 20 }, fUp),
    { ...POSES.handsOnHips, lean: -4 },
    step(T, tLights + 0.3, tLights + 0.6),
  );
  const fTalk = talk(T, tMate - 0.05, tPretend + 0.05);
  const fFace: Partial<Face> = T < tLights + 0.3 ? { ...FACES.shocked, eye: "dot" } : { ...FACES.grumpy, mouth: fTalk > 0 ? "talk" : "smile", open: fTalk, curve: -0.3, eye: "dot", lookX: -0.6 };

  // camera
  const zoom = track(T, [[t0, 0.93], [tHide - 0.2, 0.96], [tSpotted + 0.3, 1.08], [tPretend + 0.4, 1.1]]);
  const cx = track(T, [[t0, 1020], [tHide - 0.2, 1050], [tSpotted + 0.3, 1200], [tPretend + 0.4, 1230]]);
  const cam: Cam = { x: cx - 960, y: 10, zoom };
  const spotted = heads.filter((h) => T >= h.ping).length;
  const banner = step(T, tLights + 0.15, tLights + 0.45);
  const sag = 26 + 10 * step(T, tLights + 0.6, tLights + 1.4);

  return (
    <AbsoluteFill>
      <RoomBack cam={cam} t={T} lights={lights} doorOpen={doorOpen} />
      <Sofa cam={cam} lights={lights}>
        {fBehind && <Figure spec={EXTRA} id="s6friend" x={fx} y={ROOM.floor} scale={0.8} facing={-1} turn={1} pose={fPose} face={fFace} light={light} rim={rim} headExtra={<PartyHat r={EXTRA.D / 2} color="#6FB6E8" />} />}
        {heads.map((h, i) => (
          <PeekHead key={i} h={h} T={T} lights={lights} rim={rim} i={i} />
        ))}
        {banner > 0 && (
          <g opacity={banner}>
            <path d={`M980,${600 - banner * 60} Q1180,${600 - banner * 60 + sag} 1380,${600 - banner * 60}`} stroke="#E9E6E1" strokeWidth={3} fill="none" />
            <text x={1180} y={590 - banner * 60 + sag * 0.6} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={44} fill={C.gold} letterSpacing="4" transform={`rotate(${(sag - 26) * 0.2},1180,560)`}>
              SURPRISE!
            </text>
          </g>
        )}
      </Sofa>
      <Layer cam={cam} p={1}>
        {/* light switch */}
        <rect x={1700} y={520} width={26} height={40} rx={4} fill={lights > 0.5 ? "#E9E6E1" : "#6A6870"} />
        {/* confetti (a limp burst) */}
        {T > tLights + 0.1 &&
          Array.from({ length: 34 }).map((_, i) => {
            const k = T - tLights - 0.1;
            const vx = (rand(i) - 0.5) * 300;
            const vy = -260 - rand(i * 3) * 180;
            const x = 1180 + (rand(i * 5) - 0.5) * 500 + vx * k;
            const y = 640 + vy * k + 420 * k * k;
            if (y > 900) return null;
            return <rect key={i} x={x} y={y} width={10} height={6} fill={HATS[i % 5]} transform={`rotate(${k * 300 + i * 30},${x},${y})`} />;
          })}
        {!fBehind && (
          <g>
            <Shadow x={fx} y={ROOM.floor} w={34} />
            <Figure spec={EXTRA} id="s6friendF" x={fx} y={ROOM.floor} scale={0.8} facing={-1} turn={lerp(1, 0.55, step(T, tLights + 0.3, tLights + 0.6))} pose={fPose} face={fFace} light={light} rim={rim} headExtra={<PartyHat r={EXTRA.D / 2} color="#6FB6E8" />} />
          </g>
        )}
        {/* Leo */}
        <Shadow x={leoX} y={ROOM.floor} w={46} />
        <SenseRing T={T} at={tRuined + 0.05} x={leoX} y={ROOM.floor - 326 * S} r={LEO.D * S * 0.62} color={lights > 0.5 ? C.rimWarm : C.lineBlue} />
        <Figure spec={LEO} id="s6leo" x={leoX} y={ROOM.floor} scale={S} turn={turn} pose={leoPose} face={leoFace} light={light} rim={rim} />
        {heads.map((h, i) => (
          <Ping key={i} T={T} at={h.ping} x={h.x} y={h.y - 4} r={17} hold={0.7} />
        ))}
      </Layer>
      <RoomForeground cam={cam} lights={lights} />
      <Vignette strength={0.55} />
      <Label x={1760} y={110} text={`spotted ${spotted}/40`} size={24} color={C.gold} align="right" o={bump(T, tSpotted - 0.05, tSpotted + 0.15, tLights + 0.5, tLights + 0.9)} />
    </AbsoluteFill>
  );
};

export const S06_START = t0;
