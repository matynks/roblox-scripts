// S33 (414.34–427.49): "Could a mind ever watch everything at once?" Night; the
// phone buzzes: UNKNOWN NUMBER — "We saw what you did at the concert." — "You're not
// the only one." A distant rooftop silhouette with its own ring.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { LEO } from "../../characters/cast";
import { FACES, POSES, blinkAt, breathe } from "../../characters/poses";
import { ROOM, RoomBack, RoomForeground, Sofa, roomLight } from "../../env/LivingRoom";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, step } from "../../lib/acting";
import { clamp, ease, lerp, rand } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const tMind = P(255).start; // 414.34
const tBuzz = P(256).start; // 417.62
const tUnknown = P(257).start; // 420.10
const tSaw = P(258).start; // 421.78
const tSecond = P(259).start; // 424.02
const tNotOnly = P(260).start; // 425.73
const tRoof = 426.55;

const Bubble: React.FC<{ y: number; k: number; text: string }> = ({ y, k, text }) => (
  <div
    style={{
      position: "absolute",
      left: 760,
      top: y,
      width: 420,
      padding: "18px 22px",
      borderRadius: 22,
      background: "#2A3150",
      color: "#EEF2FF",
      fontFamily: FONT,
      fontWeight: 600,
      fontSize: 26,
      lineHeight: 1.3,
      opacity: clamp(k * 2),
      transform: `translateY(${(1 - ease.outBack(clamp(k))) * 30}px)`,
    }}
  >
    {text}
  </div>
);

export const S33Phone: React.FC<{ T: number }> = ({ T }) => {
  // shot 1: dark living room, Leo on the sofa, the phone buzzes on the side table
  if (T < tUnknown - 0.15) {
    const lights = 0;
    const { light, rim } = roomLight(lights);
    const cam: Cam = { x: 1300 - 960, y: 600 - 540, zoom: lerp(1.25, 1.4, clamp((T - tMind) / 6)) };
    const buzz = T > tBuzz ? Math.max(0, Math.sin((T - tBuzz) * 40)) * (Math.floor((T - tBuzz) * 2.5) % 2 === 0 ? 1 : 0) : 0;
    const glow = step(T, tBuzz, tBuzz + 0.2);
    return (
      <AbsoluteFill>
        <RoomBack cam={cam} t={T} lights={lights} />
        <Sofa cam={cam} lights={lights} />
        <Layer cam={cam} p={1}>
          <circle cx={1300} cy={772 - 160 * 0.82} r={70 + 6 * Math.sin(T * 2)} fill="none" stroke={C.gold} strokeWidth={2} opacity={0.35} />
          <Figure spec={LEO} id="s33leo" x={1300} y={772} scale={0.82} grounded={false} facing={-1} turn={0.5} pose={{ ...POSES.sit, lean: 4, headTilt: -6, shN: 30, elN: 50, shF: 24, elF: 56 }} face={T > tBuzz + 0.3 ? { ...FACES.stare, lookX: 0.6, lookY: 0.4 } : { ...FACES.neutral, eye: "dot", lookX: -0.4, lookY: -0.6, blink: blinkAt(T, [415.6]) }} light={light} rim={rim} />
          {/* side table + phone */}
          <rect x={1700} y={740} width={160} height={14} rx={4} fill="#1A1218" />
          <rect x={1770} y={754} width={16} height={130} fill="#1A1218" />
          <g transform={`translate(${1780 + buzz * 3},${730}) rotate(${buzz * 3})`}>
            <rect x={-40} y={-8} width={80} height={16} rx={5} fill="#0E0C12" />
            <rect x={-36} y={-6} width={72} height={10} rx={3} fill="#9FC8FF" opacity={glow * 0.9} />
          </g>
          <circle cx={1780} cy={720} r={120} fill="#9FC8FF" opacity={glow * 0.12} />
          {buzz > 0 && [0, 1].map((k) => <path key={k} d={`M${1720 - k * 16},${710 - k * 6} q-10,16 0,30 M${1840 + k * 16},${710 - k * 6} q10,16 0,30`} stroke="#9FC8FF" strokeWidth={3} fill="none" opacity={0.7} />)}
        </Layer>
        <RoomForeground cam={cam} lights={lights} />
        <Vignette strength={0.6} />
        <Label x={960} y={96} text="could a mind watch everything at once?" size={22} color={C.label} o={step(T, tMind + 0.2, tMind + 0.6) * (1 - step(T, tBuzz - 0.3, tBuzz))} />
      </AbsoluteFill>
    );
  }
  // shot 2: phone screen
  if (T < tRoof) {
    return (
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #1A2240 0%, #05060C 75%)", transform: `scale(${1 + 0.06 * ease.inOut(clamp((T - tUnknown + 0.15) / (tRoof - tUnknown + 0.15)))})` }}>
        <div style={{ position: "absolute", left: 700, top: 120, width: 520, height: 900, borderRadius: 60, background: "#0B0D16", border: "6px solid #20263A", boxShadow: "0 0 120px rgba(120,160,255,0.25)" }} />
        <div style={{ position: "absolute", left: 730, top: 170, width: 460, textAlign: "center", fontFamily: FONT, fontWeight: 800, fontSize: 30, letterSpacing: "0.16em", color: C.coral }}>UNKNOWN NUMBER</div>
        <div style={{ position: "absolute", left: 930, top: 230, width: 60, height: 60, borderRadius: 30, background: "#2A3150", textAlign: "center", lineHeight: "60px", fontFamily: FONT, fontWeight: 800, fontSize: 30, color: C.label }}>?</div>
        <Bubble y={360} k={(T - tSaw) / 0.4} text="We saw what you did at the concert." />
        <Bubble y={520} k={(T - tNotOnly) / 0.4} text="You're not the only one." />
        <Vignette strength={0.5} />
      </AbsoluteFill>
    );
  }
  // shot 3: night skyline — a distant figure with its own ring
  const k = clamp((T - tRoof) / 1.0);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(#0B1030, #1F2A5C)" }}>
      <svg width={1920} height={1080}>
        {Array.from({ length: 60 }).map((_, i) => (
          <circle key={i} cx={rand(i) * 1920} cy={rand(i * 3) * 500} r={1 + rand(i * 7)} fill="#fff" opacity={0.5} />
        ))}
        {Array.from({ length: 18 }).map((_, i) => {
          const h = 200 + rand(i * 5.3) * 380;
          return <rect key={i} x={i * 110 - 20} y={1080 - h} width={104} height={h} fill={i % 2 ? "#0A0E24" : "#0E1430"} />;
        })}
        <g transform="translate(1320,560) scale(2.2) translate(0,-120)">
          <rect x={-60} y={0} width={120} height={520} fill="#070A1C" />
          <circle cx={0} cy={-52} r={13} fill="#04060F" />
          <path d="M0,-38 L0,0" stroke="#04060F" strokeWidth={8} />
          <circle cx={0} cy={-52} r={30 + k * 16} fill="none" stroke={C.gold} strokeWidth={2.5} opacity={k * (0.6 + 0.4 * Math.sin(T * 5))} />
        </g>
      </svg>
      <Vignette strength={0.6} />
    </AbsoluteFill>
  );
};

export const _b = breathe;
export const _r = ROOM;
