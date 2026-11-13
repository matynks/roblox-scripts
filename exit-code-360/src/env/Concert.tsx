// Concert stadium at night: stands (shared with the pitch), stage + LED screen,
// truss rig over the crowd with stage lights, haze, crowd silhouettes, GATE 4.
import React from "react";
import { C } from "../style/palette";
import { Layer, type Cam } from "../lib/camera";
import { clamp, deg, lerp, noise1, rand } from "../lib/anim";
import { FONT } from "../style/fonts";
import { Stands } from "./Pitch";

export const CONCERT = {
  trussY: 170,
  dangerX: 1200,
  miaX: 1200,
  miaFeet: 1050, // Mia stands among the crowd (head ≈ y 883)
  miaHead: 885,
  leoX: 2250,
  post: 844, // Leo stands on the platform
  gateX: 2620,
  rowNear: 900,
  crowdEnd: 2070, // crowd barrier before Leo's post / the gate
};
export const ROWS_BACK = [
  { y: 760, dx: 26, r: 9, tone: "#1E1A2E" },
  { y: 820, dx: 32, r: 11, tone: "#191526" },
  { y: 900, dx: 40, r: 14, tone: "#14111E" },
];
export const ROWS_FRONT = [
  { y: 980, dx: 48, r: 17, tone: "#110E19" },
  { y: 1062, dx: 56, r: 20, tone: "#0E0B15" },
];
export const CONCERT_LIGHT = { x: -0.6, y: -0.8 };
export const STAGE_RIM = "#C9B8FF";
const BEAMS = ["#D04AA8", "#4AC8E0", "#F2C55C", "#8A6AF0"];

/** state for the light that fails: shake 0..1, snapped (one side hanging), fall 0..1 (to the floor), gone after crash */
export type DangerLight = { shake: number; snapped: number; fall: number; crashed: boolean };

const Can: React.FC<{ x: number; y: number; ang: number; color: string; on: number; t: number; hangOne?: number; shake?: number }> = ({ x, y, ang, color, on, hangOne = 0, shake = 0, t }) => {
  const sh = shake * Math.sin(t * 38) * 4;
  const a = ang + hangOne * 38 + sh;
  return (
    <g transform={`translate(${x},${y}) rotate(${a})`}>
      <path d="M-34,0 L34,0 L22,40 L-22,40Z" fill={`${color}`} opacity={0.06 * on} transform="scale(1,1)" />
      <path d={`M-22,40 L-260,1000 L260,1000 L22,40Z`} fill={color} opacity={0.075 * on} />
      <rect x={-20} y={-14} width={40} height={52} rx={8} fill="#141220" />
      <rect x={-16} y={30} width={32} height={10} rx={4} fill={color} opacity={0.9 * on} />
      <circle cx={0} cy={36} r={30} fill={color} opacity={0.25 * on} />
      <path d="M-14,-14 L-14,-30 L14,-30 L14,-14" stroke="#141220" strokeWidth={5} fill="none" />
    </g>
  );
};

export const ConcertBack: React.FC<{ cam: Cam; t: number; lightsOn?: number; danger: DangerLight; house?: number; blur?: number }> = ({ cam, t, lightsOn = 1, danger, house = 0, blur = 0 }) => {
  const { trussY } = CONCERT;
  const cans = [-650, -350, -50, 250, 550, 850, 1200, 1550, 1850];
  return (
    <>
      <Stands cam={cam} t={t} />
      <Layer cam={cam} p={1} blur={blur}>
        <defs>
          <linearGradient id="ccHaze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6A5AA8" stopOpacity="0" />
            <stop offset="1" stopColor="#6A5AA8" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="ccScreen" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3A1E5A" />
            <stop offset="1" stopColor="#1E4A6A" />
          </linearGradient>
        </defs>
        {/* stage + LED screen */}
        <rect x={-950} y={250} width={1520} height={400} rx={10} fill="#0C0A16" />
        <rect x={-900} y={280} width={1420} height={340} fill="url(#ccScreen)" opacity={0.9 * lightsOn} />
        {Array.from({ length: 24 }).map((_, i) => (
          <rect key={i} x={-880 + i * 58} y={600 - (0.5 + 0.5 * Math.sin(t * 6 + i * 0.6)) * 260 * lightsOn} width={40} height={(0.5 + 0.5 * Math.sin(t * 6 + i * 0.6)) * 260 * lightsOn} fill={BEAMS[i % 4]} opacity={0.35} />
        ))}
        <rect x={-980} y={640} width={1600} height={60} fill="#151222" />
        <rect x={-980} y={640} width={1600} height={4} fill={STAGE_RIM} opacity={0.4} />
        {/* truss towers */}
        {[-920, 640, 2000].map((x) => (
          <g key={x}>
            <rect x={x} y={trussY} width={36} height={700} fill="none" stroke="#2A2638" strokeWidth={5} />
            {Array.from({ length: 14 }).map((_, k) => (
              <path key={k} d={`M${x},${trussY + k * 50} L${x + 36},${trussY + k * 50 + 50}`} stroke="#2A2638" strokeWidth={3} />
            ))}
          </g>
        ))}
        {/* truss beam */}
        <rect x={-940} y={trussY - 20} width={2980} height={40} fill="none" stroke="#2A2638" strokeWidth={6} />
        {Array.from({ length: 60 }).map((_, k) => (
          <path key={k} d={`M${-940 + k * 50},${trussY - 20} L${-940 + k * 50 + 50},${trussY + 20}`} stroke="#2A2638" strokeWidth={3} />
        ))}
        {/* bolts on the truss above the crowd (pinged later) */}
        {[880, 1020, 1380, 1520, 1700, 1880].map((x) => (
          <circle key={x} cx={x} cy={trussY + 20} r={6} fill="#4A4660" />
        ))}
        {/* stage lights */}
        {cans.map((x, i) => {
          const isD = x === CONCERT.dangerX;
          if (isD && danger.fall > 0) return null;
          const ang = Math.sin(t * 0.8 + i) * 18;
          return <Can key={x} x={x} y={trussY + 24} ang={ang} color={BEAMS[i % 4]} on={lightsOn} t={t} hangOne={isD ? danger.snapped : 0} shake={isD ? danger.shake : 0} />;
        })}
        <rect x={-1200} y={-200} width={4600} height={1300} fill="url(#ccHaze)" />
        {/* GATE 4 */}
        <g transform={`translate(${CONCERT.gateX},0)`}>
          <rect x={-40} y={300} width={60} height={600} fill="#121020" />
          <rect x={380} y={300} width={60} height={600} fill="#121020" />
          <rect x={-60} y={240} width={520} height={120} rx={10} fill="#121020" />
          <rect x={-40} y={258} width={480} height={84} rx={8} fill={C.gold} opacity={0.12 + 0.05 * Math.sin(t * 3)} />
          <text x={200} y={326} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={64} letterSpacing="10" fill={C.gold}>
            GATE 4
          </text>
          {[60, 160, 260].map((x) => (
            <g key={x}>
              <rect x={x} y={760} width={14} height={140} fill="#2A2638" />
              <rect x={x - 30} y={760} width={74} height={10} fill="#3A3650" />
            </g>
          ))}
          <path d={`M-40,360 L-320,1000 L760,1000 L440,360Z`} fill={C.gold} opacity={0.035} />
        </g>
        {/* crowd barrier */}
        <rect x={CONCERT.crowdEnd + 10} y={800} width={24} height={320} fill="#1A1626" />
        <rect x={CONCERT.crowdEnd + 30} y={800} width={3} height={320} fill={C.gold} opacity={0.3} />
        {/* Leo's security post */}
        <rect x={CONCERT.leoX - 80} y={CONCERT.post} width={160} height={56} rx={6} fill="#1A1626" />
        <rect x={CONCERT.leoX - 80} y={CONCERT.post} width={160} height={4} fill={C.gold} opacity={0.6} />
        {house > 0 && <rect x={-1200} y={-300} width={4600} height={1400} fill="#FFE9C8" opacity={0.08 * house} />}
      </Layer>
    </>
  );
};

/** Lightweight crowd silhouettes. turn 0..1 = heads turn to look up/right; clap 0..1. */
export const Crowd: React.FC<{
  cam: Cam;
  t: number;
  rows?: { y: number; dx: number; r: number; tone: string }[];
  x0?: number;
  x1?: number;
  turn?: number;
  clap?: number;
  skip?: (x: number, row: number) => boolean;
  p?: number;
  blur?: number;
}> = ({ cam, t, rows, x0 = -600, x1 = CONCERT.crowdEnd, turn = 0, clap = 0, skip, p = 1, blur = 0 }) => {
  const R = rows ?? ROWS_BACK;
  return (
    <Layer cam={cam} p={p} blur={blur}>
      {R.map((row, ri) => {
        const n = Math.floor((x1 - x0) / row.dx);
        return (
          <g key={ri}>
            {Array.from({ length: n }).map((_, i) => {
              const x = x0 + i * row.dx + (ri % 2) * row.dx * 0.5 + (rand(i * 3.1 + ri) - 0.5) * row.dx * 0.4;
              if (skip?.(x, ri)) return null;
              const ph = rand(i * 7.3 + ri * 3);
              const bob = Math.abs(Math.sin(t * 4.2 + ph * 6)) * row.r * 0.5 * (1 - clap * 0.5);
              const y = row.y - bob;
              const phone = ph > 0.84;
              const arm = phone || ph < 0.12 || clap > 0.5;
              const tx = turn * row.r * 0.35 * (0.6 + ph * 0.4);
              const clapK = clap * Math.abs(Math.sin(t * 9 + ph * 5));
              return (
                <g key={i}>
                  <ellipse cx={x} cy={y + row.r * 2.1} rx={row.r * 1.3} ry={row.r * 1.3} fill={row.tone} />
                  {arm && !clap && <path d={`M${x + row.r * 0.6},${y + row.r} L${x + row.r * 1.1},${y - row.r * 2.2}`} stroke={row.tone} strokeWidth={row.r * 0.45} strokeLinecap="round" />}
                  {clap > 0.05 && (
                    <path d={`M${x - row.r},${y + row.r} L${x - row.r * (0.2 + 0.4 * (1 - clapK))},${y - row.r * 1.8} M${x + row.r},${y + row.r} L${x + row.r * (0.2 + 0.4 * (1 - clapK))},${y - row.r * 1.8}`} stroke={row.tone} strokeWidth={row.r * 0.42} strokeLinecap="round" />
                  )}
                  {phone && !clap && <rect x={x + row.r * 0.8} y={y - row.r * 3.2} width={row.r * 0.7} height={row.r * 1.1} rx={2} fill="#CFE4FF" opacity={0.8} />}
                  <circle cx={x + tx * 0.3} cy={y} r={row.r} fill={row.tone} />
                  <circle cx={x + tx * 0.3 - row.r * 0.08} cy={y - row.r * 0.06} r={row.r} fill="none" stroke={STAGE_RIM} strokeWidth={1.2} opacity={0.35} />
                  {turn > 0.05 && (
                    <g opacity={turn}>
                      <circle cx={x + tx * 0.3 + row.r * 0.1 + tx} cy={y - row.r * 0.25} r={row.r * 0.17} fill={C.eyeWhite} />
                      <circle cx={x + tx * 0.3 + row.r * 0.5 + tx} cy={y - row.r * 0.25} r={row.r * 0.17} fill={C.eyeWhite} />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </Layer>
  );
};

/** The falling stage light (world coords) with impact sparks. */
export const FallingLight: React.FC<{ fall: number; t: number; tCrash: number }> = ({ fall, t, tCrash }) => {
  const x = CONCERT.dangerX + 30;
  const y = lerp(CONCERT.trussY + 60, CONCERT.miaHead + 40, fall * fall);
  const rot = 38 + fall * 140;
  const k = t - tCrash;
  return (
    <g>
      {fall < 1 && (
        <g transform={`translate(${x},${y}) rotate(${rot})`}>
          <rect x={-20} y={-14} width={40} height={52} rx={8} fill="#141220" />
          <rect x={-16} y={30} width={32} height={10} rx={4} fill="#F2C55C" />
        </g>
      )}
      {k > 0 && (
        <g>
          <g transform={`translate(${x},${CONCERT.miaHead + 60}) rotate(${70 + Math.min(k, 0.3) * 40})`}>
            <rect x={-20} y={-14} width={40} height={52} rx={8} fill="#141220" />
          </g>
          {Array.from({ length: 22 }).map((_, i) => {
            const a = deg(-170 + rand(i) * 160);
            const v = 300 + rand(i * 3) * 500;
            const px = x + Math.cos(a) * v * k;
            const py = CONCERT.miaHead + 60 + Math.sin(a) * v * k + 900 * k * k;
            return <circle key={i} cx={px} cy={py} r={2.6} fill={i % 3 ? "#FFD27A" : "#FFF4E8"} opacity={clamp(1 - k * 1.4)} />;
          })}
          <ellipse cx={x} cy={CONCERT.miaHead + 70} rx={60 + k * 260} ry={18 + k * 60} fill="#B9A9C8" opacity={clamp(0.45 - k * 0.25)} />
        </g>
      )}
    </g>
  );
};

export const concertNoise = noise1;
