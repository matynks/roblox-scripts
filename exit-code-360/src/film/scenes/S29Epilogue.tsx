// S29 "Weeks later…" (352.37–379.09): promenade callback. New mask, eyes closed,
// BOO, a real jump, laughter on time, the spark lights, SCARES 1 / TRIES 413.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { LEO, MIA } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe, walk } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { CardboardMask, Sandwich } from "../../props/Props";
import { Foreground, Hills, KEY_LIGHT, PROM, PromenadeSet, SkySea } from "../../env/Promenade";
import { Vignette } from "../../env/Atmosphere";
import { SparkIcon, IconDefs } from "../../graphics/Icons";
import { type Cam } from "../../lib/camera";
import { Label, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, rand, track, wobble } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const tWeeks = P(222).start; // 352.37
const tTiptoe = P(223).start; // 353.33
const tClose = P(225).start; // 357.01
const tBoo = P(226).start; // 358.53
const tJump = P(227).start; // 359.57
const tScream = P(229).start; // 361.83
const tLaugh = P(230).start; // 363.35
const tSpark = P(232).start; // 365.99
const tBook = P(233).start; // 368.31
const tOne = P(235).start; // 370.63
const tTries = P(236).start; // 371.65
const tOpen = P(238).start; // 374.61
const tOnly = P(240).start; // 377.41
const LEO_X = 820;

const Insert: React.FC<{ T: number }> = ({ T }) => {
  const one = step(T, tOne - 0.1, tOne + 0.2);
  const n = Math.round(lerp(412, 413, step(T, tTries + 0.9, tTries + 1.2)));
  return (
    <AbsoluteFill style={{ background: "#120C14" }}>
      <svg width={1920} height={1080}>
        <g transform={`translate(960 560) rotate(${2 + Math.sin(T * 0.6) * 0.6})`}>
          <rect x={-560} y={-380} width={1120} height={760} rx={16} fill="#F27BAA" />
          <rect x={-540} y={-360} width={1080} height={720} rx={10} fill="#F4EEE4" />
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} d={`M-500,${-280 + i * 48} L500,${-280 + i * 48}`} stroke="#A9BBD6" strokeWidth={2} opacity={0.6} />
          ))}
          <text x={-360} y={-150} fontFamily={FONT} fontWeight={800} fontSize={86} fill="#3A3550" letterSpacing="4">SCARES:</text>
          <text x={150} y={-150} fontFamily={FONT} fontWeight={800} fontSize={110} fill="#C23A48" opacity={1 - one * 0.5}>0</text>
          {one > 0 && <path d={`M140,-210 L${140 + one * 90},-170`} stroke="#3A3550" strokeWidth={10} strokeLinecap="round" />}
          <text x={270} y={-140} fontFamily={FONT} fontWeight={800} fontSize={130} fill="#2E8A5A" opacity={one} transform={`rotate(-6,300,-180)`}>1</text>
          <text x={-360} y={90} fontFamily={FONT} fontWeight={800} fontSize={86} fill="#3A3550" letterSpacing="4" opacity={step(T, tTries - 0.1, tTries + 0.2)}>TRIES:</text>
          <text x={120} y={92} fontFamily={FONT} fontWeight={800} fontSize={110} fill="#3A3550" opacity={step(T, tTries - 0.1, tTries + 0.2)}>{n}</text>
          <circle cx={370} cy={-180} r={80 * one} fill="none" stroke="#2E8A5A" strokeWidth={6} opacity={one} />
        </g>
      </svg>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

export const S29Epilogue: React.FC<{ T: number }> = ({ T }) => {
  if (T >= tBook - 0.15 && T < tOpen - 0.15) return <Insert T={T} />;
  const ending = T >= tOpen - 0.15;
  // Mia tiptoes in, then scares
  const mx = ending ? LEO_X - 210 : track(T, [[tTiptoe - 0.2, -160], [tClose + 0.2, LEO_X - 250]], ease.out);
  const tiptoe = !ending && T < tClose + 0.2;
  const boo = bump(T, tBoo - 0.15, tBoo + 0.05, tJump + 0.6, tJump + 1.0);
  const scareArms = { shN: 160, elN: 30, shF: 150, elF: 34 };
  let miaPose: Pose = tiptoe ? { ...walk((mx + 160) / (180 * 0.79 * 0.62), 0.65), ...scareArms, lean: 9 } : breathe({ ...STAND, ...scareArms, lean: 6 }, T);
  miaPose = blendPose(miaPose, { ...POSES.scare, lean: 18, hipN: 30, knN: 20, bob: 0.06 }, boo);
  miaPose = blendPose(miaPose, { shN: 20, elN: 60, shF: 20, elF: 60, lean: 10, bob: 0 }, step(T, tLaugh, tLaugh + 0.3) * (ending ? 0 : 1));
  if (ending) miaPose = breathe({ ...STAND, shN: 8, elN: 20, headTilt: -6 }, T);
  const maskState = ending ? 1 : step(T, tLaugh + 0.1, tLaugh + 0.5);
  let miaFace: Partial<Face> = { ...FACES.laugh, eye: "lid", open: 0.3 };
  if (T > tLaugh) miaFace = { ...FACES.laugh, open: 0.6 };
  if (ending) miaFace = { ...FACES.happy, lookX: 0.8, blink: blinkAt(T, [376.4]) };
  // Leo: eats, closes eyes, real jump, laughs, opens eyes, looks at her
  const jumpK = Math.max(0, Math.sin(Math.PI * clamp((T - tJump) / 0.55))) + 0.7 * Math.max(0, Math.sin(Math.PI * clamp((T - tJump - 0.7) / 0.5)));
  let leoPose: Pose = breathe({ ...STAND, shN: 30, elN: 80 }, T);
  leoPose = blendPose(leoPose, { shN: 150, elN: 40, shF: 140, elF: 40, hipN: 30, knN: 50, hipF: -10, knF: 40, lean: -10, bob: 0.4 }, clamp(jumpK));
  leoPose = blendPose(leoPose, { lean: 16, shN: 30, elN: 100, shF: 20, elF: 100, headTilt: 10 }, bump(T, tLaugh, tLaugh + 0.3, tSpark - 0.2, tSpark + 0.2) * (ending ? 0 : 1));
  if (ending) leoPose = breathe({ ...STAND, shN: -10, elN: 20, headTilt: -8 }, T);
  let leoFace: Partial<Face> = { ...FACES.content, lookX: 0.4, blink: blinkAt(T, [354.2, 355.9]) };
  if (T > tClose) leoFace = { ...FACES.calm, curve: 0.15 };
  if (T > tBoo + 0.1) leoFace = { ...FACES.shocked, eye: "wide", open: 1 };
  if (T > tLaugh) leoFace = { ...FACES.laugh, open: 0.7 };
  if (ending) leoFace = T < tOpen + 0.3 ? { ...FACES.calm, curve: 0.5 } : { ...FACES.happy, eye: "dot", lookX: -0.9, lookY: 0.3, curve: 0.55 };
  // sandwich flies off at the jump
  const fly = clamp((T - tJump) / 1.3);
  const sandwich = T > tJump && !ending ? { x: LEO_X + 60 + fly * 260, y: PROM.laneMid - 270 - 520 * fly + 900 * fly * fly, rot: fly * 700 } : null;
  // camera: opening composition callback; pull back at the end
  const zoom = ending ? lerp(1.3, 1.0, ease.inOut(clamp((T - tOpen) / 4.2))) : track(T, [[tWeeks, 1.0], [tClose, 1.1], [tBoo, 1.18], [tLaugh, 1.2], [tSpark, 1.12]]);
  const cx = ending ? lerp(LEO_X - 100, LEO_X + 300, ease.inOut(clamp((T - tOpen) / 4.2))) : LEO_X - 40;
  const cam: Cam = { x: cx - 960, y: ending ? lerp(40, -40, clamp((T - tOpen) / 4)) : 30, zoom };
  const spark = clamp((T - tSpark) / 0.8);
  const ringOn = ending ? step(T, tOpen + 0.2, tOpen + 0.8) : 1 - step(T, tClose, tClose + 0.4);
  return (
    <AbsoluteFill>
      <SkySea cam={cam} t={T} />
      <Hills cam={cam} t={T} />
      <PromenadeSet cam={cam} t={T}>
        <Shadow x={mx} y={PROM.laneFar} w={30} />
        <Figure spec={MIA} id="s29mia" x={mx} y={PROM.laneFar} scale={0.77} turn={ending ? 0.7 : 1} pose={miaPose} face={miaFace} light={KEY_LIGHT} hairSwing={wobble(T, tBoo, 0.8, 2.5, 3) + Math.sin(T * 6) * 0.15} headExtra={<CardboardMask r={MIA.D / 2} state={maskState} turn={1} variant="new" />} />
        <Shadow x={LEO_X} y={PROM.laneMid} w={46} />
        {ringOn > 0.01 && <circle cx={LEO_X} cy={PROM.laneMid - 326 * 0.82 - leoPose.bob * 82} r={62} fill="none" stroke={C.gold} strokeWidth={2.5} opacity={ringOn * 0.7} />}
        <Figure spec={LEO} id="s29leo" x={LEO_X} y={PROM.laneMid} scale={0.82} facing={ending ? -1 : 1} turn={ending ? 0.65 : 1} pose={leoPose} face={leoFace} light={KEY_LIGHT} holdNear={T < tJump || ending ? <Sandwich s={0.85} /> : undefined} holdUpright />
        {sandwich && (
          <g transform={`translate(${sandwich.x},${sandwich.y}) rotate(${sandwich.rot})`}>
            <Sandwich s={0.85} />
          </g>
        )}
        {spark > 0 && !ending && (
          <g opacity={1 - clamp((T - tSpark - 1.6) / 0.6)}>
            <IconDefs />
            <SparkIcon x={(LEO_X + mx) / 2} y={PROM.laneMid - 420} s={1.4 * ease.outBack(spark)} k={1} />
            {Array.from({ length: 30 }).map((_, i) => {
              const a = (i / 30) * Math.PI * 2;
              const r = spark * (160 + rand(i) * 140);
              return <circle key={i} cx={(LEO_X + mx) / 2 + Math.cos(a) * r} cy={PROM.laneMid - 420 + Math.sin(a) * r + spark * spark * 60} r={3} fill={i % 2 ? C.gold : C.goldLight} opacity={1 - spark * 0.7} />;
            })}
          </g>
        )}
      </PromenadeSet>
      <Foreground cam={cam} />
      <Vignette strength={0.5} />
      {boo > 0.3 && T < tJump + 0.4 && (
        <div style={{ position: "absolute", left: 520, top: 260, fontFamily: FONT, fontWeight: 800, fontSize: 140, color: C.gold, transform: `rotate(-8deg) scale(${0.8 + 0.3 * boo})`, textShadow: "0 0 30px rgba(242,197,92,0.6)", letterSpacing: "0.04em" }}>
          BOO!
        </div>
      )}
      <Label x={960} y={96} text="weeks later" size={26} color={C.label} o={bump(T, tWeeks, tWeeks + 0.4, tTiptoe + 0.8, tTiptoe + 1.2)} />
      <Label x={960} y={96} text="the spark lights up" size={26} color={C.gold} o={bump(T, tSpark + 0.2, tSpark + 0.5, tBook - 0.4, tBook - 0.2)} />
      <Label x={960} y={96} text="you only look at her" size={26} color={C.gold} o={step(T, tOnly, tOnly + 0.4)} />
    </AbsoluteFill>
  );
};
