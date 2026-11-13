// S19–S20 Mia's notebook + concert ticket (212.77–251.61), lamp-lit living room at night.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure, Head } from "../../characters/Figure";
import { LEO, MIA } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe, walk } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { CardboardMask } from "../../props/Props";
import { ROOM, RoomBack, RoomForeground, Sofa, roomLight } from "../../env/LivingRoom";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, SenseRing, Shadow, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, track } from "../../lib/anim";
import { P, talk } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const tNotices = P(131).start; // 212.77
const tBook = P(134).start; // 217.79
const tScares = P(135).start; // 219.55
const tTries = P(137).start; // 221.95
const tHolds = P(139).start; // 225.25
const tOnce = P(141).start; // 227.41
const tRuin = P(143).start; // 230.53
const tLaugh = P(146).start; // 234.29
const tHears = P(149).start; // 237.88
const tOkay = P(150).start; // 239.48
const tTired = P(151).start; // 240.84
const tGrins = P(152).start; // 242.60
const tConcert = P(153).start; // 244.12
const tMask = P(155).start; // 246.68
const tWatch = P(156).start; // 247.85
const tWait = P(157).start; // 249.69
const END = 251.61;

const LEO_X = 1290;
const SEAT_Y = 772;
const MIA_STOP = 1010;

const Notebook: React.FC<{ open?: boolean; s?: number }> = ({ s = 1 }) => (
  <g transform={`scale(${s})`}>
    <rect x={-6} y={-30} width={46} height={58} rx={4} fill="#F27BAA" />
    <rect x={-2} y={-26} width={38} height={50} rx={3} fill="#F7B5D6" opacity={0.6} />
    <path d="M6,-14 L28,-14 M6,-4 L24,-4" stroke="#8A3A5E" strokeWidth={2} />
  </g>
);
const Ticket: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`scale(${s}) rotate(-12)`}>
    <rect x={-4} y={-22} width={64} height={34} rx={5} fill={C.gold} />
    <path d="M40,-22 L40,12" stroke="#8A6A2A" strokeWidth={2} strokeDasharray="3 3" />
  </g>
);

/** Full-frame insert: the notebook page. */
const NotebookInsert: React.FC<{ T: number }> = ({ T }) => {
  const scares = step(T, tScares - 0.1, tScares + 0.3);
  const tries = clamp((T - tTries) / 2.4);
  const n = Math.round(412 * ease.out(tries));
  const tallies = Math.min(14, Math.floor(n / 30));
  return (
    <AbsoluteFill style={{ background: "#120C14" }}>
      <svg width={1920} height={1080}>
        <g transform={`translate(960 560) rotate(${-3 + Math.sin(T * 0.6) * 0.6}) scale(${1 + (T - tScares) * 0.01})`}>
          <rect x={-560} y={-380} width={1120} height={760} rx={16} fill="#F27BAA" />
          <rect x={-540} y={-360} width={1080} height={720} rx={10} fill="#F4EEE4" />
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} d={`M-500,${-280 + i * 48} L500,${-280 + i * 48}`} stroke="#A9BBD6" strokeWidth={2} opacity={0.6} />
          ))}
          <path d="M-420,-360 L-420,360" stroke="#E08A9A" strokeWidth={3} opacity={0.6} />
          <text x={-360} y={-150} fontFamily={FONT} fontWeight={800} fontSize={86} fill="#3A3550" letterSpacing="4" opacity={scares}>
            SCARES:
          </text>
          <text x={150} y={-150} fontFamily={FONT} fontWeight={800} fontSize={110} fill="#C23A48" opacity={scares}>
            0
          </text>
          <text x={-360} y={90} fontFamily={FONT} fontWeight={800} fontSize={86} fill="#3A3550" letterSpacing="4" opacity={step(T, tTries - 0.1, tTries + 0.2)}>
            TRIES:
          </text>
          <text x={120} y={92} fontFamily={FONT} fontWeight={800} fontSize={110} fill="#3A3550" opacity={step(T, tTries - 0.1, tTries + 0.2)} style={{ fontVariantNumeric: "tabular-nums" }}>
            {n}
          </text>
          {Array.from({ length: tallies }).map((_, g) => (
            <g key={g} transform={`translate(${-360 + (g % 7) * 120},${170 + Math.floor(g / 7) * 80})`}>
              {[0, 1, 2, 3].map((k) => (
                <path key={k} d={`M${k * 16},0 L${k * 16 + 2},52`} stroke="#3A3550" strokeWidth={5} strokeLinecap="round" />
              ))}
              <path d="M-8,40 L64,8" stroke="#3A3550" strokeWidth={5} strokeLinecap="round" />
            </g>
          ))}
        </g>
        {/* Mia's hand holding the edge */}
        <rect x={150} y={720} width={130} height={110} rx={50} fill={C.ink} transform="rotate(-20 215 775)" />
      </svg>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

const TicketInsert: React.FC<{ T: number }> = ({ T }) => {
  const k = ease.outBack(clamp((T - tConcert - 0.2) / 0.6));
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #3A2433 0%, #120C14 75%)" }}>
      <svg width={1920} height={1080}>
        <g transform={`translate(960 560) rotate(${-6 + (1 - k) * 10}) scale(${0.8 + 0.2 * k})`} opacity={clamp(k * 2)}>
          <rect x={-520} y={-200} width={1040} height={400} rx={28} fill="#2A1C3A" stroke={C.gold} strokeWidth={6} />
          <rect x={-500} y={-180} width={700} height={360} rx={20} fill="url(#tkGrad)" />
          <defs>
            <linearGradient id="tkGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#5A2E6A" />
              <stop offset="1" stopColor="#C2507A" />
            </linearGradient>
          </defs>
          <text x={-460} y={-90} fontFamily={FONT} fontWeight={700} fontSize={28} letterSpacing="8" fill="#F7D9E6">LIVE · STADIUM</text>
          <text x={-460} y={10} fontFamily={FONT} fontWeight={800} fontSize={88} fill="#FFF4E8" letterSpacing="2">CONCERT</text>
          <text x={-460} y={100} fontFamily={FONT} fontWeight={700} fontSize={32} letterSpacing="6" fill={C.gold}>TOMORROW · 20:00</text>
          <path d="M220,-200 L220,200" stroke={C.gold} strokeWidth={4} strokeDasharray="14 12" />
          <text x={370} y={-40} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={26} letterSpacing="6" fill={C.label}>GATE</text>
          <text x={370} y={70} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={120} fill={C.gold}>4</text>
          <text x={370} y={150} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing="5" fill={C.label}>ADMIT ONE</text>
        </g>
      </svg>
      <Vignette strength={0.55} />
    </AbsoluteFill>
  );
};

export const S19Notebook: React.FC<{ T: number }> = ({ T }) => {
  const lights = 1;
  const { light, rim } = roomLight(lights);
  // Mia enters from the door and walks to Leo
  const mx = track(T, [[tNotices + 0.6, ROOM.doorX + 100], [tBook - 0.3, MIA_STOP]], ease.linear);
  const mWalking = T > tNotices + 0.6 && T < tBook - 0.3;
  let miaPose: Pose = mWalking ? walk((mx - ROOM.doorX) / (180 * 0.8), 1) : breathe({ ...STAND }, T);
  miaPose = blendPose(miaPose, { shN: 60, elN: 50 }, step(T, tBook - 0.2, tBook + 0.3)); // shows the notebook
  miaPose = blendPose(miaPose, { shN: 130, elN: 20, shF: 120, elF: 24, headTilt: -6 }, bump(T, tHolds - 0.1, tHolds + 0.3, tOnce + 0.2, tOnce + 0.5));
  miaPose = blendPose(miaPose, { shN: 44, elN: 110, shF: 40, elF: 110, headTilt: 8 }, bump(T, tOnce + 0.2, tOnce + 0.5, tRuin - 0.3, tRuin));
  miaPose = blendPose(miaPose, { shN: 100, elN: 30 }, bump(T, tConcert, tConcert + 0.3, tMask - 0.2, tMask)); // shows ticket
  miaPose = blendPose(miaPose, { shN: 160, elN: 70, shF: 150, elF: 70 }, bump(T, tMask - 0.1, tMask + 0.2, tMask + 0.6, tMask + 0.8)); // mask on
  miaPose = blendPose(miaPose, { ...POSES.scare }, bump(T, tWatch - 0.1, tWatch + 0.2, tWait - 0.1, tWait + 0.3));
  miaPose = blendPose(miaPose, { ...POSES.slump, shN: 150, elN: 90 }, bump(T, tWait + 0.2, tWait + 0.5, END, END + 1));
  const maskState = 1 - bump(T, tMask + 0.2, tMask + 0.6, tWait + 0.4, tWait + 0.8);
  const mTalk = talk(T, tOnce - 0.05, tRuin - 0.2) || talk(T, tOkay - 0.05, tTired - 0.3) || talk(T, tConcert - 0.05, tWait + 1.3);
  let miaFace: Partial<Face> = { ...FACES.content, blink: blinkAt(T, [216.2, 226.6, 233.1]) };
  if (T > tHolds) miaFace = { ...FACES.happy, brow: 0.6, browShow: 1, browY: 0.5 };
  if (mTalk > 0) miaFace = { ...miaFace, mouth: "talk", open: mTalk };
  if (T > tHears && T < tGrins) miaFace = { ...FACES.worried, mouth: mTalk > 0 ? "talk" : "flat", open: mTalk, brow: 0.8 };
  if (T > tGrins) miaFace = { ...FACES.laugh, eye: "dot", open: 0.4, ...(mTalk > 0 ? { mouth: "talk" as const, open: mTalk } : {}) };
  if (T > tWait) miaFace = { ...FACES.laugh, eye: "happy", open: 0.3 };
  // Leo on the sofa, tired
  const lTalk = talk(T, tTired - 0.05, tTired + 1.2);
  const laugh = bump(T, tLaugh - 0.05, tLaugh + 0.2, tHears - 0.3, tHears);
  let leoFace: Partial<Face> = { ...FACES.neutral, eye: "lid", lookX: -0.6, blink: blinkAt(T, [214.5, 222.8]) };
  if (T > tRuin) leoFace = { ...FACES.sad, eye: "lid", curve: 0.15, lookX: -0.6 };
  if (laugh > 0.4) leoFace = { ...FACES.laugh, eye: "closed", open: 0.15, brow: 0.6, browShow: 1, browY: 0.1 };
  if (lTalk > 0 || (T > tTired && T < tTired + 1.2)) leoFace = { ...FACES.sad, eye: "lid", mouth: "talk", open: lTalk, curve: 0.1, lookX: -0.6 };
  if (T > tGrins) leoFace = { ...FACES.content, eye: "lid", lookX: -0.6, curve: 0.3 };
  if (T > tWait + 0.4) leoFace = { ...FACES.laugh, eye: "closed", open: 0.2 };
  const leoPose: Pose = { ...POSES.sit, lean: 8, headTilt: 6 + laugh * 6 + Math.sin(T * 1.3) * 2, shN: 34, elN: 50, shF: 26, elF: 60, bob: 0 };

  // shot list
  type Shot = "wide" | "mia" | "leo" | "miaCU" | "leoCU" | "book" | "ticket";
  const shot: Shot =
    T < tScares - 0.2 ? "wide" : T < tHolds - 0.15 ? "book" : T < tRuin - 0.1 ? "mia" : T < tHears - 0.1 ? "leo" : T < tTired - 0.15 ? "miaCU" : T < tGrins - 0.1 ? "leoCU" : T < tConcert + 0.1 ? "wide" : T < tMask - 0.2 ? "ticket" : "wide";
  if (shot === "book") return <NotebookInsert T={T} />;
  if (shot === "ticket") return <TicketInsert T={T} />;
  const camFor: Record<string, Cam> = {
    wide: { x: 1150 - 960, y: 620 - 540, zoom: lerp(1.15, 1.25, clamp((T - tNotices) / 6)) },
    mia: { x: MIA_STOP - 960, y: 640 - 540, zoom: 1.9 + (T - tHolds) * 0.02 },
    leo: { x: LEO_X - 960, y: 600 - 540, zoom: 1.9 + (T - tRuin) * 0.02 },
  };
  const blurBg = shot === "miaCU" || shot === "leoCU";
  const cam = camFor[shot] ?? { x: (shot === "miaCU" ? 900 : 1500) - 960, y: 360 - 540, zoom: 1.6 };
  return (
    <AbsoluteFill>
      <RoomBack cam={cam} t={T} lights={lights} doorOpen={0.7} blur={blurBg ? 14 : 0} />
      {!blurBg && (
        <>
          <Sofa cam={cam} lights={lights} />
          <Layer cam={cam} p={1}>
            <SenseRing T={T} at={tNotices + 0.2} x={LEO_X} y={SEAT_Y - 160 * 0.82} r={LEO.D * 0.82 * 0.62} />
            <SenseRing T={T} at={232.3} x={LEO_X} y={SEAT_Y - 160 * 0.82} r={LEO.D * 0.82 * 0.62} />
            <Figure spec={LEO} id="s19leo" x={LEO_X} y={SEAT_Y} scale={0.82} grounded={false} facing={-1} turn={0.55} pose={leoPose} face={leoFace} light={light} rim={rim} />
            <Shadow x={mx} y={ROOM.floor} w={36} />
            <Figure
              spec={MIA}
              id="s19mia"
              x={mx}
              y={ROOM.floor}
              scale={0.82}
              turn={mWalking ? 1 : 0.6}
              pose={miaPose}
              face={miaFace}
              light={light}
              rim={rim}
              hairSwing={mWalking ? 0.35 * Math.sin(T * 9) : Math.sin(T * 1.5) * 0.15}
              holdNear={T > tConcert - 0.1 && T < tMask + 0.1 ? <Ticket s={0.9} /> : <Notebook s={0.9} />}
              holdUpright
              headExtra={<CardboardMask r={MIA.D / 2} state={maskState} turn={mWalking ? 1 : 0.6} />}
            />
          </Layer>
          <RoomForeground cam={cam} lights={lights} />
        </>
      )}
      {blurBg && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {shot === "miaCU" ? (
            <Head spec={MIA} id="s19miaCU" x={960} y={600} size={380} face={miaFace} turn={0.2} facing={1} light={{ x: -0.6, y: -0.8 }} hairSwing={Math.sin(T * 1.4) * 0.2} extra={<CardboardMask r={MIA.D / 2} state={1} turn={0.2} />} />
          ) : (
            <Head spec={LEO} id="s19leoCU" x={960} y={600} size={400} face={leoFace} turn={0.25} facing={-1} light={{ x: -0.6, y: -0.8 }} />
          )}
        </svg>
      )}
      <Vignette strength={0.55} />
      {shot === "wide" && T < tScares && <Label x={960} y={96} text="Mia notices" size={22} color={C.miaPinkLight} o={bump(T, tNotices, tNotices + 0.4, tBook - 0.6, tBook - 0.2)} />}
    </AbsoluteFill>
  );
};

export const _f = FONT;
