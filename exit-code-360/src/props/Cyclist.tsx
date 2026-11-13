import React from "react";
import { Figure } from "../characters/Figure";
import { EXTRA } from "../characters/cast";
import { C } from "../style/palette";
import { deg } from "../lib/anim";

type V = { x: number; y: number };
const angOf = (a: V, b: V) => (Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI; // 0 = down
/** Two-bone IK: returns the middle joint (knee/elbow). bend = +1/-1 picks the side. */
const ik2 = (a: V, target: V, l1: number, l2: number, bend: 1 | -1): V => {
  const dx = target.x - a.x;
  const dy = target.y - a.y;
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
  const base = Math.atan2(dy, dx);
  const cos = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const off = Math.acos(Math.max(-1, Math.min(1, cos))) * bend;
  return { x: a.x + Math.cos(base + off) * l1, y: a.y + Math.sin(base + off) * l1 };
};

const FRAME = "#1A1520";
const K = 0.8; // rider scale relative to EXTRA spec

/**
 * Cyclist on a bicycle, facing +x, origin on the ground between the wheels.
 * dist = distance travelled (px, drives wheel + pedal rotation).
 */
export const Cyclist: React.FC<{
  x: number;
  y: number;
  scale?: number;
  dist: number;
  ring?: number; // 0..1 bell ring visual
  id: string;
  light?: V;
}> = ({ x, y, scale = 1, dist, ring = 0, id, light }) => {
  const R = 44;
  const rear: V = { x: -66, y: -R };
  const front: V = { x: 70, y: -R };
  const crank: V = { x: 0, y: -R };
  const seat: V = { x: -22, y: -150 };
  const headTop: V = { x: 52, y: -140 };
  const headBot: V = { x: 58, y: -112 };
  const grip: V = { x: 66, y: -160 };
  const wheelA = (dist / R) * (180 / Math.PI);
  const ph = deg(wheelA * 0.55);
  const pedal = (o: number): V => ({ x: crank.x + Math.cos(ph + o) * 17, y: crank.y + Math.sin(ph + o) * 17 });
  const pN = pedal(0);
  const pF = pedal(Math.PI);

  // rider skeleton in bike space (Figure uses hip as origin when grounded=false)
  const S = EXTRA;
  const hip: V = { x: seat.x, y: seat.y - 6 };
  const lean = 28;
  const thigh = S.thigh * K;
  const shin = S.shin * K;
  const legPose = (p: V) => {
    const knee = ik2(hip, p, thigh, shin, -1);
    const hipA = angOf(hip, knee);
    const shinA = angOf(knee, p);
    return { hip: hipA, kn: hipA - shinA };
  };
  const lN = legPose(pN);
  const lF = legPose(pF);
  const shoulderLocal = { x: 2, y: -S.torsoLen + S.limbW * 0.75 };
  const sh: V = {
    x: hip.x + (shoulderLocal.x * Math.cos(deg(lean)) - shoulderLocal.y * Math.sin(deg(lean))) * K,
    y: hip.y + (shoulderLocal.x * Math.sin(deg(lean)) + shoulderLocal.y * Math.cos(deg(lean))) * K,
  };
  const elbow = ik2(sh, grip, S.upper * K, S.fore * K, 1);
  const shA = angOf(sh, elbow);
  const foreA = angOf(elbow, grip);

  const spokes = (c: V) => (
    <g transform={`translate(${c.x},${c.y}) rotate(${wheelA})`}>
      <circle r={R} fill="none" stroke={FRAME} strokeWidth={6} />
      <circle r={R - 3} fill="none" stroke="#2D2533" strokeWidth={1.5} />
      {[0, 30, 60, 90, 120, 150].map((a) => (
        <path key={a} d={`M${Math.cos(deg(a)) * R},${Math.sin(deg(a)) * R} L${-Math.cos(deg(a)) * R},${-Math.sin(deg(a)) * R}`} stroke="#3A3140" strokeWidth={1.2} />
      ))}
      <circle r={5} fill={FRAME} />
    </g>
  );
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      {spokes(rear)}
      {spokes(front)}
      <path
        d={`M${rear.x},${rear.y} L${crank.x},${crank.y} L${seat.x},${seat.y + 8} M${crank.x},${crank.y} L${headBot.x},${headBot.y} L${headTop.x},${headTop.y} L${seat.x + 4},${seat.y + 16} L${rear.x},${rear.y} M${headBot.x},${headBot.y} L${front.x},${front.y} M${headTop.x},${headTop.y} L${grip.x - 6},${grip.y + 2} L${grip.x + 6},${grip.y}`}
        stroke={FRAME}
        strokeWidth={5.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={`M${seat.x - 14},${seat.y} L${seat.x + 12},${seat.y}`} stroke={FRAME} strokeWidth={7} strokeLinecap="round" />
      {/* bell */}
      <circle cx={grip.x - 8} cy={grip.y - 6} r={5} fill="#C9C4CF" />
      {ring > 0.01 &&
        [0, 1].map((k) => (
          <path
            key={k}
            d={`M${grip.x - 2 + k * 9},${grip.y - 22 - k * 6} q8,8 0,16`}
            stroke={C.eyeWhite}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
            opacity={ring * (1 - k * 0.3)}
            transform={`translate(${k * 4},0)`}
          />
        ))}
      <Figure
        spec={EXTRA}
        id={id}
        x={hip.x}
        y={hip.y}
        scale={K}
        grounded={false}
        turn={1}
        light={light}
        pose={{
          lean,
          headTilt: -lean * 0.5,
          hipN: lN.hip,
          knN: lN.kn,
          hipF: lF.hip,
          knF: lF.kn,
          footN: -10,
          footF: -10,
          shN: shA,
          elN: foreA - shA,
          shF: shA - 4,
          elF: foreA - shA,
        }}
        face={{ eye: "dot", mouth: "smile", curve: 0.25 }}
      />
      {/* crank arm + pedals on top */}
      <path d={`M${pN.x},${pN.y} L${pF.x},${pF.y}`} stroke="#2D2533" strokeWidth={4} strokeLinecap="round" />
      <circle cx={crank.x} cy={crank.y} r={8} fill={FRAME} />
    </g>
  );
};
