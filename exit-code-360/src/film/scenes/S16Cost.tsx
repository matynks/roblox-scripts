// S16 "But there's a cost" (175.92–184.62): close-up, a swarm of signals around Leo's head.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Head } from "../../characters/Figure";
import { LEO } from "../../characters/cast";
import { FACES, blinkAt } from "../../characters/poses";
import type { Face } from "../../characters/types";
import { ClassBack } from "../../env/Classroom";
import { Vignette } from "../../env/Atmosphere";
import { Label, bump, step } from "../../lib/acting";
import { clamp, ease, rand } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const t0 = P(112).start; // 175.92
const tBusy = P(113).start; // 177.28
const tNoon = P(114).start; // 179.76
const tBuzz = P(115).start; // 180.78
const tAmazing = P(116).start; // 182.22
const tOver = W_OVER();
function W_OVER() {
  return P(116).start + 1.05; // "…and overwhelming"
}

export const S16Cost: React.FC<{ T: number }> = ({ T }) => {
  const k = clamp((T - t0) / 8.7);
  const cam = { x: 0, y: -120, zoom: 1.5 + 0.1 * k };
  const buzz = step(T, tBuzz, tBuzz + 0.4);
  const jx = buzz * (Math.sin(T * 190) * 2.5);
  const jy = buzz * (Math.cos(T * 170) * 2);
  let face: Partial<Face> = { ...FACES.neutral, eye: "dot", blink: blinkAt(T, [176.8, 179.0]) };
  if (T > tBusy) face = { ...FACES.stare, lookX: Math.sin(T * 3) * 0.6 };
  if (T > tAmazing) face = { ...FACES.happy, eyeScale: 1.25, curve: 0.7, browShow: 1, browY: 0.6, lookX: Math.sin(T * 4) * 0.5 };
  if (T > tOver) face = { ...FACES.worried, mouth: "wobble", brow: 1, browY: 0.5, lookX: Math.sin(T * 9) * 0.8, eyeScale: 1.1 };
  const n = Math.floor(60 * clamp((T - tBusy) / 6.5));
  const swarm = Array.from({ length: n }).map((_, i) => {
    const r = 290 + rand(i) * 260;
    const a = rand(i * 3.3) * Math.PI * 2 + T * (0.4 + rand(i * 5) * 0.9) * (i % 2 ? 1 : -1);
    const born = tBusy + (i / 60) * 6.5;
    const pop = ease.outBack(clamp((T - born) / 0.3));
    const kind = i % 3;
    const col = T > tOver && i % 4 === 0 ? C.coral : i % 2 ? C.gold : C.lineBlue;
    const x = 960 + Math.cos(a) * r;
    const y = 560 + Math.sin(a) * r * 0.72;
    return kind === 0 ? (
      <circle key={i} cx={x} cy={y} r={10 * pop} fill="none" stroke={col} strokeWidth={2.4} opacity={0.85} />
    ) : kind === 1 ? (
      <circle key={i} cx={x} cy={y} r={4.5 * pop} fill={col} opacity={0.9} />
    ) : (
      <path key={i} d={`M${x - 10 * pop},${y} L${x + 10 * pop},${y} M${x},${y - 10 * pop} L${x},${y + 10 * pop}`} stroke={col} strokeWidth={2.4} opacity={0.8} />
    );
  });
  const clock = bump(T, tNoon - 0.1, tNoon + 0.2, tAmazing - 0.3, tAmazing);
  const hand = clamp((T - tNoon + 0.3) / 0.8);
  return (
    <AbsoluteFill>
      <ClassBack cam={cam} t={T} blur={14} dim={0.25} />
      <Vignette strength={0.6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {swarm}
        {buzz > 0 &&
          [0, 1, 2].map((j) => {
            const kk = ((T * 2.2 + j / 3) % 1);
            return <ellipse key={j} cx={960} cy={560} rx={240 + kk * 140} ry={(240 + kk * 140) * 0.92} fill="none" stroke={C.gold} strokeWidth={2} opacity={(1 - kk) * 0.5 * buzz} />;
          })}
        <g transform={`translate(${jx},${jy})`}>
          <Head spec={LEO} id="s16head" x={960} y={560} size={420} face={face} turn={0.08} light={{ x: 0.2, y: -1 }} ring={1} />
        </g>
        {T > tOver && (
          <path d="M1140,420 q12,20 0,32 q-12,-12 0,-32Z" fill={C.tear} opacity={step(T, tOver, tOver + 0.3)} />
        )}
        {clock > 0 && (
          <g transform="translate(1520,300)" opacity={clock}>
            <circle r={58} fill="rgba(12,18,38,0.8)" stroke={C.gold} strokeWidth={3} />
            <path d={`M0,0 L0,-38`} stroke={C.gold} strokeWidth={4} strokeLinecap="round" transform={`rotate(${-120 + 120 * hand})`} />
            <path d={`M0,0 L0,-26`} stroke={C.gold} strokeWidth={5} strokeLinecap="round" transform={`rotate(${-60 + 60 * hand})`} />
            <text x={0} y={100} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill={C.gold} letterSpacing="3">
              12:00
            </text>
          </g>
        )}
      </svg>
      <Label x={960} y={96} text="but there's a cost" size={24} color={C.coral} o={bump(T, t0, t0 + 0.3, tBusy - 0.1, tBusy + 0.2)} />
      <Label x={960} y={96} text="busier picture · busier mind" size={22} color={C.gold} o={bump(T, tBusy + 0.2, tBusy + 0.5, tAmazing - 0.2, tAmazing)} />
      <Label x={960} y={96} text="amazing · and · overwhelming" size={22} color={T > tOver ? C.coral : C.gold} o={step(T, tAmazing, tAmazing + 0.3)} />
    </AbsoluteFill>
  );
};
