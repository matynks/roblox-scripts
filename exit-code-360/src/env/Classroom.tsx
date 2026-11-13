// Classroom seen from the teacher's desk (front view): warm windows with trees
// (reference exam hall), clock, cork board, door with cool corridor light, rows of desks.
import React from "react";
import { C } from "../style/palette";
import { Layer, type Cam } from "../lib/camera";
import { mixColor, rand } from "../lib/anim";
import type { CharacterSpec } from "../characters/types";
import { EXTRA } from "../characters/cast";
import { Motes } from "./Atmosphere";

export const CLASS_LIGHT = { x: 0.15, y: -1 };
export const ROWS = [
  { hip: 600, desk: 612, s: 0.5, n: 11, x0: 250, dx: 142 },
  { hip: 742, desk: 756, s: 0.64, n: 10, x0: 210, dx: 166 },
  { hip: 920, desk: 936, s: 0.8, n: 9, x0: 190, dx: 192 },
];
const SHIRTS = ["#5A6A88", "#6E5A7A", "#7A6A50", "#4E6E62", "#8A5A5A", "#5E5E6E"];
export const studentSpec = (i: number): CharacterSpec => ({ ...EXTRA, outfit: "jacket", torsoW: 42, cloth: SHIRTS[i % SHIRTS.length], clothShade: mixColor(SHIRTS[i % SHIRTS.length], "#000000", 0.3), clothLight: SHIRTS[i % SHIRTS.length] });

export const ClassBack: React.FC<{ cam: Cam; t: number; door?: number; blur?: number; dim?: number }> = ({ cam, t, door = 0, blur = 0, dim = 0 }) => (
  <Layer cam={cam} p={1} blur={blur}>
    <defs>
      <linearGradient id="clOut" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F6C88C" />
        <stop offset="1" stopColor="#E0905E" />
      </linearGradient>
      <linearGradient id="clWall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2E2226" />
        <stop offset="1" stopColor="#433134" />
      </linearGradient>
      <linearGradient id="clShaft" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFD9A0" stopOpacity="0.16" />
        <stop offset="1" stopColor="#FFD9A0" stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect x={-600} y={-300} width={3100} height={1500} fill="url(#clWall)" />
    {[180, 720, 1260].map((x, i) => (
      <g key={i}>
        <rect x={x} y={90} width={400} height={330} fill="url(#clOut)" />
        <ellipse cx={x + 110} cy={330} rx={90} ry={100} fill="#7A4A3A" opacity={0.62} />
        <ellipse cx={x + 290} cy={350 - rand(i) * 30} rx={80} ry={90} fill="#6E4234" opacity={0.58} />
        <rect x={x} y={90} width={400} height={330} fill="none" stroke="#1E1418" strokeWidth={14} />
        <path d={`M${x + 200},90 L${x + 200},420 M${x},255 L${x + 400},255`} stroke="#1E1418" strokeWidth={9} />
        <path d={`M${x},420 L${x + 400},420 L${x + 520},1100 L${x - 120},1100Z`} fill="url(#clShaft)" />
      </g>
    ))}
    {/* clock + cork board */}
    <g transform="translate(1760,170)">
      <circle r={46} fill="#E9E6E1" stroke="#1E1418" strokeWidth={6} />
      <path d={`M0,0 L0,-30 M0,0 L${Math.sin(t * 0.4) * 22},${-Math.cos(t * 0.4) * 22}`} stroke="#1E1418" strokeWidth={4} strokeLinecap="round" />
    </g>
    <rect x={-160} y={140} width={260} height={180} fill="#6E5038" stroke="#2A1C16" strokeWidth={8} />
    {[0, 1, 2].map((k) => (
      <rect key={k} x={-140 + k * 80} y={160 + (k % 2) * 30} width={60} height={70} fill="#EDE8DF" opacity={0.8} transform={`rotate(${(k - 1) * 6},${-110 + k * 80},190)`} />
    ))}
    {/* door with cool corridor light */}
    <rect x={1700} y={300} width={190} height={560} fill="#1A1218" />
    <rect x={1712} y={312} width={166} height={548} fill={mixColor("#140E12", "#B9C6F0", door * 0.8)} />
    <path d={`M1712,312 L${1712 + 166 * (1 - door * 0.8)},${312 + door * 16} L${1712 + 166 * (1 - door * 0.8)},${860 - door * 8} L1712,860Z`} fill="#3A2830" />
    {door > 0.01 && <path d={`M1712,860 L1878,860 L2100,1100 L1500,1100Z`} fill="#B9C6F0" opacity={0.14 * door} />}
    <rect x={-600} y={860} width={3100} height={400} fill="#2A1E22" />
    <Motes t={t} count={30} x0={-200} x1={2100} y0={100} y1={900} seed={31} size={2.2} />
    {dim > 0 && <rect x={-600} y={-300} width={3100} height={1500} fill="#000" opacity={dim} />}
  </Layer>
);

/** A row of front-view desks (drawn over the seated students of that row). */
export const DeskRow: React.FC<{ row: (typeof ROWS)[number]; skip?: number[]; extraX?: number[] }> = ({ row, skip = [], extraX = [] }) => {
  const xs = Array.from({ length: row.n }).map((_, i) => row.x0 + i * row.dx).filter((_, i) => !skip.includes(i)).concat(extraX);
  const w = 150 * row.s * 1.6;
  return (
    <g>
      {xs.map((x, i) => (
        <g key={i}>
          <rect x={x - w / 2} y={row.desk} width={w} height={14 * row.s * 1.6} rx={4} fill="#6E4A32" />
          <rect x={x - w / 2} y={row.desk} width={w} height={4} fill={C.rimWarm} opacity={0.35} />
          <rect x={x - w / 2 + 8} y={row.desk + 14 * row.s * 1.6} width={w - 16} height={120 * row.s} fill="#4A3224" />
          <rect x={x - w / 2 + 14} y={row.desk + 14 * row.s * 1.6 + 120 * row.s} width={10} height={60 * row.s} fill="#2A1C16" />
          <rect x={x + w / 2 - 24} y={row.desk + 14 * row.s * 1.6 + 120 * row.s} width={10} height={60 * row.s} fill="#2A1C16" />
        </g>
      ))}
    </g>
  );
};
