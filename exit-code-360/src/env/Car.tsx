// Learner car: dusk road exterior (parallax), and the cabin seen through the windshield.
import React from "react";
import { C } from "../style/palette";
import { Layer, repeatX, type Cam } from "../lib/camera";
import { deg, rand } from "../lib/anim";
import { FONT } from "../style/fonts";
import { DuskSky } from "./Street";

export const ROAD = { y: 900 };

export const RoadScene: React.FC<{ cam: Cam; t: number; children?: React.ReactNode }> = ({ cam, t, children }) => {
  const hills = repeatX(cam, 0.1, 700, 0, 600);
  const trees = repeatX(cam, 0.45, 260, 0, 300);
  const poles = repeatX(cam, 0.75, 900, 200, 400);
  const dashes = repeatX(cam, 1, 220, 0, 300);
  return (
    <>
      <DuskSky cam={cam} t={t} />
      <Layer cam={cam} p={0.1}>
        {hills.map(({ x, i }) => (
          <path key={i} d={`M${x - 100},640 Q${x + 200},${520 - rand(i) * 80} ${x + 420},610 Q${x + 600},${560 - rand(i * 3) * 40} ${x + 800},640 L${x + 800},760 L${x - 100},760Z`} fill="#3A2A48" />
        ))}
        <rect x={cam.x * 0.1 - 2000} y={700} width={6000} height={200} fill="#30223C" />
      </Layer>
      <Layer cam={cam} p={0.45}>
        {trees.map(({ x, i }) => (
          <g key={i}>
            <rect x={x + 60} y={640} width={10} height={140} fill="#1E1626" />
            <ellipse cx={x + 65} cy={620 - rand(i) * 30} rx={60 + rand(i * 2) * 30} ry={70 + rand(i * 5) * 30} fill={i % 2 ? "#261C30" : "#2C2036"} />
          </g>
        ))}
        <rect x={cam.x * 0.45 - 2000} y={770} width={6000} height={140} fill="#251C2C" />
      </Layer>
      <Layer cam={cam} p={0.75}>
        {poles.map(({ x, i }) => (
          <g key={i}>
            <rect x={x} y={330} width={10} height={520} fill="#171119" />
            <rect x={x - 30} y={350} width={70} height={7} fill="#171119" />
          </g>
        ))}
        <path d={`M${cam.x * 0.75 - 2000},360 Q${cam.x * 0.75 + 1000},400 ${cam.x * 0.75 + 4000},360`} stroke="#171119" strokeWidth={2} fill="none" />
      </Layer>
      <Layer cam={cam} p={1}>
        <rect x={cam.x - 2000} y={820} width={6000} height={300} fill="#1C161F" />
        <rect x={cam.x - 2000} y={820} width={6000} height={6} fill="#3A2E3C" />
        {dashes.map(({ x, i }) => (
          <rect key={i} x={x} y={952} width={110} height={8} fill="#D8C8A8" opacity={0.35} />
        ))}
        {children}
      </Layer>
    </>
  );
};

/** Hatchback side view, facing +x, origin on the road under the car centre. */
export const LearnerCar: React.FC<{ x: number; y: number; dist: number; s?: number; bounce?: number; learner?: boolean; color?: string }> = ({ x, y, dist, s = 1, bounce = 0, learner = true, color = "#4F7C8A" }) => {
  const rot = (dist / 42) * (180 / Math.PI);
  const wheel = (cx: number) => (
    <g transform={`translate(${cx},-42) rotate(${rot})`}>
      <circle r={42} fill="#0E0B10" />
      <circle r={22} fill="#5A5560" />
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d={`M0,0 L${Math.cos(deg(a)) * 20},${Math.sin(deg(a)) * 20}`} stroke="#2A2630" strokeWidth={5} />
      ))}
    </g>
  );
  return (
    <g transform={`translate(${x},${y + bounce}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={250} ry={14} fill="#000" opacity={0.4} />
      {/* body */}
      <path d="M-230,-50 Q-236,-118 -190,-124 L-120,-130 L-70,-196 Q-56,-212 -30,-212 L110,-212 Q140,-212 160,-186 L200,-130 Q236,-124 238,-90 L238,-50 Q238,-36 224,-36 L-216,-36 Q-230,-36 -230,-50Z" fill={color} />
      <path d="M-226,-96 L236,-96" stroke="#00000033" strokeWidth={4} />
      <path d="M-70,-196 L-120,-130 L200,-130 L160,-186 Q140,-212 110,-212 L-30,-212 Q-56,-212 -70,-196Z" fill="none" stroke={C.rimWarm} strokeWidth={2} opacity={0.4} />
      {/* windows */}
      <path d="M-58,-192 L-100,-136 L36,-136 L36,-200 L-30,-200 Q-48,-200 -58,-192Z" fill="#20283A" />
      <path d="M48,-200 L48,-136 L186,-136 L152,-182 Q138,-200 112,-200Z" fill="#20283A" />
      {/* occupants (heads) */}
      <circle cx={-6} cy={-160} r={20} fill={C.ink} />
      <circle cx={104} cy={-160} r={21} fill={C.ink} />
      <circle cx={112} cy={-166} r={4} fill={C.eyeWhite} />
      <circle cx={124} cy={-166} r={4} fill={C.eyeWhite} />
      <path d="M-58,-192 L-100,-136" stroke={C.glint} strokeWidth={3} opacity={0.25} />
      {/* lights */}
      <rect x={222} y={-92} width={18} height={18} rx={5} fill="#FFE9B8" />
      <path d="M238,-84 L600,-130 L600,-30Z" fill="#FFE9B8" opacity={0.08} />
      <rect x={-232} y={-92} width={12} height={20} rx={4} fill="#E04A5A" />
      {/* learner sign */}
      {learner && (
        <g>
          <rect x={20} y={-252} width={70} height={40} rx={6} fill="#F3EEE6" />
          <text x={55} y={-221} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={32} fill="#D23A48">
            L
          </text>
          <rect x={30} y={-214} width={50} height={4} fill="#2A2630" />
        </g>
      )}
      {wheel(-150)}
      {wheel(150)}
    </g>
  );
};

/** Cabin seen through the windshield. CabinBack is behind the occupants,
 * CabinFront (dashboard, wheel, frame) is drawn over them and hides their legs. */
export const CABIN = { hipY: 760, dash: 742, leoX: 660, insX: 1260 };

export const CabinBack: React.FC<{ t: number; carPass: number }> = ({ t, carPass }) => (
  <g>
    <defs>
      <linearGradient id="cbSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3E2A50" />
        <stop offset="0.75" stopColor="#B86E86" />
        <stop offset="1" stopColor="#E3A08C" />
      </linearGradient>
    </defs>
    <rect x={0} y={0} width={1920} height={1080} fill="#100B14" />
    {/* roof lining */}
    <path d="M0,0 L1920,0 L1920,250 Q960,200 0,250Z" fill="#1A1420" />
    {/* rear window: road receding behind the car */}
    <path d="M560,290 Q960,262 1360,290 L1420,520 L500,520Z" fill="url(#cbSky)" />
    <path d="M500,470 L1420,470 L1420,520 L500,520Z" fill="#3A2440" opacity={0.7} />
    <path d="M930,452 L990,452 L1420,520 L500,520Z" fill="#2A1F2E" />
    {[0, 1, 2, 3].map((k) => {
      const u = (t * 0.9 + k / 4) % 1;
      const y = 456 + u * 62;
      const w = 4 + u * 26;
      return <rect key={k} x={960 - w / 2} y={y} width={w} height={2 + u * 3} fill="#E8D8B8" opacity={0.45} />;
    })}
    {/* a car closing in, then sliding into the left blind spot */}
    {carPass > 0 && carPass < 1 && (
      <g transform={`translate(${lerpN(900, 520, carPass)},${lerpN(462, 500, carPass)}) scale(${0.5 + carPass * 1.3})`} opacity={carPass < 0.85 ? 1 : (1 - carPass) / 0.15}>
        <ellipse cx={0} cy={6} rx={70} ry={26} fill="#FFF2D0" opacity={0.12} />
        <rect x={-34} y={-14} width={68} height={26} rx={10} fill="#140E18" />
        <circle cx={-22} cy={2} r={6} fill="#FFF2D0" />
        <circle cx={22} cy={2} r={6} fill="#FFF2D0" />
      </g>
    )}
    {/* side windows (dark) */}
    <path d="M0,280 L470,300 L440,620 L0,640Z" fill="#17111C" />
    <path d="M1920,280 L1450,300 L1480,620 L1920,640Z" fill="#17111C" />
    {/* seat backs + headrests */}
    {[CABIN_X.leo, CABIN_X.ins].map((x) => (
      <g key={x}>
        <rect x={x - 70} y={300} width={140} height={110} rx={40} fill="#221A28" />
        <rect x={x - 150} y={420} width={300} height={420} rx={70} fill="#241C2A" />
        <rect x={x - 150} y={420} width={300} height={10} rx={5} fill={C.rimWarm} opacity={0.15} />
      </g>
    ))}
  </g>
);

const CABIN_X = { leo: 660, ins: 1260 };
const lerpN = (a: number, b: number, k: number) => a + (b - a) * k;

export const CabinFront: React.FC<{ wheelTurn: number }> = ({ wheelTurn }) => (
  <g>
    {/* steering wheel (behind the dashboard edge) */}
    <g transform={`translate(${CABIN_X.leo},${CABIN.dash + 6}) rotate(${wheelTurn})`}>
      <ellipse rx={170} ry={62} fill="none" stroke="#0D0A10" strokeWidth={26} />
      <path d="M-160,8 L160,8" stroke="#0D0A10" strokeWidth={20} />
      <ellipse rx={170} ry={62} fill="none" stroke={C.rimWarm} strokeWidth={2.5} opacity={0.35} transform="translate(0,-12)" />
    </g>
    {/* dashboard */}
    <path d={`M0,${CABIN.dash + 40} Q960,${CABIN.dash - 40} 1920,${CABIN.dash + 40} L1920,1080 L0,1080Z`} fill="#1A141E" />
    <path d={`M0,${CABIN.dash + 40} Q960,${CABIN.dash - 40} 1920,${CABIN.dash + 40}`} stroke={C.rimWarm} strokeWidth={2.5} opacity={0.28} fill="none" />
    <rect x={880} y={CABIN.dash + 40} width={160} height={60} rx={10} fill="#120E16" />
    <rect x={896} y={CABIN.dash + 52} width={128} height={30} rx={6} fill="#3A6E78" opacity={0.5} />
    {/* windshield frame: A-pillars + roof edge */}
    <path d="M0,0 L1920,0 L1920,120 Q960,90 0,120Z" fill="#0B080E" />
    <path d="M0,0 L220,0 L60,1080 L0,1080Z" fill="#0B080E" />
    <path d="M1920,0 L1700,0 L1860,1080 L1920,1080Z" fill="#0B080E" />
    {/* glass reflections */}
    <path d="M340,120 L520,120 L330,${CABIN.dash} L200,${CABIN.dash}Z" fill="#fff" opacity={0.035} />
    <path d="M1420,120 L1490,120 L1320,${CABIN.dash} L1270,${CABIN.dash}Z" fill="#fff" opacity={0.03} />
    {/* rear-view mirror */}
    <rect x={952} y={110} width={16} height={46} fill="#0B080E" />
    <rect x={880} y={150} width={160} height={46} rx={14} fill="#0B080E" />
  </g>
);

export const blindSpotRand = rand;
