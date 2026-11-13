// Character rig data types.
//
// Angles are in degrees in the figure's LOCAL screen plane, figure facing +x:
//   0 = limb pointing straight down, positive = rotated toward the facing side.
// Legs: shin angle = hip - knee  (knees bend backwards)
// Arms: forearm angle = sh + el  (elbows bend forwards)

export type Pose = {
  lean: number; // torso lean about the hip (+ forward)
  headTilt: number; // head roll (+ toward facing)
  headX: number; // head offset, in head-diameter units
  headY: number;
  shN: number; // near arm (drawn in front of torso)
  elN: number;
  shF: number; // far arm (behind torso)
  elF: number;
  hipN: number;
  knN: number;
  hipF: number;
  knF: number;
  footN: number; // shoe pitch (+ toe up)
  footF: number;
  bob: number; // extra vertical hip offset (units of head diameter, + up)
};

export type EyeKind = "dot" | "happy" | "closed" | "wide" | "lid";
export type MouthKind = "smile" | "flat" | "grin" | "o" | "talk" | "smirk" | "wobble";

export type Face = {
  eye: EyeKind;
  blink: number; // 0 open → 1 shut (dot/wide/lid)
  eyeScale: number;
  lookX: number; // -1..1 eye drift
  lookY: number;
  brow: number; // + worried (inner ends up), - angry (inner ends down)
  browY: number; // raise (+) / lower (-)
  browShow: number; // 0..1
  mouth: MouthKind;
  curve: number; // smile (+) / frown (-) amount for "smile"
  open: number; // 0..1 for talk / o / grin
  mouthW: number; // width multiplier
  tears: number; // 0..1
};

export type Outfit = "jacket" | "dress" | "suit" | "plain";

export type CharacterSpec = {
  name: string;
  D: number; // head diameter (local units)
  thigh: number;
  shin: number;
  upper: number;
  fore: number;
  torsoLen: number; // hip → shoulder
  torsoW: number;
  hemW: number; // dress hem width (dress only)
  limbW: number;
  shoeL: number;
  shoeH: number;
  outfit: Outfit;
  cloth: string;
  clothShade: string;
  clothLight: string;
  hair: "none" | "ponytail" | "slick";
};

export const NEUTRAL_FACE: Face = {
  eye: "dot",
  blink: 0,
  eyeScale: 1,
  lookX: 0,
  lookY: 0,
  brow: 0,
  browY: 0,
  browShow: 0,
  mouth: "smile",
  curve: 0.35,
  open: 0,
  mouthW: 1,
  tears: 0,
};

export const STAND: Pose = {
  lean: 0,
  headTilt: 0,
  headX: 0,
  headY: 0,
  shN: 6,
  elN: 10,
  shF: -6,
  elF: 10,
  hipN: 3,
  knN: 2,
  hipF: -3,
  knF: 2,
  footN: 0,
  footF: 0,
  bob: 0,
};
