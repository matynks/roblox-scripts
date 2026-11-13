import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { rand } from "../lib/anim";
import { H, W } from "../lib/camera";

/** Cinematic letterbox (reference: bars ≈ 5% of frame height). */
export const LETTERBOX = 54;
export const Letterbox: React.FC<{ amount?: number }> = ({ amount = 1 }) => (
  <>
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: LETTERBOX * amount, background: "#000" }} />
    <div style={{ position: "absolute", left: 0, bottom: 0, width: W, height: LETTERBOX * amount, background: "#000" }} />
  </>
);

export const Vignette: React.FC<{ strength?: number; color?: string }> = ({ strength = 0.55, color = "0,0,0" }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(${color},0) 55%, rgba(${color},${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** Film grain: 8 pre-rendered noise frames, refreshed at 12 fps. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.08 }) => {
  const frame = useCurrentFrame();
  const idx = Math.floor(frame / 2.5) % 8;
  return (
    <AbsoluteFill style={{ mixBlendMode: "overlay", opacity, pointerEvents: "none" }}>
      <Img src={staticFile(`textures/grain_${idx}.png`)} style={{ width: W, height: H, imageRendering: "auto" }} />
    </AbsoluteFill>
  );
};

/** Floating dust / sea-spray motes drifting through light. World-anchored in a layer. */
export const Motes: React.FC<{
  t: number;
  count?: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  color?: string;
  seed?: number;
  size?: number;
  drift?: number;
}> = ({ t, count = 40, x0, x1, y0, y1, color = "#FFE6D2", seed = 1, size = 3, drift = 14 }) => (
  <g>
    {Array.from({ length: count }).map((_, i) => {
      const r1 = rand(i * 7.1 + seed);
      const r2 = rand(i * 3.3 + seed * 2);
      const r3 = rand(i * 9.7 + seed * 3);
      const sp = 0.4 + r3 * 0.8;
      const x = x0 + r1 * (x1 - x0) + Math.sin(t * 0.4 * sp + i) * drift + t * drift * 0.6 * sp;
      const yy = y0 + ((r2 * (y1 - y0) - t * drift * sp) % (y1 - y0) + (y1 - y0)) % (y1 - y0);
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (1.2 + r3 * 2) + i * 1.7));
      return <circle key={i} cx={x} cy={yy} r={size * (0.5 + r1 * 0.9)} fill={color} opacity={0.5 * tw * (0.4 + r2 * 0.6)} />;
    })}
  </g>
);
