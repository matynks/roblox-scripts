// School gym: warm high windows with trees outside (reference school hall),
// light shafts, hardwood floor, padded end wall, hoop, scoreboard.
import React from "react";
import { C } from "../style/palette";
import { Layer, repeatX, type Cam } from "../lib/camera";
import { noise1, rand } from "../lib/anim";
import { FONT } from "../style/fonts";
import { Motes } from "./Atmosphere";

export const GYM = { floor: 862, lane: 884, far: 846, near: 948, endWall: 1990, hoopX: 1952, hoopY: 430, board: { x: 1050, y: 230 } };
export const GYM_LIGHT = { x: 0.6, y: -0.8 };

export const GymSet: React.FC<{ cam: Cam; t: number; blur?: number; clock?: string; gameOver?: number; children?: React.ReactNode }> = ({ cam, t, blur = 0, clock = "04:00", gameOver = 0, children }) => {
  const wins = repeatX(cam, 1, 380, -120, 400).filter((w) => w.x < GYM.endWall - 200);
  const seams = repeatX(cam, 1, 160, 0, 300);
  const { floor } = GYM;
  return (
    <Layer cam={cam} p={1} blur={blur}>
      <defs>
        <linearGradient id="gyWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2C2026" />
          <stop offset="1" stopColor="#3E2C30" />
        </linearGradient>
        <linearGradient id="gyFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9A6640" />
          <stop offset="0.4" stopColor="#7A4E32" />
          <stop offset="1" stopColor="#3A2418" />
        </linearGradient>
        <linearGradient id="gyShaft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FFD9A0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="gyOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6C88C" />
          <stop offset="1" stopColor="#E0905E" />
        </linearGradient>
      </defs>
      <rect x={-800} y={-400} width={GYM.endWall + 800} height={floor + 400} fill="url(#gyWall)" />
      {/* high windows with trees outside */}
      {wins.map(({ x, i }) => (
        <g key={i}>
          <rect x={x} y={110} width={230} height={280} fill="url(#gyOut)" />
          <ellipse cx={x + 60 + rand(i) * 80} cy={330} rx={70} ry={80} fill="#7A4A3A" opacity={0.65} />
          <ellipse cx={x + 170} cy={350 - rand(i * 3) * 30} rx={60} ry={70} fill="#6E4234" opacity={0.6} />
          <rect x={x} y={110} width={230} height={280} fill="none" stroke="#1E1418" strokeWidth={12} />
          <path d={`M${x + 115},110 L${x + 115},390 M${x},250 L${x + 230},250`} stroke="#1E1418" strokeWidth={8} />
          <path d={`M${x},390 L${x + 230},390 L${x + 760},${floor + 120} L${x + 420},${floor + 120}Z`} fill="url(#gyShaft)" opacity={0.85 + 0.15 * noise1(t * 0.5 + i, i)} />
        </g>
      ))}
      {/* wood paneling */}
      <rect x={-800} y={560} width={GYM.endWall + 800} height={floor - 560} fill="#4A3226" />
      {seams.map(({ x, i }) => (x < GYM.endWall ? <rect key={i} x={x} y={560} width={3} height={floor - 560} fill="#2E1E16" opacity={0.6} /> : null))}
      <rect x={-800} y={556} width={GYM.endWall + 800} height={8} fill="#2A1C16" />
      {/* scoreboard */}
      <g transform={`translate(${GYM.board.x},${GYM.board.y})`}>
        <rect x={-200} y={-85} width={400} height={170} rx={10} fill="#121014" stroke="#2A2228" strokeWidth={6} />
        <text x={0} y={18} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={74} fill="#FF8A3D" letterSpacing="6" style={{ fontVariantNumeric: "tabular-nums" }}>
          {clock}
        </text>
        <text x={0} y={66} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={26} fill="#FF5C6C" letterSpacing="5" opacity={gameOver * (0.6 + 0.4 * Math.round((Math.sin(t * 10) + 1) / 2))}>
          GAME OVER
        </text>
        <text x={-160} y={-48} fontFamily={FONT} fontWeight={700} fontSize={18} fill="#8A7F90" letterSpacing="3">
          TIME
        </text>
      </g>
      {/* end wall with mats */}
      <rect x={GYM.endWall} y={-400} width={900} height={floor + 400} fill="#261C22" />
      <rect x={GYM.endWall} y={-400} width={10} height={floor + 400} fill={C.rimWarm} opacity={0.2} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={GYM.endWall + 4} y={570 + k * 96} width={60} height={90} rx={8} fill="#3A5A88" />
      ))}
      {/* hoop */}
      <g>
        <rect x={GYM.hoopX + 24} y={GYM.hoopY - 160} width={14} height={190} fill="#E9E6E1" />
        <rect x={GYM.hoopX + 34} y={GYM.hoopY - 120} width={40} height={10} fill="#1E1418" />
        <path d={`M${GYM.hoopX - 70},${GYM.hoopY} L${GYM.hoopX + 24},${GYM.hoopY}`} stroke="#E0553D" strokeWidth={7} />
        <path d={`M${GYM.hoopX - 66},${GYM.hoopY + 2} L${GYM.hoopX - 52},${GYM.hoopY + 60} L${GYM.hoopX + 6},${GYM.hoopY + 60} L${GYM.hoopX + 20},${GYM.hoopY + 2} M${GYM.hoopX - 45},${GYM.hoopY + 2} L${GYM.hoopX - 35},${GYM.hoopY + 58} M${GYM.hoopX - 15},${GYM.hoopY + 2} L${GYM.hoopX - 10},${GYM.hoopY + 58}`} stroke="#E9E6E1" strokeWidth={2.5} fill="none" opacity={0.85} />
      </g>
      {/* floor */}
      <rect x={-800} y={floor} width={GYM.endWall + 1700} height={500} fill="url(#gyFloor)" />
      <rect x={-800} y={floor} width={GYM.endWall + 1700} height={4} fill="#2A1C16" />
      {[880, 905, 940, 990, 1050].map((y, k) => (
        <rect key={y} x={-800} y={y} width={GYM.endWall + 1700} height={2} fill="#2A1A10" opacity={0.25 + k * 0.05} />
      ))}
      <rect x={-800} y={918} width={GYM.endWall + 1700} height={5} fill="#E8DCC8" opacity={0.45} />
      {wins.map(({ x, i }) => (
        <rect key={`r${i}`} x={x + 40} y={floor + 6} width={150} height={60} fill="#FFD9A0" opacity={0.07} />
      ))}
      <Motes t={t} count={40} x0={cam.x - 200} x1={cam.x + 2300} y0={150} y1={floor} seed={21} size={2.4} />
      {children}
    </Layer>
  );
};

/** Red rubber dodgeball (or basketball when kind = "basket"). */
export const Ball: React.FC<{ x: number; y: number; r?: number; kind?: "dodge" | "basket"; rot?: number }> = ({ x, y, r = 22, kind = "dodge", rot = 0 }) => (
  <g transform={`translate(${x},${y}) rotate(${rot})`}>
    <circle r={r} fill={kind === "dodge" ? "#D2483D" : "#E07A2E"} />
    <circle cx={r * 0.25} cy={-r * 0.3} r={r * 0.45} fill="#fff" opacity={0.18} />
    {kind === "basket" && <path d={`M${-r},0 L${r},0 M0,${-r} L0,${r} M${-r * 0.7},${-r * 0.7} Q0,0 ${-r * 0.7},${r * 0.7}`} stroke="#3A1E10" strokeWidth={2} fill="none" />}
    <circle r={r} fill="none" stroke={C.rimWarm} strokeWidth={1.5} opacity={0.5} />
  </g>
);
