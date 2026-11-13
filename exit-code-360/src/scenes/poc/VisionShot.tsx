import React from "react";
import { AbsoluteFill } from "remotion";
import { CounterBlock, NavySpace, VisionDiagram, type DiagramState } from "../../graphics/VisionField";
import { Vignette } from "../../env/Atmosphere";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";
import { clamp, ease, invLerp, lerp, track } from "../../lib/anim";
import { CUE } from "./timeline";

const bump = (T: number, a: number, b: number, c: number, d: number) =>
  Math.min(ease.inOut(invLerp(a, b, T)), 1 - ease.inOut(invLerp(c, d, T)));

/**
 * Top-down field-of-view comparison (navy infographic space).
 * Accuracy notes: human horizontal visual field ≈ 200° (both eyes ≈ 120°),
 * leaving ≈ 160° unseen behind; the 360° field is labelled HYPOTHETICAL.
 */
export const VisionShot: React.FC<{ T: number }> = ({ T }) => {
  const appear = clamp(invLerp(CUE.xfade, CUE.xfade + 0.28, T));
  const intro = ease.out(invLerp(CUE.xfade, 30.05, T));
  const split = ease.inOut(invLerp(CUE.you - 0.06, CUE.you + 0.62, T));

  // ---- human diagram
  const hx = lerp(960, 560, split);
  const hy = lerp(lerp(540, 604, intro), 548, split);
  const hs = lerp(lerp(4.25, 1, intro), 0.7, split);
  const hFov = 200 * ease.out(invLerp(CUE.fovOpen, CUE.fov200, T));
  const ahead = Math.max(bump(T, CUE.ahead - 0.05, CUE.ahead + 0.2, 33.3, 33.7), bump(T, 33.3, 33.7, 35.0, 35.3) * 0.3);
  const sides = bump(T, CUE.sides - 0.05, CUE.sides + 0.22, 34.9, 35.25);
  const human: DiagramState = {
    who: "human",
    x: hx,
    y: hy,
    scale: hs,
    appear: 1,
    fov: hFov,
    ahead,
    sides,
    blind: clamp(invLerp(CUE.behind, CUE.behind + 0.3, T)),
    blindFill: clamp(invLerp(CUE.nothing, CUE.nothing + 0.3, T)),
    question: bump(T, CUE.behind + 0.15, CUE.behind + 0.4, CUE.nothing - 0.1, CUE.nothing + 0.12),
    ghost: 0,
    shatter: 0,
    ripple: -1,
    glow: bump(T, CUE.fov200 - 0.1, CUE.fov200 + 0.1, CUE.fov200 + 0.3, CUE.fov200 + 0.8) * 0.8,
    t: T,
  };

  // ---- Leo diagram (hypothetical 360°)
  const lx = lerp(2300, 1360, split);
  const lFov = lerp(200, 360, ease.inOut(invLerp(CUE.sweep360, CUE.sweepDone, T)));
  const rippleT = T >= CUE.noBack ? T - CUE.noBack : T >= CUE.sweepDone + 0.05 ? T - CUE.sweepDone - 0.05 : -1;
  const leo: DiagramState = {
    who: "leo",
    x: lx,
    y: 548,
    scale: 0.7,
    appear: clamp(invLerp(CUE.you - 0.05, CUE.you + 0.3, T)),
    fov: lFov,
    ahead: 0,
    sides: 0,
    blind: 0,
    blindFill: 0,
    question: 0,
    ghost: bump(T, CUE.noBlind - 0.04, CUE.noBlind + 0.22, CUE.shatter + 0.2, CUE.shatter + 0.75),
    shatter: ease.out(invLerp(CUE.shatter, CUE.shatter + 0.75, T)),
    ripple: rippleT,
    glow: Math.max(bump(T, CUE.circle - 0.05, CUE.circle + 0.15, 40.4, 40.9), bump(T, CUE.noBack - 0.05, CUE.noBack + 0.12, 42.6, 43.0)),
    t: T,
  };

  const breathe = 1 + 0.012 * Math.sin(T * 0.8);
  const hCount = 200 * ease.out(invLerp(CUE.fovOpen, CUE.fov200, T));
  const lCount = lFov;

  // counter block placement: right of the big diagram, then under it
  const hcX = lerp(1395, 560, split);
  const hcY = lerp(300, 832, split);
  const hcSize = lerp(128, 62, split);
  const noBlindLabel = clamp(invLerp(CUE.shatter + 0.35, CUE.shatter + 0.7, T));

  return (
    <AbsoluteFill style={{ opacity: appear }}>
      <NavySpace drift={T * 6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(960 540) scale(${breathe}) translate(-960 -540)`}>
          <VisionDiagram s={human} id="vdH" />
          {leo.appear > 0.001 && <VisionDiagram s={leo} id="vdL" />}
        </g>
      </svg>
      {/* title */}
      <div
        style={{
          position: "absolute",
          top: 92,
          width: 1920,
          textAlign: "center",
          fontFamily: FONT,
          opacity: clamp(invLerp(29.65, 30.1, T)),
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: "0.24em", color: C.number }}>FIELD OF VIEW</div>
        <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: "0.22em", color: "#6E819B", marginTop: 6 }}>SEEN FROM ABOVE</div>
      </div>
      <CounterBlock
        x={hcX}
        y={hcY}
        label="Normal human"
        sub={split < 0.5 ? "horizontal field of view" : undefined}
        value={hCount}
        color={C.number}
        size={hcSize}
        align={split > 0.5 ? "center" : "left"}
        opacity={clamp(invLerp(CUE.fovOpen - 0.2, CUE.fovOpen + 0.2, T))}
      />
      <CounterBlock
        x={lerp(2300, 1360, split)}
        y={832}
        label="You · hypothetical"
        value={lCount}
        color={C.gold}
        size={62}
        align="center"
        approx={false}
        opacity={leo.appear}
      />
      <div
        style={{
          position: "absolute",
          left: 1360,
          top: 930,
          transform: "translateX(-50%)",
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 17,
          letterSpacing: "0.2em",
          color: C.gold,
          opacity: noBlindLabel,
          whiteSpace: "nowrap",
        }}
      >
        NO BLIND ZONE
      </div>
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

export const visionIntroScale = (T: number) => track(T, [[CUE.xfade, 4.25], [30.05, 1]], ease.out);
