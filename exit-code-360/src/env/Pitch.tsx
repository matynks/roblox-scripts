// Football pitch at night under floodlights (also the base for the concert stadium).
import React from "react";
import { C } from "../style/palette";
import { Layer, repeatX, type Cam } from "../lib/camera";
import { noise1, rand } from "../lib/anim";
import type { CharacterSpec } from "../characters/types";
import { EXTRA } from "../characters/cast";

export const PITCH = { far: 830, mid: 884, near: 948, line: 932 };
export const PITCH_LIGHT = { x: 0.3, y: -0.95 };

export const teamSpec = (cloth: string, shade: string): CharacterSpec => ({ ...EXTRA, outfit: "jacket", torsoW: 44, cloth, clothShade: shade, clothLight: cloth });
export const RED = teamSpec("#B8454E", "#8A2E38");
export const WHITE = teamSpec("#DCD6CC", "#A8A096");
export const REF = teamSpec("#E2C44A", "#B8962E");

/** Night sky + stands with crowd + floodlight towers. */
export const Stands: React.FC<{ cam: Cam; t: number; crowdColor?: number }> = ({ cam, t }) => {
  const tiers = repeatX(cam, 0.3, 18, 0, 400);
  const towers = repeatX(cam, 0.3, 1400, 300, 600);
  return (
    <>
      <Layer cam={cam} p={0.04}>
        <defs>
          <linearGradient id="ptSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#080A1C" />
            <stop offset="1" stopColor="#1C1838" />
          </linearGradient>
        </defs>
        <rect x={-1500} y={-800} width={7000} height={1500} fill="url(#ptSky)" />
      </Layer>
      <Layer cam={cam} p={0.3}>
        <defs>
          <radialGradient id="ptFlood">
            <stop offset="0" stopColor="#F4F2FF" stopOpacity="0.9" />
            <stop offset="0.3" stopColor="#C9D4FF" stopOpacity="0.35" />
            <stop offset="1" stopColor="#C9D4FF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ptBeam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E8ECFF" stopOpacity="0.18" />
            <stop offset="1" stopColor="#E8ECFF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* stand structure */}
        <path d={`M${cam.x * 0.3 - 2400},360 L${cam.x * 0.3 + 4400},360 L${cam.x * 0.3 + 4400},760 L${cam.x * 0.3 - 2400},760Z`} fill="#141226" />
        <rect x={cam.x * 0.3 - 2400} y={330} width={6800} height={30} fill="#0C0B18" />
        {/* crowd: rows of dots with gentle bobbing */}
        {tiers.map(({ x, i }) =>
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map((row) => {
            const y = 390 + row * 40 + Math.sin(t * 3 + i * 0.7 + row) * 2;
            const c = rand(i * 13 + row);
            return <circle key={`${i}-${row}`} cx={x + (row % 2) * 9} cy={y} r={7} fill={c > 0.85 ? "#6A5A8A" : c > 0.7 ? "#4A3E66" : "#2A2442"} />;
          }),
        )}
        {towers.map(({ x, i }) => (
          <g key={i}>
            <rect x={x - 8} y={-40} width={16} height={420} fill="#0C0B18" />
            <rect x={x - 70} y={-90} width={140} height={60} rx={6} fill="#1E1C30" />
            {[0, 1, 2, 3].map((k) => (
              <circle key={k} cx={x - 50 + k * 33} cy={-60} r={11} fill="#F4F2FF" opacity={0.9 + 0.1 * noise1(t * 6 + k, i)} />
            ))}
            <circle cx={x} cy={-60} r={260} fill="url(#ptFlood)" />
            <path d={`M${x - 60},-40 L${x - 500},900 L${x + 300},900 L${x + 60},-40Z`} fill="url(#ptBeam)" />
          </g>
        ))}
      </Layer>
    </>
  );
};

export const PitchGround: React.FC<{ cam: Cam; t: number; children?: React.ReactNode }> = ({ cam, t, children }) => {
  const boards = repeatX(cam, 0.85, 420, 0, 400);
  const stripes = repeatX(cam, 1, 240, 0, 400);
  return (
    <>
      <Layer cam={cam} p={0.85}>
        {boards.map(({ x, i }) => (
          <g key={i}>
            <rect x={x} y={712} width={410} height={58} fill="#121020" />
            <rect x={x + 6} y={718} width={398} height={46} fill={i % 2 ? "#2A5A6A" : "#4A2E6A"} opacity={0.75 + 0.25 * Math.sin(t * 2 + i)} />
          </g>
        ))}
      </Layer>
      <Layer cam={cam} p={1}>
        <defs>
          <linearGradient id="ptGrass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2E5A3A" />
            <stop offset="1" stopColor="#14301E" />
          </linearGradient>
        </defs>
        <rect x={cam.x - 3000} y={780} width={8000} height={500} fill="url(#ptGrass)" />
        {stripes.map(({ x, i }) => (i % 2 ? <path key={i} d={`M${x},780 L${x + 240},780 L${x + 300},1080 L${x + 60},1080Z`} fill="#3E6E48" opacity={0.25} /> : null))}
        <rect x={cam.x - 3000} y={PITCH.line} width={8000} height={5} fill="#E8EEE0" opacity={0.7} />
        <rect x={cam.x - 3000} y={800} width={8000} height={3} fill="#E8EEE0" opacity={0.35} />
        {children}
      </Layer>
    </>
  );
};

export const LinesmanFlag: React.FC<{ up: number }> = ({ up }) => (
  <g transform={`rotate(${-up * 10})`}>
    <path d="M0,0 L0,70" stroke="#2A2630" strokeWidth={4} />
    <path d="M0,70 L36,62 L32,92 L0,96Z" fill="#F2C55C" />
    <path d="M0,70 L18,66 L16,94 L0,96Z" fill="#D2483D" />
    <circle r={4} cx={0} cy={0} fill={C.ink} />
  </g>
);
