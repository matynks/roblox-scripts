import type { ReactElement } from 'react';
import { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import type { ItemAsset, Pattern } from '@/content/types';

import { type BodyLayout, luminance, shade } from './layout';

/**
 * Original procedural artwork for every Blockora item shape.
 * Coordinates use the body layout (viewBox 0 0 200 240).
 */

type El = ReactElement | null;
type GlowProps = { stroke?: string; strokeOpacity?: number; strokeWidth?: number };
const OUTLINE = 'rgba(10,12,24,0.28)';

function star(cx: number, cy: number, r: number, inner = 0.45, points = 5) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const rad = (Math.PI / points) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${(cx + rr * Math.cos(rad)).toFixed(1)},${(cy + rr * Math.sin(rad)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.2} ${cx - s * 0.7} ${cy - s * 1.3} ${cx} ${cy - s * 0.4} C${cx + s * 0.7} ${cy - s * 1.3} ${cx + s * 1.6} ${cy - s * 0.2} ${cx} ${cy + s * 0.9}Z`;

/** Pattern elements for a rectangular region (caller clips them). */
export function patternFill(p: Pattern | undefined, x: number, y: number, w: number, h: number, color: string, key: string): El {
  if (!p || p === 'none') return null;
  const els: ReactElement[] = [];
  if (p === 'stripes') for (let yy = y + 5; yy < y + h; yy += 11) els.push(<Rect key={`${key}s${yy}`} x={x - 2} y={yy} width={w + 4} height={4.5} fill={color} />);
  if (p === 'dots') for (let yy = y + 6; yy < y + h; yy += 11) for (let xx = x + ((yy / 11) % 2 ? 5 : 10); xx < x + w; xx += 11) els.push(<Circle key={`${key}d${xx}-${yy}`} cx={xx} cy={yy} r={2.4} fill={color} />);
  if (p === 'checker') for (let yy = y; yy < y + h; yy += 10) for (let xx = x; xx < x + w; xx += 10) if (((xx - x) / 10 + (yy - y) / 10) % 2 === 0) els.push(<Rect key={`${key}c${xx}-${yy}`} x={xx} y={yy} width={10} height={10} fill={color} opacity={0.75} />);
  if (p === 'zigzag') for (let yy = y + 8; yy < y + h; yy += 14) {
    let d = `M${x - 4} ${yy}`;
    for (let xx = x - 4; xx < x + w + 8; xx += 8) d += ` L${xx + 4} ${yy - 4} L${xx + 8} ${yy}`;
    els.push(<Path key={`${key}z${yy}`} d={d} stroke={color} strokeWidth={2.5} fill="none" />);
  }
  if (p === 'stars') for (let i = 0; i < Math.max(4, Math.round((w * h) / 380)); i++) {
    const sx = x + ((i * 37) % Math.max(w - 6, 1)) + 3;
    const sy = y + ((i * 23 + 7) % Math.max(h - 6, 1)) + 3;
    els.push(<Polygon key={`${key}st${i}`} points={star(sx, sy, i % 3 === 0 ? 3.6 : 2.2)} fill={color} />);
  }
  if (p === 'flames') for (let xx = x; xx < x + w; xx += 12) els.push(<Path key={`${key}f${xx}`} d={`M${xx} ${y + h} Q${xx + 2} ${y + h - 14} ${xx + 6} ${y + h - 22} Q${xx + 9} ${y + h - 12} ${xx + 12} ${y + h}Z`} fill={color} opacity={0.85} />);
  if (p === 'emblem') {
    const cx = x + w / 2;
    const cy = y + h * 0.42;
    els.push(
      <G key={`${key}em`}>
        <Path d={`M${cx} ${cy - 9} L${cx + 9} ${cy - 4} L${cx} ${cy + 1} L${cx - 9} ${cy - 4}Z`} fill={shade(color, 0.25)} />
        <Path d={`M${cx - 9} ${cy - 4} L${cx} ${cy + 1} V${cy + 11} L${cx - 9} ${cy + 6}Z`} fill={color} />
        <Path d={`M${cx + 9} ${cy - 4} L${cx} ${cy + 1} V${cy + 11} L${cx + 9} ${cy + 6}Z`} fill={shade(color, -0.25)} />
      </G>,
    );
  }
  return <G>{els}</G>;
}

// ── Back items (drawn behind the body) ────────────────────────────────────
export function backItem(a: ItemAsset, L: BodyLayout, id: string): El {
  const { torso: T, cx } = L;
  const p = a.primary;
  const s = a.secondary ?? shade(p, -0.25);
  const glow: GlowProps = a.glow ? { stroke: a.secondary ?? p, strokeOpacity: 0.35, strokeWidth: 7 } : {};
  switch (a.shape) {
    case 'cape': {
      const d = `M${T.x + 4} ${T.y + 2} L${T.x + T.w - 4} ${T.y + 2} L${T.x + T.w + 22} ${L.leftLeg.y + L.leftLeg.h - 6} Q${cx} ${L.leftLeg.y + L.leftLeg.h + 6} ${T.x - 22} ${L.leftLeg.y + L.leftLeg.h - 6}Z`;
      return (
        <G>
          <Defs>
            <ClipPath id={`${id}cape`}>
              <Path d={d} />
            </ClipPath>
          </Defs>
          <Path d={d} fill={p} {...glow} />
          <G clipPath={`url(#${id}cape)`}>{patternFill(a.pattern, T.x - 24, T.y, T.w + 48, 140, shade(s, 0.4), `${id}cp`)}</G>
          <Path d={`M${T.x + 4} ${T.y + 2} L${T.x + T.w - 4} ${T.y + 2} L${T.x + T.w + 6} ${T.y + 14} L${T.x - 6} ${T.y + 14}Z`} fill={s} />
        </G>
      );
    }
    case 'wings':
    case 'angel_wings':
    case 'bat_wings': {
      const y0 = T.y + 8;
      const wing = (dir: 1 | -1) => {
        const x0 = dir === 1 ? T.x + T.w - 6 : T.x + 6;
        if (a.shape === 'bat_wings') {
          const tip = x0 + dir * 70;
          return `M${x0} ${y0} Q${x0 + dir * 30} ${y0 - 34} ${tip} ${y0 - 18} L${tip - dir * 6} ${y0 + 22} Q${tip - dir * 16} ${y0 + 12} ${tip - dir * 24} ${y0 + 30} Q${tip - dir * 34} ${y0 + 18} ${tip - dir * 44} ${y0 + 38} Q${x0 + dir * 14} ${y0 + 26} ${x0} ${y0 + 40}Z`;
        }
        if (a.shape === 'angel_wings') {
          return `M${x0} ${y0 + 4} Q${x0 + dir * 26} ${y0 - 46} ${x0 + dir * 72} ${y0 - 30} Q${x0 + dir * 66} ${y0 - 10} ${x0 + dir * 74} ${y0 + 4} Q${x0 + dir * 60} ${y0 + 16} ${x0 + dir * 66} ${y0 + 32} Q${x0 + dir * 44} ${y0 + 36} ${x0 + dir * 44} ${y0 + 54} Q${x0 + dir * 18} ${y0 + 44} ${x0} ${y0 + 44}Z`;
        }
        return `M${x0} ${y0} Q${x0 + dir * 60} ${y0 - 52} ${x0 + dir * 70} ${y0 - 6} Q${x0 + dir * 66} ${y0 + 16} ${x0 + dir * 28} ${y0 + 20} Q${x0 + dir * 58} ${y0 + 34} ${x0 + dir * 46} ${y0 + 62} Q${x0 + dir * 22} ${y0 + 66} ${x0} ${y0 + 30}Z`;
      };
      return (
        <G>
          {([-1, 1] as const).map((dir) => (
            <G key={dir}>
              <Path d={wing(dir)} fill={p} {...glow} />
              <Path d={wing(dir)} fill={s} opacity={0.45} transform={`translate(${cx} ${y0}) scale(0.62) translate(${-cx} ${-y0})`} />
            </G>
          ))}
        </G>
      );
    }
    case 'backpack':
      return (
        <G>
          <Rect x={T.x - 8} y={T.y + 6} width={T.w + 16} height={T.h * 0.8} rx={12} fill={p} />
          <Rect x={T.x - 8} y={T.y + T.h * 0.52} width={T.w + 16} height={T.h * 0.34} rx={10} fill={s} />
        </G>
      );
    case 'jetpack':
      return (
        <G>
          {[T.x - 12, T.x + T.w - 4].map((x, i) => (
            <G key={i}>
              <Rect x={x} y={T.y + 2} width={16} height={T.h * 0.85} rx={8} fill={p} stroke={OUTLINE} strokeWidth={1} />
              <Rect x={x + 3} y={T.y + 8} width={10} height={6} rx={3} fill={a.accent ?? '#FF7B00'} />
              <Path d={`M${x + 2} ${T.y + T.h * 0.85} Q${x + 8} ${T.y + T.h * 0.85 + 30} ${x + 14} ${T.y + T.h * 0.85}Z`} fill={a.accent ?? '#FF7B00'} opacity={0.9} />
              <Path d={`M${x + 5} ${T.y + T.h * 0.85} Q${x + 8} ${T.y + T.h * 0.85 + 16} ${x + 11} ${T.y + T.h * 0.85}Z`} fill="#FFE066" />
            </G>
          ))}
        </G>
      );
    case 'sword':
      return (
        <G transform={`rotate(-32 ${cx} ${T.y + 30})`}>
          <Rect x={cx - 5} y={T.y - 48} width={10} height={96} rx={2} fill={p} stroke={shade(p, -0.3)} strokeWidth={1.5} />
          <Rect x={cx - 15} y={T.y + 46} width={30} height={7} rx={3} fill={s} />
          <Rect x={cx - 4} y={T.y + 52} width={8} height={20} rx={3} fill={shade(s, -0.2)} />
        </G>
      );
    case 'guitar':
      return (
        <G transform={`rotate(28 ${cx} ${T.y + 30})`}>
          <Rect x={cx - 3.5} y={T.y - 44} width={7} height={70} fill={shade(s, 0.2)} />
          <Rect x={cx - 7} y={T.y - 54} width={14} height={14} rx={3} fill={s} />
          <Ellipse cx={cx} cy={T.y + 46} rx={26} ry={30} fill={p} />
          <Circle cx={cx} cy={T.y + 40} r={7} fill={shade(p, -0.45)} />
        </G>
      );
    case 'shield':
      return (
        <G>
          <Path d={`M${T.x + T.w - 10} ${T.y + 2} h40 v34 q0 26 -20 36 q-20 -10 -20 -36Z`} fill={p} stroke={shade(p, -0.3)} strokeWidth={2} />
          <Polygon points={star(T.x + T.w + 10, T.y + 28, 9)} fill={a.accent ?? '#FFC53D'} />
        </G>
      );
    default:
      return null;
  }
}

/** Straps/details of back items that appear in front of the torso. */
export function backItemFront(a: ItemAsset, L: BodyLayout): El {
  const { torso: T } = L;
  if (a.shape === 'backpack') {
    const s = a.secondary ?? shade(a.primary, -0.25);
    return (
      <G>
        <Rect x={T.x + 8} y={T.y + 2} width={6} height={T.h * 0.7} rx={3} fill={s} />
        <Rect x={T.x + T.w - 14} y={T.y + 2} width={6} height={T.h * 0.7} rx={3} fill={s} />
      </G>
    );
  }
  if (a.shape === 'cape') {
    return <Circle cx={T.x + T.w / 2} cy={T.y + 6} r={4.5} fill={a.secondary ?? '#FFC53D'} />;
  }
  return null;
}

// ── Hair ──────────────────────────────────────────────────────────────────
export function hairBack(a: ItemAsset, L: BodyLayout): El {
  const H = L.head;
  const p = a.primary;
  switch (a.shape) {
    case 'long':
      return <Rect x={H.x - 6} y={H.y + 10} width={H.w + 12} height={H.h + 26} rx={22} fill={shade(p, -0.12)} />;
    case 'afro':
      return <Circle cx={L.cx} cy={H.y + H.h * 0.38} r={H.w * 0.68} fill={p} />;
    case 'ponytail':
      return <Path d={`M${H.x + H.w - 6} ${H.y + 22} q34 8 26 60 q-6 18 -16 6 q8 -34 -16 -52Z`} fill={p} />;
    case 'curly':
      return <Rect x={H.x - 8} y={H.y + 4} width={H.w + 16} height={H.h * 0.72} rx={30} fill={shade(p, -0.1)} />;
    default:
      return null;
  }
}

export function hairFront(a: ItemAsset, L: BodyLayout, id: string): El {
  const H = L.head;
  const p = a.primary;
  const s = a.secondary ?? shade(p, 0.18);
  const x0 = H.x;
  const x1 = H.x + H.w;
  const y0 = H.y;
  const cap = `M${x0 - 3} ${y0 + H.h * 0.46} Q${x0 - 4} ${y0 - 8} ${L.cx} ${y0 - 9} Q${x1 + 4} ${y0 - 8} ${x1 + 3} ${y0 + H.h * 0.46} Q${x1 - 6} ${y0 + 16} ${L.cx} ${y0 + 18} Q${x0 + 6} ${y0 + 16} ${x0 - 3} ${y0 + H.h * 0.46}Z`;
  const glow: GlowProps = a.glow ? { stroke: p, strokeOpacity: 0.4, strokeWidth: 6 } : {};
  switch (a.shape) {
    case 'short':
      return <Path d={cap} fill={p} />;
    case 'buzz':
      return <Path d={`M${x0} ${y0 + H.h * 0.34} Q${x0} ${y0 - 3} ${L.cx} ${y0 - 4} Q${x1} ${y0 - 3} ${x1} ${y0 + H.h * 0.34} Q${L.cx} ${y0 + 8} ${x0} ${y0 + H.h * 0.34}Z`} fill={p} opacity={0.85} />;
    case 'swoop':
      return (
        <G>
          <Path d={cap} fill={p} />
          <Path d={`M${x0 + 4} ${y0 + 26} Q${L.cx - 10} ${y0 - 20} ${x1 + 8} ${y0 + 8} Q${L.cx + 14} ${y0 + 10} ${L.cx - 6} ${y0 + 34} Q${x0 + 14} ${y0 + 36} ${x0 + 4} ${y0 + 26}Z`} fill={shade(p, 0.12)} />
        </G>
      );
    case 'spiky': {
      let d = `M${x0 - 2} ${y0 + H.h * 0.4}`;
      const n = 6;
      for (let i = 0; i <= n; i++) {
        const x = x0 - 2 + ((H.w + 4) / n) * i;
        d += ` L${x - (H.w + 4) / n / 2} ${y0 - 14 - (i % 2) * 6} L${x} ${y0 + 6}`;
      }
      d += ` L${x1 + 2} ${y0 + H.h * 0.4} Q${L.cx} ${y0 + 12} ${x0 - 2} ${y0 + H.h * 0.4}Z`;
      return (
        <G>
          <Path d={cap} fill={p} />
          <Path d={d} fill={p} {...glow} />
          <Path d={`M${x0 + 10} ${y0 + 6} L${L.cx - 8} ${y0 - 10} L${L.cx} ${y0 + 6}`} fill={s} opacity={0.5} />
        </G>
      );
    }
    case 'long':
      return (
        <G>
          <Path d={cap} fill={p} />
          <Path d={`M${x0 - 3} ${y0 + 30} Q${x0 - 6} ${y0 + 70} ${x0 + 4} ${y0 + H.h + 10} L${x0 + 12} ${y0 + 40}Z`} fill={p} />
          <Path d={`M${x1 + 3} ${y0 + 30} Q${x1 + 6} ${y0 + 70} ${x1 - 4} ${y0 + H.h + 10} L${x1 - 12} ${y0 + 40}Z`} fill={p} />
          <Path d={`M${L.cx - 20} ${y0 - 2} Q${L.cx} ${y0 + 10} ${L.cx + 26} ${y0 + 2}`} stroke={s} strokeWidth={3} fill="none" opacity={0.5} />
        </G>
      );
    case 'bun':
      return (
        <G>
          <Circle cx={L.cx} cy={y0 - 12} r={15} fill={shade(p, -0.08)} />
          <Path d={cap} fill={p} />
        </G>
      );
    case 'mohawk':
      return (
        <G>
          <Path d={`M${x0 + 8} ${y0 + 26} Q${L.cx} ${y0 + 6} ${x1 - 8} ${y0 + 26}`} stroke={shade(p, -0.35)} strokeWidth={3} fill="none" opacity={0.35} />
          <Path d={`M${L.cx - 10} ${y0 + 14} L${L.cx - 12} ${y0 - 18} L${L.cx - 4} ${y0 - 8} L${L.cx} ${y0 - 30} L${L.cx + 4} ${y0 - 8} L${L.cx + 12} ${y0 - 18} L${L.cx + 10} ${y0 + 14}Z`} fill={p} {...glow} />
        </G>
      );
    case 'curly':
    case 'afro': {
      const bumps = a.shape === 'afro' ? 9 : 8;
      const r = a.shape === 'afro' ? 14 : 12;
      return (
        <G>
          <Path d={cap} fill={p} />
          {Array.from({ length: bumps }, (_, i) => {
            const ang = Math.PI + (Math.PI / (bumps - 1)) * i;
            return <Circle key={i} cx={L.cx + Math.cos(ang) * (H.w / 2 + 2)} cy={y0 + H.h * 0.36 + Math.sin(ang) * (H.h * 0.46)} r={r} fill={i % 2 ? p : s} />;
          })}
          {a.pattern === 'stars' ? patternFill('stars', x0 - 10, y0 - 22, H.w + 20, 40, '#FFFFFF', `${id}hs`) : null}
        </G>
      );
    }
    case 'ponytail':
      return (
        <G>
          <Path d={cap} fill={p} />
          <Circle cx={x1 - 4} cy={y0 + 22} r={5} fill={shade(p, -0.3)} />
        </G>
      );
    default:
      return <Path d={cap} fill={p} />;
  }
}

// ── Face ──────────────────────────────────────────────────────────────────
export function face(a: ItemAsset | undefined, L: BodyLayout, skin: string): El {
  const { cx, eyeY: ey, eyeDx: dx, mouthY: my } = L;
  const ink = a?.primary ?? '#1E1E24';
  const blush = <G opacity={0.35}>
    <Ellipse cx={cx - dx - 9} cy={my - 6} rx={7} ry={4} fill="#FF7A8A" />
    <Ellipse cx={cx + dx + 9} cy={my - 6} rx={7} ry={4} fill="#FF7A8A" />
  </G>;
  const eye = (x: number, r = 5.5) => (
    <G key={x}>
      <Ellipse cx={x} cy={ey} rx={r * 0.8} ry={r * 1.1} fill={ink} />
      <Circle cx={x + 1.6} cy={ey - 2.4} r={r * 0.32} fill="#FFFFFF" />
    </G>
  );
  const shape = a?.shape ?? 'smile';
  switch (shape) {
    case 'grin':
      return (
        <G>
          {eye(cx - dx)}
          {eye(cx + dx)}
          {blush}
          <Path d={`M${cx - 15} ${my - 6} Q${cx} ${my - 4} ${cx + 15} ${my - 6} Q${cx + 12} ${my + 10} ${cx} ${my + 10} Q${cx - 12} ${my + 10} ${cx - 15} ${my - 6}Z`} fill={ink} />
          <Path d={`M${cx - 12} ${my - 5} Q${cx} ${my - 3.5} ${cx + 12} ${my - 5} L${cx + 11} ${my - 1} L${cx - 11} ${my - 1}Z`} fill="#FFFFFF" />
        </G>
      );
    case 'cool':
      return (
        <G>
          <Path d={`M${cx - dx - 7} ${ey} Q${cx - dx} ${ey - 4} ${cx - dx + 7} ${ey}`} stroke={ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          <Path d={`M${cx + dx - 7} ${ey} Q${cx + dx} ${ey - 4} ${cx + dx + 7} ${ey}`} stroke={ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          <Path d={`M${cx - 9} ${my - 2} Q${cx + 2} ${my + 4} ${cx + 12} ${my - 5}`} stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'wink':
      return (
        <G>
          <Path d={`M${cx - dx - 6} ${ey + 1} Q${cx - dx} ${ey - 5} ${cx - dx + 6} ${ey + 1}`} stroke={ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />
          {eye(cx + dx)}
          {blush}
          <Path d={`M${cx - 11} ${my - 4} Q${cx} ${my + 7} ${cx + 11} ${my - 4}`} stroke={ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'surprised':
      return (
        <G>
          {eye(cx - dx, 6.8)}
          {eye(cx + dx, 6.8)}
          <Path d={`M${cx - dx - 7} ${ey - 13} q7 -5 14 0 M${cx + dx - 7} ${ey - 13} q7 -5 14 0`} stroke={ink} strokeWidth={2.5} strokeLinecap="round" fill="none" />
          <Ellipse cx={cx} cy={my} rx={5.5} ry={7} fill={ink} />
        </G>
      );
    case 'determined':
      return (
        <G>
          {eye(cx - dx)}
          {eye(cx + dx)}
          <Path d={`M${cx - dx - 8} ${ey - 12} L${cx - dx + 6} ${ey - 8} M${cx + dx + 8} ${ey - 12} L${cx + dx - 6} ${ey - 8}`} stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
          <Path d={`M${cx - 9} ${my} L${cx + 9} ${my - 2}`} stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <Path d={`M${cx - dx - 6} ${ey} Q${cx - dx} ${ey + 5} ${cx - dx + 6} ${ey}`} stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Path d={`M${cx + dx - 6} ${ey} Q${cx + dx} ${ey + 5} ${cx + dx + 6} ${ey}`} stroke={ink} strokeWidth={3} strokeLinecap="round" fill="none" />
          <Ellipse cx={cx} cy={my} rx={4} ry={3} fill={ink} />
          <Path d={`M${L.head.x + L.head.w - 10} ${L.head.y + 14} h8 l-8 8 h8`} stroke={ink} strokeWidth={2} fill="none" opacity={0.6} />
        </G>
      );
    case 'starry':
      return (
        <G>
          <Polygon points={star(cx - dx, ey, 8)} fill={a?.accent ?? '#FFC53D'} stroke={shade(a?.accent ?? '#FFC53D', -0.35)} strokeWidth={1} />
          <Polygon points={star(cx + dx, ey, 8)} fill={a?.accent ?? '#FFC53D'} stroke={shade(a?.accent ?? '#FFC53D', -0.35)} strokeWidth={1} />
          {blush}
          <Path d={`M${cx - 12} ${my - 5} Q${cx} ${my + 9} ${cx + 12} ${my - 5}Z`} fill={ink} />
        </G>
      );
    case 'robot':
      return (
        <G>
          <Rect x={cx - dx - 12} y={ey - 7} width={dx * 2 + 24} height={13} rx={6} fill="#0B1220" />
          <Rect x={cx - dx - 9} y={ey - 3} width={dx * 2 + 18} height={5} rx={2.5} fill={ink} opacity={0.95} />
          <Rect x={cx - dx - 12} y={ey - 7} width={dx * 2 + 24} height={13} rx={6} fill="none" stroke={ink} strokeOpacity={0.35} strokeWidth={4} />
          {[-8, -2.5, 3, 8.5].map((o) => (
            <Rect key={o} x={cx + o - 2} y={my - 4} width={3.5} height={7} rx={1} fill={ink} opacity={0.85} />
          ))}
        </G>
      );
    case 'cat':
      return (
        <G>
          {eye(cx - dx)}
          {eye(cx + dx)}
          <Path d={`M${cx - 3} ${my - 10} h6 l-3 3.5Z`} fill={a?.accent ?? '#FF8FAB'} />
          <Path d={`M${cx - 9} ${my - 3} q4.5 5 9 0 q4.5 5 9 0`} stroke={ink} strokeWidth={2.6} strokeLinecap="round" fill="none" />
          <Path d={`M${cx - 18} ${my - 8} h-14 M${cx - 18} ${my - 4} l-13 4 M${cx + 18} ${my - 8} h14 M${cx + 18} ${my - 4} l13 4`} stroke={ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.7} />
        </G>
      );
    case 'smile':
    default:
      return (
        <G>
          {eye(cx - dx)}
          {eye(cx + dx)}
          {luminance(skin) > 0.35 ? blush : null}
          <Path d={`M${cx - 11} ${my - 4} Q${cx} ${my + 7} ${cx + 11} ${my - 4}`} stroke={ink} strokeWidth={3.2} strokeLinecap="round" fill="none" />
        </G>
      );
  }
}

export function faceAccessory(a: ItemAsset, L: BodyLayout, id: string): El {
  const { cx, eyeY: ey, eyeDx: dx, mouthY: my } = L;
  const p = a.primary;
  const s = a.secondary ?? shade(p, 0.3);
  switch (a.shape) {
    case 'glasses':
      return (
        <G>
          <Circle cx={cx - dx} cy={ey} r={10} fill="#FFFFFF" fillOpacity={0.15} stroke={p} strokeWidth={3} />
          <Circle cx={cx + dx} cy={ey} r={10} fill="#FFFFFF" fillOpacity={0.15} stroke={p} strokeWidth={3} />
          <Path d={`M${cx - dx + 10} ${ey - 1} Q${cx} ${ey - 5} ${cx + dx - 10} ${ey - 1}`} stroke={p} strokeWidth={3} fill="none" />
        </G>
      );
    case 'shades':
      return (
        <G>
          <Path d={`M${cx - dx - 13} ${ey - 7} h24 q2 12 -10 14 q-12 0 -14 -14Z`} fill={p} />
          <Path d={`M${cx + dx - 11} ${ey - 7} h24 q-2 14 -14 14 q-12 -2 -10 -14Z`} fill={p} />
          <Rect x={cx - dx + 10} y={ey - 7} width={2 * dx - 20} height={3} fill={p} />
          <Path d={`M${cx - dx - 8} ${ey - 3} l6 0 M${cx + dx - 6} ${ey - 3} l6 0`} stroke={s} strokeWidth={2.5} strokeLinecap="round" />
        </G>
      );
    case 'visor':
      return (
        <G>
          <Defs>
            <ClipPath id={`${id}vz`}>
              <Rect x={L.head.x - 4} y={ey - 10} width={L.head.w + 8} height={18} rx={9} />
            </ClipPath>
          </Defs>
          <Rect x={L.head.x - 4} y={ey - 10} width={L.head.w + 8} height={18} rx={9} fill={p} opacity={0.88} stroke={p} strokeOpacity={a.glow ? 0.4 : 0} strokeWidth={6} />
          {a.secondary ? <Rect x={L.cx} y={ey - 10} width={L.head.w / 2 + 4} height={18} fill={a.secondary} opacity={0.75} clipPath={`url(#${id}vz)`} /> : null}
          <Rect x={L.head.x + 8} y={ey - 6} width={L.head.w * 0.35} height={3} rx={1.5} fill="#FFFFFF" opacity={0.7} />
        </G>
      );
    case 'mask':
      return (
        <G>
          <Path d={`M${L.head.x + 4} ${my - 14} Q${cx} ${my - 20} ${L.head.x + L.head.w - 4} ${my - 14} L${L.head.x + L.head.w - 10} ${L.head.y + L.head.h - 4} Q${cx} ${L.head.y + L.head.h + 6} ${L.head.x + 10} ${L.head.y + L.head.h - 4}Z`} fill={p} />
          <Path d={`M${L.head.x + L.head.w - 8} ${my - 12} q14 4 18 18`} stroke={p} strokeWidth={4} fill="none" />
        </G>
      );
    case 'monocle':
      return (
        <G>
          <Circle cx={cx + dx} cy={ey} r={11} fill="#FFFFFF" fillOpacity={0.18} stroke={p} strokeWidth={3} />
          <Path d={`M${cx + dx + 8} ${ey + 8} Q${cx + dx + 16} ${my + 10} ${cx + dx + 4} ${my + 22}`} stroke={p} strokeWidth={1.6} fill="none" />
        </G>
      );
    case 'goggles':
      return (
        <G>
          <Rect x={L.head.x - 3} y={ey - 4} width={L.head.w + 6} height={8} rx={4} fill={shade(p, -0.3)} />
          <Circle cx={cx - dx} cy={ey} r={12} fill={s} stroke={p} strokeWidth={4} />
          <Circle cx={cx + dx} cy={ey} r={12} fill={s} stroke={p} strokeWidth={4} />
          <Circle cx={cx - dx - 4} cy={ey - 4} r={3} fill="#FFFFFF" opacity={0.7} />
          <Circle cx={cx + dx - 4} cy={ey - 4} r={3} fill="#FFFFFF" opacity={0.7} />
        </G>
      );
    case 'eyepatch':
      return (
        <G>
          <Path d={`M${L.head.x} ${ey - 16} L${L.head.x + L.head.w} ${ey + 10}`} stroke={p} strokeWidth={2.5} />
          <Ellipse cx={cx - dx} cy={ey} rx={10} ry={9} fill={p} />
        </G>
      );
    case 'star_glasses':
      return (
        <G>
          <Polygon points={star(cx - dx, ey, 13, 0.55)} fill={s} fillOpacity={0.55} stroke={p} strokeWidth={2.8} strokeLinejoin="round" />
          <Polygon points={star(cx + dx, ey, 13, 0.55)} fill={s} fillOpacity={0.55} stroke={p} strokeWidth={2.8} strokeLinejoin="round" />
        </G>
      );
    case 'heart_glasses':
      return (
        <G>
          <Path d={heart(cx - dx, ey, 9)} fill={p} fillOpacity={0.6} stroke={p} strokeWidth={2.5} />
          <Path d={heart(cx + dx, ey, 9)} fill={p} fillOpacity={0.6} stroke={p} strokeWidth={2.5} />
          <Path d={`M${cx - dx + 9} ${ey - 3} h${2 * dx - 18}`} stroke={p} strokeWidth={2.5} />
        </G>
      );
    default:
      return null;
  }
}

// ── Hats ──────────────────────────────────────────────────────────────────
export function hat(a: ItemAsset, L: BodyLayout, id: string): El {
  const H = L.head;
  const { cx } = L;
  const p = a.primary;
  const s = a.secondary ?? shade(p, -0.25);
  const acc = a.accent ?? '#FFC53D';
  const top = H.y;
  const glow: GlowProps = a.glow ? { stroke: a.secondary ?? p, strokeOpacity: 0.4, strokeWidth: 6 } : {};
  const dome = `M${H.x - 4} ${top + 26} Q${H.x - 2} ${top - 14} ${cx} ${top - 16} Q${H.x + H.w + 2} ${top - 14} ${H.x + H.w + 4} ${top + 26}Z`;
  switch (a.shape) {
    case 'cap':
      return (
        <G>
          <Path d={dome} fill={p} />
          <Path d={`M${cx} ${top + 22} L${H.x + H.w + 32} ${top + 26} Q${H.x + H.w + 30} ${top + 34} ${cx} ${top + 30}Z`} fill={s} />
          <Rect x={H.x - 4} y={top + 20} width={H.w + 8} height={8} rx={3} fill={shade(p, -0.2)} />
          <Circle cx={cx} cy={top - 15} r={3.5} fill={s} />
          {a.pattern === 'emblem' ? patternFill('emblem', cx - 20, top - 8, 40, 30, a.secondary ?? '#FFFFFF', `${id}cap`) : null}
        </G>
      );
    case 'beanie':
      return (
        <G>
          <Path d={dome} fill={p} />
          {a.pattern === 'stars' ? (
            <G>
              <Defs>
                <ClipPath id={`${id}bn`}>
                  <Path d={dome} />
                </ClipPath>
              </Defs>
              <G clipPath={`url(#${id}bn)`}>{patternFill('stars', H.x - 4, top - 16, H.w + 8, 40, s, `${id}bns`)}</G>
            </G>
          ) : null}
          <Rect x={H.x - 6} y={top + 14} width={H.w + 12} height={14} rx={6} fill={s} />
          {Array.from({ length: 9 }, (_, i) => (
            <Line key={i} x1={H.x + (H.w / 8) * i} y1={top + 16} x2={H.x + (H.w / 8) * i} y2={top + 26} stroke={shade(s, -0.2)} strokeWidth={1.4} />
          ))}
          <Circle cx={cx} cy={top - 18} r={8} fill={s} />
        </G>
      );
    case 'tophat':
      return (
        <G>
          <Rect x={cx - 30} y={top - 36} width={60} height={50} rx={5} fill={p} />
          <Rect x={cx - 30} y={top + 2} width={60} height={9} fill={s} />
          <Rect x={H.x - 8} y={top + 10} width={H.w + 16} height={8} rx={4} fill={shade(p, 0.12)} />
        </G>
      );
    case 'crown': {
      const y = top - 20;
      return (
        <G>
          <Path d={`M${cx - 34} ${top + 10} L${cx - 36} ${y} L${cx - 18} ${y + 14} L${cx} ${y - 6} L${cx + 18} ${y + 14} L${cx + 36} ${y} L${cx + 34} ${top + 10}Z`} fill={p} stroke={shade(p, -0.3)} strokeWidth={1.6} strokeLinejoin="round" {...glow} />
          <Rect x={cx - 34} y={top + 4} width={68} height={8} rx={3} fill={shade(p, -0.15)} />
          <Circle cx={cx} cy={top + 8} r={4} fill={acc} />
          <Circle cx={cx - 20} cy={top + 8} r={3} fill={acc} />
          <Circle cx={cx + 20} cy={top + 8} r={3} fill={acc} />
          <Circle cx={cx} cy={y - 6} r={3.5} fill={acc} />
        </G>
      );
    }
    case 'headphones':
      return (
        <G>
          <Path d={`M${H.x - 2} ${top + 40} Q${H.x - 6} ${top - 20} ${cx} ${top - 22} Q${H.x + H.w + 6} ${top - 20} ${H.x + H.w + 2} ${top + 40}`} stroke={p} strokeWidth={8} fill="none" strokeLinecap="round" />
          <Rect x={H.x - 12} y={top + 30} width={16} height={28} rx={7} fill={p} />
          <Rect x={H.x + H.w - 4} y={top + 30} width={16} height={28} rx={7} fill={p} />
          <Rect x={H.x - 9} y={top + 35} width={4} height={18} rx={2} fill={acc} />
          <Rect x={H.x + H.w + 5} y={top + 35} width={4} height={18} rx={2} fill={acc} />
        </G>
      );
    case 'horns':
      return (
        <G {...glow}>
          <Path d={`M${H.x + 16} ${top + 8} Q${H.x - 8} ${top - 12} ${H.x + 2} ${top - 34} Q${H.x + 14} ${top - 14} ${H.x + 30} ${top + 2}Z`} fill={p} />
          <Path d={`M${H.x + H.w - 16} ${top + 8} Q${H.x + H.w + 8} ${top - 12} ${H.x + H.w - 2} ${top - 34} Q${H.x + H.w - 14} ${top - 14} ${H.x + H.w - 30} ${top + 2}Z`} fill={p} />
          {a.secondary ? <Path d={`M${H.x + 6} ${top - 20} q4 6 10 10 M${H.x + H.w - 6} ${top - 20} q-4 6 -10 10`} stroke={a.secondary} strokeWidth={2.5} fill="none" /> : null}
        </G>
      );
    case 'halo':
      return (
        <G>
          <Ellipse cx={cx} cy={top - 18} rx={34} ry={8} fill="none" stroke={p} strokeWidth={10} strokeOpacity={0.35} />
          <Ellipse cx={cx} cy={top - 18} rx={34} ry={8} fill="none" stroke={p} strokeWidth={5} />
        </G>
      );
    case 'wizard':
      return (
        <G>
          <Path d={`M${H.x - 2} ${top + 14} L${cx + 26} ${top - 52} Q${cx + 34} ${top - 50} ${cx + 30} ${top - 38} L${H.x + H.w + 2} ${top + 14}Z`} fill={p} />
          <G>
            <Defs>
              <ClipPath id={`${id}wz`}>
                <Path d={`M${H.x - 2} ${top + 14} L${cx + 26} ${top - 52} L${H.x + H.w + 2} ${top + 14}Z`} />
              </ClipPath>
            </Defs>
            <G clipPath={`url(#${id}wz)`}>{patternFill('stars', H.x, top - 52, H.w, 66, s, `${id}wzs`)}</G>
          </G>
          <Ellipse cx={cx} cy={top + 14} rx={H.w / 2 + 16} ry={9} fill={shade(p, -0.2)} />
        </G>
      );
    case 'helmet':
      return (
        <G>
          <Rect x={H.x - 8} y={top - 10} width={H.w + 16} height={H.h + 12} rx={H.r + 8} fill={p} stroke={shade(p, -0.25)} strokeWidth={2} {...glow} />
          <Rect x={H.x + 6} y={L.eyeY - 16} width={H.w - 12} height={34} rx={14} fill={s} opacity={a.glow ? 0.55 : 0.85} />
          <Rect x={H.x + 12} y={L.eyeY - 12} width={H.w * 0.3} height={5} rx={2.5} fill="#FFFFFF" opacity={0.6} />
          {a.accent ? <Rect x={cx - 3} y={top - 10} width={6} height={20} rx={3} fill={a.accent} /> : null}
        </G>
      );
    case 'bucket':
      return (
        <G>
          <Path d={`M${H.x + 2} ${top + 18} Q${H.x + 6} ${top - 14} ${cx} ${top - 14} Q${H.x + H.w - 6} ${top - 14} ${H.x + H.w - 2} ${top + 18}Z`} fill={p} />
          <Path d={`M${H.x - 14} ${top + 26} L${H.x + 2} ${top + 12} L${H.x + H.w - 2} ${top + 12} L${H.x + H.w + 14} ${top + 26} Q${cx} ${top + 32} ${H.x - 14} ${top + 26}Z`} fill={shade(p, -0.15)} />
        </G>
      );
    case 'antenna':
      return (
        <G>
          <Path d={`M${H.x} ${top + 18} Q${cx} ${top - 8} ${H.x + H.w} ${top + 18}`} stroke={p} strokeWidth={6} fill="none" />
          <Line x1={cx} y1={top - 2} x2={cx + 6} y2={top - 34} stroke={p} strokeWidth={3} />
          <Circle cx={cx + 6} cy={top - 36} r={6} fill={acc} stroke={acc} strokeOpacity={a.glow ? 0.35 : 0} strokeWidth={6} />
        </G>
      );
    case 'bunny_ears':
      return (
        <G>
          <Ellipse cx={cx - 18} cy={top - 22} rx={11} ry={30} fill={p} transform={`rotate(-12 ${cx - 18} ${top - 22})`} />
          <Ellipse cx={cx + 18} cy={top - 22} rx={11} ry={30} fill={p} transform={`rotate(12 ${cx + 18} ${top - 22})`} />
          <Ellipse cx={cx - 18} cy={top - 22} rx={5} ry={20} fill={s} transform={`rotate(-12 ${cx - 18} ${top - 22})`} />
          <Ellipse cx={cx + 18} cy={top - 22} rx={5} ry={20} fill={s} transform={`rotate(12 ${cx + 18} ${top - 22})`} />
          <Path d={`M${H.x + 6} ${top + 10} Q${cx} ${top - 10} ${H.x + H.w - 6} ${top + 10}`} stroke={p} strokeWidth={5} fill="none" />
        </G>
      );
    case 'cat_ears':
      return (
        <G>
          <Path d={`M${H.x + 6} ${top + 14} L${H.x + 12} ${top - 24} L${H.x + 38} ${top + 4}Z`} fill={p} />
          <Path d={`M${H.x + H.w - 6} ${top + 14} L${H.x + H.w - 12} ${top - 24} L${H.x + H.w - 38} ${top + 4}Z`} fill={p} />
          <Path d={`M${H.x + 13} ${top + 6} L${H.x + 16} ${top - 12} L${H.x + 30} ${top + 2}Z`} fill={s} />
          <Path d={`M${H.x + H.w - 13} ${top + 6} L${H.x + H.w - 16} ${top - 12} L${H.x + H.w - 30} ${top + 2}Z`} fill={s} />
        </G>
      );
    case 'party':
      return (
        <G>
          <Defs>
            <ClipPath id={`${id}pt`}>
              <Path d={`M${cx - 24} ${top + 8} L${cx} ${top - 46} L${cx + 24} ${top + 8}Z`} />
            </ClipPath>
          </Defs>
          <Path d={`M${cx - 24} ${top + 8} L${cx} ${top - 46} L${cx + 24} ${top + 8}Z`} fill={p} />
          <G clipPath={`url(#${id}pt)`}>{patternFill('dots', cx - 24, top - 46, 48, 54, s, `${id}ptd`)}</G>
          <Circle cx={cx} cy={top - 46} r={6} fill={s} />
        </G>
      );
    case 'tricorn':
      return (
        <G>
          <Path d={`M${H.x - 14} ${top + 18} Q${cx} ${top - 44} ${H.x + H.w + 14} ${top + 18} Q${cx} ${top + 4} ${H.x - 14} ${top + 18}Z`} fill={p} />
          <Path d={`M${H.x - 10} ${top + 15} Q${cx} ${top - 38} ${H.x + H.w + 10} ${top + 15}`} stroke={acc} strokeWidth={2.5} fill="none" />
          <Circle cx={cx} cy={top - 8} r={5} fill={acc} />
        </G>
      );
    default:
      return null;
  }
}

// ── Neck ──────────────────────────────────────────────────────────────────
export function neckItem(a: ItemAsset, L: BodyLayout, id: string): El {
  const { cx, torso: T } = L;
  const p = a.primary;
  const s = a.secondary ?? shade(p, 0.35);
  const y = T.y;
  switch (a.shape) {
    case 'scarf':
      return (
        <G>
          <Defs>
            <ClipPath id={`${id}sc`}>
              <Rect x={T.x - 2} y={y - 4} width={T.w + 4} height={14} rx={7} />
              <Rect x={cx + 6} y={y + 4} width={14} height={34} rx={4} />
            </ClipPath>
          </Defs>
          <Rect x={T.x - 2} y={y - 4} width={T.w + 4} height={14} rx={7} fill={p} />
          <Rect x={cx + 6} y={y + 4} width={14} height={34} rx={4} fill={p} />
          <G clipPath={`url(#${id}sc)`}>{patternFill(a.pattern ?? 'stripes', T.x - 4, y - 6, T.w + 8, 48, s, `${id}scp`)}</G>
        </G>
      );
    case 'chain':
      return (
        <G>
          <Path d={`M${cx - 20} ${y + 2} Q${cx} ${y + 34} ${cx + 20} ${y + 2}`} stroke={p} strokeWidth={3.5} fill="none" strokeDasharray="5 2" />
          <Polygon points={star(cx, y + 22, 6)} fill={p} />
        </G>
      );
    case 'bowtie':
      return (
        <G>
          <Path d={`M${cx} ${y + 6} L${cx - 14} ${y - 2} L${cx - 14} ${y + 14}Z`} fill={p} />
          <Path d={`M${cx} ${y + 6} L${cx + 14} ${y - 2} L${cx + 14} ${y + 14}Z`} fill={p} />
          <Rect x={cx - 4} y={y + 2} width={8} height={8} rx={2} fill={shade(p, 0.25)} />
        </G>
      );
    case 'bandana':
      return (
        <G>
          <Defs>
            <ClipPath id={`${id}bd`}>
              <Path d={`M${T.x + 2} ${y - 2} L${T.x + T.w - 2} ${y - 2} L${cx} ${y + 28}Z`} />
            </ClipPath>
          </Defs>
          <Path d={`M${T.x + 2} ${y - 2} L${T.x + T.w - 2} ${y - 2} L${cx} ${y + 28}Z`} fill={p} />
          <G clipPath={`url(#${id}bd)`}>{patternFill(a.pattern, T.x, y - 2, T.w, 30, s, `${id}bdp`)}</G>
        </G>
      );
    case 'tie':
      return (
        <G>
          <Path d={`M${cx - 5} ${y} h10 l-2 6 h-6Z`} fill={shade(p, -0.2)} />
          <Path d={`M${cx - 3} ${y + 6} h6 l5 32 l-8 8 l-8 -8Z`} fill={p} />
        </G>
      );
    case 'medal':
      return (
        <G>
          <Path d={`M${cx - 16} ${y} L${cx} ${y + 26} L${cx + 16} ${y}`} stroke={s} strokeWidth={6} fill="none" />
          <Circle cx={cx} cy={y + 32} r={10} fill={p} stroke={shade(p, -0.3)} strokeWidth={2} />
          <Polygon points={star(cx, y + 32, 5)} fill={shade(p, 0.4)} />
        </G>
      );
    default:
      return null;
  }
}

// ── Clothing ──────────────────────────────────────────────────────────────
export type SleeveStyle = 'none' | 'short' | 'long';

export function sleeveStyle(shirt?: ItemAsset): SleeveStyle {
  if (!shirt) return 'short';
  if (shirt.shape === 'tank') return 'none';
  if (shirt.shape === 'tee' || shirt.shape === 'jersey') return 'short';
  return 'long';
}

export function shirtBody(a: ItemAsset | undefined, L: BodyLayout, id: string): El {
  const { torso: T, cx } = L;
  const p = a?.primary ?? '#6B7280';
  const s = a?.secondary ?? shade(p, -0.2);
  const shape = a?.shape ?? 'tee';
  const glow: GlowProps = a?.glow ? { stroke: s, strokeOpacity: 0.4, strokeWidth: 5 } : {};
  const base = (
    <G>
      <Defs>
        <ClipPath id={`${id}tor`}>
          <Rect x={T.x} y={T.y} width={T.w} height={T.h} rx={14} />
        </ClipPath>
      </Defs>
      <Rect x={T.x} y={T.y} width={T.w} height={T.h} rx={14} fill={p} {...glow} />
      <G clipPath={`url(#${id}tor)`}>{patternFill(a?.pattern, T.x, T.y, T.w, T.h, s, `${id}tp`)}</G>
    </G>
  );
  switch (shape) {
    case 'tank':
      return (
        <G>
          {base}
          <Path d={`M${T.x + 14} ${T.y} Q${cx} ${T.y + 22} ${T.x + T.w - 14} ${T.y}`} fill={shade(p, -0.25)} />
        </G>
      );
    case 'hoodie':
      return (
        <G>
          <Path d={`M${T.x + 6} ${T.y + 4} Q${cx} ${T.y - 14} ${T.x + T.w - 6} ${T.y + 4}`} fill={shade(p, -0.18)} />
          {base}
          <Path d={`M${T.x + 14} ${T.y + T.h * 0.55} h${T.w - 28} l-6 ${T.h * 0.3} h-${T.w - 40}Z`} fill={shade(p, -0.12)} />
          <Line x1={cx - 6} y1={T.y + 4} x2={cx - 7} y2={T.y + 24} stroke={a?.secondary ?? '#FFFFFF'} strokeWidth={2} />
          <Line x1={cx + 6} y1={T.y + 4} x2={cx + 7} y2={T.y + 24} stroke={a?.secondary ?? '#FFFFFF'} strokeWidth={2} />
        </G>
      );
    case 'jacket':
      return (
        <G>
          <Rect x={T.x} y={T.y} width={T.w} height={T.h} rx={14} fill={p} {...glow} />
          <Path d={`M${cx - 12} ${T.y} L${cx} ${T.y + T.h} L${cx + 12} ${T.y}Z`} fill={s} />
          <Path d={`M${cx - 12} ${T.y} L${cx - 4} ${T.y + 28} L${cx - 18} ${T.y + 18}Z M${cx + 12} ${T.y} L${cx + 4} ${T.y + 28} L${cx + 18} ${T.y + 18}Z`} fill={shade(p, -0.22)} />
          <Line x1={cx} y1={T.y + 10} x2={cx} y2={T.y + T.h} stroke={shade(p, -0.35)} strokeWidth={2} />
          <Rect x={T.x} y={T.y + T.h - 9} width={T.w} height={9} rx={4} fill={shade(p, -0.15)} />
        </G>
      );
    case 'sweater':
      return (
        <G>
          {base}
          <Rect x={T.x} y={T.y + T.h - 10} width={T.w} height={10} rx={5} fill={shade(p, -0.2)} />
          <Path d={`M${cx - 12} ${T.y} Q${cx} ${T.y + 10} ${cx + 12} ${T.y}`} stroke={shade(p, -0.25)} strokeWidth={4} fill="none" />
        </G>
      );
    case 'suit':
      return (
        <G>
          <Rect x={T.x} y={T.y} width={T.w} height={T.h} rx={14} fill={p} />
          <Path d={`M${cx - 13} ${T.y} L${cx} ${T.y + 36} L${cx + 13} ${T.y}Z`} fill="#F8FAFC" />
          <Path d={`M${cx - 3} ${T.y + 4} h6 l3 22 l-6 6 l-6 -6Z`} fill={s} />
          <Path d={`M${cx - 13} ${T.y} L${cx - 2} ${T.y + 40} L${cx - 20} ${T.y + 20}Z M${cx + 13} ${T.y} L${cx + 2} ${T.y + 40} L${cx + 20} ${T.y + 20}Z`} fill={shade(p, 0.12)} />
          <Circle cx={cx} cy={T.y + 46} r={2.4} fill={shade(p, 0.4)} />
          <Circle cx={cx} cy={T.y + 55} r={2.4} fill={shade(p, 0.4)} />
        </G>
      );
    case 'jersey':
      return (
        <G>
          {base}
          <Path d={`M${cx - 12} ${T.y} L${cx} ${T.y + 10} L${cx + 12} ${T.y}`} fill={s} />
          <Rect x={cx - 11} y={T.y + 18} width={22} height={26} rx={3} fill={s} opacity={0.95} />
          <Path d={`M${cx - 4} ${T.y + 24} h7 v16 M${cx - 4} ${T.y + 24} l3 -0`} stroke={p} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        </G>
      );
    case 'armor':
      return (
        <G>
          <Rect x={T.x} y={T.y} width={T.w} height={T.h} rx={14} fill={p} stroke={shade(p, -0.3)} strokeWidth={1.5} {...glow} />
          <Path d={`M${T.x + 8} ${T.y + 8} h${T.w - 16} v${T.h * 0.42} q-${(T.w - 16) / 2} 16 -${T.w - 16} 0Z`} fill={shade(p, 0.12)} stroke={a?.accent ?? s} strokeWidth={2} />
          <Rect x={T.x} y={T.y + T.h * 0.7} width={T.w} height={6} fill={a?.accent ?? s} />
          {a?.accent ? <Circle cx={cx} cy={T.y + 22} r={5} fill={a.accent} /> : null}
        </G>
      );
    case 'tee':
    default:
      return (
        <G>
          {base}
          <Path d={`M${cx - 12} ${T.y} Q${cx} ${T.y + 10} ${cx + 12} ${T.y}`} stroke={shade(p, -0.25)} strokeWidth={3.5} fill="none" />
        </G>
      );
  }
}

/** Shoulder pads drawn over the arms (armor). */
export function shirtShoulders(a: ItemAsset | undefined, L: BodyLayout): El {
  if (a?.shape !== 'armor') return null;
  const p = a.primary;
  return (
    <G>
      <Ellipse cx={L.leftArm.x + L.armW / 2} cy={L.leftArm.y + 4} rx={L.armW / 2 + 5} ry={9} fill={shade(p, 0.08)} stroke={a.accent ?? shade(p, -0.3)} strokeWidth={2} />
      <Ellipse cx={L.rightArm.x + L.armW / 2} cy={L.rightArm.y + 4} rx={L.armW / 2 + 5} ry={9} fill={shade(p, 0.08)} stroke={a.accent ?? shade(p, -0.3)} strokeWidth={2} />
    </G>
  );
}

export function pants(a: ItemAsset | undefined, L: BodyLayout, skin: string, id: string): El {
  const p = a?.primary ?? '#475569';
  const s = a?.secondary ?? shade(p, -0.25);
  const shape = a?.shape ?? 'jeans';
  const legs = [L.leftLeg, L.rightLeg];
  const w = L.legW;
  const waistY = L.leftLeg.y - 2;
  const short = shape === 'shorts' || shape === 'skirt';
  return (
    <G>
      {legs.map((leg, i) => (
        <Rect key={`skin${i}`} x={leg.x} y={leg.y} width={w} height={leg.h} rx={8} fill={short ? skin : p} />
      ))}
      {shape === 'skirt' ? (
        <G>
          <Defs>
            <ClipPath id={`${id}sk`}>
              <Path d={`M${L.torso.x + 2} ${waistY} h${L.torso.w - 4} l10 ${L.leftLeg.h * 0.55} h-${L.torso.w + 16}Z`} />
            </ClipPath>
          </Defs>
          <Path d={`M${L.torso.x + 2} ${waistY} h${L.torso.w - 4} l10 ${L.leftLeg.h * 0.55} h-${L.torso.w + 16}Z`} fill={p} />
          <G clipPath={`url(#${id}sk)`}>{patternFill(a?.pattern, L.torso.x - 8, waistY, L.torso.w + 16, L.leftLeg.h * 0.6, s, `${id}skp`)}</G>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={L.torso.x + L.torso.w * f} y1={waistY + 4} x2={L.torso.x - 6 + (L.torso.w + 12) * f} y2={waistY + L.leftLeg.h * 0.55} stroke={shade(p, -0.2)} strokeWidth={1.5} />
          ))}
        </G>
      ) : (
        legs.map((leg, i) => {
          const h = shape === 'shorts' ? leg.h * 0.45 : leg.h;
          return (
            <G key={i}>
              <Defs>
                <ClipPath id={`${id}lg${i}`}>
                  <Rect x={leg.x} y={leg.y} width={w} height={h} rx={8} />
                </ClipPath>
              </Defs>
              <Rect x={leg.x} y={leg.y} width={w} height={h} rx={8} fill={p} />
              <G clipPath={`url(#${id}lg${i})`}>
                {a?.pattern === 'stripes' && shape === 'joggers' ? (
                  <Rect x={i === 0 ? leg.x + 2 : leg.x + w - 6} y={leg.y} width={4} height={h} fill={a.accent ?? s} />
                ) : (
                  patternFill(a?.pattern, leg.x, leg.y, w, h, s, `${id}lgp${i}`)
                )}
                {shape === 'joggers' ? <Rect x={leg.x} y={leg.y + h - 8} width={w} height={8} fill={shade(p, -0.25)} /> : null}
                {shape === 'cargo' ? <Rect x={i === 0 ? leg.x - 2 : leg.x + w - 10} y={leg.y + h * 0.35} width={12} height={12} rx={2} fill={shade(p, -0.18)} /> : null}
                {shape === 'jeans' ? <Line x1={i === 0 ? leg.x + w - 3 : leg.x + 3} y1={leg.y + 4} x2={i === 0 ? leg.x + w - 3 : leg.x + 3} y2={leg.y + h} stroke={shade(p, 0.2)} strokeWidth={1.2} strokeDasharray="3 2" /> : null}
                {shape === 'armor_legs' ? (
                  <G>
                    <Rect x={leg.x} y={leg.y + h * 0.4} width={w} height={6} fill={a?.accent ?? s} />
                    <Ellipse cx={leg.x + w / 2} cy={leg.y + h * 0.55} rx={w / 2 - 2} ry={6} fill={shade(p, 0.15)} stroke={a?.accent ?? s} strokeWidth={1.5} />
                  </G>
                ) : null}
              </G>
            </G>
          );
        })
      )}
      {shape !== 'skirt' ? <Rect x={L.torso.x + 1} y={waistY} width={L.torso.w - 2} height={7} rx={3} fill={shape === 'jeans' ? shade(p, -0.45) : shade(p, -0.15)} /> : null}
    </G>
  );
}

export function shoes(a: ItemAsset | undefined, L: BodyLayout, skin: string): El {
  const p = a?.primary ?? '#334155';
  const s = a?.secondary ?? shade(p, -0.3);
  const acc = a?.accent ?? '#FFFFFF';
  const shape = a?.shape ?? 'sneakers';
  const glow: GlowProps = a?.glow ? { stroke: acc, strokeOpacity: 0.35, strokeWidth: 5 } : {};
  return (
    <G>
      {[L.leftLeg, L.rightLeg].map((leg, i) => {
        const x = leg.x - 3;
        const w = L.legW + 6;
        const bottom = L.feetY;
        if (shape === 'sandals') {
          return (
            <G key={i}>
              <Rect x={x + 2} y={bottom - 12} width={w - 4} height={10} rx={5} fill={skin} />
              <Rect x={x} y={bottom - 5} width={w} height={5} rx={2.5} fill={p} />
              <Path d={`M${x + 4} ${bottom - 5} L${x + w / 2} ${bottom - 12} L${x + w - 4} ${bottom - 5}`} stroke={shade(p, -0.25)} strokeWidth={2.5} fill="none" />
            </G>
          );
        }
        const top = shape === 'boots' ? bottom - 26 : shape === 'hightops' ? bottom - 20 : shape === 'rocket' ? bottom - 22 : bottom - 15;
        return (
          <G key={i}>
            <Rect x={x} y={top} width={w} height={bottom - top} rx={7} fill={p} {...glow} />
            {shape === 'boots' ? <Rect x={x} y={top} width={w} height={6} rx={3} fill={s} /> : null}
            {shape === 'hightops' ? <Path d={`M${x + 6} ${top + 5} l${w - 12} 4 M${x + 6} ${top + 10} l${w - 12} 4`} stroke={acc} strokeWidth={2} /> : null}
            {shape === 'sneakers' ? <Path d={`M${x + 5} ${bottom - 9} q${w / 2 - 5} -5 ${w - 10} 0`} stroke={acc} strokeWidth={2.5} fill="none" /> : null}
            {shape === 'rocket' ? (
              <G>
                <Rect x={x + 3} y={top + 5} width={w - 6} height={4} rx={2} fill={acc} />
                <Path d={`M${x + 6} ${bottom} Q${x + w / 2} ${bottom + 12} ${x + w - 6} ${bottom}Z`} fill={acc} opacity={0.9} />
              </G>
            ) : null}
            <Rect x={x - 1} y={bottom - 4} width={w + 2} height={4} rx={2} fill={shape === 'boots' || shape === 'rocket' ? shade(p, -0.35) : '#F8FAFC'} />
          </G>
        );
      })}
    </G>
  );
}
