// S25–S28 (302.28–352.37): the choice, the scream, the rescue, the crash,
// "You're fired", six loose bolts, the show stops, applause, "I always look at you".
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure, Head } from "../../characters/Figure";
import { EXTRA, LEO, MIA, MR_BLACK } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { CardboardMask } from "../../props/Props";
import { Earpiece, HardHat } from "../../props/Accessories";
import { CONCERT, CONCERT_LIGHT, ConcertBack, Crowd, FallingLight, ROWS_FRONT, STAGE_RIM } from "../../env/Concert";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, Ping, Shadow, Stamp, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, track } from "../../lib/anim";
import { P, talk } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";
import { MiaInCrowd, crowdSkip } from "./S21Concert";

const tSeeAll = P(190).start; // 302.28
const tOr = P(192).start; // 305.48
const tLookMia = P(193).start; // 307.64
const tScream = P(194).start; // 308.76
const tUp = P(196).start; // 311.24
const tHeads = P(197).start; // 312.12
const tLooksUp = P(198).start; // 314.01
const tFreeze = P(199).start; // 315.05
const tYank = P(200).start; // 316.01
const tCrash = P(201).start; // 317.93
const tSilence = P(202).start; // 320.25
const tSnarl = P(203).start; // 321.45
const tFired = P(204).start; // 324.09
const tMoney = P(205).start; // 325.37
const tEasy = P(207).start; // 327.53
const tPoint = P(209).start; // 330.09
const tBolts = P(210).start; // 331.13
const tEng = P(213).start; // 335.45
const tLoose = P(214).start; // 337.25
const tStops = P(215).start; // 339.33
const tNobody = P(216).start; // 340.69
const tClaps = P(217).start; // 342.37
const tKid = P(218).start; // 344.13
const tClings = P(219).start; // 346.77
const tHow = P(220).start; // 348.77
const tAlways = P(221).start; // 350.05
const FALL_T0 = tCrash + 0.05;
const FALL_DUR = 0.55;
const CRASH = FALL_T0 + FALL_DUR;
const BOLTS = [880, 1020, 1380, 1520, 1700, 1880];

const danger = (T: number) => ({ shake: T < FALL_T0 ? 0.35 : 0, snapped: 1, fall: clamp((T - FALL_T0) / FALL_DUR), crashed: T > CRASH });

const ConcertShot: React.FC<{ T: number; cam: Cam; children?: React.ReactNode; turn?: number; clap?: number; lightsOn?: number; house?: number; miaX?: number; miaFace?: Partial<Face>; miaPose?: Partial<Pose>; showMia?: boolean; front?: React.ReactNode }> = ({
  T,
  cam,
  children,
  turn = 0,
  clap = 0,
  lightsOn = 1,
  house = 0,
  miaX = CONCERT.miaX,
  miaFace = FACES.content,
  miaPose,
  showMia = true,
  front,
}) => (
  <>
    <ConcertBack cam={cam} t={T} danger={danger(T)} lightsOn={lightsOn} house={house} />
    <Crowd cam={cam} t={T} skip={crowdSkip} turn={turn} clap={clap} />
    <Layer cam={cam} p={1}>
      {showMia && <MiaInCrowd T={T} mask={T > tLooksUp - 0.3 ? 1 : 0} face={miaFace} pose={miaPose} x={miaX} />}
      {children}
      <FallingLight fall={danger(T).fall} t={T} tCrash={CRASH} />
    </Layer>
    <Crowd cam={cam} t={T} rows={ROWS_FRONT} turn={turn} clap={clap} skip={(x) => Math.abs(x - miaX) < 50 && T < CRASH + 3} />
    {front}
  </>
);

export const S25Climax: React.FC<{ T: number }> = ({ T }) => {
  // ------------------------------------------------ the choice (302.28–307.6)
  if (T < tLookMia - 0.1) {
    const split = step(T, tOr - 0.3, tOr);
    // each half centres its subject: gate sign at screen x≈480, Mia at x≈1440
    const camL: Cam = { x: 2340, y: 470 - 540, zoom: 1.0 };
    const camR: Cam = { x: -240, y: 620 - 540, zoom: 1.0 };
    const eyes = Math.sin((T - tOr) * 5) > 0 ? -1 : 1;
    return (
      <AbsoluteFill>
        {split < 1 && (
          <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #2A2050 0%, #0A0814 75%)", opacity: 1 - split }}>
            <svg width={1920} height={1080}>
              <circle cx={960} cy={560} r={300} fill="none" stroke={C.gold} strokeWidth={3} opacity={0.8} />
              <Head spec={LEO} id="s25cu" x={960} y={580} size={380} face={{ ...FACES.worried, lookX: Math.sin(T * 3) * 0.9 }} turn={0} light={{ x: 0, y: -1 }} rim={STAGE_RIM} extra={<Earpiece r={LEO.D / 2} turn={0} />} />
            </svg>
            <Label x={960} y={96} text="see everything · look at one thing" size={22} color={C.gold} o={step(T, tSeeAll, tSeeAll + 0.4)} />
          </AbsoluteFill>
        )}
        {split > 0 && (
          <AbsoluteFill style={{ opacity: split }}>
            <AbsoluteFill style={{ clipPath: "inset(0 50% 0 0)" }}>
              <ConcertShot T={T} cam={camL} showMia={false} />
            </AbsoluteFill>
            <AbsoluteFill style={{ clipPath: "inset(0 0 0 50%)" }}>
              <ConcertShot T={T} cam={camR} miaFace={{ ...FACES.content, lookX: 0.3 }} />
            </AbsoluteFill>
            <div style={{ position: "absolute", left: 958, top: 0, width: 4, height: 1080, background: C.gold }} />
            <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
              <circle cx={960} cy={880} r={96} fill="#0A0814" stroke={C.gold} strokeWidth={3} />
              <Head spec={LEO} id="s25mini" x={960} y={890} size={150} face={{ ...FACES.worried, lookX: eyes }} turn={0} light={{ x: 0, y: -1 }} shoulders={false} />
            </svg>
            <Label x={480} y={96} text="gate 4" size={30} color={C.gold} />
            <Label x={1440} y={96} text="mia" size={30} color={C.miaPinkLight} />
          </AbsoluteFill>
        )}
        <Vignette strength={0.5} />
      </AbsoluteFill>
    );
  }
  // ------------------------------------------------ the scream + heads turn (307.6–314.0)
  if (T < tLooksUp - 0.05) {
    const screaming = T > tScream - 0.1;
    const cam: Cam = T < tHeads - 0.1 ? { x: CONCERT.leoX - 300 - 960, y: 620 - 540, zoom: lerp(1.6, 1.75, clamp((T - tLookMia) / 4)) } : { x: 1300 - 960, y: 640 - 540, zoom: 0.95 };
    const sTalk = talk(T, tScream - 0.05, tHeads);
    const leoPose: Pose = blendPose(breathe({ ...STAND }, T), { shN: 150, elN: 70, shF: 150, elF: 70, lean: -6, headTilt: -8 }, step(T, tScream, tScream + 0.3));
    const leoFace: Partial<Face> = screaming ? { ...FACES.shocked, eye: "dot", mouth: "o", open: 0.6 + sTalk * 0.4, brow: 1, browY: 0.5 } : { ...FACES.worried, lookX: -1 };
    const turn = clamp((T - tHeads) / 1.2);
    return (
      <AbsoluteFill>
        <ConcertShot T={T} cam={cam} turn={turn}>
          <Figure spec={LEO} id="s25leo" x={CONCERT.leoX} y={CONCERT.post} scale={0.8} facing={-1} turn={lerp(1, 0.6, step(T, tLookMia, tLookMia + 0.4))} pose={leoPose} face={leoFace} light={{ x: -0.6, y: -0.8 }} rim={C.gold} headExtra={<Earpiece r={LEO.D / 2} turn={0.6} />} />
          {screaming &&
            [0, 1, 2, 3].map((k) => {
              const q = ((T - tScream) * 1.4 + k / 4) % 1;
              return <path key={k} d={`M${CONCERT.leoX - 60 - q * 400},${CONCERT.post - 360 - q * 80} q-40,${100 + q * 60} 0,${200 + q * 120}`} stroke={C.gold} strokeWidth={4} fill="none" opacity={(1 - q) * 0.8} strokeLinecap="round" />;
            })}
        </ConcertShot>
        <Vignette strength={0.5} />
        <Label x={960} y={96} text="mia — up!" size={30} color={C.gold} o={bump(T, tUp - 0.1, tUp + 0.1, tHeads - 0.2, tHeads)} />
        <Label x={960} y={96} text="40,000 heads turn" size={26} color={C.gold} o={step(T, tHeads + 0.2, tHeads + 0.5)} />
      </AbsoluteFill>
    );
  }
  // ------------------------------------------------ the rescue + crash + silence (314.0–321.4)
  if (T < tSnarl - 0.1) {
    const frozen = bump(T, tFreeze, tFreeze + 0.1, tYank, tYank + 0.1);
    const yank = ease.out(clamp((T - tYank - 0.2) / 0.5));
    const miaX = CONCERT.miaX - yank * 150;
    const shakeK = T > CRASH ? Math.exp(-(T - CRASH) * 5) : 0;
    // close two-shot on Mia + stranger (look up, freeze) → pull back as she is yanked so the
    // falling light enters from the top → slow push after the crash. Feet (y 1050) stay above the letterbox.
    const keys = { a: 314.0, b: tYank + 0.15, c: tCrash - 0.1, d: CRASH + 3 };
    const zoom = track(T, [[keys.a, 1.9], [keys.b, 2.05], [keys.c, 1.1], [CRASH + 0.25, 1.1], [keys.d, 1.6]]);
    const cyy = track(T, [[keys.a, 905], [keys.b, 905], [keys.c, 645], [CRASH + 0.25, 645], [keys.d, 772]]);
    const cxx = track(T, [[keys.a, 1130], [keys.b, 1110], [keys.c, 1150], [CRASH + 0.25, 1150], [keys.d, 1140]]);
    const cam: Cam = { x: cxx - 960 + Math.sin(T * 60) * 12 * shakeK, y: cyy - 540 + Math.cos(T * 53) * 10 * shakeK, zoom };
    const miaFace: Partial<Face> = T < tYank + 0.2 ? { ...FACES.shocked, eye: "wide", lookY: -1 } : { ...FACES.shocked, eye: "dot", lookX: 0.6 };
    const silence = step(T, tSilence - 0.1, tSilence + 0.3);
    const flash = T > CRASH ? Math.exp(-(T - CRASH) * 7) : 0;
    return (
      <AbsoluteFill style={{ filter: silence > 0 ? `saturate(${1 - silence * 0.7})` : undefined }}>
        <ConcertShot T={T} cam={cam} turn={1} miaX={miaX} miaFace={miaFace} miaPose={frozen > 0.5 ? { shN: 10, elN: 10 } : { shN: -30, elN: 10 }}>
          {/* the stranger who yanks her back */}
          <Figure spec={EXTRA} id="s26str" x={CONCERT.miaX - 140 - yank * 60} y={CONCERT.miaFeet} scale={0.8} facing={1} turn={0.7} pose={blendPose(breathe(STAND, T), { shN: 80, elN: 10, lean: -10 }, step(T, tYank, tYank + 0.2) * (1 - yank * 0.5))} face={T > tYank ? FACES.determined : FACES.shocked} light={CONCERT_LIGHT} rim={STAGE_RIM} />
        </ConcertShot>
        <AbsoluteFill style={{ background: "#FFF4E8", opacity: flash * 0.6 }} />
        <Vignette strength={0.5 + silence * 0.2} />
        <Label x={960} y={96} text="silence" size={26} color={C.label} o={step(T, tSilence, tSilence + 0.3)} />
      </AbsoluteFill>
    );
  }
  // ------------------------------------------------ fired + the bolts + applause (321.4–346.7)
  if (T < tClings - 0.15) {
    const house = step(T, tStops, tStops + 1.0);
    const lightsOn = 1 - step(T, tStops, tStops + 0.6) * 0.85;
    const clap = step(T, tClaps - 0.1, tClaps + 0.4);
    // shots: earpiece CU (snarl/fired/money) → Leo points → rig with bolts → engineers → wide applause
    if (T < tEasy - 0.1) {
      const bTalk = talk(T, tSnarl, tMoney + 2);
      const money = Math.round(10000 * (1 - ease.inOut(clamp((T - tMoney - 0.4) / 0.8))));
      return (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 40% 50%, #2A2050 0%, #0A0814 75%)" }}>
          <svg width={1920} height={1080}>
            <Head spec={LEO} id="s27leo" x={700} y={600} size={420} face={{ ...FACES.sad, eye: "lid", lookX: 0.7, curve: -0.2 }} turn={0.4} light={{ x: 0.5, y: -0.8 }} rim={STAGE_RIM} extra={<Earpiece r={LEO.D / 2} turn={0.4} />} />
            <circle cx={1380} cy={430} r={170} fill="#121020" stroke={C.coral} strokeWidth={4} />
            <clipPath id="s27clip">
              <circle cx={1380} cy={430} r={168} />
            </clipPath>
            <g clipPath="url(#s27clip)">
              <Head spec={MR_BLACK} id="s27black" x={1380} y={470} size={230} face={{ ...FACES.angry, mouth: bTalk > 0 ? "grin" : "smile", open: bTalk, curve: -0.3 }} turn={0.2} facing={-1} light={{ x: -0.5, y: -0.8 }} rim={C.coral} />
            </g>
            <Stamp x={1380} y={700} text="FIRED" k={(T - tFired) / 0.3} size={56} />
            {T > tMoney && (
              <g>
                <text x={1380} y={870} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={72} fill={money > 0 ? C.gold : C.coral} style={{ fontVariantNumeric: "tabular-nums" }}>
                  €{money.toLocaleString("en-US")}
                </text>
                {money === 0 && <path d="M1230,850 L1530,850" stroke={C.coral} strokeWidth={6} />}
              </g>
            )}
          </svg>
          <Vignette strength={0.5} />
        </AbsoluteFill>
      );
    }
    let cam: Cam;
    if (T < tBolts - 0.1) cam = { x: CONCERT.leoX - 250 - 960, y: 600 - 540, zoom: 1.7 };
    else if (T < tEng - 0.1) cam = { x: lerp(900, 1800, clamp((T - tBolts) / 3.6)) - 960, y: 260 - 540, zoom: 1.9 };
    else if (T < tStops - 0.1) cam = { x: 1450 - 960, y: 420 - 540, zoom: 1.1 };
    else {
      // wide on the applause, then push in on Leo for "for the kid with eyes in the back of his head"
      const pk = ease.inOut(clamp((T - tKid) / 2.4));
      const wx = lerp(1200, 1500, clamp((T - tStops) / 7));
      const wz = lerp(0.72, 0.8, clamp((T - tStops) / 7));
      cam = { x: lerp(wx, 2120, pk) - 960, y: lerp(560, 700, pk) - 540, zoom: lerp(wz, 1.55, pk) };
    }
    const pointUp = step(T, tPoint - 0.1, tPoint + 0.3);
    const leoPose: Pose = blendPose(breathe(STAND, T), { shN: 155, elN: 6, lean: -4 }, pointUp * (1 - step(T, tStops, tStops + 0.5)));
    const leoFace: Partial<Face> = T > tClaps ? { ...FACES.happy, eye: "dot", curve: 0.45, browShow: 1, brow: 0.5, browY: 0.3 } : T > tPoint ? { ...FACES.determined, lookY: -0.8, lookX: -0.5 } : { ...FACES.sad, eye: "lid", lookY: -0.3, lookX: -0.6 };
    const climb = (k: number) => clamp((T - tEng - k * 0.3) / 3.0);
    return (
      <AbsoluteFill>
        <ConcertShot T={T} cam={cam} turn={0.6} clap={clap} lightsOn={lightsOn} house={house} miaX={CONCERT.miaX - 150} miaFace={T > tClaps ? FACES.laugh : FACES.worried}>
          <Figure spec={EXTRA} id="s27str" x={CONCERT.miaX - 350} y={CONCERT.miaFeet} scale={0.8} facing={1} turn={0.7} pose={breathe(STAND, T)} face={FACES.content} light={CONCERT_LIGHT} rim={STAGE_RIM} />
          {BOLTS.map((x, i) => (
            <Ping key={x} T={T} at={tBolts + 0.2 + i * 0.55} x={x} y={CONCERT.trussY + 20} r={30} hold={T < tStops ? 12 : 0.1} label={i === 5 ? "6 LOOSE" : undefined} />
          ))}
          {/* engineers climbing the truss towers */}
          {[640, 2000].map((tx, k) => {
            const c = climb(k);
            if (T < tEng - 0.2) return null;
            const y = lerp(880, 300, c);
            const arm = Math.sin(T * 8 + k) * 30;
            return (
              <Figure key={tx} spec={EXTRA} id={`s27eng${k}`} x={tx + 18} y={y} scale={0.62} grounded={false} facing={k ? -1 : 1} turn={0.3} pose={{ ...STAND, shN: 150 + arm, elN: 10, shF: 150 - arm, elF: 10, hipN: 30 + arm * 0.5, knN: 60, hipF: 20 - arm * 0.5, knF: 50 }} face={FACES.determined} light={CONCERT_LIGHT} rim={STAGE_RIM} headExtra={<HardHat r={EXTRA.D / 2} />} />
            );
          })}
          {T > tLoose &&
            BOLTS.map((x, i) => (
              <text key={x} x={x} y={CONCERT.trussY - 30} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill={C.coral} opacity={step(T, tLoose + i * 0.15, tLoose + i * 0.15 + 0.2) * (1 - house)}>
                !
              </text>
            ))}
          <Figure spec={LEO} id="s27leoF" x={CONCERT.leoX} y={CONCERT.post} scale={0.8} facing={-1} turn={0.65} pose={leoPose} face={leoFace} light={{ x: -0.6, y: -0.8 }} rim={C.gold} headExtra={<Earpiece r={LEO.D / 2} turn={0.65} />} />
          {T > tKid && <circle cx={CONCERT.leoX} cy={CONCERT.post - 326 * 0.8} r={60 + 8 * Math.sin(T * 3)} fill="none" stroke={C.gold} strokeWidth={3} opacity={step(T, tKid, tKid + 0.4)} />}
        </ConcertShot>
        <Vignette strength={0.5} />
        <Label x={960} y={96} text="bolt after bolt" size={24} color={C.gold} o={bump(T, tBolts + 0.2, tBolts + 0.5, tEng - 0.3, tEng)} />
        <Label x={960} y={96} text="every one is loose" size={24} color={C.coral} o={bump(T, tLoose, tLoose + 0.3, tStops - 0.2, tStops)} />
        <Label x={960} y={96} text="show stopped · nobody else hurt" size={24} color={C.number} o={bump(T, tNobody - 0.3, tNobody, tClaps - 0.2, tClaps)} />
        <Label x={960} y={96} text="the kid with eyes in the back of his head" size={22} color={C.gold} o={step(T, tKid, tKid + 0.4)} />
      </AbsoluteFill>
    );
  }
  // ------------------------------------------------ "I always look at you" (346.8–352.4)
  const cam: Cam = { x: CONCERT.leoX - 140 - 960, y: 640 - 540, zoom: lerp(1.9, 2.05, clamp((T - tClings) / 5)) };
  const mTalk = talk(T, tHow - 0.05, tHow + 0.8);
  const lTalk = talk(T, tAlways - 0.05, tAlways + 1.0);
  const miaPose: Pose = { ...STAND, shN: 60, elN: 70, shF: 50, elF: 70, lean: 8, headTilt: mTalk > 0 || T > tHow ? -14 : 8 };
  const leoPose: Pose = { ...STAND, shN: 40, elN: 70, shF: -6, elF: 10, headTilt: 10, lean: 3 };
  return (
    <AbsoluteFill>
      <ConcertShot T={T} cam={cam} turn={0.4} clap={0.4} lightsOn={0.15} house={1} showMia={false}>
        <Figure spec={LEO} id="s28leo" x={CONCERT.leoX} y={CONCERT.post} scale={0.8} facing={-1} turn={0.6} pose={leoPose} face={lTalk > 0 ? { ...FACES.content, mouth: "talk", open: lTalk, lookX: -0.6, lookY: 0.6 } : { ...FACES.content, curve: 0.5, lookX: -0.6, lookY: 0.6, blink: blinkAt(T, [348.0]) }} light={{ x: -0.6, y: -0.8 }} rim={C.rimWarm} headExtra={<Earpiece r={LEO.D / 2} turn={0.6} />} />
        <Figure spec={MIA} id="s28mia" x={CONCERT.leoX - 70} y={CONCERT.post} scale={0.62} facing={1} turn={0.6} pose={miaPose} face={mTalk > 0 ? { ...FACES.cry, tears: 0.6, mouth: "talk", open: mTalk, lookY: -0.8 } : { ...FACES.cry, tears: 0.6, eye: T > tAlways + 0.8 ? "happy" : "closed", mouth: T > tAlways + 0.8 ? "smile" : "o", curve: 0.5 }} light={{ x: -0.6, y: -0.8 }} rim={C.rimWarm} hairSwing={0.1} headExtra={<CardboardMask r={MIA.D / 2} state={1} turn={0.6} />} />
      </ConcertShot>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

export const _p = POSES;
export const _s = Shadow;
export const _t = track;
