// S34 Outro (427.49–439.72): cast line-up at sunset; question; comment / like / subscribe; EXIT CODE.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, LEO, MIA, MR_BLACK } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe } from "../../characters/poses";
import { STAND } from "../../characters/types";
import { CardboardMask } from "../../props/Props";
import { Cap, Glasses, PartyHat } from "../../props/Accessories";
import { Hills, KEY_LIGHT, PROM, PromenadeSet, SkySea } from "../../env/Promenade";
import { Vignette } from "../../env/Atmosphere";
import { Ping, Shadow, step } from "../../lib/acting";
import { clamp, ease, lerp } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const tQ = P(261).start; // 427.49
const tComments = P(262).start; // 430.93
const tMia = P(263).start; // 434.53
const tLike = P(264).start; // 436.45
const tSub = P(265).start; // 437.26

export const S34Outro: React.FC<{ T: number }> = ({ T }) => {
  const cam = { x: 1060 - 960, y: 40, zoom: lerp(1.0, 1.06, clamp((T - tQ) / 12)) };
  const cast = [
    { spec: EXTRA, x: 520, extra: <Glasses r={EXTRA.D / 2} turn={0.2} />, s: 0.78 },
    { spec: MR_BLACK, x: 700, s: 0.74 },
    { spec: LEO, x: 900, s: 0.82 },
    { spec: MIA, x: 1060, s: 0.8, mia: true },
    { spec: EXTRA, x: 1220, extra: <PartyHat r={EXTRA.D / 2} color="#6FB6E8" />, s: 0.78 },
    { spec: EXTRA, x: 1390, extra: <Cap r={EXTRA.D / 2} color="#3E5A7A" />, s: 0.8 },
  ];
  const q = step(T, tQ, tQ + 0.6);
  const like = ease.outBack(clamp((T - tLike) / 0.4));
  const sub = ease.outBack(clamp((T - tSub) / 0.4));
  const com = ease.outBack(clamp((T - tComments) / 0.4));
  return (
    <AbsoluteFill>
      <SkySea cam={cam} t={T} />
      <Hills cam={cam} t={T} />
      <PromenadeSet cam={cam} t={T}>
        {cast.map((c, i) => {
          const wave = c.mia && T > tMia - 0.1 ? 1 : 0;
          const pose = blendPose(breathe({ ...STAND, shN: 6, shF: -6 }, T + i), c.mia ? { shN: 160 + Math.sin(T * 9) * 14, elN: 20 } : POSES.stand, wave);
          return (
            <g key={i}>
              <Shadow x={c.x} y={PROM.laneMid} w={36} />
              <Figure
                spec={c.spec}
                id={`s34c${i}`}
                x={c.x}
                y={PROM.laneMid}
                scale={c.s}
                turn={0.12}
                pose={pose}
                face={c.spec === MR_BLACK ? FACES.sly : c.mia ? { ...FACES.laugh, eye: wave ? "happy" : "dot", open: 0.3 } : { ...FACES.content, blink: blinkAt(T, [429 + i * 0.7, 434 + i * 0.5]) }}
                light={KEY_LIGHT}
                headExtra={c.mia ? <CardboardMask r={MIA.D / 2} state={1} turn={0.12} variant="new" /> : c.extra}
                hairSwing={Math.sin(T * 2) * 0.2}
              />
            </g>
          );
        })}
        {T > tQ && <circle cx={900} cy={PROM.laneMid - 326 * 0.82} r={64 + 4 * Math.sin(T * 3)} fill="none" stroke={C.gold} strokeWidth={2.5} opacity={0.7 * q} />}
        <Ping T={T} at={tMia + 0.1} x={1060} y={PROM.laneMid - 230} r={70} hold={1.6} color={C.miaPinkLight} />
      </PromenadeSet>
      <Vignette strength={0.5} />
      <div style={{ position: "absolute", top: 140, width: 1920, textAlign: "center", fontFamily: FONT, opacity: q }}>
        <div style={{ fontWeight: 800, fontSize: 32, letterSpacing: "0.14em", color: "#F6F1EA" }}>WHAT WOULD YOU DO WITH</div>
        <div style={{ fontWeight: 800, fontSize: 84, color: C.gold, textShadow: "0 0 30px rgba(242,197,92,0.5)" }}>360° VISION?</div>
      </div>
      {/* comment / like / subscribe */}
      <div style={{ position: "absolute", left: 560, top: 860, display: "flex", gap: 30, alignItems: "center", fontFamily: FONT }}>
        <div style={{ opacity: clamp(com * 2), transform: `scale(${com})`, display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderRadius: 40, background: "rgba(12,18,38,0.8)", border: `2px solid ${C.lineBlue}66` }}>
          <svg width={34} height={30}>
            <path d="M3,3 L31,3 L31,21 L14,21 L6,28 L7,21 L3,21Z" fill="none" stroke={C.lineBlue} strokeWidth={3} strokeLinejoin="round" />
          </svg>
          <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: "0.12em", color: C.number }}>YOUR SNEAKIEST PRANK</span>
        </div>
        <div style={{ opacity: clamp(like * 2), transform: `scale(${like})`, display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", borderRadius: 40, background: "rgba(12,18,38,0.8)", border: `2px solid ${C.gold}88` }}>
          <svg width={30} height={30}>
            <path d="M3,13 L9,13 L9,28 L3,28Z M11,13 L16,3 Q20,3 19,9 L18,13 L26,13 Q29,13 28,17 L25,27 Q24,28 22,28 L11,28Z" fill={C.gold} />
          </svg>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "0.12em", color: C.gold }}>LIKE</span>
        </div>
        <div style={{ opacity: clamp(sub * 2), transform: `scale(${sub})`, padding: "14px 30px", borderRadius: 40, background: "#D9363E", fontWeight: 800, fontSize: 22, letterSpacing: "0.14em", color: "#fff" }}>SUBSCRIBE</div>
      </div>
      <div style={{ position: "absolute", top: 960, width: 1920, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 20, letterSpacing: "0.5em", color: "rgba(246,241,234,0.7)", opacity: step(T, tSub + 0.4, tSub + 0.9) }}>EXIT CODE · MORE WHAT IFS</div>
    </AbsoluteFill>
  );
};
