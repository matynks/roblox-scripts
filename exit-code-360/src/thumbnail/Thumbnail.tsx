// EXIT CODE 360 — YouTube thumbnail (1280×720). Composed from the production's own assets:
// the promenade sunset set, the character rig (Leo close-up head, Mia with the cardboard mask),
// the pigeon, the gold 360° ring motif, the film's palette, light, grain and typography.
// Story read: Leo calmly side-eyes what is sneaking up *behind* him — no explanation given.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Figure, Head } from "../characters/Figure";
import { LEO, MIA } from "../characters/cast";
import { FACES, POSES } from "../characters/poses";
import { CardboardMask } from "../props/Props";
import { Seagull } from "../props/Seagull";
import { Hills, KEY_LIGHT, PROM, PromenadeSet, SkySea } from "../env/Promenade";
import { Shadow } from "../lib/acting";
import { type Cam } from "../lib/camera";
import { C } from "../style/palette";
import { FONT, loadFonts } from "../style/fonts";

loadFonts();

const OUT = "0 0 3px #0B0812, 4px 4px 0 #0B0812, -4px 4px 0 #0B0812, 4px -4px 0 #0B0812, -4px -4px 0 #0B0812, 0 10px 30px rgba(0,0,0,0.6)";

export const Thumbnail: React.FC<{ look?: number }> = ({ look = 1 }) => {
  // background: the opening promenade at sunset, slightly defocused behind the close-up
  const cam: Cam = { x: 140 - 960, y: 70, zoom: 1.18 }; // lamp post hidden behind Leo's head
  const t = 3.4;
  const HX = 1320; // Leo close-up head centre (design space 1920×1080)
  const HY = 560;
  const HS = 520; // head diameter
  const R = 395; // 360° ring radius
  // Mia's own BOO pose from the epilogue (arms up, leaning in) — reads at thumbnail size
  const miaPose = { ...POSES.scare, lean: 16, hipN: 26, knN: 18, bob: 0.04 };
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: "scale(0.6666667)" }}>
        <SkySea cam={cam} t={t} blur={3} />
        <Hills cam={cam} t={t} blur={3} />
        <PromenadeSet cam={cam} t={t} blur={0.7}>
          {/* Mia creeping up from behind: mask down, arms up */}
          <Shadow x={-120} y={PROM.laneFar} w={40} />
          <Figure spec={MIA} id="thmia" x={-120} y={PROM.laneFar} scale={1.22} turn={0.72} pose={miaPose} face={{ ...FACES.laugh, eye: "lid", open: 0.3 }} light={KEY_LIGHT} hairSwing={0.25} headExtra={<CardboardMask r={MIA.D / 2} state={0} turn={0.72} variant="old" />} />
          {/* the film's gold "spotted" ring: he has already noticed her */}
          <circle cx={-76} cy={585} r={64} fill="none" stroke={C.gold} strokeWidth={4} opacity={0.9} />
          <circle cx={-76} cy={585} r={76} fill="none" stroke={C.gold} strokeWidth={2} opacity={0.35} />
        </PromenadeSet>
        {/* grade: warm sun bloom behind Leo, darker edges, deep base for contrast */}
        <AbsoluteFill style={{ background: `radial-gradient(circle at ${HX}px ${HY}px, rgba(255,196,140,0.42) 0%, rgba(240,140,150,0.16) 26%, rgba(0,0,0,0) 46%)` }} />
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(10,6,20,0.62) 0%, rgba(10,6,20,0.18) 38%, rgba(10,6,20,0) 55%)" }} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(8,5,16,0.85) 0%, rgba(8,5,16,0) 34%)" }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="thglow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          {/* the 360° ring: glow, ring, ticks, faint outer echo */}
          <circle cx={HX} cy={HY} r={R} fill="none" stroke={C.gold} strokeWidth={26} opacity={0.35} filter="url(#thglow)" />
          <circle cx={HX} cy={HY} r={R} fill="none" stroke={C.goldLight} strokeWidth={6} />
          <circle cx={HX} cy={HY} r={R + 70} fill="none" stroke={C.gold} strokeWidth={2} opacity={0.3} />
          {Array.from({ length: 72 }).map((_, i) => {
            const a = (i / 72) * Math.PI * 2;
            const r0 = R + 16;
            const r1 = R + (i % 6 === 0 ? 44 : 30);
            return <line key={i} x1={HX + Math.cos(a) * r0} y1={HY + Math.sin(a) * r0} x2={HX + Math.cos(a) * r1} y2={HY + Math.sin(a) * r1} stroke={C.gold} strokeWidth={i % 6 === 0 ? 4 : 2} opacity={0.7} />;
          })}
          {/* the pigeon dives at the back of his head */}
          <circle cx={HX + 292} cy={HY - 300} r={92} fill="none" stroke={C.gold} strokeWidth={4} opacity={0.9} />
          <circle cx={HX + 292} cy={HY - 300} r={108} fill="none" stroke={C.gold} strokeWidth={2} opacity={0.35} />
          <Seagull kind="pigeon" x={HX + 285} y={HY - 285} scale={1.45} facing={-1} flap={40} bodyTilt={-32} />
          {/* Leo: calm half-smile, eyes slid back toward what he cannot be looking at */}
          <Head spec={LEO} id="thleo" x={HX} y={HY - 40} size={HS} face={{ ...FACES.smug, eye: "dot", lookX: look, lookY: 0.05, mouth: "smirk", brow: -0.25, browShow: 1, browY: 0.15 }} turn={0.2} facing={-1} light={KEY_LIGHT} rim={C.rimWarm} />
        </svg>
        {/* headline */}
        <div style={{ position: "absolute", left: 70, top: 92, fontFamily: FONT, fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.01em" }}>
          <div style={{ fontSize: 230, color: "#FFFFFF", textShadow: OUT }}>SEE</div>
          <div style={{ fontSize: 108, color: C.gold, textShadow: `${OUT}, 0 0 50px rgba(242,197,92,0.45)`, marginTop: 10 }}>EVERYTHING?</div>
        </div>
        {/* brand */}
        <div style={{ position: "absolute", left: 78, top: 980, fontFamily: FONT, fontWeight: 800, fontSize: 34, letterSpacing: "0.42em", color: "rgba(246,241,234,0.92)", textShadow: "0 2px 10px rgba(0,0,0,0.7)" }}>
          EXIT CODE
          <div style={{ marginTop: 8, width: 120, height: 4, background: C.gold, boxShadow: "0 0 12px rgba(242,197,92,0.8)" }} />
        </div>
        <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.07 }}>
          <Img src={staticFile("textures/grain_3.png")} style={{ width: 1920, height: 1080 }} />
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};

