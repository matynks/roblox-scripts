// EXIT CODE 360 — FINAL thumbnail (1280×720) as a story scene, not a graphic:
// in the film's gym, dodgeballs come at Leo from every direction at once — including from
// behind — and he handles all of them without looking at a single one: deadpan eye contact with
// the viewer, sandwich in one hand, a ball caught behind his head with the other. The balls'
// arrangement *is* the 360° circle; nothing is explained.
import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { Figure } from "../characters/Figure";
import { LEO } from "../characters/cast";
import type { Pose } from "../characters/types";
import { STAND } from "../characters/types";
import { Sandwich } from "../props/Props";
import { Ball, GymSet } from "../env/Gym";
import { type Cam } from "../lib/camera";
import { C } from "../style/palette";
import { FONT, loadFonts } from "../style/fonts";

loadFonts();

const OUT = "0 0 4px #07050D, 5px 5px 0 #07050D, -5px 5px 0 #07050D, 5px -5px 0 #07050D, -5px -5px 0 #07050D, 0 12px 34px rgba(0,0,0,0.7)";

// Leo (design space 1920×1080)
const LX = 1200;
const SC = 3.2;
const FEET = 1445; // feet below frame: framed head to waist
const HEAD = { x: LX + 30, y: FEET - 326 * SC }; // head centre ≈ (1230, 402)

// each ball: position, size, which way it came from (trail angle, deg: 0 = from the right),
// depth (behind Leo = partly hidden by him) and focus (blur = far from the focal plane)
type B = { x: number; y: number; r: number; from: number; behind?: boolean; blur?: number; trail?: number };
const BALLS: B[] = [
  { x: 1438, y: 368, r: 80, from: -12, behind: true, trail: 1.3 }, // whizzing past just behind his head (partly hidden by it)
  { x: 1345, y: 880, r: 70, from: 28, behind: true, trail: 1.0 }, // behind his hip
  { x: 1740, y: 640, r: 48, from: 4, behind: true, blur: 3, trail: 1.1 }, // far right, still coming
  { x: 1360, y: 105, r: 46, from: -70, behind: true, blur: 3, trail: 1.0 }, // far, from above and behind
  { x: 880, y: 210, r: 46, from: -140, behind: true, blur: 3, trail: 1.0 }, // far, high left
  { x: 720, y: 720, r: 100, from: 168, blur: 2.2, trail: 1.0 }, // close to camera, front left
  { x: 1000, y: 965, r: 62, from: 128, trail: 1.0 }, // low, under his arm
];

const Trail: React.FC<{ x: number; y: number; ang: number; r: number; k: number; id: string }> = ({ x, y, ang, r, k, id }) => {
  // tapered streak pointing back where the ball came from
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

const BallFx: React.FC<{ b: B; i: number }> = ({ b, i }) => {
  const ang = (b.from * Math.PI) / 180;
  return (
    <g filter={b.blur ? `url(#tb${Math.round(b.blur * 10)})` : undefined} opacity={b.blur ? 0.85 : 1}>
      <Trail x={b.x} y={b.y} ang={ang} r={b.r} k={b.trail ?? 1} id={`tr${i}`} />
      <circle cx={b.x} cy={b.y} r={b.r * 1.35} fill="#FF6A4A" opacity={0.18} filter="url(#tglow)" />
      <Ball x={b.x} y={b.y} r={b.r} rot={i * 40} />
    </g>
  );
};

export const ThumbnailScene: React.FC = () => {
  const cam: Cam = { x: 20 - 960, y: 40, zoom: 1.25 }; // scoreboard out of frame
  const pose: Pose = {
    ...STAND,
    lean: -4,
    headTilt: -4,
    // near arm: sandwich held up in front, unbothered
    shN: 38,
    elN: 104,
    // far arm: hanging loose — he isn't even bracing
    shF: -8,
    elF: 12,
    hipN: 6,
    knN: 4,
    hipF: -8,
    knF: 6,
  };
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transformOrigin: "0 0", transform: "scale(0.6666667)" }}>
        {/* the film's gym: warm high windows, light shafts, hardwood — defocused behind the action */}
        <GymSet cam={cam} t={1} blur={5} clock="03:59" />
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(8,8,22,0.9) 0%, rgba(8,8,22,0.6) 34%, rgba(8,8,22,0.3) 56%, rgba(8,8,22,0.55) 100%)" }} />
        <AbsoluteFill style={{ background: `radial-gradient(circle at ${HEAD.x}px ${HEAD.y + 60}px, rgba(255,205,150,0.7) 0%, rgba(255,150,100,0.22) 26%, rgba(0,0,0,0) 48%)`, mixBlendMode: "screen" }} />
        <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(8,5,10,0.75) 0%, rgba(8,5,10,0) 30%)" }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <filter id="tglow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            {[22, 30].map((k) => (
              <filter key={k} id={`tb${k}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation={k / 10} />
              </filter>
            ))}
          </defs>
          {/* the film's sense ring: faint, the way it flickers when he notices */}
          <circle cx={HEAD.x} cy={HEAD.y} r={222} fill="none" stroke={C.gold} strokeWidth={4} opacity={0.55} />
          <circle cx={HEAD.x} cy={HEAD.y} r={258} fill="none" stroke={C.gold} strokeWidth={2} opacity={0.22} />
          {BALLS.filter((b) => b.behind).map((b) => (
            <BallFx key={b.x} b={b} i={BALLS.indexOf(b)} />
          ))}
          <Figure
            spec={LEO}
            id="thsleo"
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
            <BallFx key={b.x} b={b} i={BALLS.indexOf(b)} />
          ))}
        </svg>
        <div style={{ position: "absolute", left: 62, top: 110, fontFamily: FONT, fontWeight: 800, lineHeight: 0.88, letterSpacing: "-0.015em" }}>
          <div style={{ fontSize: 250, color: "#FFFFFF", textShadow: OUT }}>SEE</div>
          <div style={{ fontSize: 114, color: C.gold, textShadow: `${OUT}, 0 0 60px rgba(242,197,92,0.5)`, marginTop: 14 }}>EVERYTHING?</div>
        </div>
        <div style={{ position: "absolute", left: 70, top: 984, fontFamily: FONT, fontWeight: 800, fontSize: 32, letterSpacing: "0.42em", color: "rgba(246,241,234,0.9)", textShadow: "0 2px 10px rgba(0,0,0,0.8)" }}>
          EXIT CODE
          <div style={{ marginTop: 8, width: 110, height: 4, background: C.gold, boxShadow: "0 0 12px rgba(242,197,92,0.8)" }} />
        </div>
        <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.07 }}>
          <Img src={staticFile("textures/grain_6.png")} style={{ width: 1920, height: 1080 }} />
        </AbsoluteFill>
      </div>
    </AbsoluteFill>
  );
};
