/**
 * Boxling avatar parts. Original BloxyBox artwork drawn with react-native-svg.
 * Each catalog item's `asset_key` maps to one renderer here; colours come from
 * the item's primary/secondary colours so new colourways need no new art.
 *
 * Coordinate system: 200 x 240 canvas, character centred on x = 100.
 */
import type { ReactElement } from 'react';
import { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';

import type { HeadShape } from '@/theme/tokens';

export type PartColors = { primary: string; secondary: string };

export type HeadGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  faceY: number;
};

export const HEADS: Record<HeadShape, HeadGeometry> = {
  cube: { x: 48, y: 18, width: 104, height: 100, rx: 24, faceY: 72 },
  round: { x: 50, y: 18, width: 100, height: 100, rx: 50, faceY: 72 },
  tall: { x: 56, y: 6, width: 88, height: 112, rx: 26, faceY: 68 },
};

const INK = '#1B1B2A';
const SHOE = '#1B1D2C';
export const BASE_SUIT = '#3A4062';
export const BASE_LEGS = '#2B3049';

// ---------------------------------------------------------------------------
// Body (always drawn). Sleeve/leg colours are supplied by the equipped top/bottom.
// ---------------------------------------------------------------------------
export function Body({
  skin,
  torso,
  sleeves,
  sleeveLength,
  legs,
  shorts,
}: {
  skin: string;
  torso: string;
  sleeves: string;
  sleeveLength: 'short' | 'long';
  legs: string;
  shorts: boolean;
}) {
  const sleeveBottom = sleeveLength === 'short' ? 142 : 160;
  return (
    <G>
      {/* legs */}
      <Rect x={74} y={176} width={24} height={44} rx={8} fill={shorts ? skin : legs} />
      <Rect x={102} y={176} width={24} height={44} rx={8} fill={shorts ? skin : legs} />
      {shorts ? (
        <>
          <Rect x={72} y={174} width={28} height={24} rx={7} fill={legs} />
          <Rect x={100} y={174} width={28} height={24} rx={7} fill={legs} />
        </>
      ) : null}
      {/* shoes */}
      <Rect x={70} y={212} width={30} height={14} rx={7} fill={SHOE} />
      <Rect x={100} y={212} width={30} height={14} rx={7} fill={SHOE} />
      {/* arms: skin underneath, sleeves on top */}
      <Rect x={40} y={122} width={22} height={46} rx={10} fill={skin} />
      <Rect x={138} y={122} width={22} height={46} rx={10} fill={skin} />
      <Rect x={40} y={122} width={22} height={sleeveBottom - 122} rx={10} fill={sleeves} />
      <Rect x={138} y={122} width={22} height={sleeveBottom - 122} rx={10} fill={sleeves} />
      <Circle cx={51} cy={170} r={10} fill={skin} />
      <Circle cx={149} cy={170} r={10} fill={skin} />
      {/* neck + torso */}
      <Rect x={88} y={108} width={24} height={16} rx={6} fill={skin} />
      <Rect x={62} y={118} width={76} height={64} rx={16} fill={torso} />
    </G>
  );
}

export function Head({ skin, shape }: { skin: string; shape: HeadShape }) {
  const h = HEADS[shape];
  return (
    <G>
      <Rect x={h.x} y={h.y} width={h.width} height={h.height} rx={h.rx} fill={skin} />
      <Rect x={h.x} y={h.y + h.height * 0.62} width={h.width} height={h.height * 0.38} rx={h.rx} fill="#000000" opacity={0.07} />
      <Ellipse cx={h.x + h.width * 0.3} cy={h.y + h.height * 0.2} rx={h.width * 0.16} ry={h.height * 0.08} fill="#FFFFFF" opacity={0.22} />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Tops
// ---------------------------------------------------------------------------
type TopStyle = { sleeves: 'short' | 'long'; sleeveColor: (c: PartColors) => string };

export const TOP_STYLES: Record<string, TopStyle> = {
  tee: { sleeves: 'short', sleeveColor: (c) => c.primary },
  hoodie: { sleeves: 'long', sleeveColor: (c) => c.primary },
  stripes: { sleeves: 'short', sleeveColor: (c) => c.primary },
  jacket: { sleeves: 'long', sleeveColor: (c) => c.secondary },
  tux: { sleeves: 'long', sleeveColor: (c) => c.primary },
  armor: { sleeves: 'long', sleeveColor: (c) => c.primary },
};

export function TopDetail({ asset, c }: { asset: string; c: PartColors }): ReactElement | null {
  switch (asset) {
    case 'tee':
      return (
        <G>
          <Path d="M88 118 Q100 128 112 118" stroke={c.secondary} strokeWidth={3} fill="none" strokeLinecap="round" />
          <Rect x={62} y={146} width={76} height={7} fill={c.secondary} opacity={0.9} />
        </G>
      );
    case 'hoodie':
      return (
        <G>
          <Path d="M76 118 Q100 104 124 118 L118 128 Q100 120 82 128 Z" fill={c.secondary} />
          <Rect x={80} y={154} width={40} height={20} rx={8} fill={c.secondary} />
          <Line x1={94} y1={126} x2={94} y2={142} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
          <Line x1={106} y1={126} x2={106} y2={142} stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
        </G>
      );
    case 'stripes':
      return (
        <G>
          <Rect x={62} y={130} width={76} height={8} fill={c.secondary} />
          <Rect x={62} y={146} width={76} height={8} fill={c.secondary} />
          <Rect x={62} y={162} width={76} height={8} fill={c.secondary} />
        </G>
      );
    case 'jacket':
      return (
        <G>
          <Path d="M86 118 L100 134 L114 118" stroke={c.secondary} strokeWidth={5} fill="none" strokeLinejoin="round" />
          <Line x1={100} y1={134} x2={100} y2={182} stroke={c.secondary} strokeWidth={3} />
          <Rect x={62} y={174} width={76} height={8} rx={4} fill={c.secondary} />
          <Rect x={110} y={140} width={18} height={12} rx={3} fill={c.secondary} opacity={0.85} />
        </G>
      );
    case 'tux':
      return (
        <G>
          <Polygon points="86,118 114,118 100,164" fill={c.secondary} />
          <Path d="M86 118 L100 150 L80 170 Z" fill="#000000" opacity={0.25} />
          <Path d="M114 118 L100 150 L120 170 Z" fill="#000000" opacity={0.25} />
          <Circle cx={100} cy={140} r={2.4} fill={INK} />
          <Circle cx={100} cy={152} r={2.4} fill={INK} />
        </G>
      );
    case 'armor':
      return (
        <G>
          <Rect x={70} y={126} width={60} height={46} rx={10} fill="#FFFFFF" opacity={0.12} />
          <Path d="M78 136 H92 V150 H108 V136 H122" stroke={c.secondary} strokeWidth={2.5} fill="none" />
          <Path d="M78 162 H96 V154 H122" stroke={c.secondary} strokeWidth={2.5} fill="none" />
          <Circle cx={100} cy={143} r={4} fill={c.secondary} />
          <Rect x={36} y={116} width={30} height={16} rx={8} fill={c.primary} stroke={c.secondary} strokeWidth={1.5} />
          <Rect x={134} y={116} width={30} height={16} rx={8} fill={c.primary} stroke={c.secondary} strokeWidth={1.5} />
        </G>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Bottoms
// ---------------------------------------------------------------------------
export const SHORTS_ASSETS = new Set(['shorts']);

export function BottomDetail({ asset, c }: { asset: string; c: PartColors }): ReactElement | null {
  switch (asset) {
    case 'jeans':
      return (
        <G>
          <Line x1={86} y1={180} x2={86} y2={212} stroke={c.secondary} strokeWidth={2} />
          <Line x1={114} y1={180} x2={114} y2={212} stroke={c.secondary} strokeWidth={2} />
        </G>
      );
    case 'shorts':
      return (
        <G>
          <Rect x={72} y={176} width={4} height={20} fill={c.secondary} />
          <Rect x={124} y={176} width={4} height={20} fill={c.secondary} />
        </G>
      );
    case 'cargo':
      return (
        <G>
          <Rect x={76} y={190} width={14} height={12} rx={3} fill={c.secondary} />
          <Rect x={110} y={190} width={14} height={12} rx={3} fill={c.secondary} />
        </G>
      );
    case 'sport':
      return (
        <G>
          <Rect x={74} y={178} width={5} height={36} fill={c.secondary} />
          <Rect x={121} y={178} width={5} height={36} fill={c.secondary} />
        </G>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Back items (behind the body) and their front details
// ---------------------------------------------------------------------------
export function BackLayer({ asset, c }: { asset: string; c: PartColors }): ReactElement | null {
  switch (asset) {
    case 'cape':
      return (
        <G>
          <Path d="M66 120 L134 120 Q152 170 150 214 Q100 226 50 214 Q48 170 66 120 Z" fill={c.secondary} />
          <Path d="M70 120 L130 120 Q146 168 144 208 Q100 218 56 208 Q54 168 70 120 Z" fill={c.primary} />
        </G>
      );
    case 'backpack':
      return <Rect x={54} y={124} width={92} height={54} rx={14} fill={c.primary} />;
    case 'wings':
      return (
        <G>
          <Path d="M70 130 Q20 90 8 140 Q18 170 70 160 Z" fill={c.primary} opacity={0.9} />
          <Path d="M130 130 Q180 90 192 140 Q182 170 130 160 Z" fill={c.primary} opacity={0.9} />
          <Path d="M70 138 Q34 116 24 144 Q36 160 70 154 Z" fill={c.secondary} opacity={0.85} />
          <Path d="M130 138 Q166 116 176 144 Q164 160 130 154 Z" fill={c.secondary} opacity={0.85} />
        </G>
      );
    case 'jetpack':
      return (
        <G>
          <Path d="M50 172 Q58 196 66 172 Z" fill={c.secondary} />
          <Path d="M134 172 Q142 196 150 172 Z" fill={c.secondary} />
          <Rect x={46} y={112} width={22} height={62} rx={10} fill={c.primary} />
          <Rect x={132} y={112} width={22} height={62} rx={10} fill={c.primary} />
          <Rect x={46} y={124} width={22} height={6} fill={c.secondary} opacity={0.8} />
          <Rect x={132} y={124} width={22} height={6} fill={c.secondary} opacity={0.8} />
        </G>
      );
    default:
      return null;
  }
}

export function BackFront({ asset, c }: { asset: string; c: PartColors }): ReactElement | null {
  if (asset === 'backpack') {
    return (
      <G>
        <Rect x={72} y={118} width={7} height={52} rx={3} fill={c.secondary} />
        <Rect x={121} y={118} width={7} height={52} rx={3} fill={c.secondary} />
      </G>
    );
  }
  if (asset === 'cape') {
    return (
      <G>
        <Circle cx={74} cy={124} r={5} fill={c.secondary} />
        <Circle cx={126} cy={124} r={5} fill={c.secondary} />
      </G>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------
export function Accessory({ asset, c }: { asset: string; c: PartColors }): ReactElement | null {
  switch (asset) {
    case 'scarf':
      return (
        <G>
          <Rect x={80} y={110} width={40} height={16} rx={8} fill={c.primary} />
          <Rect x={110} y={118} width={14} height={34} rx={6} fill={c.primary} />
          <Rect x={110} y={134} width={14} height={4} fill={c.secondary} />
          <Rect x={110} y={142} width={14} height={4} fill={c.secondary} />
          <Rect x={86} y={115} width={4} height={8} fill={c.secondary} />
          <Rect x={96} y={115} width={4} height={8} fill={c.secondary} />
        </G>
      );
    case 'bowtie':
      return (
        <G>
          <Polygon points="100,124 84,116 84,132" fill={c.primary} />
          <Polygon points="100,124 116,116 116,132" fill={c.primary} />
          <Rect x={95} y={119} width={10} height={10} rx={3} fill={c.secondary} />
        </G>
      );
    case 'medal':
      return (
        <G>
          <Polygon points="88,118 96,118 102,146 98,146" fill={c.secondary} />
          <Polygon points="112,118 104,118 98,146 102,146" fill={c.secondary} />
          <Circle cx={100} cy={152} r={10} fill={c.primary} stroke="#FFFFFF" strokeWidth={1.5} strokeOpacity={0.6} />
          <Polygon points="100,145 102,150 107,150 103,153 105,158 100,155 95,158 97,153 93,150 98,150" fill="#FFFFFF" opacity={0.9} />
        </G>
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Faces
// ---------------------------------------------------------------------------
function Eye({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <G>
      <Rect x={x - 5} y={y - 8} width={10} height={16} rx={5} fill={color} />
      <Circle cx={x + 1.5} cy={y - 3} r={2} fill="#FFFFFF" opacity={0.85} />
    </G>
  );
}

function Star({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const points: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return <Polygon points={points.join(' ')} fill={color} />;
}

export function Face({ asset, c, y }: { asset: string; c: PartColors; y: number }): ReactElement | null {
  const ly = y - 8;
  switch (asset) {
    case 'smile':
      return (
        <G>
          <Eye x={82} y={ly} color={c.primary} />
          <Eye x={118} y={ly} color={c.primary} />
          <Path d={`M86 ${y + 12} Q100 ${y + 24} 114 ${y + 12}`} stroke={c.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'grin':
      return (
        <G>
          <Eye x={82} y={ly} color={c.primary} />
          <Eye x={118} y={ly} color={c.primary} />
          <Path d={`M82 ${y + 8} H118 Q116 ${y + 28} 100 ${y + 28} Q84 ${y + 28} 82 ${y + 8} Z`} fill={c.primary} />
          <Path d={`M86 ${y + 10} H114 Q113 ${y + 16} 100 ${y + 16} Q87 ${y + 16} 86 ${y + 10} Z`} fill={c.secondary} />
        </G>
      );
    case 'wink':
      return (
        <G>
          <Path d={`M76 ${ly} Q82 ${ly - 6} 88 ${ly}`} stroke={c.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Eye x={118} y={ly} color={c.primary} />
          <Circle cx={72} cy={y + 8} r={7} fill={c.secondary} opacity={0.6} />
          <Circle cx={128} cy={y + 8} r={7} fill={c.secondary} opacity={0.6} />
          <Path d={`M88 ${y + 12} Q100 ${y + 22} 112 ${y + 12}`} stroke={c.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <Path d={`M76 ${ly} Q82 ${ly + 6} 88 ${ly}`} stroke={c.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={`M112 ${ly} Q118 ${ly + 6} 124 ${ly}`} stroke={c.primary} strokeWidth={4} fill="none" strokeLinecap="round" />
          <Ellipse cx={100} cy={y + 16} rx={6} ry={5} fill={c.primary} />
          <Path d={`M128 ${y - 30} h8 l-8 8 h8`} stroke={c.secondary} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        </G>
      );
    case 'cool':
      return (
        <G>
          <Rect x={68} y={ly - 10} width={28} height={18} rx={7} fill={c.primary} />
          <Rect x={104} y={ly - 10} width={28} height={18} rx={7} fill={c.primary} />
          <Rect x={94} y={ly - 4} width={12} height={4} fill={c.primary} />
          <Path d={`M72 ${ly - 6} L84 ${ly - 6}`} stroke={c.secondary} strokeWidth={3} strokeLinecap="round" />
          <Path d={`M108 ${ly - 6} L120 ${ly - 6}`} stroke={c.secondary} strokeWidth={3} strokeLinecap="round" />
          <Path d={`M90 ${y + 16} Q104 ${y + 20} 114 ${y + 10}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      );
    case 'star_eyes':
      return (
        <G>
          <Star cx={82} cy={ly} r={10} color={c.primary} />
          <Star cx={118} cy={ly} r={10} color={c.primary} />
          <Path d={`M86 ${y + 10} Q100 ${y + 28} 114 ${y + 10} Z`} fill={c.secondary} />
        </G>
      );
    case 'visor':
      return (
        <G>
          <Rect x={64} y={ly - 11} width={72} height={22} rx={11} fill={c.secondary} />
          <Rect x={70} y={ly - 2} width={60} height={4} rx={2} fill={c.primary} />
          <Circle cx={84} cy={ly} r={3} fill={c.primary} />
          <Circle cx={116} cy={ly} r={3} fill={c.primary} />
          <Path d={`M90 ${y + 14} Q100 ${y + 20} 110 ${y + 14}`} stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
        </G>
      );
    default:
      return null;
  }
}

/** Face shown when no face item is equipped. */
export function BlankFace({ y }: { y: number }) {
  return (
    <G>
      <Eye x={82} y={y - 8} color={INK} />
      <Eye x={118} y={y - 8} color={INK} />
      <Line x1={92} y1={y + 14} x2={108} y2={y + 14} stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </G>
  );
}

// ---------------------------------------------------------------------------
// Hats (positioned from the top of the head)
// ---------------------------------------------------------------------------
export function Hat({ asset, c, top, head }: { asset: string; c: PartColors; top: number; head: HeadGeometry }): ReactElement | null {
  const left = head.x + 4;
  const right = head.x + head.width - 4;
  switch (asset) {
    case 'cap':
      return (
        <G>
          <Path d={`M${left} ${top + 26} Q${left} ${top - 8} 100 ${top - 8} Q${right} ${top - 8} ${right} ${top + 26} Z`} fill={c.primary} />
          <Path d={`M${right - 6} ${top + 22} Q${right + 26} ${top + 20} ${right + 30} ${top + 30} L${right - 6} ${top + 30} Z`} fill={c.primary} />
          <Rect x={88} y={top - 2} width={24} height={20} rx={6} fill={c.secondary} />
          <Circle cx={100} cy={top - 8} r={4} fill={c.secondary} />
        </G>
      );
    case 'beanie':
      return (
        <G>
          <Path d={`M${left - 2} ${top + 30} Q${left - 2} ${top - 18} 100 ${top - 18} Q${right + 2} ${top - 18} ${right + 2} ${top + 30} Z`} fill={c.primary} />
          <Rect x={left - 4} y={top + 18} width={right - left + 8} height={16} rx={8} fill={c.secondary} />
          <Circle cx={100} cy={top - 20} r={9} fill={c.secondary} />
        </G>
      );
    case 'antenna':
      return (
        <G>
          <Line x1={100} y1={top + 4} x2={100} y2={top - 26} stroke={c.primary} strokeWidth={4} strokeLinecap="round" />
          <Circle cx={100} cy={top - 30} r={9} fill={c.secondary} />
          <Circle cx={97} cy={top - 33} r={3} fill="#FFFFFF" opacity={0.7} />
          <Path d={`M84 ${top + 8} Q100 ${top - 6} 116 ${top + 8} Z`} fill={c.primary} />
        </G>
      );
    case 'propeller':
      return (
        <G>
          <Path d={`M${left} ${top + 24} Q${left} ${top - 10} 100 ${top - 10} Q${right} ${top - 10} ${right} ${top + 24} Z`} fill={c.primary} />
          <Path d={`M100 ${top - 10} Q${left + 18} ${top - 4} ${left + 6} ${top + 24} L100 ${top + 24} Z`} fill={c.secondary} opacity={0.9} />
          <Line x1={100} y1={top - 10} x2={100} y2={top - 22} stroke={INK} strokeWidth={3} />
          <Ellipse cx={84} cy={top - 24} rx={16} ry={4} fill={c.secondary} />
          <Ellipse cx={116} cy={top - 24} rx={16} ry={4} fill={c.primary} />
          <Circle cx={100} cy={top - 24} r={4} fill={INK} />
        </G>
      );
    case 'tophat':
      return (
        <G>
          <Ellipse cx={100} cy={top + 6} rx={52} ry={9} fill={c.primary} />
          <Rect x={70} y={top - 50} width={60} height={58} rx={6} fill={c.primary} />
          <Rect x={70} y={top - 8} width={60} height={10} fill={c.secondary} />
          <Rect x={76} y={top - 44} width={8} height={30} rx={4} fill="#FFFFFF" opacity={0.12} />
        </G>
      );
    case 'halo':
      return (
        <G>
          <Ellipse cx={100} cy={top - 18} rx={40} ry={10} fill="none" stroke={c.secondary} strokeWidth={10} opacity={0.25} />
          <Ellipse cx={100} cy={top - 18} rx={40} ry={10} fill="none" stroke={c.primary} strokeWidth={5} />
        </G>
      );
    case 'wizard':
      return (
        <G>
          <Path d={`M${left - 2} ${top + 20} Q104 ${top - 20} 118 ${top - 70} Q110 ${top - 20} ${right + 2} ${top + 20} Z`} fill={c.primary} />
          <Ellipse cx={100} cy={top + 18} rx={58} ry={9} fill={c.primary} />
          <Star cx={92} cy={top - 6} r={6} color={c.secondary} />
          <Star cx={110} cy={top - 30} r={4.5} color={c.secondary} />
          <Circle cx={118} cy={top - 70} r={5} fill={c.secondary} />
        </G>
      );
    case 'crown':
      return (
        <G>
          <Polygon
            points={`66,${top + 10} 66,${top - 24} 82,${top - 8} 100,${top - 32} 118,${top - 8} 134,${top - 24} 134,${top + 10}`}
            fill={c.primary}
          />
          <Rect x={66} y={top + 2} width={68} height={10} fill={c.primary} />
          <Circle cx={100} cy={top - 2} r={5} fill={c.secondary} />
          <Circle cx={80} cy={top + 2} r={3.5} fill={c.secondary} />
          <Circle cx={120} cy={top + 2} r={3.5} fill={c.secondary} />
          <Circle cx={100} cy={top - 32} r={3} fill="#FFFFFF" opacity={0.85} />
        </G>
      );
    default:
      return null;
  }
}

/** Every asset key the renderer understands, by slot (used by tests to verify catalog coverage). */
export const KNOWN_ASSETS = {
  hat: ['cap', 'beanie', 'antenna', 'propeller', 'tophat', 'halo', 'wizard', 'crown'],
  face: ['smile', 'grin', 'wink', 'sleepy', 'cool', 'star_eyes', 'visor'],
  top: Object.keys(TOP_STYLES),
  bottom: ['jeans', 'shorts', 'cargo', 'sport'],
  accessory: ['scarf', 'bowtie', 'medal'],
  back: ['cape', 'backpack', 'wings', 'jetpack'],
} as const;
