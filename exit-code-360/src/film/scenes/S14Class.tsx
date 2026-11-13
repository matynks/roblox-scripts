// S14 "In class, thirty faces: every glance, every smirk, every whisper" (151.23–157.95)
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { LEO } from "../../characters/cast";
import { FACES, blinkAt } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { Beanie, Cap, Glasses } from "../../props/Accessories";
import { CLASS_LIGHT, ClassBack, DeskRow, ROWS, studentSpec } from "../../env/Classroom";
import { Vignette } from "../../env/Atmosphere";
import { Layer, type Cam } from "../../lib/camera";
import { Label, Ping, bump, step } from "../../lib/acting";
import { clamp, rand, track } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";

export const tClass = P(97).start; // 151.23
const tGlance = P(98).start; // 153.47
const tSmirk = P(99).start; // 154.67
const tWhisper = P(100).start; // 155.95
export const LEO_SEAT = { row: 1, i: 4 };

export type Student = { row: number; i: number; x: number; hip: number; s: number; k: number };
export const students: Student[] = ROWS.flatMap((row, r) =>
  Array.from({ length: row.n }).map((_, i) => ({ row: r, i, x: row.x0 + i * row.dx, hip: row.hip, s: row.s, k: r * 20 + i })),
).filter((st) => !(st.row === LEO_SEAT.row && st.i === LEO_SEAT.i));

const ACC = (k: number, r: number) => {
  const a = Math.floor(rand(k * 7.7) * 6);
  if (a === 0) return <Cap r={r} color={["#C9473F", "#3E5A7A", "#4E6E62"][k % 3]} />;
  if (a === 1) return <Glasses r={r} turn={0} />;
  if (a === 2) return <Beanie r={r} color="#4A3E5A" />;
  return null;
};

export const ClassStudents: React.FC<{
  T: number;
  opacity?: (st: Student) => number;
  special?: (st: Student) => { pose?: Partial<Pose>; face?: Partial<Face> } | null;
  after?: (row: number) => React.ReactNode;
}> = ({ T, opacity, special, after }) => (
  <>
    {ROWS.map((row, r) => (
      <g key={r}>
        {students
          .filter((st) => st.row === r)
          .map((st) => {
            const o = opacity ? opacity(st) : 1;
            if (o <= 0.01) return null;
            const sp = special?.(st);
            const look = Math.sin(T * 0.7 + st.k * 1.3) * 0.5;
            return (
              <g key={st.k} opacity={o}>
                <Figure
                  spec={studentSpec(st.k)}
                  id={`cls${st.k}`}
                  x={st.x}
                  y={st.hip}
                  scale={st.s}
                  grounded={false}
                  turn={0}
                  pose={{ ...STAND, shN: 14, elN: 60, shF: -14, elF: -60, headTilt: Math.sin(T * 0.9 + st.k) * 3, ...sp?.pose }}
                  face={{ ...FACES.neutral, eye: "dot", lookX: look, blink: blinkAt(T, [151.8 + (st.k % 7) * 0.9, 155 + (st.k % 5) * 0.7]), ...sp?.face }}
                  light={CLASS_LIGHT}
                  rimAmt={0.8}
                  headExtra={ACC(st.k, 42)}
                />
              </g>
            );
          })}
        <DeskRow row={row} skip={[]} />
        {after?.(r)}
      </g>
    ))}
  </>
);

export const S14Class: React.FC<{ T: number }> = ({ T }) => {
  const zoom = track(T, [[tClass - 0.4, 0.98], [tGlance, 1.04], [157.9, 1.12]]);
  const cam: Cam = { x: 0, y: track(T, [[tClass - 0.4, 20], [157.9, 40]]), zoom };
  const glancer = students.find((s) => s.row === 0 && s.i === 6)!;
  const smirker = students.find((s) => s.row === 2 && s.i === 2)!;
  const w1 = students.find((s) => s.row === 1 && s.i === 7)!;
  const w2 = students.find((s) => s.row === 1 && s.i === 8)!;
  const special = (st: Student) => {
    if (st === glancer && T > tGlance - 0.1) return { face: { ...FACES.sly, eye: "lid" as const, lookX: -1 } };
    if (st === smirker && T > tSmirk - 0.1) return { face: FACES.smug };
    if (st === w1 && T > tWhisper - 0.1) return { pose: { shN: 40, elN: 150, headTilt: 14 }, face: { ...FACES.sly, mouth: "talk" as const, open: 0.3 + 0.3 * Math.abs(Math.sin(T * 12)) } };
    if (st === w2 && T > tWhisper - 0.1) return { pose: { headTilt: -12 }, face: { ...FACES.happy, lookX: -0.8 } };
    return null;
  };
  const leoX = ROWS[1].x0 + LEO_SEAT.i * ROWS[1].dx;
  const dart = Math.sin(T * 5) * 0.9;
  const leoFace: Partial<Face> = { ...FACES.worried, lookX: dart, mouth: "flat", browY: 0.3, blink: blinkAt(T, [152.4, 156.6]) };
  const sweep = students.map((st, n) => ({ st, at: tClass + 0.5 + n * 0.035 }));
  return (
    <AbsoluteFill>
      <ClassBack cam={cam} t={T} />
      <Layer cam={cam} p={1}>
        <ClassStudents
          T={T}
          special={special}
          after={(r) =>
            r === 1 ? (
              <g>
                <Figure spec={LEO} id="s14leo" x={leoX} y={ROWS[1].hip} scale={ROWS[1].s * 1.05} grounded={false} turn={0} pose={{ ...STAND, shN: 14, elN: 60, shF: -14, elF: -60, headTilt: Math.sin(T * 6) * 2 }} face={leoFace} light={CLASS_LIGHT} />
                <DeskRow row={ROWS[1]} skip={Array.from({ length: 10 }).map((_, i) => i).filter((i) => i !== LEO_SEAT.i)} />
              </g>
            ) : null
          }
        />
        <path d={`M${leoX + 34},${ROWS[1].hip - 300 * ROWS[1].s} q8,14 0,22 q-8,-8 0,-22Z`} fill={C.tear} opacity={step(T, tGlance, tGlance + 0.4)} />
        {sweep.map(({ st, at }, n) => (
          <Ping key={n} T={T} at={at} x={st.x} y={st.hip - 236 * st.s} r={34 * st.s * 1.6} hold={0.5} />
        ))}
        <Ping T={T} at={tGlance + 0.1} x={glancer.x} y={glancer.hip - 236 * glancer.s} r={52} label="GLANCE" hold={1.6} />
        <Ping T={T} at={tSmirk + 0.1} x={smirker.x} y={smirker.hip - 236 * smirker.s} r={78} label="SMIRK" hold={1.6} />
        <Ping T={T} at={tWhisper + 0.1} x={(w1.x + w2.x) / 2} y={w1.hip - 236 * w1.s} r={110} label="WHISPER" hold={1.6} />
      </Layer>
      <Vignette strength={0.5} />
      <Label x={960} y={96} text="30 faces" size={26} color={C.gold} o={bump(T, tClass + 0.2, tClass + 0.5, tGlance - 0.2, tGlance + 0.1)} />
      <Label x={960} y={96} text="every glance · every smirk · every whisper" size={20} color={C.label} o={step(T, tGlance + 0.1, tGlance + 0.5) * (1 - step(T, 157.7, 158.0))} />
    </AbsoluteFill>
  );
};

export const _c = clamp;
