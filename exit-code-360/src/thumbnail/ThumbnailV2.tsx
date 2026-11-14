// EXIT CODE 360 — thumbnail v2 (1280×720): one focal point. Leo, backlit by the promenade sunset,
// inside a glowing 360° vision field; short bold question. Built from the production's own
// set, rig, palette, grain and typography.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Head } from "../characters/Figure";
import { LEO } from "../characters/cast";
import { FACES } from "../characters/poses";
import type { Face } from "../characters/types";
import { Hills, PromenadeSet, SkySea } from "../env/Promenade";
import { type Cam } from "../lib/camera";
import { C } from "../style/palette";
import { FONT, loadFonts } from "../style/fonts";

loadFonts();

const OUT = "0 0 4px #07050D, 5px 5px 0 #07050D, -5px 5px 0 #07050D, 5px -5px 0 #07050D, -5px -5px 0 #07050D, 0 12px 34px rgba(0,0,0,0.7)";

type Props = { ring?: "flat" | "orbit"; expr?: "awe" | "smirk" };

const FACE: Record<string, Partial<Face>> = {
  // wide-eyed: he is taking in everything around him
  awe: { ...FACES.shocked, eye: "wide", lookX: -0.35, lookY: -0.15, mouth: "o", open: 0.55, brow: 0.35, browShow: 1, browY: 0.45 },
  // knowing: he already sees you
  smirk: { ...FACES.smug, eye: "dot", lookX: 0, lookY: 0, mouth: "smirk", brow: -0.3, browShow: 1, browY: 0.2 },
};

export const ThumbnailV2: React.FC<Props> = ({ ring = "orbit", expr = "awe" }) => {
  const cam: Cam = { x: 1380 - 960, y: 150, zoom: 1.35 }; // sun sits behind Leo's head
  const t = 0.5;
  const HX = 1300;
  const HY = 470;
  const HS = 560;
  const rays = Array.from({ length: 48 });
  const RX = 520; // orbit ellipse
  const RY = 150;
  const OY = HY + 120;
  const tilt = -9;
  const ellipseArc = (front: boolean) => {
    // half ellipse: back = upper half (behind the head), front = lower half (sweep 0 = through the bottom)
    const s = front ? 0 : 1;
    return `M${HX - RX},${OY} A${RX},${RY} 0 0 ${s} ${HX + RX},${OY}`;
  };
  const ticks = (front: boolean) =>
    Array.from({ length: 60 }).map((_, i) => {
      const a = (i / 60) * Math.PI * 2;
      const isFront = Math.sin(a) > 0;
      if (isFront !== front) return null;
      const x = HX + Math.cos(a) * RX;
      const y = OY + Math.sin(a) * RY;
      const len = i % 5 === 0 ? 26 : 14;
      const nx = Math.cos(a) * len;
      const ny = Math.sin(a) * len * (RY / RX);
      return <line key={i} x1={x} y1={y} x2={x + nx} y2={y + ny} stroke={C.goldLight} strokeWidth={i % 5 === 0 ? 4 : 2.2} opacity={0.85} />;
    });
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: "scale(0.6666667)" }}>
        <SkySea cam={cam} t={t} blur={5} />
        <Hills cam={cam} t={t} blur={5} />
        <PromenadeSet cam={cam} t={t} blur={6} />
        {/* grade: cool, deeper sky at the edges; hot sunset core behind the head */}
        <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(14,16,48,0.78) 0%, rgba(30,20,70,0.35) 38%, rgba(0,0,0,0) 60%, rgba(8,6,20,0.7) 100%)" }} />
        <AbsoluteFill style={{ background: `radial-gradient(circle at ${HX}px ${HY + 30}px, rgba(255,226,170,0.95) 0%, rgba(255,170,120,0.65) 12%, rgba(240,120,150,0.28) 30%, rgba(0,0,0,0) 52%)`, mixBlendMode: "screen" }} />
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,8,26,0.82) 0%, rgba(8,8,26,0.45) 30%, rgba(8,8,26,0) 50%)" }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="v2glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="9" />
            </filter>
            <radialGradient id="v2disc" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={C.gold} stopOpacity={0.55} />
              <stop offset="70%" stopColor={C.gold} stopOpacity={0.12} />
              <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
            </radialGradient>
          </defs>
          {/* vision rays in every direction */}
          {rays.map((_, i) => {
            const a = (i / rays.length) * Math.PI * 2 + 0.03;
            const r0 = HS * 0.62;
            const r1 = HS * (i % 2 ? 1.25 : 1.6);
            return (
              <line key={i} x1={HX + Math.cos(a) * r0} y1={HY + Math.sin(a) * r0} x2={HX + Math.cos(a) * r1} y2={HY + Math.sin(a) * r1} stroke={C.goldLight} strokeWidth={i % 2 ? 2 : 3.5} opacity={i % 2 ? 0.25 : 0.45} strokeLinecap="round" />
            );
          })}
          {ring === "flat" ? (
            <g>
              <circle cx={HX} cy={HY} r={HS * 0.74} fill="none" stroke={C.gold} strokeWidth={28} opacity={0.4} filter="url(#v2glow)" />
              <circle cx={HX} cy={HY} r={HS * 0.74} fill="none" stroke={C.goldLight} strokeWidth={7} />
            </g>
          ) : (
            <g transform={`rotate(${tilt} ${HX} ${OY})`}>
              <ellipse cx={HX} cy={OY} rx={RX} ry={RY} fill="url(#v2disc)" />
              <path d={ellipseArc(false)} fill="none" stroke={C.gold} strokeWidth={24} opacity={0.45} filter="url(#v2glow)" />
              <path d={ellipseArc(false)} fill="none" stroke={C.goldLight} strokeWidth={6} />
              {ticks(false)}
            </g>
          )}
          <Head spec={LEO} id="v2leo" x={HX} y={HY - 30} size={HS} face={FACE[expr]} turn={0} light={{ x: 0, y: -1 }} rim="#FFD9A8" />
          {ring === "orbit" && (
            <g transform={`rotate(${tilt} ${HX} ${OY})`}>
              <path d={ellipseArc(true)} fill="none" stroke={C.gold} strokeWidth={24} opacity={0.5} filter="url(#v2glow)" />
              <path d={ellipseArc(true)} fill="none" stroke={C.goldLight} strokeWidth={6} />
              {ticks(true)}
              <text x={HX + RX - 40} y={OY + RY - 2} fontFamily={FONT} fontWeight={800} fontSize={70} fill={C.goldLight} stroke="#120C1C" strokeWidth={7} paintOrder="stroke" strokeLinejoin="round" textAnchor="middle" style={{ filter: "drop-shadow(0 0 12px rgba(242,197,92,0.75))" }}>
                360°
              </text>
            </g>
          )}
        </svg>
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(6,5,14,0.92) 0%, rgba(6,5,14,0.55) 16%, rgba(6,5,14,0) 34%)" }} />
        <div style={{ position: "absolute", left: 66, top: 120, fontFamily: FONT, fontWeight: 800, lineHeight: 0.88, letterSpacing: "-0.015em" }}>
          <div style={{ fontSize: 270, color: "#FFFFFF", textShadow: OUT }}>SEE</div>
          <div style={{ fontSize: 124, color: C.gold, textShadow: `${OUT}, 0 0 60px rgba(242,197,92,0.5)`, marginTop: 14 }}>EVERYTHING?</div>
        </div>
        <div style={{ position: "absolute", left: 74, top: 984, fontFamily: FONT, fontWeight: 800, fontSize: 32, letterSpacing: "0.42em", color: "rgba(246,241,234,0.9)", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
          EXIT CODE
          <div style={{ marginTop: 8, width: 110, height: 4, background: C.gold, boxShadow: "0 0 12px rgba(242,197,92,0.8)" }} />
        </div>
        <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.07 }}>
          <Img src={staticFile("textures/grain_5.png")} style={{ width: 1920, height: 1080 }} />
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};
