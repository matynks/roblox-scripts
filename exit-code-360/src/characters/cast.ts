import { C } from "../style/palette";
import type { CharacterSpec } from "./types";

// Proportions measured from the reference (docs/01_REFERENCE_ANALYSIS.md §A):
// older sibling head ≈ 1/4 of height, younger sibling ≈ 1/3, limbs ≈ D/6.

export const LEO: CharacterSpec = {
  name: "Leo",
  D: 100,
  thigh: 80,
  shin: 80,
  upper: 68,
  fore: 66,
  torsoLen: 118,
  torsoW: 58,
  hemW: 0,
  limbW: 17,
  shoeL: 27,
  shoeH: 12,
  outfit: "jacket",
  cloth: C.leoBlue,
  clothShade: C.leoBlueShade,
  clothLight: C.leoBlueLight,
  hair: "none",
};

export const MIA: CharacterSpec = {
  name: "Mia",
  D: 84,
  thigh: 48,
  shin: 46,
  upper: 44,
  fore: 42,
  torsoLen: 80,
  torsoW: 44,
  hemW: 82,
  limbW: 14,
  shoeL: 21,
  shoeH: 10,
  outfit: "dress",
  cloth: C.miaPink,
  clothShade: C.miaPinkShade,
  clothLight: C.miaPinkLight,
  hair: "ponytail",
};

export const MR_BLACK: CharacterSpec = {
  name: "Mr. Black",
  D: 94,
  thigh: 94,
  shin: 92,
  upper: 78,
  fore: 74,
  torsoLen: 140,
  torsoW: 74,
  hemW: 0,
  limbW: 18,
  shoeL: 31,
  shoeH: 12,
  outfit: "suit",
  cloth: C.suitGrey,
  clothShade: C.suitGreyShade,
  clothLight: "#7C808B",
  hair: "slick",
};

// Background extras: plain black stick figures (no cloth colour), smaller heads.
export const EXTRA: CharacterSpec = {
  name: "Extra",
  D: 84,
  thigh: 82,
  shin: 80,
  upper: 66,
  fore: 64,
  torsoLen: 116,
  torsoW: 34,
  hemW: 0,
  limbW: 14,
  shoeL: 28,
  shoeH: 11,
  outfit: "plain",
  cloth: C.ink,
  clothShade: C.ink,
  clothLight: "#2A2530",
  hair: "none",
};
