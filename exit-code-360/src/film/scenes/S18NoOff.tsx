// S18 "Worse, there's no off switch. And one night it costs far more." (207.57–212.77)
import React from "react";
import { AbsoluteFill } from "remotion";
import { Head } from "../../characters/Figure";
import { LEO } from "../../characters/cast";
import { FACES } from "../../characters/poses";
import { Label, step } from "../../lib/acting";
import { clamp, lerp } from "../../lib/anim";
import { P } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";
import { Vignette } from "../../env/Atmosphere";

const t0 = P(128).start; // 207.57
const tSwitch = t0 + 1.05;
const tNight = P(130).start; // 209.89

export const S18NoOff: React.FC<{ T: number }> = ({ T }) => {
  const off = step(T, tSwitch, tSwitch + 0.08);
  const out = clamp((T - tNight) / 2.4);
  const s = lerp(1, 0.72, out);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #161A30 0%, #06070E 75%)" }}>
      <svg width={1920} height={1080}>
        <g transform={`translate(960 540) scale(${s}) translate(-960 -540)`}>
          {[0, 1, 2].map((j) => {
            const k = (T * 0.6 + j / 3) % 1;
            return <circle key={j} cx={960} cy={540} r={240 + k * 240} fill="none" stroke={C.gold} strokeWidth={2.5} opacity={(1 - k) * 0.55} />;
          })}
          <circle cx={960} cy={540} r={250} fill="none" stroke={C.gold} strokeWidth={3} opacity={0.9} />
          <Head spec={LEO} id="s18" x={960} y={560} size={360} face={{ ...FACES.calm, curve: -0.1, mouth: "flat" }} turn={0} light={{ x: 0, y: -1 }} ring={0.6} rim="#BFC8FF" />
        </g>
        {/* light switch flipped to OFF — the ring stays on */}
        <g transform="translate(1480,520)" opacity={step(T, t0, t0 + 0.3) * (1 - out)}>
          <rect x={-46} y={-76} width={92} height={152} rx={14} fill="#E9E6E1" />
          <rect x={-20} y={-44} width={40} height={88} rx={8} fill="#BDB7AE" />
          <rect x={-16} y={lerp(-40, 4, off)} width={32} height={36} rx={6} fill="#5A5560" />
          <text x={0} y={110} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={24} fill={off > 0.5 ? C.coral : C.label} letterSpacing="4">
            {off > 0.5 ? "OFF" : "ON"}
          </text>
        </g>
      </svg>
      <Label x={960} y={96} text="no off switch" size={26} color={C.coral} o={step(T, tSwitch + 0.1, tSwitch + 0.4) * (1 - step(T, tNight, tNight + 0.4))} />
      <AbsoluteFill style={{ background: "#000", opacity: step(T, tNight + 1.6, tNight + 2.7) }} />
      <Vignette strength={0.5} />
    </AbsoluteFill>
  );
};
