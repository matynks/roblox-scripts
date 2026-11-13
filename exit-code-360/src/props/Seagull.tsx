import React from "react";
import { C } from "../style/palette";
import { lerp } from "../lib/anim";

export type GullState = {
  x: number;
  y: number;
  scale?: number;
  facing?: 1 | -1;
  flap?: number; // wing angle in degrees (+ up)
  fold?: number; // 0 = wings out (flying), 1 = folded (perched)
  beak?: number; // 0..1 open
  headUp?: number; // 0..1 nose-in-the-air "hmph"
  glare?: number; // 0..1 offended brow
  legs?: number; // 0..1 legs down
  bodyTilt?: number; // degrees
  rim?: string;
  kind?: "gull" | "pigeon";
};

const PALETTES = {
  gull: { white: "#F3EEF2", under: "#CBC1D0", wing: "#B7AFC2", wingFar: "#8F879C", tip: "#231A27", beak: "#F2B84B", leg: "#E39A55", head: "#F3EEF2", sheen: "none" },
  pigeon: { white: "#9A97A8", under: "#7C788C", wing: "#B3AFC0", wingFar: "#7F7B90", tip: "#3A3646", beak: "#2B2630", leg: "#D9897A", head: "#7B7891", sheen: "#5E9C86" },
};


const Wing: React.FC<{ angle: number; fold: number; far?: boolean; wing: string; wingFar: string; tip: string }> = ({ angle, fold, far, wing, wingFar, tip }) => {
  // open wing: long tapered shape; folded: lies along the back
  const span = lerp(92, 46, fold);
  const a = lerp(angle, -8, fold);
  const col = far ? wingFar : wing;
  return (
    <g transform={`translate(${lerp(2, -4, fold)},-10) rotate(${-a}) scale(1,${lerp(1, 0.55, fold)})`}>
      <path
        d={`M-10,0 Q${-span * 0.35},${-24} ${-span},${-6} Q${-span * 0.6},${6} -6,8Z`}
        transform={`scale(${lerp(-1, 1, fold)},1)`}
        fill={col}
      />
      <path
        d={`M${-span * 0.7},${-14} Q${-span * 0.85},${-12} ${-span},${-6} Q${-span * 0.82},${0} ${-span * 0.66},${0}Z`}
        transform={`scale(${lerp(-1, 1, fold)},1)`}
        fill={tip}
      />
    </g>
  );
};

export const Seagull: React.FC<GullState> = ({
  x,
  y,
  scale = 1,
  facing = 1,
  flap = 10,
  fold = 0,
  beak = 0,
  headUp = 0,
  glare = 0,
  legs = 0,
  bodyTilt = 0,
  rim = C.rimWarm,
  kind = "gull",
}) => {
  const pal = PALETTES[kind];
  const WHITE = pal.white;
  const UNDER = pal.under;
  const TIP = pal.tip;
  const BEAK = pal.beak;
  const LEG = pal.leg;
  const HEAD = pal.head;
  const SHEEN = pal.sheen;
  return (
  <g transform={`translate(${x},${y}) scale(${scale * facing},${scale}) rotate(${bodyTilt})`}>
    {/* far wing */}
    <g opacity={1 - fold}>
      <Wing angle={flap * 0.85 + 6} fold={fold} far wing={pal.wing} wingFar={pal.wingFar} tip={pal.tip} />
    </g>
    {/* legs */}
    {legs > 0.01 && (
      <g opacity={legs}>
        <path d={`M-4,12 L-6,${12 + 26 * legs} M6,12 L8,${12 + 26 * legs}`} stroke={LEG} strokeWidth={3.2} strokeLinecap="round" />
        <path d={`M-12,${12 + 26 * legs} L0,${12 + 26 * legs} M2,${12 + 26 * legs} L14,${12 + 26 * legs}`} stroke={LEG} strokeWidth={3} strokeLinecap="round" />
      </g>
    )}
    {/* tail */}
    <path d="M-30,-4 L-56,-12 L-54,2 L-30,6Z" fill={TIP} />
    <path d="M-30,-4 L-50,-8 L-48,0 L-30,4Z" fill={WHITE} opacity={0.9} />
    {/* body with rim */}
    <ellipse cx={1} cy={-1.5} rx={36} ry={16.5} fill={rim} opacity={0.9} />
    <ellipse cx={0} cy={0} rx={36} ry={16} fill={WHITE} />
    <path d="M-30,4 Q0,20 30,4 Q0,14 -30,4Z" fill={UNDER} />
    {/* head */}
    <g transform={`translate(28,-12) rotate(${-headUp * 26})`}>
      <circle cx={0.8} cy={-1} r={13.5} fill={rim} opacity={0.9} />
      <circle r={13} fill={HEAD} />
      {SHEEN !== "none" && <path d="M-12,4 Q-4,12 8,10 L6,14 Q-6,16 -13,8Z" fill={SHEEN} opacity={0.85} />}
      {/* beak (upper + lower) */}
      <path d={`M10,-2 L28,0 L10,4Z`} fill={BEAK} />
      <path d={`M10,3 L24,${3 + beak * 9} L10,${6 + beak * 2}Z`} fill={BEAK} />
      <circle cx={24} cy={2 + beak * 4} r={1.6} fill="#D2483D" />
      {/* eye */}
      <circle cx={5} cy={-3} r={2.5} fill={TIP} />
      {glare > 0.01 && (
        <path d="M0,-9 L11,-5" stroke={TIP} strokeWidth={2.6} strokeLinecap="round" opacity={glare} />
      )}
    </g>
    {/* near wing */}
    <Wing angle={flap} fold={fold} wing={pal.wing} wingFar={pal.wingFar} tip={pal.tip} />
  </g>
  );
};
