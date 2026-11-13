// Street at dusk: shopfronts with warm windows, lamps, sidewalk, road.
import React from "react";
import { C } from "../style/palette";
import { Layer, repeatX, type Cam } from "../lib/camera";
import { noise1, rand } from "../lib/anim";
import { Motes } from "./Atmosphere";

export const STREET = { walk: 884, far: 846, curb: 958, shopStep: 560 };
export const STREET_LIGHT = { x: 0.7, y: -0.7 };

export const DuskSky: React.FC<{ cam: Cam; t: number }> = ({ cam, t }) => (
  <Layer cam={cam} p={0.04}>
    <defs>
      <linearGradient id="stSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#241A38" />
        <stop offset="0.55" stopColor="#4A2E58" />
        <stop offset="0.85" stopColor="#8E4E74" />
        <stop offset="1" stopColor="#D88A8E" />
      </linearGradient>
    </defs>
    <rect x={-1500} y={-600} width={6000} height={1160} fill="url(#stSky)" />
    {[[300, 140, 700], [1200, 220, 900], [2100, 120, 800]].map(([x, y, w], i) => (
      <ellipse key={i} cx={x + t * 5} cy={y} rx={w / 2} ry={12} fill="#7A4A72" opacity={0.35} />
    ))}
  </Layer>
);

const Skyline: React.FC<{ cam: Cam; t: number }> = ({ cam, t }) => {
  const items = repeatX(cam, 0.18, 110, 0, 300);
  return (
    <Layer cam={cam} p={0.18}>
      {items.map(({ x, i }) => {
        const h = 160 + rand(i * 3.7) * 260;
        return (
          <g key={i}>
            <rect x={x} y={560 - h} width={100} height={h + 200} fill={i % 2 ? "#2A1F38" : "#251B32"} />
            {Array.from({ length: 12 }).map((_, j) =>
              rand(i * 17 + j) > 0.62 ? (
                <rect key={j} x={x + 12 + (j % 4) * 22} y={560 - h + 16 + Math.floor(j / 4) * 30} width={10} height={14} fill="#F2B880" opacity={0.55 * (noise1(t * 0.2 + j, i) > 0.9 ? 0.3 : 1)} />
              ) : null,
            )}
          </g>
        );
      })}
    </Layer>
  );
};

const AWN = [
  ["#3E6E78", "#E8DCC8"],
  ["#6B3045", "#E8DCC8"],
  ["#4A5A44", "#E8DCC8"],
  ["#5B3F6E", "#E8DCC8"],
];
const BRICK = ["#3A2A38", "#44303F", "#2F2535", "#3C2C34"];

const Shop: React.FC<{ x: number; i: number; t: number }> = ({ x, i, t }) => {
  const w = STREET.shopStep - 20;
  const top = 120 + rand(i * 2.3) * 120;
  const [a1, a2] = AWN[((i % 4) + 4) % 4];
  const fl = 0.9 + 0.1 * noise1(t * 2 + i, i);
  return (
    <g>
      <rect x={x} y={top} width={w} height={800 - top} fill={BRICK[((i % 4) + 4) % 4]} />
      <rect x={x} y={top} width={w} height={18} fill="#1E1620" />
      {/* upper windows */}
      {[0, 1, 2].map((k) => (
        <g key={k}>
          <rect x={x + 50 + k * 160} y={top + 60} width={90} height={120} fill={rand(i * 9 + k) > 0.5 ? "#F2B880" : "#2A2236"} opacity={0.85} />
          <rect x={x + 50 + k * 160} y={top + 60} width={90} height={120} fill="none" stroke="#1E1620" strokeWidth={6} />
        </g>
      ))}
      {/* shop window with warm interior */}
      <rect x={x + 30} y={560} width={w - 160} height={230} fill="#F0B47A" opacity={0.92 * fl} />
      <rect x={x + 30} y={700} width={w - 160} height={90} fill="#C88A5A" opacity={0.6} />
      {Array.from({ length: 5 }).map((_, k) => (
        <rect key={k} x={x + 60 + k * 64} y={640 + (k % 2) * 20} width={40} height={60 - (k % 2) * 20} rx={6} fill="#6B4030" opacity={0.6} />
      ))}
      <rect x={x + 30} y={560} width={w - 160} height={230} fill="none" stroke="#1E1620" strokeWidth={8} />
      {/* door */}
      <rect x={x + w - 110} y={600} width={80} height={200} fill="#1E1620" />
      <rect x={x + w - 100} y={612} width={60} height={90} fill="#F0B47A" opacity={0.5 * fl} />
      {/* awning */}
      {Array.from({ length: 8 }).map((_, k) => (
        <path key={k} d={`M${x + 10 + k * ((w - 20) / 8)},520 L${x + 10 + (k + 1) * ((w - 20) / 8)},520 L${x + 10 + (k + 1) * ((w - 20) / 8) + 6},572 L${x + 10 + k * ((w - 20) / 8) + 6},572Z`} fill={k % 2 ? a2 : a1} opacity={k % 2 ? 0.85 : 1} />
      ))}
      <rect x={x + 6} y={512} width={w - 12} height={10} fill="#1E1620" />
      {/* window light spilling on the pavement */}
      <path d={`M${x + 30},800 L${x + w - 130},800 L${x + w - 60},${STREET.curb} L${x - 40},${STREET.curb}Z`} fill="#F0B47A" opacity={0.1 * fl} />
    </g>
  );
};

const StreetLamp: React.FC<{ x: number; t: number; i: number }> = ({ x, t, i }) => {
  const fl = 0.93 + 0.07 * noise1(t * 3 + i, i + 3);
  return (
    <g>
      <rect x={x - 6} y={330} width={12} height={STREET.curb - 330} fill="#1A1420" />
      <path d={`M${x},336 Q${x},300 ${x + 44},302`} stroke="#1A1420" strokeWidth={9} fill="none" />
      <path d={`M${x + 28},300 L${x + 62},300 L${x + 56},318 L${x + 34},318Z`} fill="#1A1420" />
      <circle cx={x + 45} cy={322} r={9} fill={C.lampWarm} opacity={fl} />
      <circle cx={x + 45} cy={322} r={80} fill="url(#stGlow)" opacity={fl} />
      <path d={`M${x + 34},320 L${x - 140},${STREET.curb} L${x + 230},${STREET.curb} L${x + 56},320Z`} fill={C.lampWarm} opacity={0.05 * fl} />
    </g>
  );
};

export const StreetSet: React.FC<{ cam: Cam; t: number; blur?: number; children?: React.ReactNode; lampMoth?: number }> = ({ cam, t, blur = 0, children }) => {
  const shops = repeatX(cam, 1, STREET.shopStep, -300, 600);
  const lamps = repeatX(cam, 1, 1120, 380, 400);
  const tiles = repeatX(cam, 1, 140, 0, 300);
  const [a, b] = [shops[0].x - 600, shops[shops.length - 1].x + 1200];
  return (
    <>
      <DuskSky cam={cam} t={t} />
      <Skyline cam={cam} t={t} />
      <Layer cam={cam} p={1} blur={blur}>
        <defs>
          <radialGradient id="stGlow">
            <stop offset="0" stopColor={C.lampWarm} stopOpacity="0.55" />
            <stop offset="1" stopColor={C.lampWarm} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="stWalk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3E3242" />
            <stop offset="1" stopColor="#2A2230" />
          </linearGradient>
          <linearGradient id="stRoad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#221A26" />
            <stop offset="1" stopColor="#0E0A10" />
          </linearGradient>
        </defs>
        {shops.map(({ x, i }) => (
          <Shop key={i} x={x} i={i} t={t} />
        ))}
        <rect x={a} y={800} width={b - a} height={STREET.curb - 800} fill="url(#stWalk)" />
        <rect x={a} y={800} width={b - a} height={4} fill="#1E1620" />
        {tiles.map(({ x, i }) => (
          <rect key={i} x={x} y={806} width={2} height={STREET.curb - 806} fill="#000" opacity={0.15} />
        ))}
        <rect x={a} y={STREET.curb} width={b - a} height={12} fill="#4A3C4E" />
        <rect x={a} y={STREET.curb + 12} width={b - a} height={300} fill="url(#stRoad)" />
        {repeatX(cam, 1, 260, 0, 300).map(({ x, i }) => (
          <rect key={i} x={x} y={1040} width={130} height={8} fill="#D8C8A8" opacity={0.25} />
        ))}
        {lamps.map(({ x, i }) => (
          <StreetLamp key={i} x={x} t={t} i={i} />
        ))}
        <Motes t={t} count={30} x0={cam.x - 200} x1={cam.x + 2200} y0={300} y1={950} seed={11} size={2.2} color="#FFE2C8" />
        {children}
      </Layer>
    </>
  );
};

export const StreetForeground: React.FC<{ cam: Cam }> = ({ cam }) => {
  const items = repeatX(cam, 1.6, 1400, 300, 400);
  return (
    <Layer cam={cam} p={1.6} blur={12}>
      {items.map(({ x, i }) => (
        <g key={i}>
          <rect x={x} y={380} width={40} height={900} rx={10} fill="#0B080E" />
          <rect x={x + 300} y={860} width={380} height={300} rx={60} fill="#0B080E" />
        </g>
      ))}
    </Layer>
  );
};
