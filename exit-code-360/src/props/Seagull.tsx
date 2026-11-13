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
};

const WHITE = "#F3EEF2";
const UNDER = "#CBC1D0";
const WING = "#B7AFC2";
const TIP = "#231A27";
const BEAK = "#F2B84B";
const LEG = "#E39A55";

const Wing: React.FC<{ angle: number; fold: number; far?: boolean }> = ({ angle, fold, far }) => {
  // open wing: long tapered shape; folded: lies along the back
  const span = lerp(92, 46, fold);
  const a = lerp(angle, -8, fold);
  const col = far ? "#8F879C" : WING;
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
        fill={TIP}
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
}) => (
  <g transform={`translate(${x},${y}) scale(${scale * facing},${scale}) rotate(${bodyTilt})`}>
    {/* far wing */}
    <g opacity={1 - fold}>
      <Wing angle={flap * 0.85 + 6} fold={fold} far />
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
      <circle r={13} fill={WHITE} />
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
    <Wing angle={flap} fold={fold} />
  </g>
);
