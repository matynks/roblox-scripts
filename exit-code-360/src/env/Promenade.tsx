import React from "react";
import { C } from "../style/palette";
import { Layer, repeatX, type Cam } from "../lib/camera";
import { noise1, rand } from "../lib/anim";
import { Motes } from "./Atmosphere";

// World layout (layer p = 1 coordinates, screen = world at cam 0/0/1)
export const PROM = {
  horizon: 470,
  railTop: 604,
  deck: 770, // top edge of the boardwalk
  laneFar: 838,
  laneMid: 884,
  laneNear: 948,
  sunX: 1380,
  lampStep: 980,
  lampOffset: 260,
};
export const KEY_LIGHT = { x: 0.82, y: -0.57 }; // toward the setting sun

const PINE = (x: number, base: number, h: number, k: string) => (
  <path key={`${x}`} d={`M${x - h * 0.22},${base} L${x},${base - h} L${x + h * 0.22},${base}Z`} fill={k} />
);

/** Sky, sun, clouds and sea (very far: parallax 0.04). */
export const SkySea: React.FC<{ cam: Cam; t: number; blur?: number }> = ({ cam, t, blur = 0 }) => {
  const p = 0.04;
  const hz = PROM.horizon;
  const sx = PROM.sunX;
  return (
    <Layer cam={cam} p={p} blur={blur}>
      <defs>
        <linearGradient id="pSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.skyTop} />
          <stop offset="0.42" stopColor="#3E2A50" />
          <stop offset="0.74" stopColor={C.skyMid} />
          <stop offset="0.93" stopColor={C.skyLow} />
          <stop offset="1" stopColor={C.horizonGlow} />
        </linearGradient>
        <radialGradient id="pBloom" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.sunCore} stopOpacity="0.95" />
          <stop offset="0.12" stopColor={C.sunBloom} stopOpacity="0.75" />
          <stop offset="0.4" stopColor={C.horizonGlow} stopOpacity="0.28" />
          <stop offset="1" stopColor={C.horizonGlow} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pSea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.seaTop} />
          <stop offset="0.12" stopColor={C.seaMid} />
          <stop offset="0.34" stopColor={C.seaLow} />
          <stop offset="1" stopColor="#1E1626" />
        </linearGradient>
        <linearGradient id="pGlintFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <rect x={-1200} y={-1200} width={5200} height={1200} fill={C.skyTop} />
      <rect x={-1200} y={-20} width={5200} height={hz + 20} fill="url(#pSky)" />
      {/* cloud bands drifting */}
      {[
        [200, 150, 900, 18, 0.35],
        [900, 230, 1300, 14, 0.3],
        [-300, 300, 1100, 12, 0.28],
        [1500, 120, 1200, 16, 0.25],
        [600, 360, 1500, 9, 0.22],
        [1900, 330, 900, 10, 0.24],
      ].map(([x, y, w, h, o], i) => (
        <ellipse key={i} cx={x + t * (6 + i * 2)} cy={y} rx={w / 2} ry={h} fill={C.cloud} opacity={o} />
      ))}
      {/* sun + bloom */}
      <circle cx={sx} cy={hz - 6} r={430} fill="url(#pBloom)" opacity={0.78 + 0.05 * Math.sin(t * 0.8)} />
      <circle cx={sx} cy={hz - 4} r={46} fill={C.sunCore} />
      {/* subtle sun rays */}
      <g opacity={0.045} transform={`rotate(${t * 2},${sx},${hz})`}>
        {Array.from({ length: 14 }).map((_, i) => (
          <path
            key={i}
            d={`M${sx},${hz} L${sx + Math.cos((i / 14) * Math.PI * 2) * 700 - 16},${hz + Math.sin((i / 14) * Math.PI * 2) * 700} L${sx + Math.cos((i / 14) * Math.PI * 2) * 700 + 16},${hz + Math.sin((i / 14) * Math.PI * 2) * 700}Z`}
            fill={C.sunBloom}
          />
        ))}
      </g>
      {/* sea */}
      <rect x={-1200} y={hz} width={5200} height={900} fill="url(#pSea)" />
      <rect x={-1200} y={hz} width={5200} height={3} fill={C.horizonGlow} opacity={0.55} />
      {/* glint column under the sun */}
      <g>
        {Array.from({ length: 46 }).map((_, i) => {
          const yy = hz + 8 + Math.pow(i / 46, 1.35) * 300;
          const wv = 18 + (i / 46) * 120 + rand(i) * 40;
          const xx = sx + (rand(i * 3.1) - 0.5) * (40 + i * 5) + Math.sin(t * 1.3 + i) * 6;
          const tw = 0.5 + 0.5 * Math.sin(t * (2 + rand(i) * 3) + i * 2.1);
          return <rect key={i} x={xx - wv / 2} y={yy} width={wv} height={2 + (i / 46) * 3} rx={2} fill={C.glint} opacity={(0.25 + 0.6 * tw) * (1 - i / 60)} />;
        })}
      </g>
      {/* scattered sea shimmer */}
      {Array.from({ length: 70 }).map((_, i) => {
        const yy = hz + 20 + rand(i * 5.7) * 300;
        const xx = -800 + rand(i * 2.9) * 3600 + t * 4;
        const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + rand(i) * 2) + i);
        return <rect key={`s${i}`} x={xx} y={yy} width={20 + rand(i) * 50} height={2} rx={1} fill={C.glint} opacity={0.12 * tw} />;
      })}
      {/* distant sailboat drifting */}
      <g transform={`translate(${520 + t * 7},${hz + 26})`}>
        <path d="M-20,0 L22,0 L16,7 L-14,7Z" fill={C.pines} />
        <path d="M2,-2 L2,-46 L22,-4Z" fill={C.pines} opacity={0.9} />
        <path d="M0,-4 L0,-36 L-14,-4Z" fill={C.pines} opacity={0.75} />
      </g>
    </Layer>
  );
};

/** Far headlands, pines, lighthouse, horizon haze (parallax 0.09). */
export const Hills: React.FC<{ cam: Cam; t: number; blur?: number }> = ({ cam, t, blur = 0 }) => {
  const hz = PROM.horizon;
  const beam = 0.55 + 0.45 * Math.max(0, Math.sin(t * 1.6));
  return (
    <Layer cam={cam} p={0.09} blur={blur}>
      <defs>
        <linearGradient id="pHaze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.horizonGlow} stopOpacity="0" />
          <stop offset="1" stopColor={C.horizonGlow} stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* left headland */}
      <path
        d={`M-900,${hz + 2} L-900,${hz - 70} Q-500,${hz - 120} -150,${hz - 82} Q250,${hz - 50} 620,${hz - 38} Q860,${hz - 30} 1030,${hz + 2}Z`}
        fill={C.hillsFar}
      />
      <path d={`M-900,${hz + 2} L-900,${hz - 40} Q-400,${hz - 70} 100,${hz - 44} Q480,${hz - 24} 820,${hz + 2}Z`} fill={C.hills} />
      {Array.from({ length: 34 }).map((_, i) => {
        const x = -880 + i * 50 + rand(i) * 24;
        const base = hz - 40 + Math.max(0, (x - 100) * 0.05);
        return x < 760 ? PINE(x, base + 6, 26 + rand(i * 7) * 30, C.pines) : null;
      })}
      {/* right island + lighthouse */}
      <path d={`M1720,${hz + 2} Q1840,${hz - 36} 2050,${hz - 40} Q2350,${hz - 52} 2700,${hz - 20} L2800,${hz + 2}Z`} fill={C.hills} />
      {Array.from({ length: 14 }).map((_, i) => PINE(2140 + i * 42 + rand(i + 50) * 18, hz - 36, 20 + rand(i * 3) * 24, C.pines))}
      <g transform={`translate(1930,${hz - 38})`}>
        <path d="M-9,0 L9,0 L6,-58 L-6,-58Z" fill={C.pines} />
        <rect x={-8} y={-66} width={16} height={9} fill={C.pines} />
        <circle cx={0} cy={-62} r={5} fill={C.lampWarm} opacity={beam} />
        <circle cx={0} cy={-62} r={26} fill={C.lampWarm} opacity={0.18 * beam} />
        <path d={`M0,-62 L-260,-80 L-260,-44Z`} fill={C.lampWarm} opacity={0.06 * beam} />
      </g>
      {/* horizon haze */}
      <rect x={-1000} y={hz - 140} width={4000} height={142} fill="url(#pHaze)" />
      {/* far gulls gliding */}
      {[0, 1, 2].map((i) => {
        const gx = 300 + i * 260 + t * (18 + i * 5);
        const gy = 210 + i * 40 + Math.sin(t * 0.7 + i) * 8;
        const f = Math.sin(t * (5 + i) + i) * 4;
        return (
          <path
            key={i}
            d={`M${gx - 10},${gy - f} Q${gx - 5},${gy - 6} ${gx},${gy} Q${gx + 5},${gy - 6} ${gx + 10},${gy - f}`}
            stroke={C.pines}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
            opacity={0.8}
          />
        );
      })}
    </Layer>
  );
};

/** Lamp post with a warm glow (promenade layer). */
const Lamp: React.FC<{ x: number; t: number; i: number }> = ({ x, t, i }) => {
  const top = 300;
  const fl = 0.92 + 0.08 * noise1(t * 3 + i * 10, i);
  return (
    <g>
      <rect x={x - 6} y={top} width={12} height={PROM.deck - top + 4} fill={C.railing} />
      <rect x={x - 12} y={PROM.deck - 26} width={24} height={30} rx={4} fill={C.railing} />
      <path d={`M${x},${top + 6} Q${x},${top - 30} ${x + 46},${top - 26}`} stroke={C.railing} strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d={`M${x + 30},${top - 22} L${x + 62},${top - 22} L${x + 56},${top - 4} L${x + 36},${top - 4}Z`} fill={C.railing} />
      <circle cx={x + 46} cy={top + 2} r={9} fill={C.lampWarm} opacity={fl} />
      <circle cx={x + 46} cy={top + 2} r={70} fill="url(#pLampGlow)" opacity={0.9 * fl} />
      <path d={`M${x + 36},${top} L${x - 110},${PROM.deck + 120} L${x + 200},${PROM.deck + 120} L${x + 56},${top}Z`} fill="url(#pLampCone)" opacity={0.5 * fl} />
      {/* rim on the post (sun side) */}
      <rect x={x + 4} y={top + 10} width={2} height={PROM.deck - top - 30} fill={C.rimWarm} opacity={0.35} />
    </g>
  );
};

/** Railing, lamps and boardwalk (parallax 1, same plane as the characters). */
export const PromenadeSet: React.FC<{ cam: Cam; t: number; blur?: number; children?: React.ReactNode }> = ({ cam, t, blur = 0, children }) => {
  const posts = repeatX(cam, 1, 172, 20, 200);
  const lamps = repeatX(cam, 1, PROM.lampStep, PROM.lampOffset, 400);
  const planks = repeatX(cam, 1, 236, 90, 300);
  return (
    <Layer cam={cam} p={1} blur={blur}>
      <defs>
        <radialGradient id="pLampGlow">
          <stop offset="0" stopColor={C.lampWarm} stopOpacity="0.55" />
          <stop offset="1" stopColor={C.lampWarm} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pLampCone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.lampWarm} stopOpacity="0.22" />
          <stop offset="1" stopColor={C.lampWarm} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="pDeck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B2F40" />
          <stop offset="0.25" stopColor={C.boardwalk} />
          <stop offset="1" stopColor="#140F18" />
        </linearGradient>
        <radialGradient id="pPool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={C.lampWarm} stopOpacity="0.2" />
          <stop offset="1" stopColor={C.lampWarm} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* railing */}
      {(() => {
        const [a, b] = [posts[0].x - 200, posts[posts.length - 1].x + 200];
        return (
          <g>
            <rect x={a} y={PROM.railTop} width={b - a} height={9} fill={C.railing} />
            <rect x={a} y={PROM.railTop} width={b - a} height={2} fill={C.rimWarm} opacity={0.45} />
            <rect x={a} y={PROM.deck - 14} width={b - a} height={14} fill="#1B151F" />
          </g>
        );
      })()}
      {posts.map(({ x, i }) => (
        <g key={`p${i}`}>
          <rect x={x - 4} y={PROM.railTop} width={8} height={PROM.deck - PROM.railTop} fill={C.railing} />
          <rect x={x + 2} y={PROM.railTop + 4} width={1.5} height={PROM.deck - PROM.railTop - 10} fill={C.rimWarm} opacity={0.3} />
        </g>
      ))}
      {/* boardwalk */}
      {(() => {
        const [a, b] = [planks[0].x - 300, planks[planks.length - 1].x + 300];
        return (
          <g>
            <rect x={a} y={PROM.deck} width={b - a} height={600} fill="url(#pDeck)" />
            <rect x={a} y={PROM.deck} width={b - a} height={3} fill={C.boardwalkTop} />
            {[808, 852, 904, 968, 1046].map((yy, k) => (
              <rect key={yy} x={a} y={yy} width={b - a} height={2} fill="#000" opacity={0.18 + k * 0.03} />
            ))}
          </g>
        );
      })()}
      {planks.map(({ x, i }) =>
        [808, 852, 904, 968].map((yy, k) => (
          <rect key={`k${i}-${k}`} x={x + (k % 2) * 118 + rand(i * 4 + k) * 40} y={yy - 40 - k * 6} width={2} height={40 + k * 6} fill="#000" opacity={0.18} />
        )),
      )}
      {/* lamp pools on the deck + lamps */}
      {lamps.map(({ x, i }) => (
        <ellipse key={`pool${i}`} cx={x + 40} cy={PROM.deck + 120} rx={300} ry={70} fill="url(#pPool)" />
      ))}
      {lamps.map(({ x, i }) => (
        <Lamp key={`l${i}`} x={x} t={t} i={i} />
      ))}
      {/* sea spray / dust motes catching sunlight */}
      <Motes t={t} count={46} x0={cam.x - 200} x1={cam.x + 2200} y0={280} y1={980} seed={3} size={2.6} />
      {children}
    </Layer>
  );
};

/** Out-of-focus foreground posts passing the lens (parallax 1.55), like the
 * blurred dock posts in the reference's tracking shots. */
export const Foreground: React.FC<{ cam: Cam; blur?: number; opacity?: number }> = ({ cam, blur = 12, opacity = 1 }) => {
  const p = 1.55;
  const items = repeatX(cam, p, 1250, 1150, 400);
  return (
    <Layer cam={cam} p={p} blur={blur} opacity={opacity}>
      {items.map(({ x, i }) => (
        <g key={i}>
          <rect x={x} y={420 + (i % 2) * 60} width={46} height={900} rx={10} fill="#0B080E" />
          <rect x={x + 36} y={440 + (i % 2) * 60} width={5} height={880} fill={C.rimWarm} opacity={0.22} />
        </g>
      ))}
    </Layer>
  );
};
