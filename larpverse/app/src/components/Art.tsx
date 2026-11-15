import {
  BadgeCheck, Camera, Check, Crown, Flame, Gem, Heart, Leaf, Mic, Music, PawPrint, Rocket, Shield, Skull, Sparkles, Star, Sword, Trophy, Zap,
} from 'lucide-react';
import { memo } from 'react';
import { assetUrl } from '../api';
import type { BadgeChip, ExperienceArt as Art } from '../types';

/** The fictional currency mark: an original four-point spark. */
export function SparkIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d="M12 1.5 L14.6 9.4 L22.5 12 L14.6 14.6 L12 22.5 L9.4 14.6 L1.5 12 L9.4 9.4Z" fill="#ffc94d" stroke="#e08a00" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M12 6 L13.2 10.8 L18 12 L13.2 13.2 L12 18 L10.8 13.2 L6 12 L10.8 10.8Z" fill="#fff3c4" opacity="0.8" />
    </svg>
  );
}

export const BADGE_ICONS: Record<string, any> = {
  check: BadgeCheck, star: Star, crown: Crown, shield: Shield, gem: Gem, bolt: Zap, heart: Heart, trophy: Trophy, flame: Flame,
  leaf: Leaf, music: Music, camera: Camera, mic: Mic, sparkle: Sparkles,
};

/** Roleplay Verified mark: rounded hexagon + check. Deliberately its own shape and color. */
export function VerifiedMark({ size = 16, title = 'Roleplay Verified (Larpverse roleplay only)' }: { size?: number; title?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className="verified-mark" role="img" aria-label={title}>
      <title>{title}</title>
      <path d="M12 1.8 L20.8 6.9 L20.8 17.1 L12 22.2 L3.2 17.1 L3.2 6.9Z" fill="#7c5cff" stroke="#c3b4ff" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7.6 12.3 L10.6 15.2 L16.6 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BadgeIcon({ badge, size = 18 }: { badge: Pick<BadgeChip, 'icon' | 'color' | 'label' | 'name'>; size?: number }) {
  const Icon = BADGE_ICONS[badge.icon] ?? Star;
  return (
    <span className="badge-icon" style={{ background: badge.color, width: size + 8, height: size + 8 }} title={badge.label ?? badge.name}>
      <Icon size={size} color="#fff" strokeWidth={2.4} />
    </span>
  );
}

const SYMBOLS: Record<string, any> = { crown: Crown, bolt: Zap, heart: Heart, star: Star, skull: Skull, leaf: Leaf, flame: Flame, gem: Gem, paw: PawPrint, music: Music, sword: Sword, rocket: Rocket, check: Check };

const SHAPES: Record<string, string> = {
  shield: 'M50 4 L92 18 L88 62 Q80 86 50 98 Q20 86 12 62 L8 18Z',
  circle: 'M50 4 A46 46 0 1 1 49.9 4Z',
  hexagon: 'M50 3 L92 27 L92 73 L50 97 L8 73 L8 27Z',
  diamond: 'M50 2 L96 50 L50 98 L4 50Z',
  star: 'M50 3 L62 34 L96 36 L70 58 L79 92 L50 74 L21 92 L30 58 L4 36 L38 34Z',
};

export function GroupEmblem({ emblem, size = 56 }: { emblem: { shape?: string; color?: string; accent?: string; symbol?: string }; size?: number }) {
  const Icon = SYMBOLS[emblem.symbol ?? 'star'] ?? Star;
  return (
    <span className="emblem" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <path d={SHAPES[emblem.shape ?? 'shield'] ?? SHAPES.shield} fill={emblem.color ?? '#6d4aff'} stroke={emblem.accent ?? '#ffd166'} strokeWidth="4" />
      </svg>
      <Icon className="emblem-symbol" size={size * 0.42} color={emblem.accent ?? '#ffd166'} strokeWidth={2.4} />
    </span>
  );
}

function Motif({ motif, a, b }: { motif: string; a: string; b: string }) {
  const W = 'rgba(255,255,255,0.9)';
  const D = 'rgba(0,0,0,0.28)';
  switch (motif) {
    case 'city':
      return (
        <g>
          <circle cx="250" cy="44" r="20" fill="#ffe8a3" opacity="0.9" />
          {[[20, 70, 40], [64, 50, 36], [104, 86, 30], [138, 40, 44], [186, 64, 34], [224, 90, 28], [256, 56, 42]].map(([x, y, w], i) => (
            <g key={i}><rect x={x} y={y} width={w} height={180 - y} fill={D} />
              {Array.from({ length: 5 }).map((_, k) => <rect key={k} x={x + 6 + (k % 2) * 14} y={y + 10 + Math.floor(k / 2) * 18} width="8" height="9" fill="#ffe8a3" opacity="0.75" />)}</g>
          ))}
          <rect x="0" y="150" width="320" height="30" fill="rgba(0,0,0,0.35)" />
        </g>
      );
    case 'market':
      return <g>{[20, 120, 220].map((x, i) => <g key={x}><rect x={x} y="80" width="80" height="80" fill={D} /><path d={`M${x - 6} 80 L${x + 86} 80 L${x + 76} 56 L${x + 4} 56Z`} fill={i % 2 ? W : b} />{[0, 1, 2, 3].map((k) => <rect key={k} x={x + k * 20} y="56" width="10" height="24" fill={i % 2 ? b : W} opacity="0.85" />)}</g>)}<circle cx="60" cy="130" r="10" fill="#ffd166" /><circle cx="160" cy="132" r="9" fill="#e63946" /></g>;
    case 'night':
      return <g><circle cx="240" cy="48" r="26" fill="#f1faee" /><circle cx="252" cy="40" r="24" fill={a} />{[[30, 30], [80, 50], [140, 24], [190, 60], [300, 90], [110, 80]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#fff" />)}<path d="M0 160 L40 120 L80 160 L120 110 L170 160 L220 125 L270 160 L320 130 L320 180 L0 180Z" fill={D} /><circle cx="150" cy="120" r="22" fill="none" stroke={W} strokeWidth="7" /><path d="M166 136 L190 160" stroke={W} strokeWidth="9" strokeLinecap="round" /></g>;
    case 'stage':
      return <g><path d="M60 0 L20 160 L100 160Z M260 0 L220 160 L300 160Z M160 0 L120 160 L200 160Z" fill="#fff" opacity="0.14" /><rect x="10" y="140" width="300" height="40" fill={D} /><path d="M160 60 l12 24 27 4 -19 19 4 27 -24 -13 -24 13 4 -27 -19 -19 27 -4z" fill="#ffd166" /></g>;
    case 'hospital':
      return <g><rect x="80" y="50" width="160" height="130" fill={W} opacity="0.85" />{[100, 140, 180, 210].map((x) => <rect key={x} x={x} y="120" width="18" height="22" fill={a} opacity="0.5" />)}<rect x="146" y="64" width="28" height="44" rx="3" fill="#e63946" /><rect x="138" y="72" width="44" height="28" rx="3" fill="#e63946" /></g>;
    case 'islands':
      return <g>{[[60, 110, 50], [170, 70, 60], [270, 120, 40]].map(([x, y, r], i) => <g key={i}><ellipse cx={x} cy={y} rx={r} ry={r / 4} fill="#80ed99" /><path d={`M${x - r} ${y} Q${x} ${y + r} ${x + r} ${y}Z`} fill="#7f5539" /></g>)}<ellipse cx="120" cy="40" rx="30" ry="10" fill="#fff" opacity="0.8" /><ellipse cx="250" cy="34" rx="24" ry="8" fill="#fff" opacity="0.8" /></g>;
    case 'pets':
      return <g>{[[90, 110], [160, 90], [230, 115]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="26" ry="34" fill={i === 1 ? '#fff' : W} stroke={b} strokeWidth="4" />)}<path d="M150 40 c-6 -10 -22 -4 -14 8 l14 12 14 -12 c8 -12 -8 -18 -14 -8z" fill="#ff6b9a" /></g>;
    case 'food':
      return <g><path d="M100 90 Q160 30 220 90Z" fill="#f4a261" /><rect x="100" y="92" width="120" height="14" rx="6" fill="#2a9d8f" /><rect x="96" y="106" width="128" height="16" rx="6" fill="#7f5539" /><rect x="100" y="122" width="120" height="12" rx="6" fill="#ffd166" /><path d="M100 134 L220 134 Q220 152 160 152 Q100 152 100 134Z" fill="#f4a261" /></g>;
    case 'racing':
      return <g><path d="M0 180 L120 70 L200 70 L320 180Z" fill={D} /><path d="M160 80 L160 100 M160 120 L160 145 M160 160 L160 180" stroke="#fff" strokeWidth="6" />{[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => <rect key={`${r}-${c}`} x={230 + c * 12} y={20 + r * 12} width="12" height="12" fill={(r + c) % 2 ? '#fff' : '#111'} />))}<rect x="100" y="130" width="50" height="22" rx="8" fill="#e63946" /><circle cx="110" cy="154" r="8" fill="#111" /><circle cx="140" cy="154" r="8" fill="#111" /></g>;
    case 'haunted':
      return <g><circle cx="70" cy="50" r="24" fill="#f1faee" opacity="0.9" /><path d="M110 180 L110 90 L160 50 L210 90 L210 180Z" fill={D} /><rect x="148" y="120" width="24" height="60" fill="#ffd166" opacity="0.7" /><path d="M240 50 q10 -10 20 0 q10 -10 20 0 q-10 4 -20 12 q-10 -8 -20 -12z" fill="#111" /></g>;
    case 'sports':
      return <g><rect x="40" y="60" width="240" height="120" fill={D} /><path d="M160 60 L160 180" stroke="#fff" strokeWidth="3" /><circle cx="160" cy="120" r="30" fill="none" stroke="#fff" strokeWidth="3" /><circle cx="200" cy="100" r="16" fill="#fff" /><path d="M192 92 L208 108 M208 92 L192 108" stroke="#111" strokeWidth="3" /></g>;
    case 'temple':
      return <g>{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={70 + i * 18} y={160 - i * 24} width={180 - i * 36} height="24" fill={i % 2 ? D : 'rgba(0,0,0,0.18)'} />)}<ellipse cx="160" cy="52" rx="16" ry="9" fill="#fff" /><circle cx="160" cy="52" r="5" fill={a} /></g>;
    case 'pirate':
      return <g><path d="M0 150 Q40 136 80 150 T160 150 T240 150 T320 150 L320 180 L0 180Z" fill="#118ab2" /><path d="M90 140 L230 140 L210 168 L110 168Z" fill="#7f5539" /><path d="M160 40 L160 140" stroke="#5c3d2e" strokeWidth="6" /><path d="M164 46 L220 110 L164 110Z" fill="#fff" /><path d="M156 56 L110 116 L156 116Z" fill="#fff" opacity="0.9" /></g>;
    case 'cafe':
      return <g><rect x="110" y="70" width="90" height="80" rx="12" fill={W} /><path d="M200 86 Q236 90 200 126" stroke={W} strokeWidth="10" fill="none" /><rect x="110" y="70" width="90" height="18" rx="6" fill="#7f5539" />{[130, 155, 180].map((x) => <path key={x} d={`M${x} 60 Q${x - 8} 44 ${x} 30`} stroke="#fff" strokeWidth="4" fill="none" opacity="0.7" />)}</g>;
    default:
      return <circle cx="160" cy="90" r="40" fill={W} opacity="0.4" />;
  }
}

function ExperienceArtImpl({ art, thumbnail, className, title }: { art: Art; thumbnail?: string | null; className?: string; title?: string }) {
  const src = assetUrl(thumbnail);
  if (src) return <img className={`exp-art ${className ?? ''}`} src={src} alt={title ?? ''} loading="lazy" decoding="async" />;
  const [a, b, c] = art.palette?.length ? art.palette : ['#6d4aff', '#ff6b9a'];
  const id = `g${(a + b + (art.motif ?? '')).replace(/[^a-z0-9]/gi, '')}`;
  return (
    <svg viewBox="0 0 320 180" className={`exp-art ${className ?? ''}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label={title ?? art.tagline ?? 'Experience'}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill={`url(#${id})`} />
      <Motif motif={art.motif} a={a} b={c ?? b} />
      {art.tagline && <text x="14" y="170" fill="#fff" fontSize="18" fontWeight="800" style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 3 }}>{art.tagline}</text>}
    </svg>
  );
}

export const ExperienceArt = memo(ExperienceArtImpl);
