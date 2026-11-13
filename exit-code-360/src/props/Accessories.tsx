// Head / body accessories that give extras a readable identity (reference:
// silhouette accents such as caps and hair). Head-space unless noted (r = radius).
import React from "react";
import { C } from "../style/palette";
import { lerp } from "../lib/anim";

export const PartyHat: React.FC<{ r: number; color?: string; tilt?: number }> = ({ r, color = "#F27BAA", tilt = 12 }) => (
  <g transform={`rotate(${tilt}) translate(0,${-0.82 * r})`}>
    <path d={`M${-0.36 * r},0 L${0.36 * r},0 L${0.04 * r},${-0.95 * r}Z`} fill={color} />
    <path d={`M${-0.24 * r},${-0.3 * r} L${0.26 * r},${-0.3 * r} M${-0.12 * r},${-0.62 * r} L${0.16 * r},${-0.62 * r}`} stroke="#FFF4E8" strokeWidth={r * 0.07} opacity={0.75} />
    <circle cx={0.04 * r} cy={-0.98 * r} r={0.12 * r} fill={C.gold} />
  </g>
);

export const Beanie: React.FC<{ r: number; color?: string }> = ({ r, color = "#3B3F4A" }) => (
  <g>
    <path d={`M${-1.0 * r},${-0.3 * r} C${-1.0 * r},${-1.25 * r} ${1.0 * r},${-1.25 * r} ${1.0 * r},${-0.3 * r}Z`} fill={color} />
    <rect x={-1.04 * r} y={-0.42 * r} width={2.08 * r} height={0.26 * r} rx={0.1 * r} fill="#2C2F38" />
    <circle cx={0} cy={-1.08 * r} r={0.16 * r} fill={color} />
  </g>
);

export const Glasses: React.FC<{ r: number; turn?: number }> = ({ r, turn = 0 }) => {
  const shift = turn * 0.4 * r;
  const sp = lerp(0.74, 0.6, turn) * r;
  const gr = 0.26 * r;
  return (
    <g stroke={C.eyeWhite} strokeWidth={0.06 * r} fill="none">
      <circle cx={shift - sp / 2} cy={-0.1 * r} r={gr} />
      <circle cx={shift + sp / 2} cy={-0.1 * r} r={gr} />
      <path d={`M${shift - sp / 2 + gr},${-0.12 * r} L${shift + sp / 2 - gr},${-0.12 * r}`} />
    </g>
  );
};

export const Cap: React.FC<{ r: number; color?: string }> = ({ r, color = "#C9473F" }) => (
  <g>
    <path d={`M${-0.98 * r},${-0.28 * r} C${-0.98 * r},${-1.2 * r} ${0.98 * r},${-1.2 * r} ${0.98 * r},${-0.28 * r}Z`} fill={color} />
    <path d={`M${0.5 * r},${-0.34 * r} L${1.55 * r},${-0.26 * r} Q${1.6 * r},${-0.16 * r} ${1.45 * r},${-0.14 * r} L${0.5 * r},${-0.18 * r}Z`} fill={color} />
  </g>
);

export const HardHat: React.FC<{ r: number }> = ({ r }) => (
  <g>
    <path d={`M${-0.92 * r},${-0.36 * r} C${-0.9 * r},${-1.25 * r} ${0.9 * r},${-1.25 * r} ${0.92 * r},${-0.36 * r}Z`} fill="#F2C55C" />
    <rect x={-1.2 * r} y={-0.46 * r} width={2.4 * r} height={0.16 * r} rx={0.08 * r} fill="#E0A93E" />
    <path d={`M0,${-1.1 * r} L0,${-0.5 * r}`} stroke="#E0A93E" strokeWidth={0.1 * r} />
  </g>
);

/** Earpiece at the ear (moves from the head's side in front view to behind centre in profile). */
export const Earpiece: React.FC<{ r: number; turn?: number }> = ({ r, turn = 1 }) => {
  const ex = lerp(-0.94, -0.22, turn) * r;
  const ey = 0.06 * r;
  return (
    <g>
      <circle cx={ex} cy={ey} r={0.11 * r} fill="#E9E6E1" />
      <path d={`M${ex},${ey + 0.1 * r} C${ex - 0.12 * r},${ey + 0.5 * r} ${ex + 0.06 * r},${ey + 0.8 * r} ${ex - 0.08 * r},${ey + 1.25 * r}`} stroke="#E9E6E1" strokeWidth={0.05 * r} fill="none" />
    </g>
  );
};

/** Small backpack for Leo (torso space; back side is -x). */
export const Backpack: React.FC<{ torsoW: number; torsoLen: number }> = ({ torsoW, torsoLen }) => (
  <g>
    <rect x={-torsoW / 2 - 30} y={-torsoLen + 18} width={46} height={torsoLen * 0.62} rx={14} fill="#6B4A3A" />
    <rect x={-torsoW / 2 - 30} y={-torsoLen + 18} width={46} height={16} rx={8} fill="#7E5946" />
    <rect x={-torsoW / 2 - 24} y={-torsoLen * 0.55} width={34} height={torsoLen * 0.22} rx={8} fill="#5A3D30" />
  </g>
);

export const Clipboard: React.FC<{ s?: number; rot?: number }> = ({ s = 1, rot = 0 }) => (
  <g transform={`rotate(${rot}) scale(${s})`}>
    <rect x={-6} y={-4} width={40} height={52} rx={4} fill="#8A6A4A" />
    <rect x={-2} y={2} width={32} height={42} rx={2} fill="#EDE8DF" />
    <rect x={8} y={-8} width={12} height={8} rx={2} fill="#B5B0A8" />
    {[12, 20, 28, 36].map((y) => (
      <path key={y} d={`M2,${y} L26,${y}`} stroke="#9AA3B0" strokeWidth={1.6} />
    ))}
  </g>
);
