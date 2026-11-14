import React from "react";
import { Composition, Still } from "remotion";
import { CharacterSheet } from "./sheets/CharacterSheet";
import { POC } from "./scenes/poc/POC";
import { DURATION_FRAMES, FPS } from "./scenes/poc/timeline";
import { Film } from "./film/Film";
import { FILM_FRAMES } from "./lib/timing";
import { Teaser, TEASER_FRAMES } from "./teaser/Teaser";
import { Mystery, MYSTERY_FRAMES } from "./teaser/Mystery";
import { Thumbnail } from "./thumbnail/Thumbnail";
import { ThumbnailV2 } from "./thumbnail/ThumbnailV2";
import { ThumbnailFinal } from "./thumbnail/ThumbnailFinal";

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
    <Composition
      id="Teaser"
      component={Teaser}
      durationInFrames={TEASER_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ withAudio: true }}
    />
    <Composition
      id="TeaserMystery"
      component={Mystery}
      durationInFrames={MYSTERY_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{ withAudio: true }}
    />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} defaultProps={{ look: 1 }} />
    <Still id="ThumbnailV2" component={ThumbnailV2} width={1280} height={720} defaultProps={{ ring: "orbit" as const, expr: "awe" as const }} />
    <Still id="ThumbnailV2Flat" component={ThumbnailV2} width={1280} height={720} defaultProps={{ ring: "flat" as const, expr: "awe" as const }} />
    <Still id="ThumbnailV2Smirk" component={ThumbnailV2} width={1280} height={720} defaultProps={{ ring: "orbit" as const, expr: "smirk" as const }} />
    <Still id="ThumbnailFinal" component={ThumbnailFinal} width={1280} height={720} />
    <Still id="SheetLeo" component={CharacterSheet} width={1920} height={1080} defaultProps={{ who: "leo" as const }} />
    <Still id="SheetMia" component={CharacterSheet} width={1920} height={1080} defaultProps={{ who: "mia" as const }} />
    <Still id="SheetBlack" component={CharacterSheet} width={1920} height={1080} defaultProps={{ who: "black" as const }} />
  </>
);
