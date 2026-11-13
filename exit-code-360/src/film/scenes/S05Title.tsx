// S05 Title (59.10–62.30): WHAT IF YOU HAD / 360° VISION? over the sunset sea.
import React from "react";
import { AbsoluteFill } from "remotion";
import { Hills, PROM, SkySea } from "../../env/Promenade";
import { Vignette } from "../../env/Atmosphere";
import { type Cam } from "../../lib/camera";
import { clamp, ease, lerp } from "../../lib/anim";
import { step } from "../../lib/acting";
import { P, W } from "../../lib/timing";
import { C } from "../../style/palette";
import { FONT } from "../../style/fonts";

const t0 = P(39).start; // 59.10 "So what if you had…"
const t360 = W("three", t0).start;

export const S05Title: React.FC<{ T: number }> = ({ T }) => {
  const k = clamp((T - t0) / 3.2);
  // sky parallax 0.04: cam.x = 8000 puts the sun right of centre (x≈1060), lighthouse clear of the title
  const cam: Cam = { x: 8000, y: -170, zoom: lerp(1.0, 1.05, ease.inOut(k)) };
  const a = step(T, t0 - 0.1, t0 + 0.5);
  const b = ease.outBack(clamp((T - t360 + 0.15) / 0.5));
  const ring = clamp((T - t360) / 1.2);
  const words = "WHAT IF YOU HAD".split(" ");
  const dip = clamp((T - 61.95) / 0.35); // dip to black before the time skip
  return (
    <AbsoluteFill>
      <SkySea cam={cam} t={T} />
      <Hills cam={cam} t={T} />
      <Vignette strength={0.55} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
        <div style={{ position: "absolute", top: 300, width: 1920, textAlign: "center" }}>
          {words.map((w, i) => {
            const o = clamp((T - t0 - i * 0.12) / 0.35);
            return (
              <span
                key={w + i}
                style={{
                  display: "inline-block",
                  margin: "0 14px",
                  fontWeight: 800,
                  fontSize: 46,
                  letterSpacing: "0.14em",
                  color: "#F6F1EA",
                  opacity: o * a,
                  transform: `translateY(${(1 - o) * 18}px)`,
                  textShadow: "0 0 18px rgba(255,220,240,0.35)",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            top: 370,
            width: 1920,
            textAlign: "center",
            fontWeight: 800,
            fontSize: 150,
            letterSpacing: "0.04em",
            color: C.gold,
            opacity: clamp(b * 1.5),
            transform: `scale(${lerp(0.85, 1, b)})`,
            textShadow: `0 0 40px rgba(242,197,92,0.55), 0 0 90px rgba(242,140,170,0.35)`,
          }}
        >
          360° VISION?
        </div>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {ring > 0 && (
            <circle
              cx={960}
              cy={460}
              r={360}
              fill="none"
              stroke={C.gold}
              strokeWidth={2.5}
              strokeDasharray={`${ring * 2262} 2262`}
              transform="rotate(-90 960 460)"
              opacity={0.75 * (1 - clamp((T - t360 - 2.0) / 0.6))}
            />
          )}
        </svg>
        <div
          style={{
            position: "absolute",
            top: 880,
            width: 1920,
            textAlign: "center",
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "0.5em",
            color: "rgba(246,241,234,0.75)",
            opacity: step(T, t0 + 0.6, t0 + 1.2),
          }}
        >
          EXIT CODE
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "#000", opacity: dip }} />
    </AbsoluteFill>
  );
};

