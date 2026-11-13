import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure, Head } from "../characters/Figure";
import { LEO, MIA, MR_BLACK } from "../characters/cast";
import { FACES, POSES, run, walk } from "../characters/poses";
import type { CharacterSpec, Face, Pose } from "../characters/types";
import { CardboardMask, Sandwich } from "../props/Props";
import { C } from "../style/palette";
import { FONT, labelStyle, loadFonts } from "../style/fonts";

loadFonts();

type Slot = {
  label: string;
  pose?: Partial<Pose>;
  face?: Partial<Face>;
  turn?: number;
  facing?: 1 | -1;
  mask?: number; // Mia only: mask state
  hold?: "sandwich";
  hair?: number;
};
type Expr = { label: string; face: Partial<Face>; turn?: number; mask?: number };

const SHEETS: Record<string, { spec: CharacterSpec; role: string; scale: number; slots: Slot[]; exprs: Expr[]; notes: string[] }> = {
  leo: {
    spec: LEO,
    role: "Main character · the boy with 360° vision",
    scale: 1.0,
    slots: [
      { label: "Front", pose: POSES.frontStand, turn: 0, face: FACES.content },
      { label: "Three-quarter", turn: 0.55, face: FACES.content },
      { label: "Side", turn: 1, face: FACES.neutral },
      { label: "Walk", turn: 1, pose: walk(0.12), face: FACES.content, hold: "sandwich" },
      { label: "Run", turn: 1, pose: run(0.2), face: FACES.determined },
      { label: "Dancer step", turn: 0.8, pose: POSES.dancer, face: FACES.calm },
      { label: "Hold it high", turn: 0.7, pose: POSES.holdHigh, face: FACES.smug, hold: "sandwich" },
      { label: "Shrug", turn: 0, pose: POSES.frontShrug, face: FACES.sly },
    ],
    exprs: [
      { label: "Content", face: FACES.content },
      { label: "Laugh", face: FACES.laugh },
      { label: "Calm", face: FACES.calm },
      { label: "Smug", face: FACES.smug },
      { label: "Tired", face: { ...FACES.sad, eye: "lid", curve: 0.12 } },
      { label: "Worried", face: FACES.worried },
      { label: "Shocked", face: FACES.shocked },
      { label: "Determined", face: FACES.determined },
    ],
    notes: ["Steel-blue zip jacket", "No hair accent: silhouette = plain round head", "Head ≈ ¼ of height"],
  },
  mia: {
    spec: MIA,
    role: "Leo's little sister · relentless scare artist",
    scale: 1.18,
    slots: [
      { label: "Front", pose: POSES.frontStand, turn: 0, face: FACES.content },
      { label: "Three-quarter", turn: 0.55, face: FACES.happy },
      { label: "Side", turn: 1, face: FACES.neutral, hair: 0.2 },
      { label: "Tiptoe walk", turn: 1, pose: { ...walk(0.62, 0.7), lean: 10, shN: 120, elN: 50, shF: 110, elF: 50 }, mask: 0, hair: 0.5 },
      { label: "Run", turn: 1, pose: run(0.7), face: FACES.determined, hair: 1 },
      { label: "Scare!", turn: 0.4, pose: POSES.scare, mask: 0, hair: -0.4 },
      { label: "Mask up · stare", turn: 0.6, face: FACES.stare, mask: 1 },
      { label: "How?!", turn: 0.2, pose: POSES.frontArmsOut, face: { ...FACES.shocked, eye: "dot", eyeScale: 1.1 }, mask: 1 },
    ],
    exprs: [
      { label: "Content", face: FACES.content, turn: 0.15 },
      { label: "Laugh", face: FACES.laugh, turn: 0.15 },
      { label: "Hopeful", face: { ...FACES.happy, brow: 0.6, browShow: 1, browY: 0.4 }, turn: 0.15 },
      { label: "Groan", face: FACES.grumpy, turn: 0.15 },
      { label: "Stare", face: FACES.stare, turn: 0.15 },
      { label: "Shocked", face: FACES.shocked, turn: 0.15 },
      { label: "Crying", face: FACES.cry, turn: 0.15 },
      { label: "Mask on", face: FACES.content, turn: 0.15, mask: 0 },
    ],
    notes: ["Pink A-line dress", "Ponytail + pink clip (silhouette ID)", "Cardboard mask prop", "Head ≈ ⅓ of height"],
  },
  black: {
    spec: MR_BLACK,
    role: "The man in the grey suit · wants a human security camera",
    scale: 0.92,
    slots: [
      { label: "Front", pose: POSES.frontStand, turn: 0, face: FACES.sly },
      { label: "Three-quarter", turn: 0.55, face: FACES.sly },
      { label: "Side", turn: 1, face: FACES.neutral },
      { label: "Walk", turn: 1, pose: walk(0.3, 0.8, "brisk"), face: FACES.sly },
      { label: "Run", turn: 1, pose: run(0.25, 0.8), face: FACES.angry },
      { label: "Offer", turn: 0.6, pose: POSES.palmsOut, face: FACES.smug },
      { label: "Hands on hips", turn: 0, pose: { ...POSES.frontStand, shN: 30, elN: -95, shF: -30, elF: 95 }, face: FACES.grumpy },
      { label: "Point", turn: 0.9, pose: POSES.point, face: FACES.angry, facing: -1 },
    ],
    exprs: [
      { label: "Sly", face: FACES.sly },
      { label: "Smug", face: FACES.smug },
      { label: "Neutral", face: FACES.neutral },
      { label: "Talk", face: { ...FACES.talk, eye: "lid" } },
      { label: "Grumpy", face: FACES.grumpy },
      { label: "Angry", face: FACES.angry },
      { label: "Snarl", face: { ...FACES.angry, mouth: "grin", open: 0.2 } },
      { label: "Surprised", face: { ...FACES.shocked, eye: "dot" } },
    ],
    notes: ["Grey suit, white shirt, black tie", "Slicked quiff (silhouette ID)", "Taller, broader: head ≈ ⅕ of height", "Narrow lidded eyes"],
  },
};

export const CharacterSheet: React.FC<{ who: keyof typeof SHEETS }> = ({ who }) => {
  const sh = SHEETS[who];
  const S = sh.spec;
  const light = { x: 0.75, y: -0.65 };
  const groundY = 640;
  const xs = [140, 360, 580, 800, 1040, 1290, 1530, 1770];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 70% 20%, #2C2234 0%, #18131F 55%, #0D0A12 100%)" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        {/* floor */}
        <rect x={0} y={groundY} width={1920} height={8} fill="#2A2232" />
        <rect x={0} y={groundY + 8} width={1920} height={120} fill="#130F18" opacity={0.6} />
        {/* key light hint */}
        <circle cx={1880} cy={-40} r={420} fill={C.rimWarm} opacity={0.05} />
        {sh.slots.map((sl, i) => (
          <g key={sl.label}>
            <ellipse cx={xs[i]} cy={groundY + 2} rx={48 * sh.scale} ry={7} fill="#000" opacity={0.35} />
            <Figure
              spec={S}
              id={`${who}-s${i}`}
              x={xs[i]}
              y={groundY}
              scale={sh.scale}
              turn={sl.turn ?? 1}
              facing={sl.facing ?? 1}
              pose={sl.pose}
              face={sl.face}
              light={light}
              hairSwing={sl.hair ?? 0}
              holdNear={sl.hold === "sandwich" ? <Sandwich s={0.9} /> : undefined}
              holdUpright
              headExtra={sl.mask !== undefined ? <CardboardMask r={S.D / 2} state={sl.mask} turn={sl.turn ?? 1} /> : undefined}
            />
            <text x={xs[i]} y={groundY + 48} textAnchor="middle" style={labelStyle(15, C.label)} fill={C.label}>
              {sl.label}
            </text>
          </g>
        ))}
        {/* expressions */}
        {sh.exprs.map((ex, i) => (
          <g key={ex.label}>
            <Head
              spec={S}
              id={`${who}-e${i}`}
              x={170 + i * 225}
              y={835}
              size={120}
              face={ex.face}
              turn={ex.turn ?? 0}
              light={light}
              extra={ex.mask !== undefined ? <CardboardMask r={S.D / 2} state={ex.mask} turn={0} /> : undefined}
            />
            <text x={170 + i * 225} y={1000} textAnchor="middle" style={labelStyle(15, C.label)} fill={C.label}>
              {ex.label}
            </text>
          </g>
        ))}
      </svg>
      {/* header */}
      <div style={{ position: "absolute", left: 70, top: 46, fontFamily: FONT }}>
        <div style={{ ...labelStyle(16, C.gold) }}>EXIT CODE · 360° · Character design</div>
        <div style={{ fontWeight: 800, fontSize: 64, color: "#F6F1EA", letterSpacing: "0.04em", marginTop: 6 }}>{S.name.toUpperCase()}</div>
        <div style={{ ...labelStyle(16, C.label), marginTop: 4 }}>{sh.role}</div>
      </div>
      <div style={{ position: "absolute", right: 70, top: 56, display: "flex", gap: 14, alignItems: "flex-start" }}>
        {[C.ink, S.cloth, S.clothShade, C.eyeWhite, C.rimWarm, ...(who === "mia" ? [C.miaClip, C.cardboard] : [])].map((c) => (
          <div key={c} style={{ textAlign: "center" }}>
            <div style={{ width: 54, height: 54, borderRadius: 27, background: c, border: "2px solid #ffffff22" }} />
            <div style={{ ...labelStyle(11, C.label), marginTop: 6, letterSpacing: "0.06em" }}>{c}</div>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 70, top: 150, textAlign: "right" }}>
        {sh.notes.map((n) => (
          <div key={n} style={{ ...labelStyle(13, "#7E8CA3"), letterSpacing: "0.1em", marginTop: 4 }}>
            {n}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
