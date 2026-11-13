// S07 "Pickpockets are doomed" (73.72–82.55)
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, LEO } from "../../characters/cast";
import { FACES, blendPose, blinkAt, breathe, run, walk } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { Backpack, Beanie } from "../../props/Accessories";
import { STREET, STREET_LIGHT, StreetForeground, StreetSet } from "../../env/Street";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { SenseRing, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, invLerp, lerp, rand, track } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { integrate } from "../../scenes/poc/timeline";

const t0 = P(48).start; // 73.72
const tHand = P(49).start; // 75.32
const tSee = P(50).start; // 77.40
const tBefore = P(51).start; // 78.28
const tSorry = P(52).start; // 79.75
const tRun = P(53).start; // 81.35
const tTap = tBefore + 0.12;
const S = 0.82;
const STRIDE = 262 * S;

const vLeo = (T: number) => track(T, [[t0 - 0.5, 170], [tTap - 0.3, 170], [tTap + 0.5, 0]]);
const vThief = (T: number) => track(T, [[t0 - 0.5, 170], [tHand, 170], [tHand + 0.4, 205], [tHand + 1.4, 175], [tTap - 0.3, 170], [tTap + 0.3, 0]]);

export const S07Pickpocket: React.FC<{ T: number }> = ({ T }) => {
  const dL = integrate(vLeo, t0 - 0.5, T);
  const dT = integrate(vThief, t0 - 0.5, T);
  const leoX = 700 + dL;
  const runAway = Math.max(0, T - tRun);
  const thiefX = 700 - 330 + dT - (runAway > 0 ? integrate((x) => track(x, [[tRun, 0], [tRun + 0.35, 560]]), tRun, T) : 0);
  const zoom = track(T, [[t0, 1.1], [tHand + 0.2, 1.12], [tSee, 1.28], [tRun, 1.3], [tRun + 0.7, 1.22]]);
  // tracking shot; framing shifts to give the thief room behind Leo
  const cam: Cam = { x: leoX - 960 + lerp(60, -90, step(T, tHand, tSee)) / zoom, y: 30, zoom };

  // ---- Leo
  const leoWalk = clamp(1 - invLerp(tTap - 0.3, tTap + 0.5, T));
  let leoPose: Pose = blendPose(breathe({ ...STAND }, T), walk(dL / STRIDE, 1), leoWalk);
  // backhand tap without looking
  leoPose = blendPose(leoPose, { shF: -84, elF: -20, lean: 2 }, bump(T, tTap - 0.22, tTap, tTap + 0.18, tTap + 0.6));
  let leoFace: Partial<Face> = { ...FACES.content, blink: blinkAt(T, [74.9, 76.4]) };
  if (T > tSee - 0.05 && T < tSorry) leoFace = { ...FACES.calm, curve: 0.45 };
  if (T >= tSorry) leoFace = { ...FACES.sly, lookX: -0.5 };

  // ---- thief: tiptoe, reach, frozen, bow, run
  const tWalk = walk(dT / (STRIDE * 0.9), 0.75);
  let thPose: Pose = { ...tWalk, lean: 12, footN: tWalk.footN - 15, footF: tWalk.footF - 15 };
  thPose = blendPose(thPose, { shN: 78, elN: 6, lean: 16 }, step(T, tHand + 0.1, tHand + 1.2) * (1 - step(T, tTap, tTap + 0.12)));
  thPose = blendPose(thPose, { ...STAND, shN: 30, elN: 100, shF: 20, elF: 100, lean: -6 }, step(T, tTap + 0.05, tTap + 0.2));
  thPose = blendPose(thPose, { ...STAND, lean: 38, headTilt: 10, shN: 34, elN: 70, shF: 30, elF: 74 }, bump(T, tSorry - 0.1, tSorry + 0.25, tRun - 0.25, tRun));
  let thFacing: 1 | -1 = 1;
  if (T > tRun - 0.05) {
    thFacing = -1;
    thPose = run((T - tRun) * 2.6, 1);
  }
  let thFace: Partial<Face> = { ...FACES.sly, eye: "lid", lookX: 0.6 };
  if (T > tTap) thFace = { ...FACES.shocked, eye: "wide" };
  if (T > tSorry - 0.1) thFace = { ...FACES.worried, eye: "closed", mouth: "wobble" };
  if (T > tRun - 0.05) thFace = { ...FACES.shocked, eye: "dot" };

  // pedestrians on the far side of the pavement
  const peds = [0, 1, 2, 3].map((i) => {
    const dir = i % 2 ? 1 : -1;
    const sp = 120 + rand(i) * 40;
    const x = 400 + i * 700 + dir * sp * (T - t0);
    return { x, dir: dir as 1 | -1, ph: (sp * (T - t0)) / (262 * 0.68) + i * 0.3, i };
  });
  const tap = clamp((T - tTap) / 0.35);

  return (
    <AbsoluteFill>
      <StreetSet cam={cam} t={T}>
        {peds.map((p) => (
          <g key={p.i}>
            <Shadow x={p.x} y={STREET.far - 30} w={22} o={0.25} />
            <Figure spec={EXTRA} id={`s7p${p.i}`} x={p.x} y={STREET.far - 30} scale={0.56} facing={p.dir} pose={walk(p.ph * 1.18, 0.9)} face={FACES.content} light={STREET_LIGHT} rimAmt={0.4} opacity={0.82} />
          </g>
        ))}
      </StreetSet>
      <Layer cam={cam} p={1}>
        <Shadow x={thiefX} y={STREET.walk} w={36} />
        {runAway > 0 &&
          [1, 2].map((g) => (
            <g key={g} opacity={0.18 / g}>
              <Figure spec={EXTRA} id={`s7gh${g}`} x={thiefX + g * 30} y={STREET.walk} scale={0.8} facing={-1} pose={run((T - tRun - g * 0.04) * 2.6, 1)} face={thFace} light={STREET_LIGHT} headExtra={<Beanie r={EXTRA.D / 2} />} />
            </g>
          ))}
        <Figure spec={EXTRA} id="s7thief" x={thiefX} y={STREET.walk} scale={0.8} facing={thFacing} pose={thPose} face={thFace} light={STREET_LIGHT} headExtra={<Beanie r={EXTRA.D / 2} />} />
        <Shadow x={leoX} y={STREET.walk} w={46} />
        <SenseRing T={T} at={tSee + 0.05} x={leoX} y={STREET.walk - 326 * S} r={LEO.D * S * 0.62} />
        <Figure spec={LEO} id="s7leo" x={leoX} y={STREET.walk} scale={S} pose={leoPose} face={leoFace} light={STREET_LIGHT} backExtra={<Backpack torsoW={LEO.torsoW} torsoLen={LEO.torsoLen} />} />
        {tap > 0 && tap < 1 && (
          <g opacity={1 - tap}>
            {Array.from({ length: 8 }).map((_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const cx = leoX - 92;
              const cy = STREET.walk - 230;
              return <path key={i} d={`M${cx + Math.cos(a) * 12},${cy + Math.sin(a) * 12} L${cx + Math.cos(a) * (18 + tap * 34)},${cy + Math.sin(a) * (18 + tap * 34)}`} stroke={C.gold} strokeWidth={3} strokeLinecap="round" />;
            })}
          </g>
        )}
      </Layer>
      <StreetForeground cam={cam} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
