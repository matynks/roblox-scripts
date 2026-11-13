// Night living room (reference: lamp-lit room with moon window, sofa, frame).
// lights: 0 = lights off (cool moonlight), 1 = lamp on (warm).
import React from "react";
import { C } from "../style/palette";
import { Layer, type Cam } from "../lib/camera";
import { lerp, mixColor, noise1, rand } from "../lib/anim";
import { Motes } from "./Atmosphere";

export const ROOM = {
  floor: 884,
  wallBase: 860,
  doorX: 120,
  doorW: 190,
  sofaX0: 720,
  sofaX1: 1640,
  sofaTop: 646,
  lampX: 520,
  winX0: 1760,
  winX1: 2300,
  winY0: 170,
  winY1: 600,
  shelfX: 2440,
};

/** Rim / key light for characters in the room. */
export const roomLight = (lights: number) => ({
  light: { x: lights > 0.5 ? -0.7 : 0.8, y: -0.7 },
  rim: lights > 0.5 ? C.rimWarm : mixColor("#9FB0FF", C.rimWarm, lights),
});

const WindowView: React.FC<{ cam: Cam; t: number }> = ({ cam, t }) => {
  const { winX0: x0, winX1: x1, winY0: y0, winY1: y1 } = ROOM;
  const off = -cam.x * 0.22;
  return (
    <g>
      <defs>
        <clipPath id="lrWin">
          <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} />
        </clipPath>
        <linearGradient id="lrNight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1030" />
          <stop offset="1" stopColor="#1F2A5C" />
        </linearGradient>
        <radialGradient id="lrMoon">
          <stop offset="0" stopColor="#FFF8E8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFF8E8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath="url(#lrWin)">
        <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill="url(#lrNight)" />
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={x0 + rand(i) * (x1 - x0)} cy={y0 + rand(i * 3.1) * 220} r={1.2 + rand(i * 7) * 1.2} fill="#fff" opacity={0.4 + 0.4 * Math.sin(t * 2 + i)} />
        ))}
        <circle cx={x0 + 380 + off * 0.3} cy={y0 + 100} r={90} fill="url(#lrMoon)" />
        <circle cx={x0 + 380 + off * 0.3} cy={y0 + 100} r={30} fill="#FFF6E4" />
        {Array.from({ length: 14 }).map((_, i) => {
          const bx = x0 - 60 + i * 52 + off;
          const h = 90 + rand(i * 5.3) * 170;
          return (
            <g key={i}>
              <rect x={bx} y={y1 - h} width={46} height={h} fill={i % 2 ? "#0A0E24" : "#0E1430"} />
              {Array.from({ length: 10 }).map((__, j) => {
                const lit = rand(i * 31 + j) > 0.55;
                if (!lit) return null;
                const fl = noise1(t * 0.3 + j, i) > 0.85 ? 0.3 : 1;
                return <rect key={j} x={bx + 6 + (j % 3) * 13} y={y1 - h + 10 + Math.floor(j / 3) * 18} width={7} height={9} fill="#F5D27A" opacity={0.75 * fl} />;
              })}
            </g>
          );
        })}
      </g>
      {/* frame + mullions */}
      <rect x={x0 - 14} y={y0 - 14} width={x1 - x0 + 28} height={y1 - y0 + 28} fill="none" stroke="#1A1218" strokeWidth={22} />
      <path d={`M${(x0 + x1) / 2},${y0} L${(x0 + x1) / 2},${y1} M${x0},${(y0 + y1) / 2} L${x1},${(y0 + y1) / 2}`} stroke="#1A1218" strokeWidth={12} />
      <rect x={x0 - 40} y={y1 + 12} width={x1 - x0 + 80} height={16} rx={4} fill="#2A1D24" />
      {/* curtains */}
      <path d={`M${x0 - 120},${y0 - 40} Q${x0 - 60},${(y0 + y1) / 2} ${x0 - 100},${y1 + 120} L${x0 - 40},${y1 + 120} Q${x0 - 20},${(y0 + y1) / 2} ${x0 - 30},${y0 - 40}Z`} fill="#3A2340" />
      <path d={`M${x1 + 120},${y0 - 40} Q${x1 + 60},${(y0 + y1) / 2} ${x1 + 100},${y1 + 120} L${x1 + 40},${y1 + 120} Q${x1 + 20},${(y0 + y1) / 2} ${x1 + 30},${y0 - 40}Z`} fill="#3A2340" />
    </g>
  );
};

/** Back wall, window, lamp, door, shelf, floor. */
export const RoomBack: React.FC<{ cam: Cam; t: number; lights: number; doorOpen?: number; blur?: number }> = ({ cam, t, lights, doorOpen = 0, blur = 0 }) => {
  const { floor, wallBase, doorX, doorW, lampX } = ROOM;
  const lampFl = 0.95 + 0.05 * noise1(t * 4, 2);
  const lit = lights * lampFl;
  return (
    <Layer cam={cam} p={1} blur={blur}>
      <defs>
        <linearGradient id="lrWall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1E26" />
          <stop offset="1" stopColor="#3E2E33" />
        </linearGradient>
        <radialGradient id="lrLampWall" cx={lampX} cy={380} r={900} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6E5148" stopOpacity="0.95" />
          <stop offset="1" stopColor="#6E5148" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lrFloor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A2A2E" />
          <stop offset="1" stopColor="#150E13" />
        </linearGradient>
        <radialGradient id="lrGlow">
          <stop offset="0" stopColor={C.lampWarm} stopOpacity="0.6" />
          <stop offset="1" stopColor={C.lampWarm} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lrDoorLight" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.lampWarm} stopOpacity="0.38" />
          <stop offset="1" stopColor={C.lampWarm} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={-600} y={-200} width={3800} height={wallBase + 200} fill="url(#lrWall)" />
      <rect x={-600} y={-200} width={3800} height={wallBase + 200} fill="url(#lrLampWall)" opacity={lit} />
      {/* picture frame */}
      <rect x={1080} y={290} width={170} height={120} fill="#1A1218" />
      <rect x={1092} y={302} width={146} height={96} fill="#5E4A54" />
      <path d="M1092,380 L1140,340 L1175,368 L1205,330 L1238,372 L1238,398 L1092,398Z" fill="#3E2E3E" />
      <circle cx={1210} cy={325} r={9} fill="#C9A06A" opacity={0.7} />
      <WindowView cam={cam} t={t} />
      {/* shelf */}
      <g>
        <rect x={ROOM.shelfX} y={330} width={260} height={530} fill="#22181E" />
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <rect x={ROOM.shelfX + 8} y={340 + k * 128} width={244} height={8} fill="#3A2A30" />
            {Array.from({ length: 9 }).map((_, i) => (
              <rect
                key={i}
                x={ROOM.shelfX + 14 + i * 26}
                y={348 + k * 128 + (rand(k * 9 + i) * 26)}
                width={20}
                height={110 - rand(k * 9 + i) * 26}
                fill={["#5B3F55", "#3F5468", "#6B4A3A", "#4A5A44", "#7A5A6A"][(k + i) % 5]}
                opacity={0.85}
              />
            ))}
          </g>
        ))}
      </g>
      {/* plant */}
      <g>
        <path d="M2330,860 L2345,780 L2395,780 L2410,860Z" fill="#3A2A2E" />
        {[-40, -18, 0, 20, 42].map((a, i) => (
          <path key={i} d={`M2370,782 Q${2370 + a * 2},${700 - i * 6} ${2370 + a * 3.2},${640 + (i % 2) * 30}`} stroke="#2E3E30" strokeWidth={14} fill="none" strokeLinecap="round" />
        ))}
      </g>
      {/* door */}
      <g>
        <rect x={doorX - 16} y={360} width={doorW + 32} height={wallBase - 360} fill="#1A1218" />
        <rect x={doorX} y={376} width={doorW} height={wallBase - 376} fill={mixColor("#120C10", "#FFD9A0", doorOpen * 0.85)} />
        <path
          d={`M${doorX},376 L${doorX + doorW * (1 - doorOpen * 0.82)},${376 + doorOpen * 18} L${doorX + doorW * (1 - doorOpen * 0.82)},${wallBase - doorOpen * 10} L${doorX},${wallBase}Z`}
          fill="#3A2830"
        />
        <circle cx={doorX + doorW * (1 - doorOpen * 0.82) - 22} cy={620} r={7} fill="#C9A06A" opacity={1 - doorOpen * 0.6} />
      </g>
      {/* floor + rug */}
      <rect x={-600} y={wallBase} width={3800} height={600} fill="url(#lrFloor)" />
      <rect x={-600} y={wallBase} width={3800} height={8} fill="#1B1216" />
      {[900, 935, 980, 1040].map((y, k) => (
        <rect key={y} x={-600} y={y} width={3800} height={2} fill="#000" opacity={0.18 + k * 0.04} />
      ))}
      <ellipse cx={1180} cy={930} rx={760} ry={60} fill="#3A2440" opacity={0.6} />
      {/* door light spill */}
      {doorOpen > 0.01 && <path d={`M${doorX},${wallBase} L${doorX + doorW},${wallBase} L${doorX + doorW + 520},1080 L${doorX - 200},1080Z`} fill="url(#lrDoorLight)" opacity={doorOpen} />}
      {/* moonlight shaft on the floor (dark state) */}
      <path d={`M${ROOM.winX0},${ROOM.winY1} L${ROOM.winX1},${ROOM.winY1} L${ROOM.winX1 - 380},1080 L${ROOM.winX0 - 620},1080Z`} fill="#9FB0FF" opacity={0.07 * (1 - lights)} />
      {/* floor lamp */}
      <g>
        <ellipse cx={lampX} cy={wallBase + 26} rx={40} ry={8} fill="#140C10" />
        <rect x={lampX - 4} y={420} width={8} height={wallBase + 22 - 420} fill="#1A1218" />
        <path d={`M${lampX - 58},420 L${lampX + 58},420 L${lampX + 40},350 L${lampX - 40},350Z`} fill={mixColor("#4A4638", "#ECE5A8", lit)} />
        <circle cx={lampX} cy={400} r={240} fill="url(#lrGlow)" opacity={lit} />
        <path d={`M${lampX - 58},420 L${lampX + 58},420 L${lampX + 220},${wallBase + 40} L${lampX - 220},${wallBase + 40}Z`} fill={C.lampWarm} opacity={0.08 * lit} />
      </g>
      <Motes t={t} count={26} x0={lampX - 400} x1={lampX + 900} y0={240} y1={840} seed={7} size={2.4} color={lights > 0.5 ? "#FFE6D2" : "#C9D4FF"} />
    </Layer>
  );
};

/** The long sofa (drawn after anything hiding behind it). */
export const Sofa: React.FC<{ cam: Cam; lights: number; blur?: number; children?: React.ReactNode }> = ({ cam, lights, blur = 0, children }) => {
  const { sofaX0: x0, sofaX1: x1, sofaTop: top, wallBase } = ROOM;
  const base = mixColor("#24203A", "#3A2C46", lights);
  const hi = mixColor("#3A3A5E", "#5A4466", lights);
  return (
    <Layer cam={cam} p={1} blur={blur}>
      {children}
      <rect x={x0} y={top} width={x1 - x0} height={150} rx={34} fill={base} />
      <rect x={x0 + 10} y={top + 6} width={x1 - x0 - 20} height={10} rx={5} fill={hi} opacity={0.7} />
      <rect x={x0 - 30} y={top + 90} width={x1 - x0 + 60} height={110} rx={26} fill={mixColor("#1E1A30", "#33273F", lights)} />
      <rect x={x0 - 60} y={top + 60} width={90} height={160} rx={30} fill={base} />
      <rect x={x1 - 30} y={top + 60} width={90} height={160} rx={30} fill={base} />
      {[x0 + 20, x1 - 40].map((x) => (
        <rect key={x} x={x} y={wallBase - 10} width={20} height={34} fill="#140C10" />
      ))}
      <ellipse cx={(x0 + x1) / 2} cy={wallBase + 30} rx={(x1 - x0) / 2 + 60} ry={16} fill="#000" opacity={0.35} />
    </Layer>
  );
};

/** Out-of-focus foreground (armchair edge + side table). */
export const RoomForeground: React.FC<{ cam: Cam; lights: number }> = ({ cam, lights }) => (
  <Layer cam={cam} p={1.5} blur={12}>
    <rect x={-260} y={740} width={300} height={420} rx={60} fill={mixColor("#0C0A14", "#1A1218", lights)} />
    <rect x={2620} y={700} width={60} height={420} fill="#0C0A10" />
    <rect x={2560} y={690} width={200} height={26} rx={8} fill="#0C0A10" />
  </Layer>
);

export const lerpLights = (a: number, b: number, k: number) => lerp(a, b, k);
