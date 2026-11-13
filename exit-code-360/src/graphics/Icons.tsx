// Line-art icons in the reference's infographic style (thin glowing strokes).
import React from "react";
import { C } from "../style/palette";

type P = { x: number; y: number; s?: number; color?: string; o?: number; w?: number };

const glowId = "iconGlow";
export const IconDefs: React.FC = () => (
  <defs>
    <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="5" />
    </filter>
  </defs>
);

/** Draw a path twice: soft glow + crisp line. */
export const Glow: React.FC<{ d: string; color?: string; w?: number; o?: number; dash?: string; fill?: string }> = ({ d, color = C.lineBlue, w = 2.6, o = 1, dash, fill = "none" }) => (
  <g opacity={o}>
    <path d={d} stroke={color} strokeWidth={w * 3.2} fill="none" opacity={0.28} filter={`url(#${glowId})`} strokeLinecap="round" strokeLinejoin="round" />
    <path d={d} stroke={color} strokeWidth={w} fill={fill} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
  </g>
);

/** Brain seen from above: two hemispheres with folds. */
export const BrainIcon: React.FC<P> = ({ x, y, s = 1, color = C.lineBlue, o = 1, w = 2.6 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <Glow color={color} o={o} w={w} d="M-4,-58 C-30,-62 -58,-46 -62,-18 C-72,0 -66,30 -48,46 C-34,60 -12,62 -4,54 Z" />
    <Glow color={color} o={o} w={w} d="M4,-58 C30,-62 58,-46 62,-18 C72,0 66,30 48,46 C34,60 12,62 4,54 Z" />
    <Glow color={color} o={o * 0.85} w={w * 0.8} d="M-46,-26 C-34,-34 -22,-20 -30,-8 C-38,4 -24,16 -14,8 M-52,18 C-40,10 -30,24 -20,30 M-26,-46 C-18,-38 -24,-30 -14,-26" />
    <Glow color={color} o={o * 0.85} w={w * 0.8} d="M46,-26 C34,-34 22,-20 30,-8 C38,4 24,16 14,8 M52,18 C40,10 30,24 20,30 M26,-46 C18,-38 24,-30 14,-26" />
  </g>
);

/** Eye (front view). */
export const EyeIcon: React.FC<P & { open?: number }> = ({ x, y, s = 1, color = C.lineBlue, o = 1, w = 2.6, open = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <Glow color={color} o={o} w={w} d={`M-56,0 Q0,${-46 * open} 56,0 Q0,${46 * open} -56,0Z`} />
    <Glow color={color} o={o} w={w} d={`M0,${-17 * open} a17,${17 * open} 0 1,0 0.01,0Z`} />
    <circle cx={0} cy={0} r={7 * open} fill={color} opacity={o} />
  </g>
);

/** Line-art stick figure (infographic people). pose: stand | run | arms */
export const StickIcon: React.FC<P & { pose?: "stand" | "run" | "arms" | "point"; facing?: 1 | -1 }> = ({ x, y, s = 1, color = C.lineBlue, o = 1, w = 2.6, pose = "stand", facing = 1 }) => {
  const d =
    pose === "run"
      ? "M0,-62 L-6,-18 M-6,-18 L12,6 L4,30 M-6,-18 L-22,4 L-34,22 M-2,-52 L16,-34 L30,-40 M-2,-52 L-20,-38 L-28,-22"
      : pose === "arms"
        ? "M0,-62 L0,-16 M0,-16 L-12,30 M0,-16 L12,30 M0,-52 L-22,-74 M0,-52 L22,-74"
        : pose === "point"
          ? "M0,-62 L0,-16 M0,-16 L-10,30 M0,-16 L10,30 M0,-52 L34,-58 M0,-52 L-12,-30"
          : "M0,-62 L0,-16 M0,-16 L-10,30 M0,-16 L10,30 M0,-52 L-14,-26 M0,-52 L14,-26";
  return (
    <g transform={`translate(${x},${y}) scale(${s * facing},${s})`}>
      <Glow color={color} o={o} w={w} d={d} />
      <Glow color={color} o={o} w={w} d="M0,-90 a14,14 0 1,0 0.01,0Z" />
    </g>
  );
};

/** Horse, side view line art. */
export const HorseIcon: React.FC<P> = ({ x, y, s = 1, color = C.lineBlue, o = 1, w = 2.6 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <Glow
      color={color}
      o={o}
      w={w}
      d="M-70,-10 C-74,-30 -60,-44 -36,-44 L30,-46 C44,-60 52,-84 60,-96 L70,-110 L74,-100 C84,-96 92,-86 96,-78 L90,-70 L72,-74 C66,-60 60,-42 56,-26 C54,-12 48,-4 40,-2 L40,40 M28,0 L26,40 M-48,-6 L-50,40 M-60,-10 L-64,40 M-70,-26 C-84,-24 -90,-10 -92,6"
    />
    <circle cx={78} cy={-94} r={2.8} fill={color} opacity={o} />
  </g>
);

/** Rabbit, side view line art. */
export const RabbitIcon: React.FC<P> = ({ x, y, s = 1, color = C.lineBlue, o = 1, w = 2.6 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <Glow color={color} o={o} w={w} d="M-46,30 C-62,10 -50,-22 -14,-24 C6,-26 20,-16 26,-4 C40,-6 52,2 50,16 C48,30 34,32 22,30 Z M30,-8 C26,-40 34,-64 40,-70 C44,-58 40,-30 36,-8 M38,-6 C42,-36 56,-56 62,-58 C62,-44 50,-24 42,-4 M-48,22 C-58,22 -60,30 -54,32" />
    <circle cx={40} cy={4} r={2.6} fill={color} opacity={o} />
  </g>
);

/** Spark / starburst (dopamine "spark"). */
export const SparkIcon: React.FC<P & { k?: number }> = ({ x, y, s = 1, color = C.gold, o = 1, k = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
    {Array.from({ length: 10 }).map((_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const r0 = 14 * k;
      const r1 = (i % 2 ? 40 : 62) * k;
      return <Glow key={i} color={color} w={3} d={`M${Math.cos(a) * r0},${Math.sin(a) * r0} L${Math.cos(a) * r1},${Math.sin(a) * r1}`} />;
    })}
    <circle r={10 * k} fill={color} />
  </g>
);
