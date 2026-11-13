// S30–S32 Reality check (379.09–414.34): 360° not real, the limit is real; the
// invisible gorilla (Simons & Chabris, 1999); real vs fiction; brain ≈ 1/5 of energy.
import React from "react";
import { AbsoluteFill } from "remotion";
import { NavySpace, VisionDiagram, type DiagramState } from "../../graphics/VisionField";
import { BrainIcon, Glow, IconDefs, StickIcon } from "../../graphics/Icons";
import { Vignette } from "../../env/Atmosphere";
import { Label, bump, step } from "../../lib/acting";
import { clamp, ease, lerp } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const tReal = P(241).start; // 379.09
const tPower = P(242).start; // 380.69
const tCircle = P(243).start; // 382.02
const tLimit = P(244).start; // 384.18
const t1999 = P(245).start; // 386.10
const tCount = P(246).start; // 387.70
const tGorilla = P(247).start; // 392.99
const tSeeing = P(248).start; // 396.99
const tDopa = P(249).start; // 398.99
const tFiction = P(250).start; // 401.55
const tFifth = P(251).start; // 404.67
const tHarder = P(252).start; // 407.79
const tStarving = P(253).start; // 410.19
const tPredict = P(254).start; // 412.35
const X_GOR = t1999 - 0.3;
const X_FACT = tDopa - 0.3;

const dg = (who: "human" | "leo", x: number, fov: number, appear: number, T: number): DiagramState => ({
  who, x, y: 580, scale: 0.6, appear, fov, ahead: 0, sides: 0, blind: who === "human" ? 1 : 0, blindFill: who === "human" ? 1 : 0, question: 0, ghost: 0, shatter: 0, ripple: -1, glow: 0, t: T,
});

const Mark: React.FC<{ x: number; y: number; ok: boolean; k: number; s?: number }> = ({ x, y, ok, k, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s * ease.outBack(clamp(k))})`} opacity={clamp(k * 2)}>
    <circle r={34} fill="none" stroke={ok ? C.gold : C.coral} strokeWidth={4} />
    <Glow d={ok ? "M-16,0 L-4,14 L18,-14" : "M-14,-14 L14,14 M14,-14 L-14,14"} color={ok ? C.gold : C.coral} w={5} />
  </g>
);

const Gorilla: React.FC<{ x: number; y: number; beat: number }> = ({ x, y, beat }) => (
  <g transform={`translate(${x},${y})`}>
    <Glow color={C.coral} w={3} d={`M-26,-70 C-40,-110 30,-120 24,-70 M-30,-66 C-50,-40 -46,0 -30,20 L-34,60 M30,-66 C50,-40 46,0 30,20 L34,60 M-30,20 C-10,30 10,30 30,20 M-30,-50 L${-60 - beat * 10},${-20 - beat * 30} L-48,20 M30,-50 L${60 + beat * 10},${-20 - beat * 30} L48,20`} />
    <circle cx={-8} cy={-88} r={3} fill={C.coral} />
    <circle cx={8} cy={-88} r={3} fill={C.coral} />
  </g>
);

export const S30Reality: React.FC<{ T: number }> = ({ T }) => {
  // ---------- phase A: reality check
  const card = ease.outBack(clamp((T - tReal) / 0.5));
  const cardUp = step(T, tPower - 0.3, tPower + 0.1);
  const aOut = 1 - step(T, X_GOR, X_GOR + 0.4);
  // ---------- phase B: gorilla study
  const bIn = step(T, X_GOR, X_GOR + 0.4) * (1 - step(T, X_FACT, X_FACT + 0.4));
  const passes = Math.floor(Math.max(0, T - tCount - 0.4) / 0.55);
  const ring = (T - tCount) * 1.1;
  const players = Array.from({ length: 6 }).map((_, i) => {
    const a = (i / 6) * Math.PI * 2 + ring * (i % 2 ? 0.4 : -0.3);
    return { x: 960 + Math.cos(a) * 300, y: 640 + Math.sin(a) * 120, white: i % 2 === 0 };
  });
  const whites = players.filter((p) => p.white);
  const pk = ((T - tCount - 0.4) % 0.55) / 0.55;
  const from = whites[passes % 3];
  const to = whites[(passes + 1) % 3];
  const ball = T > tCount + 0.4 ? { x: lerp(from.x, to.x, pk), y: lerp(from.y - 60, to.y - 60, pk) - 60 * Math.sin(Math.PI * pk) } : null;
  const gx = lerp(1700, 220, clamp((T - tGorilla) / 3.6));
  const beat = T > tGorilla + 1.5 && T < tGorilla + 2.3 ? Math.abs(Math.sin((T - tGorilla) * 18)) : 0;
  const stat = step(T, tGorilla + 2.2, tGorilla + 2.6);
  // ---------- phase C: facts
  const cIn = step(T, X_FACT, X_FACT + 0.4);
  const rows = [
    { t: tDopa + 0.3, label: "Dopamine spark", verdict: "REAL", ok: true },
    { t: tFiction + 0.6, label: "Overload", verdict: "FICTION", ok: false },
    { t: tFiction + 1.6, label: "Spoiled surprises", verdict: "FICTION", ok: false },
    { t: tStarving + 0.4, label: "Starving", verdict: "NO", ok: false },
    { t: tPredict + 0.3, label: "Predict everything", verdict: "NO", ok: false },
  ];
  const fifth = 0.2 * ease.inOut(clamp((T - tFifth - 0.3) / 1.2));
  const harder = 0.012 * step(T, tHarder + 0.3, tHarder + 0.8) * (0.6 + 0.4 * Math.sin(T * 6));
  return (
    <AbsoluteFill>
      <NavySpace drift={T * 6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <IconDefs />
        {/* phase A */}
        <g opacity={aOut}>
          <g transform={`translate(960,${lerp(520, 150, cardUp)}) scale(${lerp(1, 0.6, cardUp) * card})`}>
            <rect x={-380} y={-70} width={760} height={140} rx={16} fill="none" stroke={C.gold} strokeWidth={4} />
            <text x={0} y={22} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={64} fill={C.gold} letterSpacing="6">
              REALITY CHECK
            </text>
          </g>
          {T > tPower - 0.2 && (
            <g opacity={step(T, tPower - 0.2, tPower + 0.2)}>
              <VisionDiagram id="s30leo" s={dg("leo", 560, 360, 1, T)} />
              <Mark x={560} y={560} ok={false} k={(T - tPower - 0.2) / 0.4} s={2.2} />
            </g>
          )}
          {T > tCircle - 0.2 && (
            <g opacity={step(T, tCircle - 0.2, tCircle + 0.2)}>
              <VisionDiagram id="s30hum" s={dg("human", 1360, 200, 1, T)} />
            </g>
          )}
        </g>
        {/* phase B */}
        {bIn > 0 && (
          <g opacity={bIn}>
            <text x={960} y={300} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={120} fill={C.number} opacity={1 - step(T, tCount + 0.6, tCount + 1.0)}>
              1999
            </text>
            <g opacity={step(T, t1999 + 0.35, t1999 + 0.8) * (1 - stat * 0.6)}>
              <ellipse cx={960} cy={640} rx={380} ry={170} fill="none" stroke={C.grid} strokeWidth={3} strokeDasharray="8 10" />
              {players.map((p, i) => (
                <StickIcon key={i} x={p.x} y={p.y} s={0.9} color={p.white ? C.number : C.lineBlueDim} pose={i % 3 === 0 ? "arms" : "stand"} />
              ))}
              {ball && <circle cx={ball.x} cy={ball.y} r={9} fill={C.gold} />}
              {T > tGorilla && <Gorilla x={gx} y={660} beat={beat} />}
            </g>
            {stat > 0 && (
              <g opacity={stat}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <StickIcon key={i} x={560 + i * 90} y={900} s={0.55} color={i < 5 ? C.coral : C.lineBlueDim} />
                ))}
              </g>
            )}
          </g>
        )}
        {/* phase C */}
        {cIn > 0 && (
          <g opacity={cIn}>
            {rows.map((r, i) =>
              T > r.t - 0.3 ? (
                <g key={i} opacity={step(T, r.t - 0.3, r.t)}>
                  <Mark x={260} y={270 + i * 130} ok={r.ok} k={(T - r.t) / 0.35} s={0.9} />
                  <text x={330} y={282 + i * 130} fontFamily={FONT} fontWeight={700} fontSize={36} fill={C.number} letterSpacing="2">
                    {r.label.toUpperCase()}
                  </text>
                  <text x={900} y={282 + i * 130} fontFamily={FONT} fontWeight={800} fontSize={30} fill={r.ok ? C.gold : C.coral} letterSpacing="4">
                    {r.verdict}
                  </text>
                </g>
              ) : null,
            )}
            <g opacity={step(T, tFifth - 0.2, tFifth + 0.3)}>
              <circle cx={1450} cy={560} r={210} fill="none" stroke={C.grid} strokeWidth={22} />
              <circle cx={1450} cy={560} r={210} fill="none" stroke={C.gold} strokeWidth={22} strokeDasharray={`${(fifth + harder) * 1319} 1319`} transform="rotate(-90 1450 560)" strokeLinecap="round" />
              <BrainIcon x={1450} y={560} s={1.4} color={C.lineBlue} />
              <text x={1450} y={850} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={54} fill={C.gold}>
                ≈ 1/5
              </text>
              <text x={1450} y={895} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing="4" fill={C.label}>
                OF YOUR BODY&apos;S ENERGY
              </text>
            </g>
          </g>
        )}
      </svg>
      <Label x={560} y={880} text="360° vision · not real" size={20} color={C.coral} o={aOut * step(T, tPower + 0.2, tPower + 0.5)} />
      <Label x={1360} y={880} text="humans · ≈200°" size={20} color={C.lineBlue} o={aOut * step(T, tCircle + 0.2, tCircle + 0.5)} />
      <Label x={960} y={980} text="but the limit is real" size={26} color={C.gold} o={aOut * step(T, tLimit, tLimit + 0.4)} />
      <Label x={960} y={96} text="Simons & Chabris · 1999 · count the passes" size={22} color={C.number} o={bIn * bump(T, tCount, tCount + 0.4, tGorilla + 2.0, tGorilla + 2.3)} />
      <Label x={960} y={150} text={`passes: ${Math.max(0, passes)}`} size={22} color={C.gold} o={bIn * bump(T, tCount + 0.4, tCount + 0.7, tGorilla + 2.0, tGorilla + 2.3)} />
      <Label x={960} y={96} text="≈ half never noticed the gorilla" size={24} color={C.coral} o={bIn * stat * (1 - step(T, tSeeing - 0.1, tSeeing + 0.2))} />
      <Label x={960} y={96} text="seeing ≠ noticing" size={34} color={C.gold} o={bIn * step(T, tSeeing, tSeeing + 0.3)} />
      <Label x={960} y={96} text="fact · or · fiction" size={24} color={C.label} o={cIn * (1 - step(T, tFifth - 0.4, tFifth))} />
      <Label x={1450} y={250} text="thinking harder: barely changes it" size={16} color={C.label} o={cIn * step(T, tHarder + 0.3, tHarder + 0.7)} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};
