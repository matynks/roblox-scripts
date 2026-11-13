// EXIT CODE 360 — palette tokens derived from the reference analysis
// (docs/01_REFERENCE_ANALYSIS.md). Keep every color in the film here.

export const C = {
  // characters
  ink: "#14111A",
  inkFar: "#0E0C12",
  eyeWhite: "#F6F1EA",
  rimWarm: "#F4C590",
  rimCool: "#BFC8FF",
  tear: "#8FC7F2",

  leoBlue: "#3F6FA6",
  leoBlueShade: "#2C5283",
  leoBlueLight: "#6D98CC",

  miaPink: "#EC8FBF",
  miaPinkShade: "#C26C9B",
  miaPinkLight: "#F7B5D6",
  miaClip: "#F27BAA",

  cardboard: "#C79A68",
  cardboardEdge: "#9B7148",
  cardboardShade: "#A97E52",

  suitGrey: "#5B5F69",
  suitGreyShade: "#43464F",
  shirtWhite: "#E9E6E1",

  // sunset seaside set
  skyTop: "#2E2140",
  skyMid: "#5A3862",
  skyLow: "#A4628C",
  horizonGlow: "#E79AB2",
  sunCore: "#FFF4E8",
  sunBloom: "#F7B7C8",
  cloud: "#8E5A86",
  hillsFar: "#5A3A5C",
  hills: "#43304A",
  pines: "#2A1C2E",
  seaTop: "#8A5C7E",
  seaMid: "#6A4A66",
  seaLow: "#33263C",
  glint: "#F9DDEB",
  boardwalk: "#2B2331",
  boardwalkTop: "#4A3A4C",
  railing: "#1F1823",
  lampWarm: "#FFD9A0",

  // infographic space
  navyCenter: "#111833",
  navy: "#0C1226",
  navyEdge: "#050813",
  grid: "#1A2442",
  lineBlue: "#9CC8F2",
  lineBlueDim: "#4C6C93",
  gold: "#F2C55C",
  goldLight: "#FFE3A1",
  coral: "#FF5C6C",
  label: "#9FB2C8",
  number: "#DCE9FF",
} as const;

export type ColorToken = keyof typeof C;
