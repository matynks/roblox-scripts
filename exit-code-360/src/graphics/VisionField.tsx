import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../style/palette";
import { FONT } from "../style/fonts";
import { clamp, deg, lerp, rand } from "../lib/anim";

/** Navy infographic space (reference §B/§D): radial gradient + faint grid. */
export const NavySpace: React.FC<{ drift?: number }> = ({ drift = 0 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 70% at 50% 50%, ${C.navyCenter} 0%, ${C.navy} 55%, ${C.navyEdge} 100%)` }}>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id="navyGrid" width="64" height="64" patternUnits="userSpaceOnUse" patternTransform={`translate(${drift},${drift * 0.4})`}>
          <path d="M64,0 L0,0 L0,64" fill="none" stroke={C.grid} strokeWidth="1.2" />
        </pattern>
        <radialGradient id="gridFade" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="gridMask">
          <rect width="1920" height="1080" fill="url(#gridFade)" />
        </mask>
      </defs>
      <rect width="1920" height="1080" fill="url(#navyGrid)" mask="url(#gridMask)" opacity={0.7} />
    </svg>
  </AbsoluteFill>
);

// angles: 0 = forward (screen up), clockwise positive
const P = (cx: number, cy: number, r: number, a: number) => ({ x: cx + r * Math.sin(deg(a)), y: cy - r * Math.cos(deg(a)) });
export const wedgePath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const span = a1 - a0;
  if (span >= 359.5) return `M${cx - r},${cy} A${r},${r} 0 1 1 ${cx + r},${cy} A${r},${r} 0 1 1 ${cx - r},${cy}Z`;
  if (span <= 0.01) return "";
  const p0 = P(cx, cy, r, a0);
  const p1 = P(cx, cy, r, a1);
  return `M${cx},${cy} L${p0.x},${p0.y} A${r},${r} 0 ${span > 180 ? 1 : 0} 1 ${p1.x},${p1.y}Z`;
};
const arcPath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const span = a1 - a0;
  if (span >= 359.5) return `M${cx - r},${cy} A${r},${r} 0 1 1 ${cx + r},${cy} A${r},${r} 0 1 1 ${cx - r},${cy}`;
  const p0 = P(cx, cy, r, a0);
  const p1 = P(cx, cy, r, a1);
  return `M${p0.x},${p0.y} A${r},${r} 0 ${span > 180 ? 1 : 0} 1 ${p1.x},${p1.y}`;
};

export type DiagramState = {
  who: "human" | "leo";
  x: number;
  y: number;
  scale: number;
  appear: number; // 0..1
  fov: number; // degrees visible
  ahead: number; // 0..1 highlight of the central (binocular) 120°
  sides: number; // 0..1 highlight of the peripheral lobes
  blind: number; // 0..1 blind-zone outline
  blindFill: number; // 0..1 blind-zone darkening + label
  question: number; // 0..1 "?" in the blind zone
  ghost: number; // 0..1 ghost blind zone (Leo)
  shatter: number; // 0..1 ghost shatter progress
  ripple: number; // seconds since the circle completed (<0 = none)
  glow: number; // 0..1 extra brightness pulse
  t: number;
};

const R = 330; // field radius (diagram units)
const EYE_Y = -36;

export const VisionDiagram: React.FC<{ s: DiagramState; id: string; center?: React.ReactNode; color?: string; blindLabel?: string; heading?: number }> = ({ s, id, center, color, blindLabel, heading = 0 }) => {
  const col = color ?? (s.who === "leo" ? C.gold : C.lineBlue);
  const colDim = s.who === "leo" ? "#8C6F2E" : C.lineBlueDim;
  const cy = EYE_Y;
  const half = s.fov / 2;
  const blind0 = half;
  const blind1 = 360 - half;
  const showBlind = s.who === "human" && s.blind > 0.01;
  const tickR = R + 18;
  return (
    <g transform={`translate(${s.x},${s.y}) scale(${s.scale})`} opacity={s.appear}>
      <defs>
        <radialGradient id={`${id}-fov`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={col} stopOpacity={0.42 + 0.2 * s.glow} />
          <stop offset="0.65" stopColor={col} stopOpacity={0.14 + 0.1 * s.glow} />
          <stop offset="1" stopColor={col} stopOpacity={0.03} />
        </radialGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g transform={`rotate(${heading} 0 ${EYE_Y})`}>
      {/* protractor ticks + guide rings */}
      <g opacity={0.55}>
        {[0.42, 0.72].map((k) => (
          <circle key={k} cx={0} cy={cy} r={R * k} fill="none" stroke={C.grid} strokeWidth={1.5} strokeDasharray="3 9" />
        ))}
        {Array.from({ length: 36 }).map((_, i) => {
          const a = i * 10;
          const long = i % 3 === 0;
          const p0 = P(0, cy, tickR, a);
          const p1 = P(0, cy, tickR + (long ? 16 : 8), a);
          return <path key={i} d={`M${p0.x},${p0.y} L${p1.x},${p1.y}`} stroke={C.lineBlueDim} strokeWidth={long ? 2.2 : 1.4} />;
        })}
      </g>
      {/* blind zone (human) */}
      {showBlind && (
        <g>
          <path d={wedgePath(0, cy, R, blind0, blind1)} fill="#03050C" opacity={0.75 * s.blindFill} />
          <path
            d={wedgePath(0, cy, R * (0.98 + 0.02 * s.blind), blind0, blind1)}
            fill="none"
            stroke={C.coral}
            strokeWidth={2.4}
            strokeDasharray="10 9"
            opacity={s.blind * 0.9}
          />
          <path d={wedgePath(0, cy, R, blind0, blind1)} fill={C.coral} opacity={0.06 * s.blind} />
          {s.question > 0.01 && (
            <text
              x={0}
              y={cy + R * 0.62}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily={FONT}
              fontWeight={800}
              fontSize={92}
              fill={C.coral}
              opacity={s.question}
              transform={`translate(0,${(1 - s.question) * 18})`}
            >
              ?
            </text>
          )}
        </g>
      )}
      {/* ghost blind zone shattering (Leo) */}
      {s.who === "leo" && s.ghost > 0.01 && (
        <g>
          {Array.from({ length: 18 }).map((_, i) => {
            const a0 = 100 + (i * 160) / 18;
            const a1 = a0 + 160 / 18;
            const am = (a0 + a1) / 2;
            const k = clamp(s.shatter * 1.4 - rand(i) * 0.4);
            const out = k * (120 + rand(i * 3) * 160);
            const off = P(0, 0, out, am);
            const rr = rand(i * 5) * 120 - 60;
            return (
              <g key={i} transform={`translate(${off.x},${off.y - 0}) rotate(${rr * k},${P(0, cy, R * 0.6, am).x},${P(0, cy, R * 0.6, am).y})`} opacity={s.ghost * (1 - k)}>
                <path d={wedgePath(0, cy, R, a0, a1)} fill={C.coral} opacity={0.1} />
                <path d={arcPath(0, cy, R, a0, a1)} fill="none" stroke={C.coral} strokeWidth={2.4} strokeDasharray="10 9" />
              </g>
            );
          })}
        </g>
      )}
      {/* field of view */}
      {s.fov > 0.5 && (
        <g>
          <path d={wedgePath(0, cy, R, -half, half)} fill={`url(#${id}-fov)`} />
          {/* central (both eyes) zone highlight */}
          {s.ahead > 0.01 && <path d={wedgePath(0, cy, R, -Math.min(60, half), Math.min(60, half))} fill={col} opacity={0.16 * s.ahead} />}
          {s.sides > 0.01 && half > 60 && (
            <g opacity={s.sides}>
              <path d={wedgePath(0, cy, R, -half, -60)} fill={col} opacity={0.16} />
              <path d={wedgePath(0, cy, R, 60, half)} fill={col} opacity={0.16} />
            </g>
          )}
          {/* glow arc + crisp arc */}
          <path d={arcPath(0, cy, R, -half, half)} fill="none" stroke={col} strokeWidth={10} opacity={0.35 + 0.3 * s.glow} filter={`url(#${id}-glow)`} />
          <path d={arcPath(0, cy, R, -half, half)} fill="none" stroke={col} strokeWidth={2.6} />
          {s.fov < 359.5 &&
            [-half, half].map((a) => {
              const e = P(0, cy, R, a);
              return (
                <g key={a}>
                  <path d={`M0,${cy} L${e.x},${e.y}`} stroke={col} strokeWidth={2.2} opacity={0.85} />
                  <circle cx={e.x} cy={e.y} r={14} fill={col} opacity={0.35} filter={`url(#${id}-glow)`} />
                  <circle cx={e.x} cy={e.y} r={5} fill={C.goldLight} opacity={s.who === "leo" ? 1 : 0} />
                  <circle cx={e.x} cy={e.y} r={5} fill="#E8F3FF" opacity={s.who === "leo" ? 0 : 1} />
                </g>
              );
            })}
        </g>
      )}
      {/* ripples once the circle closes */}
      {s.ripple >= 0 &&
        [0, 1, 2].map((k) => {
          const tt = s.ripple - k * 0.35;
          if (tt < 0) return null;
          const rr = R * (1 + tt * 0.55);
          const o = Math.max(0, 0.6 - tt * 0.45);
          return <circle key={k} cx={0} cy={cy} r={rr} fill="none" stroke={col} strokeWidth={2.5} opacity={o} />;
        })}
      </g>
      {/* top-down person (or a supplied centre icon) */}
      {center ?? <TopDownPerson who={s.who} />}
      {/* section labels */}
      {s.ahead > 0.01 && (
        <text x={0} y={cy - R - 46} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} letterSpacing="4" fill={col} opacity={s.ahead}>
          AHEAD
        </text>
      )}
      {s.sides > 0.01 &&
        [-1, 1].map((sd) => {
          const p = P(0, cy, R + 58, sd * Math.min(85, half - 12));
          return (
            <text key={sd} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing="4" fill={col} opacity={s.sides}>
              SIDE
            </text>
          );
        })}
      {showBlind && s.blindFill > 0.01 && (
        <text x={0} y={cy + R + 64} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} letterSpacing="4" fill={C.coral} opacity={s.blindFill}>
          {blindLabel ?? "BLIND ZONE ≈160°"}
        </text>
      )}
    </g>
  );
};

/** A person seen from above, facing screen-up (reference line-art spirit, but solid head). */
export const TopDownPerson: React.FC<{ who: "human" | "leo" }> = ({ who }) => {
  const leo = who === "leo";
  const outline = leo ? C.gold : C.lineBlue;
  return (
    <g>
      <rect x={-98} y={-18} width={196} height={70} rx={35} fill={leo ? C.leoBlue : "#24304C"} stroke={leo ? C.rimWarm : C.lineBlueDim} strokeWidth={2.5} />
      <rect x={-98} y={22} width={196} height={30} rx={15} fill={leo ? C.leoBlueShade : "#1B2540"} opacity={0.8} />
      <circle cx={0} cy={0} r={54} fill={C.ink} stroke={outline} strokeWidth={3} />
      <path d="M-10,-51 Q0,-70 10,-51Z" fill={C.ink} stroke={outline} strokeWidth={2.5} strokeLinejoin="round" />
      <ellipse cx={-20} cy={-37} rx={8} ry={5.5} fill={C.eyeWhite} />
      <ellipse cx={20} cy={-37} rx={8} ry={5.5} fill={C.eyeWhite} />
    </g>
  );
};

/** Counter block: small caps label + big number (HTML for crisp type). */
export const CounterBlock: React.FC<{
  x: number;
  y: number;
  label: string;
  sub?: string;
  value: number;
  color: string;
  size?: number;
  opacity?: number;
  align?: "left" | "center";
  approx?: boolean;
}> = ({ x, y, label, sub, value, color, size = 120, opacity = 1, align = "left", approx = true }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: align === "center" ? "translateX(-50%)" : undefined,
      textAlign: align,
      opacity,
      fontFamily: FONT,
    }}
  >
    <div style={{ fontWeight: 700, fontSize: Math.round(size * 0.19), letterSpacing: "0.18em", color: C.label, textTransform: "uppercase" }}>{label}</div>
    <div
      style={{
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.05,
        color,
        fontVariantNumeric: "tabular-nums",
        textShadow: `0 0 ${size * 0.25}px ${color}55`,
      }}
    >
      {approx && <span style={{ fontSize: size * 0.55, opacity: 0.8, marginRight: size * 0.05 }}>≈</span>}
      {Math.round(value)}
      <span style={{ fontSize: size * 0.6, verticalAlign: "top", marginLeft: 2 }}>°</span>
    </div>
    {sub && <div style={{ fontWeight: 600, fontSize: Math.round(size * 0.16), letterSpacing: "0.16em", color: "#6E819B", textTransform: "uppercase", marginTop: 4 }}>{sub}</div>}
  </div>
);

export const lerpState = (a: number, b: number, t: number) => lerp(a, b, clamp(t));
