// Scene table (narration seconds). xIn = cross-dissolve length into the scene.
import type React from "react";
import { PromenadeShots } from "../../scenes/poc/PromenadeShots";
import { VisionShot } from "../../scenes/poc/VisionShot";
import { S04Rule } from "./S04Rule";
import { S05Title } from "./S05Title";
import { S06Party } from "./S06Party";
import { S07Pickpocket } from "./S07Pickpocket";
import { S08Driving } from "./S08Driving";
import { S09Dodgeball } from "./S09Dodgeball";
import { S10Basketball } from "./S10Basketball";
import { S11Football } from "./S11Football";
import { S12Nature } from "./S12Nature";

export type SceneDef = { id: string; t0: number; xIn?: number; C: React.FC<{ T: number }> };

export const SCENES: SceneDef[] = [
  { id: "S01-S02 promenade", t0: 0, C: PromenadeShots },
  { id: "S03 field of view", t0: 29.12, C: VisionShot }, // fades itself in over the push-in
  { id: "S04 the rule", t0: 43.25, xIn: 0.35, C: S04Rule },
  { id: "S05 title", t0: 58.95, xIn: 0.55, C: S05Title },
  { id: "S06 surprise party", t0: 62.25, xIn: 0.4, C: S06Party },
  { id: "S07 pickpocket", t0: 73.62, C: S07Pickpocket },
  { id: "S08 driving", t0: 82.45, xIn: 0.2, C: S08Driving },
  { id: "S09 dodgeball", t0: 95.7, xIn: 0.25, C: S09Dodgeball },
  { id: "S10 basketball", t0: 106.85, xIn: 0.3, C: S10Basketball },
  { id: "S11 football", t0: 115.7, xIn: 0.3, C: S11Football },
  { id: "S12 nature", t0: 125.5, xIn: 0.45, C: S12Nature },
];
