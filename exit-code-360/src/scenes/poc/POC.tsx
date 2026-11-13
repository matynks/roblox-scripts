import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { Grain, Letterbox } from "../../env/Atmosphere";
import { loadFonts } from "../../style/fonts";
import { FxContext } from "../../lib/fx";
import { clamp, invLerp, useTime } from "../../lib/anim";
import { PromenadeShots } from "./PromenadeShots";
import { VisionShot } from "./VisionShot";
import { CUE, END, START } from "./timeline";

loadFonts();

/**
 * EXIT CODE 360 — proof of concept, narration 13.70 s → 43.20 s.
 * Shot A  (13.70–18.95) wide tracking: cyclist dodge "like a dancer"
 * Shot BC (18.95–29.35) two-shot: Mia "How?", seagull vs sandwich, push-in
 * Shot D  (29.12–43.20) top-down field-of-view science graphic
 */
export const POC: React.FC<{ withAudio?: boolean; blur?: number; grain?: boolean }> = ({ withAudio = true, blur = 1, grain = true }) => {
  const T = START + useTime();
  const fadeIn = 1 - clamp(invLerp(START, START + 0.45, T));
  const fadeOut = clamp(invLerp(CUE.fadeOut, END - 0.02, T));
  return (
    <FxContext.Provider value={{ blur, grain }}>
    <AbsoluteFill style={{ background: "#000" }}>
      {T < 29.42 && <PromenadeShots T={T} />}
      {T >= CUE.xfade && <VisionShot T={T} />}
      {grain && <Grain opacity={0.075} />}
      <Letterbox />
      <AbsoluteFill style={{ background: "#000", opacity: Math.max(fadeIn, fadeOut) }} />
      {withAudio && <Audio src={staticFile("audio/poc_mix.wav")} />}
    </AbsoluteFill>
    </FxContext.Provider>
  );
};
