import React from "react";
import { useFx } from "./fx";

export const W = 1920;
export const H = 1080;

/** Virtual 2.5D camera. x/y = world offset of the screen centre, zoom about centre. */
export type Cam = { x: number; y: number; zoom: number };

export const layerScale = (cam: Cam, p: number) => 1 + (cam.zoom - 1) * p;

/** SVG transform that places WORLD coords of a layer with parallax factor p. */
export const layerTransform = (cam: Cam, p: number) => {
  const z = layerScale(cam, p);
  return `translate(${W / 2} ${H / 2}) scale(${z}) translate(${-W / 2 - cam.x * p} ${-H / 2 - cam.y * p})`;
};

/** World → screen for a layer. */
export const toScreen = (cam: Cam, p: number, wx: number, wy: number) => {
  const z = layerScale(cam, p);
  return { x: W / 2 + z * (wx - W / 2 - cam.x * p), y: H / 2 + z * (wy - H / 2 - cam.y * p) };
};

/** Visible world-x range of a layer (for spawning repeating elements). */
export const visibleRange = (cam: Cam, p: number, margin = 200) => {
  const z = layerScale(cam, p);
  const c = W / 2 + cam.x * p;
  return [c - W / 2 / z - margin, c + W / 2 / z + margin] as const;
};

/** One full-frame SVG per depth layer so each can carry its own blur (DOF). */
export const Layer: React.FC<{
  cam: Cam;
  p: number;
  blur?: number;
  opacity?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ cam, p, blur: blurIn = 0, opacity = 1, children, style }) => {
  const blur = blurIn * useFx().blur;
  return (
  <svg
    width={W}
    height={H}
    viewBox={`0 0 ${W} ${H}`}
    style={{
      position: "absolute",
      inset: 0,
      filter: blur > 0.15 ? `blur(${blur.toFixed(2)}px)` : undefined,
      opacity,
      overflow: "visible",
      ...style,
    }}
  >
    <g transform={layerTransform(cam, p)}>{children}</g>
  </svg>
  );
};

/** Repeat an element every `step` world px across the visible range. */
export const repeatX = (cam: Cam, p: number, step: number, offset: number, margin = 300) => {
  const [a, b] = visibleRange(cam, p, margin);
  const out: { x: number; i: number }[] = [];
  const i0 = Math.floor((a - offset) / step);
  const i1 = Math.ceil((b - offset) / step);
  for (let i = i0; i <= i1; i++) out.push({ x: offset + i * step, i });
  return out;
};
