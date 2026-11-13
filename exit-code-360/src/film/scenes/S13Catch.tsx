// S13 "The catch? Nothing is background." (136.52–151.23): attention reticle jumps
// moth (left) → car honk (right) → flag (behind) → overload.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { LEO } from "../../characters/cast";
import { FACES, blinkAt, breathe } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { STREET, STREET_LIGHT, StreetForeground, StreetSet } from "../../env/Street";
import { LearnerCar } from "../../env/Car";
import { Vignette } from "../../env/Atmosphere";
import { Layer, toScreen, type Cam } from "../../lib/camera";
import { Label, Ping, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, rand, track, wobble } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";

const t0 = P(88).start; // 136.52
const tBg = P(89).start; // 137.64
const tMoth = P(90).start; // 139.24
const tJump1 = P(91).start; // 140.92
const tCar = P(92).start; // 142.28
const tJump2 = P(93).start; // 143.88
const tFlag = P(94).start; // 144.76
const tJump3 = P(95).start; // 146.68
const tAll = P(96).start; // 147.79
const LEO_X = 1150;
const S = 0.86;

const mothAt = (T: number) => ({ x: 660 + Math.sin(T * 3.1) * 70 + Math.sin(T * 7.3) * 18, y: 560 + Math.sin(T * 4.2) * 40 + Math.cos(T * 9) * 12 });
// the car drives left → right and honks once it is on Leo's right (x ≈ 1600)
const carX = (T: number) => lerp(-700, 2600, clamp((T - (tCar + 0.15 - 0.697 * 3.4)) / 3.4));
const FLAG = { x: 820, y: 300 };

export const S13Catch: React.FC<{ T: number }> = ({ T }) => {
  const zoom = track(T, [[t0 - 0.3, 1.2], [tAll, 1.28], [151.2, 1.36]]);
  const cam: Cam = { x: 1150 - 960, y: 60, zoom };
  const moth = mothAt(T);
  const cx = carX(T);
  // reticle targets in world space
  const tgt = (() => {
    if (T < tCar) return { x: moth.x, y: moth.y };
    if (T < tFlag) return { x: cx + 100, y: 860 };
    return { x: FLAG.x + 60, y: FLAG.y + 30 };
  })();
  const snapTimes = [tMoth + 0.2, tCar + 0.15, tFlag + 0.15];
  let snap = 0;
  snapTimes.forEach((s) => {
    if (T > s) snap = Math.max(snap, 1 - clamp((T - s) / 0.15));
  });
  const reticleOn = step(T, tMoth, tMoth + 0.25) * (1 - step(T, tAll + 2.2, tAll + 2.8));
  const overload = step(T, tAll, tAll + 0.6);
  const jitter = overload * 30;
  const rx = tgt.x + Math.sin(T * 23) * jitter;
  const ry = tgt.y + Math.cos(T * 19) * jitter;
  const scr = toScreen(cam, 1, rx, ry);
  // Leo reacts to each jump
  const jolt = wobble(T, tMoth + 0.2, 6, 4, 6) + wobble(T, tCar + 0.15, 7, 4, 6) + wobble(T, tFlag + 0.15, 7, 4, 6);
  const lookX = T < tMoth ? 0.4 : T < tCar ? -0.9 : T < tFlag ? 0.9 : T < tAll ? -0.8 : Math.sin(T * 7) * 0.9;
  const leoPose: Pose = breathe({ ...STAND, headTilt: jolt + overload * Math.sin(T * 9) * 4, shN: 10, elN: 20, shF: -10, elF: 20 }, T);
  let leoFace: Partial<Face> = { ...FACES.neutral, eye: "dot", lookX, blink: blinkAt(T, [138.4]) };
  if (T > tMoth) leoFace = { ...FACES.stare, lookX, eyeScale: 1.05 };
  if (T > tAll) leoFace = { ...FACES.worried, lookX, mouth: "wobble", brow: 1, browY: 0.4 };
  const honk = bump(T, tCar + 0.15, tCar + 0.25, tCar + 0.9, tCar + 1.2);
  const pings = Array.from({ length: 18 }).map((_, i) => ({ x: 300 + rand(i) * 1700, y: 200 + rand(i * 3) * 650, at: tAll + 0.15 + i * 0.13 }));
  return (
    <AbsoluteFill>
      <StreetSet cam={cam} t={T}>
        {/* flag on a pole on the facade, flapping */}
        <g>
          <path d={`M${FLAG.x},${FLAG.y + 120} L${FLAG.x},${FLAG.y - 20}`} stroke="#1A1420" strokeWidth={7} />
          <path
            d={`M${FLAG.x},${FLAG.y - 14} ${Array.from({ length: 9 })
              .map((_, k) => `L${FLAG.x + k * 15},${FLAG.y - 14 + Math.sin(T * 9 - k * 0.8) * (k * 1.6)}`)
              .join(" ")} L${FLAG.x + 120},${FLAG.y + 60 + Math.sin(T * 9 - 7) * 12} ${Array.from({ length: 9 })
              .map((_, k) => `L${FLAG.x + 120 - k * 15},${FLAG.y + 60 + Math.sin(T * 9 - (8 - k) * 0.8) * ((8 - k) * 1.6)}`)
              .join(" ")}Z`}
            fill="#C9473F"
          />
        </g>
        {/* moth */}
        <g transform={`translate(${moth.x},${moth.y})`}>
          <ellipse rx={4} ry={9} fill="#3A2E2A" />
          <path d={`M0,-2 L${-16},${-12 + Math.sin(T * 40) * 8} L${-12},6Z M0,-2 L16,${-12 + Math.sin(T * 40) * 8} L12,6Z`} fill="#D8C8A8" opacity={0.85} />
        </g>
      </StreetSet>
      <Layer cam={cam} p={1}>
        <Shadow x={LEO_X} y={STREET.walk} w={48} />
        <Figure spec={LEO} id="s13leo" x={LEO_X} y={STREET.walk} scale={S} turn={0.6} pose={leoPose} face={leoFace} light={STREET_LIGHT} />
        {T > tCar - 2.6 && T < tCar + 1.4 && (
          <g>
            <LearnerCar x={cx} y={1070} dist={cx} s={0.95} learner={false} color="#7A4A5A" />
            {honk > 0 &&
              [0, 1, 2].map((k) => (
                <path key={k} d={`M${cx + 270 + k * 26},${940 - 50} q20,30 0,60`} stroke={C.gold} strokeWidth={4} fill="none" opacity={honk * (1 - k * 0.25)} strokeLinecap="round" transform={`translate(${(T * 120) % 26},0)`} />
              ))}
          </g>
        )}
        {pings.map((p, i) => (
          <Ping key={i} T={T} at={p.at} x={p.x} y={p.y} r={26} hold={0.7} />
        ))}
      </Layer>
      <StreetForeground cam={cam} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }} opacity={reticleOn}>
        <g transform={`translate(${scr.x},${scr.y}) scale(${1 + snap * 0.6})`}>
          <circle r={64} fill="none" stroke={C.gold} strokeWidth={3} />
          {[0, 90, 180, 270].map((a) => (
            <path key={a} d="M0,-80 L0,-56" stroke={C.gold} strokeWidth={3} transform={`rotate(${a})`} />
          ))}
          <circle r={4} fill={C.gold} />
        </g>
      </svg>
      <Vignette strength={0.5} />
      <Label x={960} y={96} text="the catch" size={26} color={C.gold} o={bump(T, t0 - 0.1, t0 + 0.3, tBg - 0.1, tBg + 0.1)} />
      <Label x={960} y={96} text="nothing is background" size={24} color={C.lineBlue} o={bump(T, tBg, tBg + 0.3, tMoth - 0.1, tMoth + 0.2)} />
      <Label x={960} y={96} text="attention · jump" size={24} color={C.gold} o={Math.max(bump(T, tJump1, tJump1 + 0.2, tJump1 + 0.9, tJump1 + 1.1), bump(T, tJump2, tJump2 + 0.2, tJump2 + 0.6, tJump2 + 0.8), bump(T, tJump3, tJump3 + 0.2, tJump3 + 0.6, tJump3 + 0.8))} />
      <Label x={960} y={96} text="distracted by everything" size={24} color={C.coral} o={step(T, tAll + 0.3, tAll + 0.7)} />
      <Label x={toScreen(cam, 1, moth.x, moth.y).x} y={toScreen(cam, 1, moth.x, moth.y).y + 80} text="moth · left" size={16} color={C.gold} o={bump(T, tMoth + 0.3, tMoth + 0.5, tCar - 0.3, tCar)} />
      <Label x={1500} y={780} text="car · right" size={16} color={C.gold} o={bump(T, tCar + 0.3, tCar + 0.5, tFlag - 0.3, tFlag)} />
      <Label x={toScreen(cam, 1, FLAG.x + 60, FLAG.y).x} y={toScreen(cam, 1, FLAG.x, FLAG.y).y - 80} text="flag · behind" size={16} color={C.gold} o={bump(T, tFlag + 0.3, tFlag + 0.5, tAll - 0.2, tAll)} />
    </AbsoluteFill>
  );
};

export const _e = ease;
