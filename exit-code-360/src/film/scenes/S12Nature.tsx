// S12 "Nature already tried this once" (125.62–136.52): horse ≈350°, rabbit ≈360°,
// prey animals, danger from anywhere, Leo joins the club.
import React from "react";
import { AbsoluteFill } from "remotion";
import { NavySpace, VisionDiagram, CounterBlock, type DiagramState } from "../../graphics/VisionField";
import { EyeIcon, Glow, HorseIcon, IconDefs, RabbitIcon } from "../../graphics/Icons";
import { Vignette } from "../../env/Atmosphere";
import { Label, bump, step } from "../../lib/acting";
import { clamp, ease, lerp } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const t0 = P(82).start; // 125.62
const tHorse = P(83).start; // 127.70
const tRabbit = P(84).start; // 130.18
const tPrey = P(85).start; // 131.38
const tDanger = P(86).start; // 132.98
const tClub = P(87).start; // 134.90
const TEAL = "#8FD3E8";

const diag = (who: "human" | "leo", x: number, y: number, scale: number, fov: number, appear: number, glow: number, T: number, blind = 0): DiagramState => ({
  who, x, y, scale, appear, fov, ahead: 0, sides: 0, blind, blindFill: 0, question: 0, ghost: 0, shatter: 0, ripple: -1, glow, t: T,
});

export const S12Nature: React.FC<{ T: number }> = ({ T }) => {
  const club = step(T, tClub - 0.1, tClub + 0.6);
  const hx = lerp(560, 430, club);
  const rx = lerp(1360, 1490, club);
  const hA = step(T, tHorse - 0.2, tHorse + 0.4);
  const rA = step(T, tRabbit - 0.2, tRabbit + 0.4);
  const hFov = 350 * ease.out(clamp((T - tHorse) / 1.2));
  const rFov = 356 * ease.out(clamp((T - tRabbit) / 1.0));
  const danger = step(T, tDanger - 0.1, tDanger + 0.2);
  const pulse = (x: number) => bump(T, tDanger + 0.55 + x, tDanger + 0.7 + x, tDanger + 0.9 + x, tDanger + 1.3 + x);
  const arrows = (cx: number, cy: number, r: number, seed: number) =>
    Array.from({ length: 8 }).map((_, i) => {
      const a = (i / 8) * Math.PI * 2 + seed;
      const k = ease.inOut(clamp((T - tDanger - i * 0.06) / 0.8));
      const r0 = r + 260 - k * 230;
      const r1 = r0 - 70;
      const x0 = cx + Math.cos(a) * r0;
      const y0 = cy + Math.sin(a) * r0;
      const x1 = cx + Math.cos(a) * r1;
      const y1 = cy + Math.sin(a) * r1;
      const hx1 = cx + Math.cos(a + 0.06) * (r1 + 18);
      const hy1 = cy + Math.sin(a + 0.06) * (r1 + 18);
      const hx2 = cx + Math.cos(a - 0.06) * (r1 + 18);
      const hy2 = cy + Math.sin(a - 0.06) * (r1 + 18);
      return <Glow key={i} color={C.coral} w={2.6} o={danger * (1 - step(T, tClub - 0.4, tClub))} d={`M${x0},${y0} L${x1},${y1} M${hx1},${hy1} L${x1},${y1} L${hx2},${hy2}`} />;
    });
  // intro beat "Nature already tried this once.": a 360° ring draws itself around the title,
  // a horse, a rabbit and an eye pop onto it; everything clears before the horse diagram.
  const intro = bump(T, t0 - 0.15, t0 + 0.35, tHorse - 0.55, tHorse - 0.15);
  const R = 250;
  const draw = ease.inOut(clamp((T - t0) / 1.3));
  const circ = 2 * Math.PI * R;
  const icon = (k: number) => ease.outBack(clamp((T - t0 - 0.35 - k * 0.3) / 0.35));
  const onRing = (deg: number) => ({ x: 960 + Math.cos((deg * Math.PI) / 180) * R, y: 540 + Math.sin((deg * Math.PI) / 180) * R });
  const pH = onRing(-150);
  const pR = onRing(-30);
  const pE = onRing(90);
  return (
    <AbsoluteFill>
      <NavySpace drift={T * 6} />
      {intro > 0.001 && (
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: intro }}>
          <IconDefs />
          <g transform={`translate(960 540) scale(${lerp(0.94, 1, intro)}) translate(-960 -540)`}>
            <circle cx={960} cy={540} r={R} fill="none" stroke={C.gold} strokeWidth={10} opacity={0.12} strokeDasharray={`${circ * draw} ${circ}`} transform="rotate(-90 960 540)" />
            <circle cx={960} cy={540} r={R} fill="none" stroke={C.gold} strokeWidth={2.6} strokeDasharray={`${circ * draw} ${circ}`} transform="rotate(-90 960 540)" strokeLinecap="round" />
            <HorseIcon x={pH.x} y={pH.y} s={0.62 * icon(0)} color={TEAL} o={clamp(icon(0))} />
            <RabbitIcon x={pR.x} y={pR.y} s={0.8 * icon(1)} color={TEAL} o={clamp(icon(1))} />
            <EyeIcon x={pE.x} y={pE.y} s={0.5 * icon(2)} color={C.gold} o={clamp(icon(2))} />
            <text x={960} y={528} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={76} letterSpacing="10" fill={C.gold} style={{ filter: "drop-shadow(0 0 18px rgba(242,197,92,0.45))" }}>
              NATURE
            </text>
            <text x={960} y={580} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={22} letterSpacing="7" fill={C.label} opacity={step(T, t0 + 0.5, t0 + 0.9)}>
              ALREADY TRIED THIS ONCE
            </text>
          </g>
        </svg>
      )}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <IconDefs />
        <VisionDiagram id="s12h" s={diag("human", hx, 560, 0.6, hFov, hA, pulse(0), T, step(T, tHorse + 1.0, tHorse + 1.4) * 0.9)} color={TEAL} heading={90} center={<HorseIcon x={-10} y={-20} s={0.95} color={TEAL} />} />
        <VisionDiagram id="s12r" s={diag("human", rx, 560, 0.6, rFov, rA, pulse(0.2), T, step(T, tRabbit + 0.9, tRabbit + 1.3) * 0.9)} color={TEAL} heading={90} center={<RabbitIcon x={-4} y={-14} s={1.2} color={TEAL} />} />
        {club > 0 && <VisionDiagram id="s12l" s={{ ...diag("leo", 960, 560, 0.42 * club, 360, club, bump(T, tClub + 0.4, tClub + 0.6, tClub + 0.8, tClub + 1.2), T), ripple: T > tClub + 0.4 ? T - tClub - 0.4 : -1 }} />}
        {arrows(hx, 560, 200, 0.2)}
        {arrows(rx, 560, 200, 0.6)}
      </svg>
      <Label x={960} y={96} text="nature" size={26} color={C.gold} o={bump(T, tHorse - 0.2, tHorse + 0.2, tPrey - 0.2, tPrey)} />
      <Label x={960} y={96} text="prey animals" size={26} color={TEAL} o={bump(T, tPrey, tPrey + 0.4, tClub - 0.3, tClub)} />
      <Label x={960} y={150} text="danger can come from anywhere" size={18} color={C.coral} o={bump(T, tDanger + 0.1, tDanger + 0.5, tClub - 0.3, tClub)} />
      <Label x={960} y={96} text="welcome to the 360° club" size={26} color={C.gold} o={step(T, tClub + 0.2, tClub + 0.6)} />
      <CounterBlock x={hx} y={850} label="horse" value={hFov} color={TEAL} size={58} align="center" opacity={hA} />
      <CounterBlock x={rx} y={850} label="rabbit" value={rFov} color={TEAL} size={58} align="center" opacity={rA} />
      <Vignette strength={0.45} />
    </AbsoluteFill>
  );
};
