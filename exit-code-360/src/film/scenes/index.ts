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
import { S13Catch } from "./S13Catch";
import { S14Class } from "./S14Class";
import { S15MrBlack } from "./S15MrBlack";
import { S16Cost } from "./S16Cost";
import { S17Dopamine } from "./S17Dopamine";
import { S18NoOff } from "./S18NoOff";
import { S19Notebook } from "./S19Notebook";
import { S21Concert } from "./S21Concert";
import { S24Physics } from "./S24Physics";
import { S25Climax } from "./S25Climax";
import { S29Epilogue } from "./S29Epilogue";
import { S30Reality } from "./S30Reality";
import { S33Phone } from "./S33Phone";
import { S34Outro } from "./S34Outro";

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
  { id: "S13 the catch", t0: 136.3, xIn: 0.4, C: S13Catch },
  { id: "S14 class", t0: 150.95, xIn: 0.4, C: S14Class },
  { id: "S15 mr black", t0: 157.85, C: S15MrBlack },
  { id: "S16 cost", t0: 175.7, xIn: 0.45, C: S16Cost },
  { id: "S17 dopamine", t0: 184.4, xIn: 0.4, C: S17Dopamine },
  { id: "S18 no off switch", t0: 207.35, xIn: 0.4, C: S18NoOff },
  { id: "S19-S20 notebook", t0: 212.45, xIn: 0.6, C: S19Notebook },
  { id: "S21-S23 concert", t0: 251.3, xIn: 0.5, C: S21Concert },
  { id: "S24 physics", t0: 286.0, xIn: 0.35, C: S24Physics },
  { id: "S25-S28 climax", t0: 302.05, xIn: 0.35, C: S25Climax },
  { id: "S29 epilogue", t0: 352.05, xIn: 0.7, C: S29Epilogue },
  { id: "S30-S32 reality check", t0: 378.75, xIn: 0.6, C: S30Reality },
  { id: "S33 phone", t0: 414.1, xIn: 0.6, C: S33Phone },
  { id: "S34 outro", t0: 427.25, xIn: 0.6, C: S34Outro },
];
