import type { AvatarConfig } from '@/content/types';

export function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0').slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/** amt in -1..1 : negative darkens, positive lightens */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return `#${[f(r), f(g), f(b)].map((c) => clamp(c, 0, 255).toString(16).padStart(2, '0')).join('')}`;
}

export function luminance(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Geometry of the character for a given body configuration (viewBox 0 0 200 240). */
export interface BodyLayout {
  cx: number;
  head: { x: number; y: number; w: number; h: number; r: number };
  torso: { x: number; y: number; w: number; h: number };
  armW: number;
  leftArm: { x: number; y: number; h: number };
  rightArm: { x: number; y: number; h: number };
  legW: number;
  leftLeg: { x: number; y: number; h: number };
  rightLeg: { x: number; y: number; h: number };
  feetY: number;
  eyeY: number;
  eyeDx: number;
  mouthY: number;
}

export function bodyLayout(cfg: Pick<AvatarConfig, 'body_type' | 'height_scale' | 'head_scale'>): BodyLayout {
  const hs = clamp(Number(cfg.height_scale) || 1, 0.9, 1.1);
  const hd = clamp(Number(cfg.head_scale) || 1, 0.9, 1.1);
  const torsoW = cfg.body_type === 'slim' ? 54 : cfg.body_type === 'broad' ? 72 : 62;
  const armW = cfg.body_type === 'slim' ? 16 : cfg.body_type === 'broad' ? 20 : 18;
  const cx = 100;
  const feetY = 236;
  const legBottom = 230;
  const legLen = 44 * hs;
  const torsoLen = 64 * hs;
  const legTop = legBottom - legLen;
  const torsoBottom = legTop + 4;
  const torsoTop = torsoBottom - torsoLen;
  const headH = 86 * hd;
  const headW = 94 * hd;
  const headBottom = torsoTop + 5;
  const headTop = headBottom - headH;
  const torsoX = cx - torsoW / 2;
  const legW = torsoW / 2 - 3;
  return {
    cx,
    head: { x: cx - headW / 2, y: headTop, w: headW, h: headH, r: 30 * hd },
    torso: { x: torsoX, y: torsoTop, w: torsoW, h: torsoLen },
    armW,
    leftArm: { x: torsoX - armW - 2, y: torsoTop + 4, h: torsoLen - 6 },
    rightArm: { x: torsoX + torsoW + 2, y: torsoTop + 4, h: torsoLen - 6 },
    legW,
    leftLeg: { x: torsoX + 1, y: legTop, h: legLen },
    rightLeg: { x: cx + 2, y: legTop, h: legLen },
    feetY,
    eyeY: headTop + headH * 0.52,
    eyeDx: 17 * hd,
    mouthY: headTop + headH * 0.76,
  };
}

export const DEFAULT_AVATAR: AvatarConfig = { skin_tone: '#F2C9A0', body_type: 'classic', height_scale: 1, head_scale: 1, equipped: {} };

export const SKIN_TONES = ['#FFE3CC', '#FFDBB4', '#F7D7C4', '#F2C9A0', '#E0AC69', '#D19A66', '#C68642', '#A86B3C', '#8D5524', '#6B4226', '#5C3A21', '#3E2716', '#9AD1FF', '#B9F6CA', '#E1BEE7', '#B0BEC5'];
