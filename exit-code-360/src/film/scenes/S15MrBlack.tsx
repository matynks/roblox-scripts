// S15 "Then a man in a grey suit finds you. Mr. Black." (157.95–175.92)
import React from "react";
import { AbsoluteFill } from "remotion";
import { Figure } from "../../characters/Figure";
import { LEO, MR_BLACK } from "../../characters/cast";
import { FACES, POSES, blendPose, blinkAt, breathe, walk } from "../../characters/poses";
import { STAND, type Face, type Pose } from "../../characters/types";
import { CLASS_LIGHT, ClassBack, DeskRow, ROWS } from "../../env/Classroom";
import { Vignette } from "../../env/Atmosphere";
import { Glow, IconDefs } from "../../graphics/Icons";
import { Layer, type Cam } from "../../lib/camera";
import { Label, bump, step } from "../../lib/acting";
import { clamp, ease, lerp, track } from "../../lib/anim";
import { P, talk } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";
import { ClassStudents, LEO_SEAT } from "./S14Class";

const t0 = P(101).start; // 157.95
const tName = P(102).start; // 160.35
const tSmile = P(103).start; // 161.63
const tCam = P(104).start; // 162.91
const tFans = P(105).start; // 165.31
const tConcert = P(106).start; // 166.91
const tEuros = P(107).start; // 167.95
const tWatch1 = P(108).start; // 169.68
const tWatchQ = P(109).start; // 171.04
const tWatch2 = P(110).start; // 173.12
const tPost = P(111).start; // 174.16
const tEnd = P(111).end; // 175.43

const Card: React.FC<{ x: number; k: number; value: string; label: string; color: string }> = ({ x, k, value, label, color }) => (
  <div
    style={{
      position: "absolute",
      left: x - 170,
      top: 330,
      width: 340,
      height: 230,
      borderRadius: 18,
      background: "rgba(12,18,38,0.82)",
      border: `2px solid ${color}55`,
      boxShadow: `0 0 40px ${color}22`,
      opacity: clamp(k * 2),
      transform: `translateY(${(1 - ease.outBack(clamp(k))) * 40}px) scale(${lerp(0.9, 1, ease.out(clamp(k)))})`,
      fontFamily: FONT,
      textAlign: "center",
      paddingTop: 44,
    }}
  >
    <div style={{ fontWeight: 800, fontSize: 76, color, fontVariantNumeric: "tabular-nums", textShadow: `0 0 24px ${color}66` }}>{value}</div>
    <div style={{ fontWeight: 700, fontSize: 20, letterSpacing: "0.22em", color: C.label, marginTop: 10 }}>{label}</div>
  </div>
);

export const S15MrBlack: React.FC<{ T: number }> = ({ T }) => {
  const leoX = ROWS[1].x0 + LEO_SEAT.i * ROWS[1].dx;
  const door = step(T, t0 + 0.2, t0 + 0.7);
  // Mr. Black walks from the door to Leo's desk
  const wk = clamp((T - (t0 + 0.65)) / 1.6);
  const bx = lerp(1795, 1105, ease.inOut(wk));
  const by = lerp(862, 905, ease.inOut(wk));
  const bs = lerp(0.52, 0.7, ease.inOut(wk));
  const walking = wk > 0 && wk < 1;
  const bTalk = talk(T, tCam - 0.05, tEuros + 1.4) || talk(T, tWatch1 - 0.05, tWatch1 + 0.8) || talk(T, tWatch2 - 0.05, tEnd + 0.05);
  let bPose: Pose = walking ? walk(wk * 3.2, 0.9, "brisk") : breathe({ ...STAND }, T);
  bPose = blendPose(bPose, POSES.palmsOut, bump(T, tCam, tCam + 0.3, tFans, tFans + 0.3));
  bPose = blendPose(bPose, { lean: 10, headTilt: 6 }, bump(T, tWatch2 - 0.2, tWatch2, tPost + 0.2, tPost + 0.5));
  bPose = blendPose(bPose, { shN: 40, elN: 20, lean: 12 }, bump(T, tPost + 0.1, tPost + 0.45, tEnd + 0.1, tEnd + 0.4));
  let bFace: Partial<Face> = { ...FACES.neutral, eye: "lid", blink: blinkAt(T, [163.5, 170.6]) };
  if (T > tSmile - 0.05) bFace = { ...FACES.sly, blink: blinkAt(T, [163.5, 170.6]) };
  if (bTalk > 0) bFace = { ...FACES.sly, mouth: "talk", open: bTalk };
  const leoTalk = talk(T, tWatchQ - 0.05, tWatchQ + 1.4);
  let leoFace: Partial<Face> = { ...FACES.neutral, eye: "dot", lookX: lerp(0, 0.8, step(T, t0 + 1.0, t0 + 1.5)), blink: blinkAt(T, [162.4, 168.0]) };
  if (T > tSmile) leoFace = { ...FACES.worried, lookX: 0.8, brow: 0.4 };
  if (leoTalk > 0 || (T > tWatchQ && T < tWatchQ + 1.4)) leoFace = { ...FACES.worried, mouth: "talk", open: leoTalk, lookX: 0.8, brow: 0.8, browY: 0.7 };
  if (T > tWatchQ + 1.4) leoFace = { ...FACES.determined, lookX: 0.8 };
  // camera: wide → two-shot
  const zoom = track(T, [[t0 - 0.2, 1.12], [t0 + 2.0, 1.12], [tName + 0.4, 1.85], [tPost, 1.9], [tEnd + 0.5, 2.0]]);
  const cx = track(T, [[t0 - 0.2, 960], [t0 + 2.0, 1080], [tName + 0.4, 990], [tEnd + 0.5, 985]]);
  const cy = track(T, [[t0 - 0.2, 580], [t0 + 2.0, 600], [tName + 0.4, 690]]);
  const cam: Cam = { x: cx - 960, y: cy - 540, zoom };
  const studentsGone = (st: { row: number }) => 1 - step(T, t0 + st.row * 0.15, t0 + 0.6 + st.row * 0.15);
  const cards = step(T, tFans - 0.15, tFans + 0.1) * (1 - step(T, tWatch1 - 0.2, tWatch1 + 0.15));
  const cctv = bump(T, tCam + 0.6, tCam + 0.9, tFans - 0.2, tFans);
  const earpiece = step(T, tPost + 0.5, tPost + 0.7);
  return (
    <AbsoluteFill>
      <ClassBack cam={cam} t={T} door={door} />
      <Layer cam={cam} p={1}>
        <ClassStudents
          T={T}
          opacity={studentsGone}
          after={(r) =>
            r === 1 ? (
              <g>
                <Figure spec={LEO} id="s15leo" x={leoX} y={ROWS[1].hip} scale={ROWS[1].s * 1.05} grounded={false} turn={0.2} pose={breathe({ ...STAND, shN: 14, elN: 60, shF: -14, elF: -60 }, T)} face={leoFace} light={CLASS_LIGHT} />
                <DeskRow row={ROWS[1]} skip={Array.from({ length: 10 }).map((_, i) => i).filter((i) => i !== LEO_SEAT.i)} />
                {earpiece > 0 && (
                  <g transform={`translate(${leoX + 40},${ROWS[1].desk - 6})`} opacity={earpiece}>
                    <circle r={7} fill="#E9E6E1" />
                    <path d="M0,6 C-10,18 6,26 -6,36" stroke="#E9E6E1" strokeWidth={2.5} fill="none" />
                  </g>
                )}
                <Figure spec={MR_BLACK} id="s15black" x={bx} y={by} scale={bs} facing={-1} turn={walking ? 1 : 0.45} pose={bPose} face={bFace} light={{ x: 0.3, y: -1 }} rim={door > 0.5 && wk < 0.5 ? "#B9C6F0" : C.rimWarm} />
              </g>
            ) : null
          }
        />
        {cctv > 0 && (
          <g transform={`translate(${leoX - 150},${ROWS[1].hip - 215}) scale(${0.8 + 0.2 * cctv})`} opacity={cctv}>
            <IconDefs />
            <Glow color={C.gold} d="M-50,-20 L30,-20 L30,20 L-50,20Z M30,-10 L56,-22 L56,22 L30,10 M-10,20 L-10,44 L-36,44" />
            <circle cx={-36} cy={-6} r={6} fill={C.coral} opacity={0.5 + 0.5 * Math.round((Math.sin(T * 8) + 1) / 2)} />
          </g>
        )}
      </Layer>
      <Vignette strength={0.5} />
      <AbsoluteFill style={{ background: "#060A16", opacity: cards * 0.55 }} />
      {cards > 0 && (
        <>
          <Card x={560} k={(T - tFans) / 0.4} value={Math.round(40000 * ease.out(clamp((T - tFans) / 0.8))).toLocaleString("en-US")} label="fans" color={C.number} />
          <Card x={960} k={(T - tConcert) / 0.4} value="1" label="concert" color={C.number} />
          <Card x={1360} k={(T - tEuros) / 0.4} value={`€${Math.round(10000 * ease.out(clamp((T - tEuros) / 0.8))).toLocaleString("en-US")}`} label="for you" color={C.gold} />
        </>
      )}
      {/* lower third */}
      <div style={{ position: "absolute", left: 150, top: 820, opacity: bump(T, tName, tName + 0.4, tCam + 0.3, tCam + 0.8), fontFamily: FONT }}>
        <div style={{ width: 60 + 200 * ease.out(clamp((T - tName) / 0.5)), height: 3, background: C.gold }} />
        <div style={{ fontWeight: 800, fontSize: 40, letterSpacing: "0.12em", color: "#F6F1EA", marginTop: 10 }}>MR. BLACK</div>
        <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "0.22em", color: C.label, marginTop: 4 }}>THE MAN IN THE GREY SUIT</div>
      </div>
      <Label x={960} y={96} text="a human security camera" size={22} color={C.gold} o={bump(T, tCam + 0.5, tCam + 0.9, tFans - 0.2, tFans)} />
      <Label x={960} y={96} text="just watch" size={24} color={C.gold} o={bump(T, tWatch1, tWatch1 + 0.3, tPost - 0.2, tPost)} />
      <Label x={960} y={96} text="never leave your post" size={24} color={C.coral} o={step(T, tPost + 0.2, tPost + 0.5)} />
    </AbsoluteFill>
  );
};
