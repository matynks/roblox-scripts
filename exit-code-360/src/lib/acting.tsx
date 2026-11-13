// Shared acting / staging helpers used by every scene.
import React from "react";
import { C } from "../style/palette";
import { FONT } from "../style/fonts";
import { clamp, ease, invLerp, lerp } from "./anim";
import type { Face, Pose } from "../characters/types";

/** 0→1→0 envelope: rise over [a,b], hold, fall over [c,d]. */
export const bump = (T: number, a: number, b: number, c: number, d: number) =>
  Math.min(ease.inOut(invLerp(a, b, T)), 1 - ease.inOut(invLerp(c, d, T)));

/** Slow, deliberate camera push for graphic holds: eased scale 1 → 1+amt between t0 and t1. */
export const pushK = (T: number, t0: number, t1: number, amt = 0.04) => 1 + amt * ease.inOut(clamp((T - t0) / (t1 - t0)));
/** SVG transform for pushK about (ox, oy). */
export const pushSvg = (T: number, t0: number, t1: number, amt = 0.04, ox = 960, oy = 540) =>
  `translate(${ox} ${oy}) scale(${pushK(T, t0, t1, amt)}) translate(${-ox} ${-oy})`;
/** HTML wrapper version (whole layer, including HTML labels). */
export const Push: React.FC<{ T: number; t0: number; t1: number; amt?: number; children: React.ReactNode }> = ({ T, t0, t1, amt = 0.04, children }) => (
  <div style={{ position: "absolute", inset: 0, transform: `scale(${pushK(T, t0, t1, amt)})`, transformOrigin: "960px 540px" }}>{children}</div>
);

/** 0→1 eased step over [a,b]. */
export const step = (T: number, a: number, b: number) => ease.inOut(invLerp(a, b, T));

/** The same pose seen from the other facing, so a facing flip is invisible. */
export const mirrorPose = (p: Pose): Pose => ({
  ...p,
  lean: -p.lean,
  headTilt: -p.headTilt,
  headX: -p.headX,
  shN: -p.shF,
  elN: -p.elF,
  shF: -p.shN,
  elF: -p.elN,
  hipN: -p.hipF,
  knN: -p.knF,
  hipF: -p.hipN,
  knF: -p.knN,
  footN: 180 - p.footF,
  footF: 180 - p.footN,
});

export const blendFace = (a: Face, b: Partial<Face>, t: number): Face => {
  const k = clamp(t);
  const out: Face = { ...a };
  (Object.keys(b) as (keyof Face)[]).forEach((key) => {
    const v = b[key];
    if (typeof v === "number") (out as Record<string, unknown>)[key] = lerp(a[key] as number, v, k);
    else if (k >= 0.5) (out as Record<string, unknown>)[key] = v;
  });
  return out;
};

/** Pick the face whose start time is the latest one ≤ T. */
export const faceAt = (T: number, keys: [number, Partial<Face>][]): Partial<Face> => {
  let f = keys[0][1];
  for (const [t, v] of keys) if (T >= t) f = v;
  return f;
};

export const Shadow: React.FC<{ x: number; y: number; w: number; o?: number }> = ({ x, y, w, o = 0.4 }) => (
  <ellipse cx={x} cy={y + 3} rx={w} ry={w * 0.16} fill="#07040A" opacity={o} />
);

/** Thin rings expanding from a head: the film's motif for "seeing behind". */
export const SenseRing: React.FC<{ T: number; at: number; x: number; y: number; r: number; color?: string }> = ({ T, at, x, y, r, color = C.rimWarm }) => (
  <g>
    {[0, 0.16].map((d) => {
      const k = (T - at - d) / 0.75;
      if (k < 0 || k > 1) return null;
      return <circle key={d} cx={x} cy={y} r={r * (0.75 + k * 1.1)} fill="none" stroke={color} strokeWidth={3 * (1 - k) + 0.6} opacity={(1 - k) * 0.85} />;
    })}
  </g>
);

/** "Spotted" ping: a gold ring that pops on a target, optional label. */
export const Ping: React.FC<{ T: number; at: number; x: number; y: number; r?: number; label?: string; color?: string; hold?: number }> = ({
  T,
  at,
  x,
  y,
  r = 40,
  label,
  color = C.gold,
  hold = 1.2,
}) => {
  const k = T - at;
  if (k < 0 || k > hold + 0.4) return null;
  const pop = ease.outBack(clamp(k / 0.25));
  const fade = 1 - clamp((k - hold) / 0.4);
  return (
    <g opacity={fade}>
      <circle cx={x} cy={y} r={r * pop} fill="none" stroke={color} strokeWidth={3.2} />
      <circle cx={x} cy={y} r={r * (1 + k * 0.9)} fill="none" stroke={color} strokeWidth={1.6} opacity={Math.max(0, 0.7 - k)} />
      {label && (
        <text x={x} y={y - r - 14} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={22} letterSpacing="3" fill={color} opacity={clamp(k / 0.2)}>
          {label}
        </text>
      )}
    </g>
  );
};

/** Rotated rubber-stamp label (reference: "IMPOSSIBLE"). */
export const Stamp: React.FC<{ x: number; y: number; text: string; k: number; color?: string; size?: number; rot?: number; bg?: string }> = ({
  x,
  y,
  text,
  k,
  color = C.coral,
  size = 44,
  rot = -7,
  bg,
}) => {
  if (k <= 0) return null;
  const s = lerp(1.6, 1, ease.outBack(clamp(k)));
  const w = text.length * size * 0.72 + size;
  return (
    <g transform={`translate(${x},${y}) rotate(${rot}) scale(${s})`} opacity={clamp(k * 2)}>
      <rect x={-w / 2} y={-size * 0.85} width={w} height={size * 1.7} rx={10} fill={bg ?? "none"} stroke={color} strokeWidth={4} />
      <text x={0} y={size * 0.34} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={size} letterSpacing="3" fill={color}>
        {text}
      </text>
    </g>
  );
};

/** Scene captions on/off. The film leaves this at the default (on); the vertical teaser
 *  turns them off because 16:9 caption strips would be cropped in 9:16 and it sets its own type. */
export const LabelsVisible = React.createContext(true);

/** Small-caps label (HTML) used for titles and lower thirds. */
export const Label: React.FC<{ x: number; y: number; text: string; size?: number; color?: string; o?: number; align?: "left" | "center" | "right"; weight?: number; spacing?: string }> = ({
  x,
  y,
  text,
  size = 22,
  color = C.label,
  o = 1,
  align = "center",
  weight = 700,
  spacing = "0.18em",
}) =>
  !React.useContext(LabelsVisible) ? null : (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: align === "center" ? "translateX(-50%)" : align === "right" ? "translateX(-100%)" : undefined,
      fontFamily: FONT,
      fontWeight: weight,
      fontSize: size,
      letterSpacing: spacing,
      color,
      opacity: o,
      whiteSpace: "nowrap",
      textTransform: "uppercase",
    }}
  >
    {text}
  </div>
);
