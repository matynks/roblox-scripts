import React from "react";
import { C } from "../style/palette";
import { lerp } from "../lib/anim";

/**
 * Mia's cardboard scare mask, in HEAD space (r = head radius).
 * state: 0 = worn over the face, 1 = pushed up onto the top of the head.
 */
export const CardboardMask: React.FC<{ r: number; state: number; turn?: number }> = ({ r, state, turn = 0 }) => {
  const cx = lerp(turn * 0.32 * r, -0.05 * r, state);
  const cy = lerp(0.02 * r, -1.02 * r, state);
  const ang = lerp(0, -22, state);
  const sy = lerp(1, 0.42, state);
  const sx = lerp(lerp(1, 0.72, turn), 0.95, state);
  const shape = `M${-0.86 * r},${-0.8 * r} L${-0.2 * r},${-0.88 * r} L${0.8 * r},${-0.83 * r} L${0.9 * r},${-0.05 * r} L${0.82 * r},${0.78 * r} L${0.05 * r},${0.9 * r} L${-0.8 * r},${0.8 * r} L${-0.9 * r},${0.1 * r}Z`;
  const marker = "#2B1C12";
  return (
    <g transform={`translate(${cx},${cy}) rotate(${ang}) scale(${sx},${sy})`}>
      {/* elastic strap */}
      <path d={`M${-0.86 * r},${-0.1 * r} Q${-1.15 * r},${-0.15 * r} ${-1.0 * r},${-0.45 * r}`} stroke={marker} strokeWidth={r * 0.05} fill="none" />
      <path d={shape} fill={C.cardboard} stroke={C.cardboardEdge} strokeWidth={r * 0.06} strokeLinejoin="round" />
      {/* corrugation hints */}
      {[-0.5, -0.1, 0.3].map((yy) => (
        <path key={yy} d={`M${-0.7 * r},${yy * r} L${0.7 * r},${(yy - 0.03) * r}`} stroke={C.cardboardShade} strokeWidth={r * 0.025} opacity={0.5} />
      ))}
      {/* eye holes */}
      <ellipse cx={-0.33 * r} cy={-0.16 * r} rx={0.15 * r} ry={0.11 * r} fill="#1E140D" />
      <ellipse cx={0.33 * r} cy={-0.18 * r} rx={0.15 * r} ry={0.11 * r} fill="#1E140D" />
      {/* marker drawing: angry brows + jagged teeth */}
      <path d={`M${-0.6 * r},${-0.5 * r} L${-0.14 * r},${-0.34 * r} M${0.6 * r},${-0.52 * r} L${0.14 * r},${-0.36 * r}`} stroke={marker} strokeWidth={r * 0.07} strokeLinecap="round" />
      <path
        d={`M${-0.5 * r},${0.32 * r} L${-0.35 * r},${0.52 * r} L${-0.2 * r},${0.34 * r} L${-0.05 * r},${0.56 * r} L${0.1 * r},${0.34 * r} L${0.25 * r},${0.54 * r} L${0.4 * r},${0.33 * r} L${0.5 * r},${0.45 * r}`}
        stroke={marker}
        strokeWidth={r * 0.06}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </g>
  );
};

/** Triangle sandwich, drawn in hand space (origin at the hand). */
export const Sandwich: React.FC<{ s?: number; bite?: number }> = ({ s = 1, bite = 0 }) => (
  <g transform={`scale(${s})`}>
    <path d="M-22,-4 L26,-30 L24,10 Z" fill="#B9844A" />
    <path d="M-19,-4 L23,-27 L22,7 Z" fill="#EBCB8F" />
    <path d="M-20,-1 L24,-6 L24,2 L-18,4Z" fill="#7DBE5A" />
    <path d="M-14,1 L22,-1 L22,5 L-12,5Z" fill="#E0554A" />
    <path d="M-22,3 L24,6 L24,14 L-20,8Z" fill="#E3C185" />
    {bite > 0 && <circle cx={25} cy={-26} r={9 * bite} fill="#000" opacity={0} />}
  </g>
);
