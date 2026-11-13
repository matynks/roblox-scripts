import React from "react";
import { Composition, Still } from "remotion";
import { CharacterSheet } from "./sheets/CharacterSheet";
import { POC } from "./scenes/poc/POC";
import { DURATION_FRAMES, FPS } from "./scenes/poc/timeline";
import { Film } from "./film/Film";
import { FILM_FRAMES } from "./lib/timing";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="POC"
      component={POC}
      durationInFrames={DURATION_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ withAudio: true }}
    />
    <Composition
      id="Film"
      component={Film}
      durationInFrames={FILM_FRAMES}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ withAudio: true }}
    />
    <Still id="SheetLeo" component={CharacterSheet} width={1920} height={1080} defaultProps={{ who: "leo" as const }} />
    <Still id="SheetMia" component={CharacterSheet} width={1920} height={1080} defaultProps={{ who: "mia" as const }} />
    <Still id="SheetBlack" component={CharacterSheet} width={1920} height={1080} defaultProps={{ who: "black" as const }} />
  </>
);
