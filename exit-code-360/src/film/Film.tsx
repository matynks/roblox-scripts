// EXIT CODE — "What If You Had 360-Degree Vision?" — master composition.
// T = narration time (frame / fps). Scenes are pure functions of T; each
// scene is drawn from t0 until the next scene has fully faded in.
import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Grain, Letterbox } from "../env/Atmosphere";
import { loadFonts } from "../style/fonts";
import { FxContext } from "../lib/fx";
import { clamp, invLerp, useTime } from "../lib/anim";
import { NARRATION_SECONDS } from "../lib/timing";
import { SCENES } from "./scenes";

loadFonts();

export const Film: React.FC<{ withAudio?: boolean; blur?: number; grain?: boolean }> = ({ withAudio = true, blur = 1, grain = true }) => {
  const T = useTime();
  const fadeIn = 1 - clamp(invLerp(0, 0.7, T));
  const fadeOut = clamp(invLerp(NARRATION_SECONDS - 0.9, NARRATION_SECONDS, T));
  return (
    <FxContext.Provider value={{ blur, grain }}>
      <AbsoluteFill style={{ background: "#000" }}>
        {SCENES.map((s, i) => {
          const next = SCENES[i + 1];
          const end = next ? next.t0 + (next.xIn ?? 0) : Infinity;
          if (T < s.t0 || T >= end) return null;
          const o = s.xIn ? clamp((T - s.t0) / s.xIn) : 1;
          const C = s.C;
          return (
            <AbsoluteFill key={s.id} style={{ opacity: o }}>
              <C T={T} />
            </AbsoluteFill>
          );
        })}
        {grain && <Grain opacity={0.075} />}
        <Letterbox />
        <AbsoluteFill style={{ background: "#000", opacity: Math.max(fadeIn, fadeOut) }} />
        {withAudio && <Audio src={staticFile("audio/film_mix.wav")} />}
      </AbsoluteFill>
    </FxContext.Provider>
  );
};
