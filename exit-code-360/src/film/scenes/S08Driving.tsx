// S08 "Driving lessons" (82.55–95.86): exterior → top-down blind spots → cabin.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { EXTRA, LEO } from "../../characters/cast";
import { FACES, blinkAt } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { Clipboard, Glasses } from "../../props/Accessories";
import { CABIN, CabinBack, CabinFront, LearnerCar, ROAD, RoadScene } from "../../env/Car";
import { Vignette } from "../../env/Atmosphere";
import { NavySpace, wedgePath } from "../../graphics/VisionField";
import { IconDefs } from "../../graphics/Icons";
import { Label, SenseRing, bump, step } from "../../lib/acting";
import { type Cam } from "../../lib/camera";
import { clamp, invLerp, lerp, track } from "../../lib/anim";
import { P, talk } from "../../lib/timing";
import { C } from "../../style/palette";

const t0 = P(54).start; // 82.55 "Driving lessons."
const tNormal = P(55).start; // 84.07
const tYou = P(56).start; // 87.35
const tNever = P(57).start; // 88.31
const tStare = P(58).start; // 89.43
const tDude = P(59).start; // 91.86
const tLook = P(60).end; // 94.18
const tNoNeed = P(61).start; // 94.82
const X_DIAG = 83.95;
const X_CAB = 89.15;

const Exterior: React.FC<{ T: number }> = ({ T }) => {
  const speed = 900;
  const d = (T - t0 + 1) * speed;
  const cam: Cam = { x: d, y: 40, zoom: lerp(1.0, 1.06, clamp((T - t0) / 1.6)) };
  return (
    <AbsoluteFill>
      <RoadScene cam={cam} t={T}>
        <LearnerCar x={d + 960} y={ROAD.y} dist={d} s={1.1} bounce={Math.sin(T * 31) * 1.2} />
      </RoadScene>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

const TopCar: React.FC<{ color: string; outline: string; w?: number; h?: number }> = ({ color, outline, w = 150, h = 280 }) => (
  <g>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={42} fill={color} stroke={outline} strokeWidth={2.5} />
    <path d={`M${-w / 2 + 16},${-h / 2 + 70} L${w / 2 - 16},${-h / 2 + 70} L${w / 2 - 26},${-h / 2 + 30} L${-w / 2 + 26},${-h / 2 + 30}Z`} fill="#3B4A6E" opacity={0.8} />
    <rect x={-w / 2 + 18} y={-h / 2 + 90} width={w - 36} height={h - 150} rx={20} fill="#1C2640" />
    <rect x={-w / 2 - 14} y={-h / 2 + 76} width={16} height={12} rx={4} fill={outline} />
    <rect x={w / 2 - 2} y={-h / 2 + 76} width={16} height={12} rx={4} fill={outline} />
  </g>
);

const Diagram: React.FC<{ T: number }> = ({ T }) => {
  const cx = 960;
  const cy = 610;
  const hx = cx - 34;
  const hy = cy - 40;
  const turn = track(T, [[84.9, 0], [85.4, -78], [86.45, -78], [86.95, 0]]);
  const leo = step(T, tYou - 0.05, tYou + 0.5);
  const ring = step(T, tNever - 0.3, tNever + 0.6);
  const coral = 1 - step(T, tNever, tNever + 0.7);
  const reveal = bump(T, 85.3, 85.5, 86.4, 86.6);
  const appear = step(T, X_DIAG, X_DIAG + 0.5);
  const fovCol = leo > 0.5 ? C.gold : C.lineBlue;
  return (
    <AbsoluteFill style={{ opacity: appear }}>
      <NavySpace drift={T * 6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <IconDefs />
        <defs>
          <radialGradient id="s8fov" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={fovCol} stopOpacity="0.4" />
            <stop offset="1" stopColor={fovCol} stopOpacity="0.04" />
          </radialGradient>
        </defs>
        {/* road lanes */}
        {[-1, 1].map((k) => (
          <path key={k} d={`M${cx + k * 300},120 L${cx + k * 300},1000`} stroke={C.grid} strokeWidth={4} strokeDasharray="40 30" strokeDashoffset={-T * 300} />
        ))}
        {/* mirror cones */}
        <g opacity={0.35 * (1 - leo)}>
          <path d={wedgePath(cx - 82, cy - 64, 380, 190, 212)} fill={C.lineBlue} opacity={0.4} />
          <path d={wedgePath(cx + 82, cy - 64, 380, 148, 170)} fill={C.lineBlue} opacity={0.4} />
          <path d={wedgePath(cx, cy - 50, 420, 170, 190)} fill={C.lineBlue} opacity={0.4} />
        </g>
        {/* blind spots */}
        <g opacity={coral}>
          {[-1, 1].map((k) => (
            <path
              key={k}
              d={`M${cx + k * 82},${cy - 40} L${cx + k * 360},${cy - 10} L${cx + k * 330},${cy + 240} L${cx + k * 120},${cy + 120}Z`}
              fill={C.coral}
              opacity={k < 0 ? 0.2 + 0.25 * reveal : 0.2}
              stroke={C.coral}
              strokeWidth={2}
              strokeDasharray="8 8"
            />
          ))}
        </g>
        {/* the car hiding in the left blind spot */}
        <g transform={`translate(${cx - 230},${cy + 110 - (T - X_DIAG) * 4})`}>
          <TopCar color="#3A3040" outline={reveal > 0.3 ? C.coral : "#5A5070"} w={90} h={170} />
        </g>
        {/* driver field of view (rotates with the head) */}
        <g transform={`rotate(${turn * (1 - leo)},${hx},${hy})`}>
          <path d={wedgePath(hx, hy, 380, -95 + 0, 95)} fill="url(#s8fov)" opacity={1 - ring} />
          <path d={wedgePath(hx, hy, 380, -95, 95).replace(/^M[^L]*L/, "M").replace(/Z$/, "")} fill="none" stroke={fovCol} strokeWidth={2.4} opacity={0.8 * (1 - ring)} />
        </g>
        {ring > 0 && (
          <g>
            <circle cx={hx} cy={hy} r={380 * ring} fill="url(#s8fov)" opacity={0.9} />
            <circle cx={hx} cy={hy} r={380 * ring} fill="none" stroke={C.gold} strokeWidth={2.6} />
          </g>
        )}
        <g transform={`translate(${cx},${cy})`}>
          <TopCar color="#26324F" outline={leo > 0.5 ? C.gold : C.lineBlueDim} />
        </g>
        <g transform={`translate(${hx},${hy}) rotate(${turn * (1 - leo)})`}>
          <circle r={22} fill={C.ink} stroke={leo > 0.5 ? C.gold : C.lineBlue} strokeWidth={2.4} />
          <path d="M-5,-21 Q0,-30 5,-21Z" fill={C.ink} stroke={leo > 0.5 ? C.gold : C.lineBlue} strokeWidth={2} />
        </g>
      </svg>
      <Label x={960} y={96} text={leo > 0.5 ? "you · no head turn" : "blind spots"} size={24} color={leo > 0.5 ? C.gold : C.coral} o={step(T, X_DIAG + 0.2, X_DIAG + 0.6)} />
      <Label x={cx - 360} y={cy + 270} text="blind spot" size={17} color={C.coral} o={coral * step(T, tNormal, tNormal + 0.4)} />
      <Label x={cx + 360} y={cy + 270} text="blind spot" size={17} color={C.coral} o={coral * step(T, tNormal, tNormal + 0.4)} />
      <Label x={960} y={150} text="normal driver: turn your head" size={17} color={C.label} o={bump(T, 84.7, 85.0, tYou - 0.2, tYou)} />
    </AbsoluteFill>
  );
};

const Cabin: React.FC<{ T: number }> = ({ T }) => {
  const S = 1.62;
  const shake = Math.sin(T * 37) * 1.4 + Math.sin(T * 13) * 0.8;
  const carPass = invLerp(89.7, 91.1, T);
  const nudge = bump(T, 90.1, 90.35, 90.6, 90.9) * 6;
  const leoPose: Pose = { ...STAND, shN: 12, elN: -26, shF: -12, elF: 26, headTilt: Math.sin(T * 1.3) * 2 };
  let leoFace: Partial<Face> = { ...FACES.calm, curve: 0.4 };
  if (T > tLook + 0.2) leoFace = { ...FACES.smug, mouth: "talk", open: talk(T, tNoNeed - 0.05, tNoNeed + 0.7) };
  if (T > tNoNeed + 0.75) leoFace = FACES.smug;
  const iTalk = talk(T, tDude - 0.05, tLook + 0.05);
  const gest = bump(T, tDude - 0.1, tDude + 0.2, tLook, tLook + 0.3);
  const insPose: Pose = { ...STAND, shN: lerp(10, 60, gest) + Math.sin(T * 9) * 8 * gest, elN: lerp(80, 60, gest), shF: 14, elF: 90, lean: -3 + gest * 4 };
  let insFace: Partial<Face> = { ...FACES.stare, lookX: 0.4, blink: blinkAt(T, [90.6]) };
  if (iTalk > 0 || (T > tDude && T < tLook + 0.1)) insFace = { ...FACES.worried, mouth: "talk", open: iTalk, brow: 0.5, browY: 0.6, lookX: 0.4 };
  if (T > tNoNeed + 0.3) insFace = { ...FACES.shocked, eye: "dot", lookX: 0.4 };
  const light = { x: 0, y: -1 };
  return (
    <AbsoluteFill style={{ opacity: step(T, X_CAB, X_CAB + 0.35) }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <CabinBack t={T} carPass={carPass} />
        <g transform={`translate(0,${shake})`}>
          <SenseRing T={T} at={89.85} x={CABIN.leoX} y={CABIN.hipY - 160 * S} r={LEO.D * S * 0.62} />
          <Figure spec={LEO} id="s8leo" x={CABIN.leoX} y={CABIN.hipY} scale={S} grounded={false} turn={0.12} pose={leoPose} face={leoFace} light={light} />
          <Figure
            spec={EXTRA}
            id="s8ins"
            x={CABIN.insX}
            y={CABIN.hipY}
            scale={S * 0.98}
            grounded={false}
            facing={-1}
            turn={0.5}
            pose={insPose}
            face={insFace}
            light={light}
            headExtra={<Glasses r={EXTRA.D / 2} turn={0.5} />}
            holdFar={<Clipboard s={1.1} rot={-10} />}
          />
          <CabinFront wheelTurn={nudge} />
        </g>
      </svg>
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};

export const S08Driving: React.FC<{ T: number }> = ({ T }) => (
  <AbsoluteFill>
    {T < X_DIAG + 0.6 && <Exterior T={T} />}
    {T >= X_DIAG && T < X_CAB + 0.5 && <Diagram T={T} />}
    {T >= X_CAB && <Cabin T={T} />}
  </AbsoluteFill>
);

export const S08_START = t0;
