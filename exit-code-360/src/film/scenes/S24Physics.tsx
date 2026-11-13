// S24 Physics (286.19–302.28): 8 m drop → ≈1.25 s (√(2·8/9.81) ≈ 1.28 s), minus the
// quarter second of noticing → 1 s; 15 m at 5 m/s → 3 s. Not even close.
import React from "react";
import { AbsoluteFill } from "remotion";
import { NavySpace } from "../../graphics/VisionField";
import { Glow, IconDefs, StickIcon } from "../../graphics/Icons";
import { Vignette } from "../../env/Atmosphere";
import { Label, Stamp, bump, step } from "../../lib/acting";
import { clamp, ease, lerp } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const t8m = P(181).start; // 286.19
const tFalls = P(182).start; // 288.43
const tQuarter = P(183).start; // 291.09
const tOne = P(184).start; // 292.61
const t15 = P(185).start; // 294.05
const t5 = P(186).start; // 296.21
const t3 = P(187).start; // 298.45
const tReach = P(188).start; // 299.57
const tNot = P(189).start; // 300.85

const T_FALL = 1.25;

const Txt: React.FC<{ x: number; y: number; s: number; c: string; o: number; children: React.ReactNode; a?: "start" | "middle" | "end"; w?: number }> = ({ x, y, s, c, o, children, a = "middle", w = 800 }) => (
  <text x={x} y={y} textAnchor={a} fontFamily={FONT} fontWeight={w} fontSize={s} fill={c} opacity={o} style={{ fontVariantNumeric: "tabular-nums" }}>
    {children}
  </text>
);

export const S24Physics: React.FC<{ T: number }> = ({ T }) => {
  const ph2 = step(T, t15 - 0.3, t15 + 0.2);
  const ph3 = step(T, tReach - 0.3, tReach + 0.2);
  const dimA = lerp(1, 0.1, ph3);
  // vertical drop demo
  const vx = 520;
  const top = 230;
  const bot = 860;
  const dropK = clamp((T - tFalls - 0.2) / T_FALL);
  const lightY = lerp(top + 40, bot - 120, dropK * dropK);
  const timer = dropK * T_FALL;
  // time bar
  const barX = 900;
  const barW = 820;
  const cut = step(T, tQuarter + 0.2, tQuarter + 0.7);
  // distance
  const runK = clamp((T - t5 - 0.2) / 1.6);
  return (
    <AbsoluteFill>
      <NavySpace drift={T * 6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <IconDefs />
        {/* ---- vertical: 8 m drop ---- */}
        <g opacity={step(T, t8m - 0.2, t8m + 0.3) * dimA}>
          <Glow d={`M${vx - 220},${top} L${vx + 220},${top}`} color={C.lineBlueDim} w={4} />
          {Array.from({ length: 10 }).map((_, i) => (
            <path key={i} d={`M${vx - 220 + i * 44},${top} L${vx - 176 + i * 44},${top - 30}`} stroke={C.lineBlueDim} strokeWidth={2} />
          ))}
          <g transform={`translate(${vx},${lightY})`}>
            <rect x={-26} y={-30} width={52} height={64} rx={10} fill="none" stroke={C.gold} strokeWidth={3} />
            <rect x={-20} y={22} width={40} height={10} rx={4} fill={C.gold} />
          </g>
          {dropK > 0 && dropK < 1 && <path d={`M${vx},${top + 40} L${vx},${lightY - 34}`} stroke={C.gold} strokeWidth={2} strokeDasharray="6 8" opacity={0.5} />}
          <StickIcon x={vx} y={bot - 30} s={1.1} color={C.miaPink} />
          <path d={`M${vx - 150},${top + 10} L${vx - 150},${bot}`} stroke={C.label} strokeWidth={2.5} />
          <path d={`M${vx - 170},${top + 10} L${vx - 130},${top + 10} M${vx - 170},${bot} L${vx - 130},${bot}`} stroke={C.label} strokeWidth={2.5} />
          <Txt x={vx - 190} y={(top + bot) / 2 + 20} s={56} c={C.number} o={1} a="end">8 m</Txt>
          <Txt x={vx + 120} y={lightY + 10} s={36} c={C.gold} o={step(T, tFalls, tFalls + 0.2)} a="start">{timer.toFixed(2)} s</Txt>
          <Txt x={vx} y={bot + 90} s={22} c={C.label} o={step(T, tFalls + 1.6, tFalls + 2.0)} w={700}>t = √(2h / g) ≈ 1.28 s</Txt>
        </g>
        {/* ---- time budget bar ---- */}
        <g opacity={step(T, tQuarter - 0.2, tQuarter + 0.2) * dimA} transform={`translate(0,${lerp(0, -170, ph2)})`}>
          <rect x={barX} y={420} width={barW} height={44} rx={10} fill={C.gold} opacity={0.85} />
          <rect x={barX} y={420} width={barW * 0.2} height={44} rx={10} fill={C.coral} opacity={0.4 + 0.5 * cut} transform={`translate(${-cut * 30},${cut * 70})`} />
          <Txt x={barX} y={400} s={22} c={C.label} o={1} a="start" w={700}>FALL ≈ 1¼ s</Txt>
          <Txt x={barX + barW * 0.1} y={560} s={20} c={C.coral} o={cut} w={700}>− ¼ s NOTICING</Txt>
          <Txt x={barX + barW * 0.6} y={410} s={60} c={C.gold} o={step(T, tOne, tOne + 0.3)}>1 s LEFT</Txt>
        </g>
        {/* ---- distance ---- */}
        <g opacity={ph2 * dimA}>
          <path d={`M1000,640 L1700,640`} stroke={C.label} strokeWidth={2.5} />
          <path d={`M1000,620 L1000,660 M1700,620 L1700,660`} stroke={C.label} strokeWidth={2.5} />
          <Txt x={1350} y={620} s={52} c={C.number} o={1}>15 m</Txt>
          <StickIcon x={1000 + runK * 260} y={800} s={1.0} color={C.gold} pose={runK > 0 ? "run" : "stand"} />
          <StickIcon x={1700} y={800} s={1.0} color={C.miaPink} />
          <Txt x={1000} y={900} s={26} c={C.gold} o={step(T, t5, t5 + 0.3)} w={700}>5 m/s</Txt>
          <Txt x={1350} y={990} s={44} c={C.gold} o={step(T, t3, t3 + 0.3)}>15 ÷ 5 = 3 s</Txt>
        </g>
        {/* ---- comparison ---- */}
        <g opacity={ph3}>
          <rect x={560} y={430} width={800} height={70} rx={14} fill={C.coral} opacity={0.8} />
          <rect x={560} y={560} width={800 / 3} height={70} rx={14} fill={C.gold} />
          <Txt x={540} y={480} s={30} c={C.coral} o={1} a="end">NEED 3 s</Txt>
          <Txt x={540} y={610} s={30} c={C.gold} o={1} a="end">HAVE 1 s</Txt>
        </g>
        <Stamp x={1000} y={780} text="NOT EVEN CLOSE" k={(T - tNot) / 0.35} size={52} />
      </svg>
      <Label x={960} y={96} text="can you reach her?" size={26} color={C.gold} o={bump(T, tReach, tReach + 0.3, tNot - 0.1, tNot + 0.2)} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

export const _e = ease;
