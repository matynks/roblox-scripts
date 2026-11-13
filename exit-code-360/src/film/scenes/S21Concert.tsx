// S21–S23 Concert night (251.61–286.19): Mia in the crowd, 40,000 people, earpiece,
// GATE 4, the light shakes, a bolt snaps, eyes vs brain (navy insert), Mia underneath.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure, Head } from "../../characters/Figure";
import { LEO, MIA } from "../../characters/cast";
import { FACES, blinkAt, breathe } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { CardboardMask } from "../../props/Props";
import { Earpiece } from "../../props/Accessories";
import { CONCERT, CONCERT_LIGHT, ConcertBack, Crowd, ROWS_FRONT, STAGE_RIM, type DangerLight } from "../../env/Concert";
import { Vignette } from "../../env/Atmosphere";
import { NavySpace } from "../../graphics/VisionField";
import { BrainIcon, EyeIcon, IconDefs } from "../../graphics/Icons";
import { Layer, type Cam } from "../../lib/camera";
import { Label, Ping, SenseRing, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, track } from "../../lib/anim";
import { P, talk } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const tEveryone = P(159).start; // 251.61
const tMia = P(160).start; // 253.37
const tLook = P(161).start; // 254.49
const tConcert = P(162).start; // 255.61
const t40k = P(163).start; // 256.73
const tEar = P(164).start; // 258.51
const tGate = P(165).start; // 261.23
const tAway = P(167).start; // 264.19
const tStare = P(169).start; // 266.75
const tGroan = P(170).start; // 268.70
const tShakes = P(172).start; // 271.82
const tBolt = P(173).start; // 273.42
const tEyes = P(174).start; // 274.94
const tBrain = P(175).start; // 276.62
const tQuarter = P(176).start; // 277.66
const tNotice = P(177).start; // 279.31
const tSeeHer = P(178).start; // 280.99
const tMask = P(179).start; // 282.27
const tMiaName = P(180).start; // 285.23
const X_NAVY = tEyes - 0.2;
const X_BACK = tSeeHer - 0.25;

export const dangerAt = (T: number): DangerLight => ({
  shake: bump(T, tShakes - 0.3, tShakes, 400, 401) * (1 - step(T, tBolt, tBolt + 0.1)) + step(T, tBolt, tBolt + 0.1) * 0.25,
  snapped: step(T, tBolt + 0.05, tBolt + 0.3),
  fall: 0,
  crashed: false,
});

/** Mia in the crowd (pink dress, mask), shared with later scenes. */
export const MiaInCrowd: React.FC<{ T: number; mask: number; face: Partial<Face>; pose?: Partial<Pose>; x?: number; y?: number; s?: number; facing?: 1 | -1 }> = ({ T, mask, face, pose, x = CONCERT.miaX, y = CONCERT.miaFeet, s = 0.62, facing = 1 }) => (
  <g>
    <Shadow x={x} y={y} w={22} />
    <Figure spec={MIA} id={`mc${Math.round(x)}`} x={x} y={y} scale={s} facing={facing} turn={0.4} pose={breathe({ ...STAND, shN: 30 + Math.sin(T * 6) * 10, elN: 40, ...pose }, T)} face={face} light={CONCERT_LIGHT} rim={STAGE_RIM} hairSwing={Math.sin(T * 4) * 0.3} headExtra={<CardboardMask r={MIA.D / 2} state={mask} turn={0.4} />} />
  </g>
);

export const crowdSkip = (x: number, row: number) => row === 2 && Math.abs(x - CONCERT.miaX) < 40;

const EyesVsBrain: React.FC<{ T: number }> = ({ T }) => {
  const k = clamp((T - tEyes) / 0.6);
  const bar = clamp((T - tQuarter) / 0.8);
  return (
    <AbsoluteFill style={{ opacity: step(T, X_NAVY, X_NAVY + 0.35) }}>
      <NavySpace drift={T * 6} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <IconDefs />
        <path d="M360,700 L1560,700" stroke={C.grid} strokeWidth={6} strokeLinecap="round" />
        {[0, 0.05, 0.1, 0.15, 0.2, 0.25].map((v) => (
          <g key={v}>
            <path d={`M${360 + v * 4800},690 L${360 + v * 4800},712`} stroke={C.lineBlueDim} strokeWidth={3} />
            <text x={360 + v * 4800} y={750} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={18} fill={C.label}>
              {v.toFixed(2)} s
            </text>
          </g>
        ))}
        <path d={`M360,700 L${360 + bar * 1200},700`} stroke={C.gold} strokeWidth={6} strokeLinecap="round" />
        <g opacity={k}>
          <EyeIcon x={360} y={520} s={1.1} color={C.gold} />
          <circle cx={360} cy={700} r={12} fill={C.gold} />
        </g>
        <g opacity={step(T, tBrain, tBrain + 0.4)}>
          <BrainIcon x={1560} y={510} s={1.05} color={bar > 0.98 ? C.gold : C.lineBlue} />
          <circle cx={1560} cy={700} r={12} fill={bar > 0.98 ? C.gold : C.lineBlueDim} />
        </g>
      </svg>
      <Label x={360} y={790} text="eyes · instantly" size={22} color={C.gold} o={k} />
      <Label x={1560} y={790} text="brain · +0.25 s" size={22} color={C.lineBlue} o={step(T, tQuarter, tQuarter + 0.4)} />
      <Label x={960} y={96} text="noticing takes time" size={26} color={C.gold} o={step(T, tNotice, tNotice + 0.4)} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};

export const S21Concert: React.FC<{ T: number }> = ({ T }) => {
  const danger = dangerAt(T);
  type Shot = { cx: number; cy: number; zoom: number };
  // camera path through the shots (cuts at shot boundaries, moves within shots)
  let sh: Shot;
  if (T < tLook - 0.05) sh = { cx: lerp(900, 1180, clamp((T - tEveryone) / 2)), cy: 820, zoom: 1.65 };
  else if (T < tConcert - 0.05) sh = { cx: 2210, cy: 660, zoom: 1.7 };
  else if (T < tEar - 0.1) sh = { cx: 900, cy: 520, zoom: lerp(0.6, 0.64, clamp((T - tConcert) / 3)) };
  else if (T < tGate - 0.1) sh = { cx: 2300, cy: 600, zoom: 1.4 };
  else if (T < tAway - 0.1) sh = { cx: lerp(2350, 2420, clamp((T - tGate) / 3)), cy: 600, zoom: lerp(1.1, 1.25, clamp((T - tGate) / 3)) };
  else if (T < tGroan) sh = { cx: 2270, cy: 640, zoom: lerp(1.9, 2.1, clamp((T - tAway) / 4)) };
  else if (T < tBolt - 0.2) {
    const k = ease.inOut(clamp((T - tGroan) / 2.0));
    sh = { cx: lerp(2270, 1260, k), cy: lerp(640, 300, k), zoom: lerp(2.0, 1.6, k) };
  } else sh = { cx: 1210, cy: 230, zoom: 2.6 };
  if (T >= X_BACK) {
    const k = ease.inOut(clamp((T - tMask) / 1.6));
    sh = { cx: 1200, cy: lerp(560, 820, k), zoom: lerp(1.15, 1.9, k) };
  }
  const cam: Cam = { x: sh.cx - 960, y: sh.cy - 540, zoom: sh.zoom };
  const earTalk = talk(T, tGate - 0.05, tAway + 2.2);
  const lookBack = bump(T, tLook - 0.1, tLook + 0.2, tConcert - 0.3, tConcert);
  const leoPose: Pose = breathe({ ...STAND, shN: 6, elN: 10, headTilt: -lookBack * 6 }, T);
  let leoFace: Partial<Face> = { ...FACES.determined, lookX: 0.7, blink: blinkAt(T, [259.6, 263.3, 267.1]) };
  if (lookBack > 0.3) leoFace = { ...FACES.content, lookX: -1, curve: 0.45 };
  if (T > tGroan && T < tSeeHer) leoFace = { ...FACES.stare, lookX: 0.7 };
  const miaMask = 1 - step(T, tSeeHer - 2, tSeeHer - 1.5); // mask goes on before she is found again
  const miaFace: Partial<Face> = T < tLook ? { ...FACES.happy, lookX: 0.8, browShow: 1, brow: 0.4 } : FACES.content;
  const showBack = T < X_NAVY + 0.4 || T >= X_BACK;
  const showLeoCU = T >= tMiaName - 0.05;
  const earCU = T >= tEar - 0.1 && T < tGate - 0.1;
  return (
    <AbsoluteFill>
      {showBack && !earCU && !showLeoCU && (
        <>
          <ConcertBack cam={cam} t={T} danger={danger} />
          <Crowd cam={cam} t={T} skip={crowdSkip} />
          <Layer cam={cam} p={1}>
            <MiaInCrowd T={T} mask={miaMask} face={miaFace} pose={T < tLook ? { shN: 150 + Math.sin(T * 9) * 12, elN: 20 } : {}} />
            <Ping T={T} at={tMia + 0.05} x={CONCERT.miaX} y={CONCERT.miaHead} r={56} label="MIA?" hold={1.0} />
            {T >= X_BACK && <path d={`M${CONCERT.dangerX + 30},${CONCERT.trussY + 90} L${CONCERT.miaX},${CONCERT.miaHead - 70}`} stroke={C.coral} strokeWidth={3} strokeDasharray="10 10" opacity={step(T, tMask, tMask + 0.4)} />}
            {T >= X_BACK && <Ping T={T} at={tSeeHer + 0.1} x={CONCERT.miaX} y={CONCERT.miaHead} r={64} hold={4.5} color={C.coral} />}
            <Figure spec={LEO} id="s21leo" x={CONCERT.leoX} y={CONCERT.post} scale={0.8} turn={lookBack > 0.3 ? 0.7 : 1} pose={leoPose} face={leoFace} light={{ x: 0.6, y: -0.8 }} rim={C.gold} headExtra={<Earpiece r={LEO.D / 2} />} />
            <SenseRing T={T} at={tLook - 0.05} x={CONCERT.leoX} y={CONCERT.post - 326 * 0.8} r={LEO.D * 0.8 * 0.62} />
            <SenseRing T={T} at={tGroan + 0.1} x={CONCERT.leoX} y={CONCERT.post - 326 * 0.8} r={LEO.D * 0.8 * 0.62} color={C.coral} />
            {/* the bolt that snaps */}
            {T > tBolt && T < tBolt + 1.2 && (
              <g transform={`translate(${CONCERT.dangerX - 20 + (T - tBolt) * 260},${CONCERT.trussY + 20 + 900 * (T - tBolt) ** 2}) rotate(${(T - tBolt) * 900})`}>
                <rect x={-5} y={-12} width={10} height={24} rx={2} fill="#8A86A0" />
              </g>
            )}
            {T > tBolt && T < tBolt + 0.35 && <circle cx={CONCERT.dangerX - 20} cy={CONCERT.trussY + 20} r={20 + (T - tBolt) * 120} fill="#FFE2A0" opacity={0.6 - (T - tBolt) * 1.6} />}
          </Layer>
          <Crowd cam={cam} t={T} rows={ROWS_FRONT} />
          <Crowd cam={cam} t={T} p={1.3} blur={6} rows={[{ y: 1150, dx: 120, r: 30, tone: "#0B0912" }]} x0={-800} x1={2000} />
        </>
      )}
      {earCU && (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 40% 50%, #2A2050 0%, #0A0814 75%)" }}>
          <svg width={1920} height={1080}>
            <Head spec={LEO} id="s21ear" x={760} y={600} size={460} face={{ ...FACES.neutral, eye: "dot", lookX: 0.6 }} turn={0.85} light={{ x: -0.5, y: -0.8 }} rim={STAGE_RIM} extra={<Earpiece r={LEO.D / 2} />} />
            {/* radio waveform */}
            <g transform="translate(1300,540)">
              <rect x={-220} y={-110} width={440} height={220} rx={24} fill="rgba(12,18,38,0.85)" stroke={C.lineBlue} strokeOpacity={0.4} strokeWidth={2} />
              {Array.from({ length: 28 }).map((_, i) => {
                const a = talk(T, tEar - 0.05, tGate + 3) * (0.4 + 0.6 * Math.abs(Math.sin(T * 30 + i * 1.7))) + 0.06 * Math.abs(Math.sin(T * 50 + i));
                return <rect key={i} x={-180 + i * 13} y={-a * 70} width={7} height={Math.max(4, a * 140)} rx={3} fill={C.lineBlue} />;
              })}
              <text x={0} y={92} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={18} letterSpacing="4" fill={C.label}>
                MR. BLACK · EARPIECE
              </text>
            </g>
          </svg>
          <Vignette strength={0.5} />
        </AbsoluteFill>
      )}
      {T >= X_NAVY && T < X_BACK + 0.4 && (
        <AbsoluteFill style={{ opacity: T >= X_BACK ? 1 - step(T, X_BACK, X_BACK + 0.4) : 1 }}>
          <EyesVsBrain T={T} />
        </AbsoluteFill>
      )}
      {showLeoCU && (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #3A2050 0%, #0A0814 75%)" }}>
          <svg width={1920} height={1080}>
            <Head spec={LEO} id="s21cu" x={960} y={600} size={420} face={{ ...FACES.shocked, eye: "wide", lookX: -0.7, lookY: -0.3 }} turn={0.4} facing={-1} light={{ x: 0.6, y: -0.8 }} rim={C.coral} extra={<Earpiece r={LEO.D / 2} />} />
          </svg>
          <Vignette strength={0.55} />
        </AbsoluteFill>
      )}
      <Vignette strength={0.5} />
      <Label x={960} y={96} text="40,000 people" size={26} color={C.gold} o={bump(T, t40k, t40k + 0.3, tEar - 0.3, tEar - 0.1)} />
      <Label x={960} y={96} text="gate 4 · only gate 4" size={24} color={C.gold} o={bump(T, tGate + 0.1, tGate + 0.4, tAway - 0.2, tAway)} />
      <Label x={960} y={96} text="look away = deal over" size={24} color={C.coral} o={bump(T, tAway + 0.1, tAway + 0.4, tGroan - 0.3, tGroan)} />
      <Label x={960} y={96} text="right underneath" size={24} color={C.coral} o={bump(T, tMask + 0.3, tMask + 0.6, tMiaName - 0.2, tMiaName)} />
    </AbsoluteFill>
  );
};
