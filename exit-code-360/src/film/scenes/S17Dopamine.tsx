// S17 "And sneaky surprises are ruined…" (184.62–207.57)
//  a) triptych: gift behind a back / party behind a couch / scare from behind
//  b) dopamine: cells fire hardest when life beats the prediction
//  c) Leo sees it coming → prediction error ≈ 0 → the spark never lights
//  d) "you smile a second late, or not at all"
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure, Head } from "../../characters/Figure";
import { EXTRA, LEO, MIA } from "../../characters/cast";
import { FACES, POSES, breathe } from "../../characters/poses";
import { STAND, type Face } from "../../characters/types";
import { CardboardMask } from "../../props/Props";
import { PartyHat } from "../../props/Accessories";
import { NavySpace } from "../../graphics/VisionField";
import { Glow, IconDefs, SparkIcon } from "../../graphics/Icons";
import { Vignette } from "../../env/Atmosphere";
import { Label, Ping, Stamp, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, rand } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const t0 = P(117).start; // 184.62 "and sneaky surprises are ruined"
const tGift = P(118).start; // 186.86
const tParty = P(119).start; // 188.62
const tScare = P(120).start; // 190.46
const tWhy = P(121).start; // 192.33
const tDopa = P(122).start; // 195.13
const tPredict = P(123).start; // 199.37
const tSpark = P(125).start; // 202.61
const tLate = P(126).start; // 204.37
const tNot = P(127).start; // 206.13
const tRuined = 186.06; // word "ruined"

const Gift: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <rect x={-26} y={-24} width={52} height={44} rx={4} fill="#C9473F" />
    <rect x={-4} y={-24} width={8} height={44} fill={C.gold} />
    <rect x={-26} y={-4} width={52} height={8} fill={C.gold} />
    <path d="M0,-24 C-16,-40 -24,-24 0,-24 C24,-40 16,-24 0,-24" stroke={C.gold} strokeWidth={5} fill="none" />
  </g>
);

const Panel: React.FC<{ x: number; k: number; label: string; children: React.ReactNode }> = ({ x, k, label, children }) => {
  const a = ease.outBack(clamp(k));
  return (
    <g transform={`translate(${x},${560 + (1 - a) * 80})`} opacity={clamp(k * 2)}>
      <rect x={-280} y={-230} width={560} height={420} rx={22} fill="#1A1220" stroke={C.gold} strokeOpacity={0.35} strokeWidth={2} />
      <clipPath id={`pn${x}`}>
        <rect x={-280} y={-230} width={560} height={420} rx={22} />
      </clipPath>
      <g clipPath={`url(#pn${x})`}>{children}</g>
      <text x={0} y={240} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing="4" fill={C.label}>
        {label}
      </text>
    </g>
  );
};

const Triptych: React.FC<{ T: number }> = ({ T }) => {
  const L = { x: 0.3, y: -1 };
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #2A1C2C 0%, #120C14 70%)" }}>
      <svg width={1920} height={1080}>
        <Panel x={360} k={(T - tGift + 0.2) / 0.5} label="THE GIFT BEHIND A BACK">
          <rect x={-280} y={60} width={560} height={140} fill="#2A1E26" />
          <Figure spec={LEO} id="s17l1" x={-110} y={110} scale={0.6} turn={0.8} pose={breathe(STAND, T)} face={FACES.smug} light={L} />
          <Figure spec={EXTRA} id="s17f1" x={110} y={110} scale={0.6} facing={-1} turn={0.8} pose={{ ...STAND, shN: -40, elN: -60, shF: -40, elF: -70 }} face={FACES.sly} light={L} />
          <Gift x={168} y={-30} s={0.8} />
          <Ping T={T} at={tGift + 0.4} x={168} y={-30} r={36} hold={2.5} />
        </Panel>
        <Panel x={960} k={(T - tParty + 0.2) / 0.5} label="THE PARTY BEHIND A COUCH">
          <rect x={-280} y={60} width={560} height={140} fill="#2A1E26" />
          {[-150, -90, -30, 30, 90, 150].map((hx, i) => (
            <g key={i} transform={`translate(${hx},${-10 + (i % 2) * 6})`}>
              <circle r={20} fill={C.ink} />
              <PartyHat r={20} color={["#F27BAA", "#6FB6E8", "#F2C55C"][i % 3]} tilt={(i - 2.5) * 6} />
              <Ping T={T} at={tParty + 0.35 + i * 0.07} x={0} y={0} r={18} hold={2.2} />
            </g>
          ))}
          <rect x={-220} y={0} width={440} height={80} rx={20} fill="#3A2C46" />
          <rect x={-240} y={50} width={480} height={60} rx={16} fill="#33273F" />
        </Panel>
        <Panel x={1560} k={(T - tScare + 0.2) / 0.5} label="THE SCARE FROM BEHIND">
          <rect x={-280} y={60} width={560} height={140} fill="#2A1E26" />
          <Figure spec={MIA} id="s17m" x={-90} y={110} scale={0.72} turn={0.9} pose={{ ...POSES.scare }} face={FACES.content} light={L} hairSwing={0.3} headExtra={<CardboardMask r={MIA.D / 2} state={0} turn={0.9} />} />
          <Figure spec={LEO} id="s17l3" x={110} y={110} scale={0.6} turn={0.8} pose={breathe(STAND, T)} face={{ ...FACES.calm, curve: 0.45 }} light={L} />
          <Ping T={T} at={tScare + 0.4} x={-80} y={-60} r={70} hold={1.6} />
        </Panel>
      </svg>
      {/* opening beat: one big surprise, already spotted, stamped RUINED; clears for the panels */}
      {T < tGift + 0.1 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: bump(T, t0 - 0.2, t0 + 0.3, tGift - 0.45, tGift - 0.05) }}>
          <g transform={`translate(0 ${Math.sin(T * 3) * 6})`}>
            <Gift x={960} y={560} s={3.4 * ease.outBack(clamp((T - t0 + 0.1) / 0.5))} />
            <text x={960} y={400} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={90} fill={C.label} opacity={step(T, t0 + 0.3, t0 + 0.6) * (1 - step(T, tRuined - 0.3, tRuined - 0.05))}>
              ?
            </text>
          </g>
          <Ping T={T} at={185.3} x={960} y={540} r={150} hold={2} />
        </svg>
      )}
      {T < tGift + 0.1 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: 1 - step(T, tGift - 0.45, tGift - 0.05) }}>
          <Stamp x={985} y={640} text="RUINED" k={(T - tRuined) / 0.25} size={64} bg="rgba(18,12,20,0.88)" />
        </svg>
      )}
      <Label x={960} y={110} text="sneaky surprises · ruined" size={24} color={C.coral} o={step(T, t0, t0 + 0.4)} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

/** Prediction vs reality graph with a dopamine spike raster. */
const Graph: React.FC<{ T: number; x: number; y: number; leo: boolean; start: number; label: string }> = ({ T, x, y, leo, start, label }) => {
  const k = clamp((T - start) / 2.2); // drawing progress
  const W = 640;
  const ev = 0.55; // event at 55% of the timeline
  const realY = (u: number) => (u < ev ? 0 : -120);
  const predY = (u: number) => (leo ? (u < ev - 0.18 ? 0 : u < ev ? -120 * ((u - (ev - 0.18)) / 0.18) : -120) : 0);
  const pts = (f: (u: number) => number) =>
    Array.from({ length: 81 })
      .map((_, i) => i / 80)
      .filter((u) => u <= k)
      .map((u, i) => `${i ? "L" : "M"}${x + u * W},${y + f(u)}`)
      .join(" ");
  const fired = k > ev;
  const burst = leo ? 0.12 : 1;
  return (
    <g>
      <path d={`M${x},${y + 30} L${x + W},${y + 30}`} stroke={C.grid} strokeWidth={2} />
      <Glow d={pts(predY) || `M${x},${y}`} color={C.lineBlue} w={2.6} dash="10 8" />
      <Glow d={pts(realY) || `M${x},${y}`} color={C.gold} w={3} />
      {fired && !leo && <path d={`M${x + ev * W + 30},${y} L${x + ev * W + 30},${y - 120}`} stroke={C.coral} strokeWidth={2.5} strokeDasharray="4 6" />}
      {/* spike raster */}
      {Array.from({ length: 40 }).map((_, i) => {
        const u = i / 40;
        if (u > k) return null;
        const nearEv = Math.abs(u - ev - 0.03) < 0.08;
        const dense = nearEv ? burst : 0.06;
        if (rand(i * 9.1 + (leo ? 3 : 0)) > dense + 0.12) return null;
        const h = nearEv && !leo ? 46 : 18;
        return <path key={i} d={`M${x + u * W},${y + 110} L${x + u * W},${y + 110 - h}`} stroke={nearEv && !leo ? C.gold : C.lineBlueDim} strokeWidth={3} />;
      })}
      <text x={x} y={y - 170} fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing="3" fill={leo ? C.gold : C.label}>
        {label}
      </text>
      <text x={x + W + 20} y={y + 6} fontFamily={FONT} fontWeight={700} fontSize={15} letterSpacing="2" fill={C.lineBlue} opacity={k > 0.3 ? 1 : 0}>
        EXPECTED
      </text>
      <text x={x + W + 20} y={y - 112} fontFamily={FONT} fontWeight={700} fontSize={15} letterSpacing="2" fill={C.gold} opacity={k > 0.7 ? 1 : 0}>
        HAPPENED
      </text>
      <text x={x} y={y + 150} fontFamily={FONT} fontWeight={700} fontSize={15} letterSpacing="2" fill={C.label} opacity={k > 0.2 ? 1 : 0}>
        DOPAMINE CELLS
      </text>
    </g>
  );
};

const Science: React.FC<{ T: number }> = ({ T }) => {
  const spark1 = step(T, tDopa + 1.3, tDopa + 1.6);
  const fizzle = step(T, tSpark, tSpark + 0.9);
  return (
    <AbsoluteFill>
      <NavySpace drift={T * 6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <IconDefs />
        <g opacity={1 - step(T, tDopa - 0.4, tDopa)}>
          {[0, 1, 2].map((i) => {
            const q = ((T - tWhy) / 1.2 + i / 3) % 1;
            return T > tWhy ? <circle key={i} cx={960} cy={500} r={60 + q * 260} fill="none" stroke={C.gold} strokeWidth={2} opacity={(1 - q) * 0.35} /> : null;
          })}
          <SparkIcon x={960} y={500} s={2.2} k={0.9 + 0.1 * Math.sin(T * 6)} />
        </g>
        {T > tDopa - 0.2 && (
          <g opacity={step(T, tDopa - 0.2, tDopa + 0.2)}>
            <Graph T={T} x={170} y={560} leo={false} start={tDopa} label="SURPRISE" />
            <g opacity={spark1}>
              <SparkIcon x={560} y={330} s={0.9} k={0.9 + 0.15 * Math.sin(T * 9)} />
            </g>
            <text x={600} y={440} fontFamily={FONT} fontWeight={700} fontSize={15} letterSpacing="2" fill={C.coral} opacity={spark1}>
              PREDICTION ERROR
            </text>
          </g>
        )}
        {T > tPredict - 0.2 && (
          <g opacity={step(T, tPredict - 0.2, tPredict + 0.2)}>
            <Graph T={T} x={1060} y={560} leo start={tPredict} label="YOU · SAW IT COMING" />
            <g opacity={step(T, tPredict + 2.0, tPredict + 2.3) * (1 - fizzle * 0.85)} transform={`translate(0,${fizzle * 10})`}>
              <SparkIcon x={1450} y={330} s={0.9 * (1 - fizzle * 0.7)} k={1 - fizzle * 0.6} color={fizzle > 0.5 ? C.lineBlueDim : C.gold} />
            </g>
            {fizzle > 0 &&
              [0, 1, 2].map((j) => (
                <circle key={j} cx={1450 + Math.sin(T * 3 + j) * 12} cy={300 - fizzle * 80 - j * 26} r={10 + j * 6} fill="#8A90A8" opacity={0.25 * fizzle * (1 - j * 0.25)} />
              ))}
          </g>
        )}
      </svg>
      <Label x={960} y={96} text="why do surprises feel good?" size={24} color={C.gold} o={bump(T, tWhy, tWhy + 0.4, tDopa - 0.3, tDopa)} />
      <Label x={960} y={96} text="dopamine fires when life beats the prediction" size={22} color={C.number} o={bump(T, tDopa, tDopa + 0.4, tPredict - 0.3, tPredict)} />
      <Label x={960} y={96} text="you see these coming" size={24} color={C.gold} o={bump(T, tPredict, tPredict + 0.4, tSpark - 0.3, tSpark)} />
      <Label x={960} y={96} text="the spark never lights" size={24} color={C.coral} o={step(T, tSpark, tSpark + 0.4)} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

const Late: React.FC<{ T: number }> = ({ T }) => {
  const flash = bump(T, tLate - 0.1, tLate, tLate + 0.15, tLate + 0.4);
  const smile = step(T, tLate + 1.0, tLate + 1.3) * (1 - step(T, tNot, tNot + 0.3));
  const timer = clamp((T - tLate) / 1.0);
  let face: Partial<Face> = { ...FACES.neutral, eye: "dot", mouth: "flat" };
  if (smile > 0.5) face = { ...FACES.content, curve: 0.25 * smile };
  if (T > tNot) face = { ...FACES.neutral, eye: "lid", mouth: "flat", blink: 0.2 };
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, #2C2034 0%, #110B14 75%)" }}>
      <svg width={1920} height={1080}>
        <circle cx={960} cy={540} r={240 + flash * 300} fill={C.gold} opacity={flash * 0.25} />
        <Head spec={LEO} id="s17late" x={960} y={560} size={380} face={face} turn={0.05} light={{ x: 0.2, y: -1 }} ring={1} />
        <g transform="translate(1420,400)" opacity={step(T, tLate, tLate + 0.2) * (1 - step(T, tNot + 0.4, tNot + 0.8))}>
          <circle r={64} fill="none" stroke={C.grid} strokeWidth={8} />
          <circle r={64} fill="none" stroke={C.gold} strokeWidth={8} strokeDasharray={`${timer * 402} 402`} transform="rotate(-90)" />
          <text x={0} y={10} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill={C.gold}>
            +{timer.toFixed(1)}s
          </text>
        </g>
      </svg>
      <Label x={960} y={96} text="a second late" size={24} color={C.gold} o={bump(T, tLate + 0.4, tLate + 0.7, tNot - 0.2, tNot)} />
      <Label x={960} y={96} text="or not at all" size={24} color={C.coral} o={step(T, tNot, tNot + 0.3)} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

export const S17Dopamine: React.FC<{ T: number }> = ({ T }) => {
  const toSci = step(T, tWhy - 0.35, tWhy + 0.05);
  const toLate = step(T, tLate - 0.35, tLate - 0.05);
  return (
    <AbsoluteFill>
      {toSci < 1 && <Triptych T={T} />}
      {toSci > 0 && toLate < 1 && (
        <AbsoluteFill style={{ opacity: toSci }}>
          <Science T={T} />
        </AbsoluteFill>
      )}
      {toLate > 0 && (
        <AbsoluteFill style={{ opacity: toLate }}>
          <Late T={T} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

export const _l = lerp;
