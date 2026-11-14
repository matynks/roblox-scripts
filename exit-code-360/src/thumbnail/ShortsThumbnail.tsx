// EXIT CODE 360 — YouTube Shorts thumbnail (9:16; design space 1080×1920, rendered at 2× = 2160×3840).
// Recomposed for vertical (not a crop of the 16:9 thumbnail): same scene language — the film's gym,
// dodgeballs frozen mid-flight from every direction (above, below, behind), Leo unbothered with his
// sandwich, deadpan eye contact. Face + headline sit inside the centre square so they survive the
// 1:1 and 4:5 crops some YouTube surfaces apply.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Figure } from "../characters/Figure";
import { LEO } from "../characters/cast";
import { STAND, type Pose } from "../characters/types";
import { Sandwich } from "../props/Props";
import { Ball, GymSet } from "../env/Gym";
import { type Cam } from "../lib/camera";
import { C } from "../style/palette";
import { FONT, loadFonts } from "../style/fonts";

loadFonts();

const W = 1080;
const H = 1920;
const OUT = "0 0 4px #07050D, 5px 5px 0 #07050D, -5px 5px 0 #07050D, 5px -5px 0 #07050D, -5px -5px 0 #07050D, 0 12px 34px rgba(0,0,0,0.7)";

const SC = 3.8; // Leo's head ≈ 380 px
const HEAD = { x: 540, y: 930 };
const FEET = HEAD.y + 326 * SC;
const LX = HEAD.x - 36; // figure root offset vs. head centre at this turn

type B = { x: number; y: number; r: number; from: number; behind?: boolean; blur?: number; trail?: number };
const BALLS: B[] = [
  { x: 770, y: 905, r: 96, from: -10, behind: true, trail: 1.25 }, // whizzing past just behind his head
  { x: 905, y: 690, r: 56, from: -48, behind: true, blur: 3, trail: 1.0 }, // far, high right
  { x: 160, y: 720, r: 54, from: -135, behind: true, blur: 3, trail: 1.0 }, // far, high left
  { x: 540, y: 205, r: 50, from: -90, behind: true, blur: 3.5, trail: 1.2 }, // from straight above
  { x: 130, y: 1335, r: 118, from: 168, blur: 2.2, trail: 0.9 }, // close to camera, front left
  { x: 975, y: 1185, r: 62, from: 4, behind: true, blur: 3, trail: 1.1 }, // far right
  { x: 790, y: 1450, r: 92, from: 28, behind: true, trail: 1.0 }, // behind his hip
  { x: 300, y: 1575, r: 80, from: 132, trail: 1.0 }, // low left, under his arm
  { x: 470, y: 1765, r: 76, from: 98, trail: 1.1 }, // from below
];

const Trail: React.FC<{ x: number; y: number; ang: number; r: number; k: number; id: string }> = ({ x, y, ang, r, k, id }) => {
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  const len = r * 4.4 * k;
  const px = -uy;
  const py = ux;
  const d = `M${x + px * r * 0.92},${y + py * r * 0.92} L${x + ux * len},${y + uy * len} L${x - px * r * 0.92},${y - py * r * 0.92} Z`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1={x} y1={y} x2={x + ux * len} y2={y + uy * len} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF7A5C" stopOpacity={0.7} />
          <stop offset="100%" stopColor="#FF7A5C" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id})`} />
      {[-0.55, 0.55].map((o, i) => (
        <line key={i} x1={x + ux * r * 1.3 + px * r * o} y1={y + uy * r * 1.3 + py * r * o} x2={x + ux * len * 0.85 + px * r * o * 0.5} y2={y + uy * len * 0.85 + py * r * o * 0.5} stroke="#FFE3D0" strokeWidth={3} opacity={0.32} strokeLinecap="round" />
      ))}
    </g>
  );
};

const BallFx: React.FC<{ b: B; i: number }> = ({ b, i }) => (
  <g filter={b.blur ? `url(#sb${Math.round(b.blur * 10)})` : undefined} opacity={b.blur ? 0.85 : 1}>
    <Trail x={b.x} y={b.y} ang={(b.from * Math.PI) / 180} r={b.r} k={b.trail ?? 1} id={`str${i}`} />
    <circle cx={b.x} cy={b.y} r={b.r * 1.35} fill="#FF6A4A" opacity={0.18} filter="url(#sglow)" />
    <Ball x={b.x} y={b.y} r={b.r} rot={i * 40} />
  </g>
);

export const ShortsThumbnail: React.FC = () => {
  // the gym stage (1920×1080) scaled to cover the 9:16 frame, windows behind Leo's head
  const k = H / 1080;
  const cam: Cam = { x: 20 - 960, y: 40, zoom: 1.25 };
  const pose: Pose = { ...STAND, lean: -4, headTilt: -4, shN: 24, elN: 120, shF: -8, elF: 12, hipN: 6, knN: 4, hipF: -8, knF: 6 };
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: W / 2 - 1150 * k, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `scale(${k})` }}>
        <GymSet cam={cam} t={1} blur={4} clock="03:59" />
      </div>
      {/* grade: dark cool top and bottom, warm backlight core behind the head */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(8,8,22,0.92) 0%, rgba(8,8,22,0.55) 20%, rgba(8,8,22,0.25) 42%, rgba(8,8,22,0.35) 70%, rgba(6,5,12,0.92) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,8,22,0.55) 0%, rgba(8,8,22,0) 30%, rgba(8,8,22,0) 70%, rgba(8,8,22,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${HEAD.x}px ${HEAD.y + 40}px, rgba(255,205,150,0.72) 0%, rgba(255,150,100,0.22) 22%, rgba(0,0,0,0) 42%)`, mixBlendMode: "screen" }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="sglow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
          {[22, 30, 35].map((v) => (
            <filter key={v} id={`sb${v}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation={v / 10} />
            </filter>
          ))}
        </defs>
        {/* the film's sense ring, faint */}
        <circle cx={HEAD.x} cy={HEAD.y} r={262} fill="none" stroke={C.gold} strokeWidth={4.5} opacity={0.55} />
        <circle cx={HEAD.x} cy={HEAD.y} r={304} fill="none" stroke={C.gold} strokeWidth={2.2} opacity={0.22} />
        {BALLS.filter((b) => b.behind).map((b) => (
          <BallFx key={`${b.x}-${b.y}`} b={b} i={BALLS.indexOf(b)} />
        ))}
        <Figure
          spec={LEO}
          id="shleo"
          x={LX}
          y={FEET}
          scale={SC}
          turn={0.18}
          facing={-1}
          pose={pose}
          face={{ eye: "lid", lookX: 0, lookY: 0.1, mouth: "smirk", curve: 0.3, brow: -0.15, browShow: 1, browY: 0.15 }}
          light={{ x: 0.6, y: -0.8 }}
          rim="#FFD2A0"
          rimAmt={1}
          holdNear={<Sandwich s={1} />}
          holdUpright
        />
        {BALLS.filter((b) => !b.behind).map((b) => (
          <BallFx key={`${b.x}-${b.y}`} b={b} i={BALLS.indexOf(b)} />
        ))}
      </svg>
      {/* headline — centred, inside the centre square */}
      <div style={{ position: "absolute", left: 0, width: W, top: 440, textAlign: "center", fontFamily: FONT, fontWeight: 800, lineHeight: 0.86, letterSpacing: "-0.015em" }}>
        <div style={{ fontSize: 196, color: "#FFFFFF", textShadow: OUT }}>SEE</div>
        <div style={{ fontSize: 118, color: C.gold, textShadow: `${OUT}, 0 0 60px rgba(242,197,92,0.5)`, marginTop: 10 }}>EVERYTHING?</div>
      </div>
      {/* brand: small kicker above the headline */}
      <div style={{ position: "absolute", left: 0, width: W, top: 362, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: "0.42em", paddingLeft: "0.42em", color: "rgba(246,241,234,0.92)", textShadow: "0 2px 10px rgba(0,0,0,0.85)" }}>
        EXIT CODE
        <div style={{ margin: "8px auto 0", width: 96, height: 4, background: C.gold, boxShadow: "0 0 12px rgba(242,197,92,0.8)" }} />
      </div>
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.07 }}>
        <Img src={staticFile("textures/grain_6.png")} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: `translate(${W}px,0) rotate(90deg) scale(${H / 1920})` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
