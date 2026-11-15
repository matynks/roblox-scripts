import { memo, useId, type ReactElement } from 'react';
import type { AvatarItem, AvatarSpec, BodyColors } from '../types';

// Original chunky-chibi avatar drawn as layered SVG. viewBox 0 0 200 260.
// Head 54..146 × 20..108, torso 66..134 × 104..178, arms beside torso, legs 174..236.

export const MANNEQUIN: BodyColors = { head: '#d7dbe6', torso: '#c9cfdc', leftArm: '#d7dbe6', rightArm: '#d7dbe6', leftLeg: '#b9c0d0', rightLeg: '#b9c0d0' };

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

type Dims = { tx: number; tw: number; ax: number; aw: number };
const DIMS: Record<string, Dims> = {
  classic: { tx: 66, tw: 68, ax: 42, aw: 22 },
  slim: { tx: 72, tw: 56, ax: 50, aw: 20 },
  chunky: { tx: 60, tw: 80, ax: 36, aw: 23 },
};

const c0 = (it: AvatarItem, d = '#888888') => it.colors?.[0] ?? d;
const c1 = (it: AvatarItem, d = '#ffffff') => it.colors?.[1] ?? d;

// ───────────── Aura & back layers ─────────────

function Aura({ it, uid }: { it: AvatarItem; uid: string }) {
  const a = c0(it, '#ffd166');
  const b = c1(it, '#ffffff');
  const g = `${uid}-aura`;
  const sparks = [[30, 60], [170, 50], [20, 160], [182, 150], [50, 230], [156, 232], [100, 6]];
  return (
    <g className="lv-aura">
      <defs>
        <radialGradient id={g} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={it.style === 'shadow' ? '#000000' : b} stopOpacity="0.55" />
          <stop offset="0.6" stopColor={a} stopOpacity="0.35" />
          <stop offset="1" stopColor={a} stopOpacity="0" />
        </radialGradient>
      </defs>
      {it.style === 'rainbow'
        ? ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'].map((c, i) => (
          <ellipse key={c} cx="100" cy="132" rx={96 - i * 9} ry={128 - i * 9} fill="none" stroke={c} strokeWidth="5" opacity="0.55" />
        ))
        : <ellipse cx="100" cy="132" rx="98" ry="130" fill={`url(#${g})`} />}
      {it.style === 'flame' && [40, 70, 100, 130, 160].map((x, i) => (
        <path key={x} d={`M${x} 250 Q${x - 18} ${200 - i * 6} ${x} ${170 - (i % 2) * 20} Q${x + 18} ${200 - i * 6} ${x} 250Z`} fill={i % 2 ? a : b} opacity="0.7" />
      ))}
      {(it.style === 'sparkle' || it.style === 'gold' || it.style === 'frost') && sparks.map(([x, y], i) => (
        <path key={i} d={`M${x} ${y - 7} L${x + 2} ${y - 2} L${x + 7} ${y} L${x + 2} ${y + 2} L${x} ${y + 7} L${x - 2} ${y + 2} L${x - 7} ${y} L${x - 2} ${y - 2}Z`} fill={i % 2 ? a : b} className="lv-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </g>
  );
}

function Back({ it }: { it: AvatarItem }) {
  const a = c0(it);
  const b = c1(it, shade(a, -40));
  switch (it.style) {
    case 'wings':
    case 'angelwings': {
      const big = it.style === 'angelwings' ? 1.25 : 1;
      const wing = (flip: number) => (
        <g transform={`translate(100 0) scale(${flip * big} ${big}) translate(-100 ${big > 1 ? -18 : 0})`}>
          <path d="M72 118 Q14 70 6 150 Q26 140 30 172 Q44 150 52 176 Q60 150 74 150Z" fill={a} stroke={b} strokeWidth="2" />
          <path d="M66 124 Q30 110 20 140 M66 134 Q40 132 34 160 M68 142 Q54 148 52 168" stroke={b} strokeWidth="2" fill="none" />
        </g>
      );
      return <g>{wing(1)}{wing(-1)}</g>;
    }
    case 'batwings': {
      const wing = (flip: number) => (
        <g transform={`translate(100 0) scale(${flip} 1) translate(-100 0)`}>
          <path d="M72 116 L12 96 L20 124 L4 132 L22 146 L10 164 L36 160 L44 178 L74 150Z" fill={a} stroke={b} strokeWidth="2" />
        </g>
      );
      return <g>{wing(1)}{wing(-1)}</g>;
    }
    case 'cape':
      return <path d="M64 106 L136 106 L160 244 Q100 258 40 244Z" fill={a} stroke={shade(a, -40)} strokeWidth="2" />;
    case 'backpack':
      return <g><rect x="56" y="112" width="88" height="70" rx="16" fill={a} /><rect x="72" y="150" width="56" height="26" rx="8" fill={b} /></g>;
    case 'sword':
      return <g transform="rotate(-35 100 140)"><rect x="96" y="40" width="10" height="150" rx="3" fill={b} /><rect x="84" y="186" width="34" height="8" rx="3" fill={a} /><rect x="97" y="192" width="8" height="26" rx="3" fill={a} /></g>;
    case 'guitar':
      return <g transform="rotate(30 100 150)"><rect x="96" y="40" width="10" height="110" fill={b} /><ellipse cx="101" cy="182" rx="34" ry="40" fill={a} /><circle cx="101" cy="176" r="9" fill={b} /></g>;
    case 'jetpack':
      return (
        <g>
          <rect x="50" y="104" width="30" height="70" rx="12" fill={a} /><rect x="120" y="104" width="30" height="70" rx="12" fill={a} />
          <path d="M56 174 L65 200 L74 174Z M126 174 L135 200 L144 174Z" fill={b} className="lv-flame" />
        </g>
      );
    default:
      return null;
  }
}

// ───────────── Hair ─────────────

function hairLayers(it: AvatarItem): { back: ReactElement | null; front: ReactElement | null } {
  const a = c0(it, '#3b2a20');
  const d = shade(a, -30);
  const cap = <path d="M50 70 Q46 14 100 12 Q154 14 150 70 Q146 40 128 32 Q100 42 70 32 Q54 42 50 70Z" fill={a} />;
  switch (it.style) {
    case 'buzz':
      return { back: null, front: <path d="M56 54 Q58 20 100 18 Q142 20 144 54 Q122 34 100 34 Q78 34 56 54Z" fill={a} opacity="0.92" /> };
    case 'spiky':
      return { back: null, front: <path d="M50 66 L54 28 L70 38 L76 8 L92 30 L102 2 L112 28 L128 8 L132 36 L148 24 L150 66 Q140 38 100 36 Q60 38 50 66Z" fill={a} stroke={d} strokeWidth="1.5" /> };
    case 'bob':
      return {
        back: <path d="M44 60 Q44 10 100 10 Q156 10 156 60 L158 112 Q100 120 42 112Z" fill={d} />,
        front: <path d="M46 62 Q46 12 100 12 Q154 12 154 62 L154 106 Q140 110 136 100 L134 52 Q100 38 66 52 L64 100 Q60 110 46 106Z" fill={a} />,
      };
    case 'long':
      return {
        back: <path d="M44 60 Q44 8 100 8 Q156 8 156 60 L162 168 Q100 182 38 168Z" fill={d} />,
        front: <g>{cap}<path d="M50 64 Q44 110 48 150 L62 150 Q58 100 62 58Z M150 64 Q156 110 152 150 L138 150 Q142 100 138 58Z" fill={a} /></g>,
      };
    case 'wavy':
      return {
        back: <path d="M44 60 Q44 8 100 8 Q156 8 156 60 Q166 90 154 110 Q166 130 152 150 L48 150 Q34 130 46 110 Q34 90 44 60Z" fill={d} />,
        front: <g>{cap}<path d="M50 60 Q40 84 52 104 Q42 120 54 136 L62 130 Q56 112 62 96 Q54 80 62 58Z M150 60 Q160 84 148 104 Q158 120 146 136 L138 130 Q144 112 138 96 Q146 80 138 58Z" fill={a} /></g>,
      };
    case 'curly':
      return {
        back: <g fill={d}>{[[52, 84], [148, 84], [50, 104], [150, 104]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="13" />)}</g>,
        front: <g fill={a}>{[[56, 52, 15], [68, 32, 16], [86, 20, 16], [106, 18, 16], [126, 24, 16], [140, 40, 15], [146, 60, 13], [54, 70, 12]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />)}</g>,
      };
    case 'afro':
      return { back: <circle cx="100" cy="54" r="64" fill={a} />, front: <path d="M54 50 Q60 26 100 26 Q140 26 146 50 Q124 40 100 40 Q76 40 54 50Z" fill={d} /> };
    case 'mohawk':
      return {
        back: null,
        front: <g><path d="M60 50 Q64 26 100 24 Q136 26 140 50 Q120 38 100 38 Q80 38 60 50Z" fill={d} opacity="0.6" /><path d="M86 40 L88 -6 L98 8 L104 -10 L112 6 L116 40Z" fill={a} /></g>,
      };
    case 'bun':
      return { back: null, front: <g>{cap}<circle cx="100" cy="6" r="17" fill={a} stroke={d} strokeWidth="2" /></g> };
    case 'ponytail':
      return { back: <path d="M138 44 Q182 64 168 130 Q160 100 140 76Z" fill={d} />, front: cap };
    case 'pigtails':
      return {
        back: <g fill={a}><circle cx="36" cy="84" r="16" /><circle cx="164" cy="84" r="16" /></g>,
        front: <g>{cap}<circle cx="48" cy="72" r="5" fill="#ff6b9a" /><circle cx="152" cy="72" r="5" fill="#ff6b9a" /></g>,
      };
    case 'sidepart':
    default:
      return { back: null, front: <g>{cap}<path d="M62 40 Q90 30 130 44 Q104 30 80 30Z" fill={d} /></g> };
  }
}

// ───────────── Face & face accessories ─────────────

function Face({ it }: { it: AvatarItem | undefined }) {
  const ink = it ? c0(it, '#1f2330') : '#1f2330';
  const style = it?.style ?? 'smile';
  const eyes = <g fill={ink}><ellipse cx="82" cy="62" rx="5.5" ry="7.5" /><ellipse cx="118" cy="62" rx="5.5" ry="7.5" /></g>;
  const stroke = { stroke: ink, strokeWidth: 3.5, fill: 'none', strokeLinecap: 'round' as const };
  switch (style) {
    case 'grin':
      return <g>{eyes}<path d="M80 78 Q100 102 120 78Z" fill={ink} /><rect x="88" y="79" width="24" height="6" rx="2" fill="#fff" /></g>;
    case 'cool':
      return <g><path d="M74 60 L90 60 M110 60 L126 60" {...stroke} strokeWidth={5} /><path d="M88 84 Q104 90 114 80" {...stroke} /></g>;
    case 'wink':
      return <g><path d="M76 63 Q82 56 88 63" {...stroke} /><ellipse cx="118" cy="62" rx="5.5" ry="7.5" fill={ink} /><path d="M86 82 Q100 94 114 82" {...stroke} /></g>;
    case 'determined':
      return <g>{eyes}<path d="M72 50 L90 54 M128 50 L110 54" {...stroke} /><path d="M88 86 L112 86" {...stroke} /></g>;
    case 'sleepy':
      return <g><path d="M76 62 Q82 68 88 62 M112 62 Q118 68 124 62" {...stroke} /><ellipse cx="100" cy="86" rx="5" ry="4" fill={ink} /><text x="132" y="44" fontSize="14" fontWeight="700" fill={ink}>z</text></g>;
    case 'surprised':
      return <g fill={ink}><circle cx="82" cy="62" r="8" /><circle cx="118" cy="62" r="8" /><ellipse cx="100" cy="88" rx="7" ry="9" /></g>;
    case 'cheeky':
      return <g>{eyes}<path d="M84 82 Q100 94 116 82" {...stroke} /><path d="M98 86 Q104 98 110 86Z" fill="#ff6b9a" /></g>;
    case 'happy':
      return <g><path d="M75 65 Q82 55 89 65 M111 65 Q118 55 125 65" {...stroke} /><path d="M84 80 Q100 98 116 80Z" fill={ink} /></g>;
    case 'smirk':
      return <g>{eyes}<path d="M88 86 Q106 88 116 78" {...stroke} /></g>;
    case 'kawaii':
      return (
        <g>
          <ellipse cx="82" cy="62" rx="8" ry="10" fill={ink} /><ellipse cx="118" cy="62" rx="8" ry="10" fill={ink} />
          <circle cx="85" cy="58" r="3" fill="#fff" /><circle cx="121" cy="58" r="3" fill="#fff" />
          <ellipse cx="70" cy="78" rx="7" ry="4" fill="#ff8fab" opacity="0.7" /><ellipse cx="130" cy="78" rx="7" ry="4" fill="#ff8fab" opacity="0.7" />
          <path d="M92 84 Q96 89 100 84 Q104 89 108 84" {...stroke} strokeWidth={2.5} />
        </g>
      );
    case 'robot':
      return <g><rect x="72" y="54" width="20" height="12" rx="3" fill="#00e5ff" /><rect x="108" y="54" width="20" height="12" rx="3" fill="#00e5ff" /><path d="M84 84 L116 84 M88 80 L88 88 M96 80 L96 88 M104 80 L104 88 M112 80 L112 88" stroke={ink} strokeWidth="2.5" /></g>;
    case 'angry':
      return <g>{eyes}<path d="M72 48 L92 56 M128 48 L108 56" {...stroke} /><path d="M86 90 Q100 80 114 90" {...stroke} /></g>;
    case 'stars': {
      const star = (x: number) => `M${x} 52 L${x + 3} 59 L${x + 10} 60 L${x + 5} 65 L${x + 6} 72 L${x} 68 L${x - 6} 72 L${x - 5} 65 L${x - 10} 60 L${x - 3} 59Z`;
      return <g><path d={star(82)} fill="#ffd166" stroke={ink} strokeWidth="1.5" /><path d={star(118)} fill="#ffd166" stroke={ink} strokeWidth="1.5" /><ellipse cx="100" cy="86" rx="9" ry="7" fill={ink} /></g>;
    }
    case 'smile':
    default:
      return <g>{eyes}<path d="M86 82 Q100 94 114 82" {...stroke} /></g>;
  }
}

function FaceAcc({ it }: { it: AvatarItem }) {
  const a = c0(it, '#1f2330');
  const b = c1(it, '#e9c46a');
  switch (it.style) {
    case 'glasses':
      return <g fill="none" stroke={a} strokeWidth="3.5"><circle cx="82" cy="62" r="12" /><circle cx="118" cy="62" r="12" /><path d="M94 62 L106 62 M70 60 L56 56 M130 60 L144 56" /></g>;
    case 'shades':
      return <g><rect x="66" y="52" width="32" height="20" rx="7" fill={a} stroke={b} strokeWidth="2" /><rect x="102" y="52" width="32" height="20" rx="7" fill={a} stroke={b} strokeWidth="2" /><path d="M98 60 L102 60" stroke={b} strokeWidth="3" /></g>;
    case 'monocle':
      return <g fill="none" stroke={a} strokeWidth="3"><circle cx="118" cy="62" r="13" /><path d="M128 72 Q136 96 128 118" strokeWidth="1.5" /></g>;
    case 'mask':
      return <path d="M58 56 Q78 44 100 56 Q122 44 142 56 Q140 76 120 74 Q108 72 100 66 Q92 72 80 74 Q60 76 58 56Z M76 58 a6 5 0 1 0 12 0 a6 5 0 1 0 -12 0 M112 58 a6 5 0 1 0 12 0 a6 5 0 1 0 -12 0" fill={a} fillRule="evenodd" stroke={b} strokeWidth="2" />;
    case 'eyepatch':
      return <g><path d="M54 44 L146 70" stroke={a} strokeWidth="3" /><ellipse cx="82" cy="62" rx="13" ry="11" fill={a} /></g>;
    case 'visor':
      return <rect x="56" y="52" width="88" height="20" rx="10" fill={a} opacity="0.85" />;
    case 'heartglasses': {
      const heart = (x: number) => `M${x} 74 L${x - 13} 60 Q${x - 16} 48 ${x - 6} 49 Q${x} 50 ${x} 56 Q${x} 50 ${x + 6} 49 Q${x + 16} 48 ${x + 13} 60Z`;
      return <g fill={a} stroke="#1f2330" strokeWidth="1.5"><path d={heart(82)} /><path d={heart(118)} /><path d="M95 58 L105 58" stroke={a} strokeWidth="3" /></g>;
    }
    default:
      return null;
  }
}

// ───────────── Hats ─────────────

function Hat({ it }: { it: AvatarItem }) {
  const a = c0(it, '#e63946');
  const b = c1(it, '#ffffff');
  const d = shade(a, -35);
  switch (it.style) {
    case 'cap':
      return <g><path d="M54 46 Q56 6 100 6 Q144 6 146 46Z" fill={a} /><ellipse cx="100" cy="46" rx="56" ry="9" fill={d} /><circle cx="100" cy="24" r="8" fill={b} /></g>;
    case 'beanie':
      return <g><path d="M52 50 Q52 2 100 2 Q148 2 148 50Z" fill={a} /><rect x="50" y="40" width="100" height="16" rx="8" fill={b} /><circle cx="100" cy="-2" r="10" fill={b} /></g>;
    case 'tophat':
      return <g><rect x="70" y="-34" width="60" height="64" rx="4" fill={a} /><rect x="70" y="14" width="60" height="9" fill={b} /><ellipse cx="100" cy="30" rx="58" ry="8" fill={d} /></g>;
    case 'crown':
      return <g><path d="M58 34 L62 -4 L80 16 L100 -12 L120 16 L138 -4 L142 34Z" fill={a} stroke={d} strokeWidth="2" /><circle cx="100" cy="20" r="5" fill={b} /><circle cx="76" cy="24" r="4" fill={b} /><circle cx="124" cy="24" r="4" fill={b} /></g>;
    case 'cowboy':
      return <g><path d="M62 40 Q64 0 100 4 Q136 0 138 40Z" fill={a} /><rect x="62" y="28" width="76" height="8" fill={b} /><path d="M24 36 Q100 58 176 36 Q164 52 100 54 Q36 52 24 36Z" fill={d} /></g>;
    case 'headphones':
      return <g><path d="M50 62 Q50 2 100 2 Q150 2 150 62" stroke={a} strokeWidth="9" fill="none" /><rect x="38" y="48" width="20" height="32" rx="8" fill={a} /><rect x="142" y="48" width="20" height="32" rx="8" fill={a} /><rect x="43" y="54" width="10" height="20" rx="4" fill={b} /><rect x="147" y="54" width="10" height="20" rx="4" fill={b} /></g>;
    case 'halo':
      return <ellipse cx="100" cy="-2" rx="40" ry="9" fill="none" stroke={a} strokeWidth="7" className="lv-float" />;
    case 'horns':
      return <g fill={a}><path d="M66 32 Q46 6 56 -14 Q66 8 82 24Z" /><path d="M134 32 Q154 6 144 -14 Q134 8 118 24Z" /></g>;
    case 'partyhat':
      return <g><path d="M78 30 L100 -38 L122 30Z" fill={a} /><path d="M86 6 L114 6 M82 18 L118 18" stroke={b} strokeWidth="5" /><circle cx="100" cy="-38" r="8" fill={b} /></g>;
    case 'helmet':
      return <g><path d="M42 74 Q42 2 100 2 Q158 2 158 74 L158 100 L42 100Z M60 40 L140 40 L140 88 L60 88Z" fill={a} fillRule="evenodd" /><rect x="60" y="40" width="80" height="48" rx="14" fill={b} opacity="0.28" /><rect x="60" y="40" width="80" height="48" rx="14" fill="none" stroke={d} strokeWidth="3" /></g>;
    case 'beret':
      return <g><ellipse cx="92" cy="22" rx="52" ry="18" fill={a} transform="rotate(-8 92 22)" /><rect x="96" y="-2" width="6" height="10" rx="2" fill={d} /></g>;
    case 'bunnyears':
      return <g><ellipse cx="80" cy="-8" rx="11" ry="34" fill={a} /><ellipse cx="120" cy="-8" rx="11" ry="34" fill={a} /><ellipse cx="80" cy="-6" rx="5" ry="24" fill={b} /><ellipse cx="120" cy="-6" rx="5" ry="24" fill={b} /></g>;
    case 'chef':
      return <g fill={a} stroke="#d6d6dc" strokeWidth="1.5"><circle cx="76" cy="-2" r="22" /><circle cx="100" cy="-12" r="26" /><circle cx="124" cy="-2" r="22" /><rect x="64" y="10" width="72" height="22" rx="4" /></g>;
    case 'wizard':
      return <g><path d="M56 32 L104 -54 L144 32Z" fill={a} /><ellipse cx="100" cy="32" rx="58" ry="9" fill={d} /><path d="M98 -10 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1z M118 10 l2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1z" fill={b} /></g>;
    case 'viking':
      return <g><path d="M56 46 Q56 4 100 4 Q144 4 144 46Z" fill={a} /><rect x="54" y="38" width="92" height="10" rx="4" fill={d} /><path d="M58 34 Q30 30 30 -4 Q44 18 64 22Z M142 34 Q170 30 170 -4 Q156 18 136 22Z" fill={b} /></g>;
    case 'tiara':
      return <g><path d="M66 30 L74 12 L88 24 L100 2 L112 24 L126 12 L134 30Z" fill={a} stroke={d} strokeWidth="1.5" /><circle cx="100" cy="16" r="5" fill={b} /></g>;
    case 'flowercrown':
      return <g>{[64, 80, 100, 120, 136].map((x, i) => <circle key={x} cx={x} cy={i === 2 ? 20 : 26} r="8" fill={i % 2 ? b : a} stroke="#fff" strokeWidth="1.5" />)}</g>;
    case 'antenna':
      return <g><path d="M100 22 L100 -16" stroke="#3a3f52" strokeWidth="4" /><circle cx="100" cy="-20" r="9" fill={a} className="lv-blink" /></g>;
    case 'fedora':
      return <g><path d="M62 32 Q64 -8 100 -2 Q136 -8 138 32Z" fill={a} /><path d="M92 -2 Q100 8 108 -2" stroke={d} strokeWidth="3" fill="none" /><rect x="62" y="20" width="76" height="9" fill={b} /><ellipse cx="100" cy="32" rx="62" ry="9" fill={d} /></g>;
    case 'hood':
      return <path d="M38 118 Q28 6 100 4 Q172 6 162 118 L146 118 Q152 38 100 34 Q48 38 54 118Z" fill={a} />;
    default:
      return null;
  }
}

// ───────────── Neck, shoulder, waist ─────────────

function Neck({ it }: { it: AvatarItem }) {
  const a = c0(it, '#e63946');
  const b = c1(it, '#ffffff');
  switch (it.style) {
    case 'scarf':
      return <g><rect x="62" y="98" width="76" height="18" rx="9" fill={a} /><rect x="114" y="106" width="16" height="40" rx="5" fill={a} /><path d="M114 120 L130 120 M114 132 L130 132" stroke={b} strokeWidth="3" /></g>;
    case 'chain':
      return <g><path d="M74 106 Q100 140 126 106" stroke={a} strokeWidth="4" fill="none" /><circle cx="100" cy="128" r="7" fill={a} /></g>;
    case 'bowtie':
      return <path d="M100 110 L84 102 L84 118Z M100 110 L116 102 L116 118Z" fill={a} stroke={shade(a, -40)} strokeWidth="1.5" />;
    case 'tie':
      return <path d="M94 106 L106 106 L104 114 L110 150 L100 160 L90 150 L96 114Z" fill={a} />;
    case 'necklace':
      return <g fill={a} stroke="#c9c9d1" strokeWidth="1">{[76, 84, 92, 100, 108, 116, 124].map((x, i) => <circle key={x} cx={x} cy={110 + Math.sin((i / 6) * Math.PI) * 12} r="3.5" />)}</g>;
    case 'bandana':
      return <g><path d="M66 102 L134 102 L100 136Z" fill={a} /><circle cx="94" cy="112" r="2" fill={b} /><circle cx="106" cy="112" r="2" fill={b} /><circle cx="100" cy="122" r="2" fill={b} /></g>;
    default:
      return null;
  }
}

function Shoulder({ it }: { it: AvatarItem }) {
  const a = c0(it, '#2a9d8f');
  const b = c1(it, '#e63946');
  return (
    <g transform="translate(150 86)" className="lv-pet">
      {it.style === 'parrot' && <g><ellipse cx="0" cy="10" rx="12" ry="17" fill={a} /><circle cx="0" cy="-8" r="10" fill={a} /><path d="M7 -8 L16 -4 L7 -1Z" fill="#ffd166" /><circle cx="3" cy="-10" r="2" fill="#111" /><path d="M-10 6 Q-18 20 -6 28" fill={b} /></g>}
      {it.style === 'cat' && <g><ellipse cx="0" cy="12" rx="14" ry="13" fill={a} /><circle cx="0" cy="-6" r="12" fill={a} /><path d="M-11 -12 L-8 -24 L-2 -15Z M11 -12 L8 -24 L2 -15Z" fill={a} /><circle cx="-4" cy="-6" r="2" fill="#111" /><circle cx="4" cy="-6" r="2" fill="#111" /><ellipse cx="0" cy="-1" rx="2" ry="1.5" fill={b} /></g>}
      {it.style === 'dragon' && <g><path d="M-6 0 Q-30 -20 -24 8 Q-14 2 -8 10Z M6 0 Q30 -20 24 8 Q14 2 8 10Z" fill={b} /><ellipse cx="0" cy="10" rx="11" ry="16" fill={a} /><ellipse cx="0" cy="-8" rx="10" ry="9" fill={a} /><path d="M-6 -15 L-9 -24 L-2 -16Z M6 -15 L9 -24 L2 -16Z" fill={b} /><circle cx="-3" cy="-9" r="2" fill="#fff" /><circle cx="3" cy="-9" r="2" fill="#fff" /></g>}
      {it.style === 'owl' && <g><ellipse cx="0" cy="4" rx="15" ry="19" fill={a} /><circle cx="-6" cy="-4" r="6" fill={b} /><circle cx="6" cy="-4" r="6" fill={b} /><circle cx="-6" cy="-4" r="3" fill="#111" /><circle cx="6" cy="-4" r="3" fill="#111" /><path d="M-2 2 L0 6 L2 2Z" fill="#f4a261" /></g>}
    </g>
  );
}

function Waist({ it }: { it: AvatarItem }) {
  const a = c0(it, '#7f5539');
  const b = c1(it, '#e9c46a');
  if (it.style === 'tail') return <path d="M118 170 Q176 172 172 214 Q168 228 158 222 Q164 190 116 184Z" fill={a} stroke={b} strokeWidth="2" />;
  return (
    <g>
      <rect x="66" y="164" width="68" height="9" rx="3" fill={a} />
      <rect x="94" y="162" width="12" height="13" rx="2" fill={b} />
      {it.style === 'toolbelt' && <g><rect x="70" y="172" width="12" height="16" rx="2" fill={a} /><rect x="118" y="172" width="12" height="16" rx="2" fill={a} /><rect x="122" y="166" width="4" height="14" fill={b} /></g>}
    </g>
  );
}

// ───────────── Clothing ─────────────

function Shirt({ it, d }: { it: AvatarItem; d: Dims }) {
  const a = c0(it, '#4f7cff');
  const b = c1(it, '#ffffff');
  const { tx, tw, ax, aw } = d;
  const rx = tx + tw;
  const torso = (fill: string) => <rect x={tx} y="104" width={tw} height="74" rx="14" fill={fill} />;
  const rightArmX = 200 - ax - aw;
  const sl = (len: number, fill = a) => <g fill={fill}><rect x={ax} y="108" width={aw} height={len} rx="10" /><rect x={rightArmX} y="108" width={aw} height={len} rx="10" /></g>;
  switch (it.style) {
    case 'stripes':
      return <g>{torso(a)}{[116, 132, 148, 164].map((y) => <rect key={y} x={tx} y={y} width={tw} height="7" fill={b} />)}{sl(26)}</g>;
    case 'hoodie':
      return <g>{torso(a)}{sl(60)}<path d={`M${tx + 6} 106 Q100 128 ${rx - 6} 106`} stroke={shade(a, -30)} strokeWidth="8" fill="none" /><rect x={tx + 16} y="146" width={tw - 32} height="22" rx="8" fill={shade(a, -18)} />{it.colors[1] && <path d="M94 116 L94 140 M106 116 L106 140" stroke={b} strokeWidth="3" />}</g>;
    case 'jacket':
      return <g>{torso(b)}<path d={`M${tx} 118 Q${tx} 104 ${tx + 14} 104 L94 104 L94 178 L${tx} 178Z M${rx} 118 Q${rx} 104 ${rx - 14} 104 L106 104 L106 178 L${rx} 178Z`} fill={a} />{sl(62)}</g>;
    case 'suit':
      return <g>{torso(a)}<path d="M84 104 L100 136 L116 104Z" fill={b} /><path d="M96 110 L104 110 L102 140 L100 146 L98 140Z" fill="#c1121f" />{sl(62)}<circle cx="100" cy="152" r="2.5" fill={shade(a, 60)} /></g>;
    case 'star':
      return <g>{torso(a)}<path d="M100 120 l6 12 13 2 -9 9 2 13 -12 -6 -12 6 2 -13 -9 -9 13 -2z" fill={b} />{sl(26)}</g>;
    case 'tank':
      return <g>{torso(a)}<rect x={tx + 12} y="98" width="10" height="12" fill={a} /><rect x={rx - 22} y="98" width="10" height="12" fill={a} /></g>;
    case 'flannel':
      return <g>{torso(a)}{[tx + 14, tx + 34, tx + 54].map((x) => <rect key={x} x={x} y="104" width="6" height="74" fill={b} opacity="0.55" />)}{[122, 146, 168].map((y) => <rect key={y} x={tx} y={y} width={tw} height="5" fill={b} opacity="0.55" />)}{sl(62)}</g>;
    case 'sweater':
      return <g>{torso(a)}<rect x={tx} y="166" width={tw} height="12" rx="4" fill={shade(a, -25)} />{sl(62)}<path d={`M${tx + 10} 106 Q100 120 ${rx - 10} 106`} stroke={b} strokeWidth="5" fill="none" /></g>;
    case 'jersey':
      return <g>{torso(a)}<text x="100" y="158" textAnchor="middle" fontSize="30" fontWeight="800" fill={b}>7</text>{sl(26, b)}</g>;
    case 'armor':
      return <g>{torso(a)}<path d={`M${tx + 6} 118 L${rx - 6} 118 M${tx + 6} 140 L${rx - 6} 140 M100 104 L100 178`} stroke={b} strokeWidth="3" /><circle cx="100" cy="128" r="8" fill={b} />{sl(40, shade(a, -15))}</g>;
    case 'dress':
      return <g><rect x={tx} y="104" width={tw} height="60" rx="14" fill={a} /><path d={`M${tx} 156 L${rx} 156 L${rx + 22} 216 Q100 226 ${tx - 22} 216Z`} fill={a} /><path d={`M${tx} 156 L${rx} 156`} stroke={b} strokeWidth="5" />{sl(18)}</g>;
    case 'uniform':
      return <g>{torso(a)}<path d="M118 118 l5 4 -1 7 -4 3 -4 -3 -1 -7z" fill={b} /><rect x={tx + 8} y="124" width="18" height="12" rx="2" fill={shade(a, 20)} /><rect x={rx - 26} y="140" width="18" height="12" rx="2" fill={shade(a, 20)} />{sl(40)}<path d="M84 104 L100 120 L116 104" stroke={shade(a, 40)} strokeWidth="3" fill="none" /></g>;
    case 'scrubs':
      return <g>{torso(a)}<path d="M86 104 L100 128 L114 104Z" fill={b} />{sl(26)}<rect x={tx + 10} y="138" width="16" height="12" rx="2" fill={shade(a, -20)} /></g>;
    case 'tee':
    default:
      return <g>{torso(a)}{sl(26)}</g>;
  }
}

function Pants({ it, d }: { it: AvatarItem; d: Dims }) {
  const a = c0(it, '#1d3557');
  const b = c1(it, shade(a, -30));
  const hip = <rect x={d.tx + 2} y="164" width={d.tw - 4} height="16" rx="6" fill={a} />;
  const legs = (h: number, fill = a) => <g fill={fill}><rect x="70" y="174" width="28" height={h} rx="9" /><rect x="102" y="174" width="28" height={h} rx="9" /></g>;
  switch (it.style) {
    case 'shorts':
      return <g>{hip}{legs(28)}</g>;
    case 'skirt':
      return <path d={`M${d.tx + 2} 162 L${d.tx + d.tw - 2} 162 L${d.tx + d.tw + 14} 212 Q100 220 ${d.tx - 14} 212Z`} fill={a} />;
    case 'cargo':
      return <g>{hip}{legs(58)}<rect x="72" y="196" width="10" height="14" rx="2" fill={shade(a, -25)} /><rect x="118" y="196" width="10" height="14" rx="2" fill={shade(a, -25)} /></g>;
    case 'joggers':
      return <g>{hip}{legs(58)}<path d="M74 180 L74 228 M126 180 L126 228" stroke={b} strokeWidth="3" /><rect x="70" y="224" width="28" height="8" rx="4" fill={shade(a, -25)} /><rect x="102" y="224" width="28" height="8" rx="4" fill={shade(a, -25)} /></g>;
    case 'suitpants':
      return <g>{hip}{legs(58)}<path d="M84 182 L84 230 M116 182 L116 230" stroke={shade(a, 25)} strokeWidth="1.5" /></g>;
    case 'armorlegs':
      return <g>{hip}{legs(58)}<path d="M70 196 L98 196 M102 196 L130 196 M70 214 L98 214 M102 214 L130 214" stroke={shade(a, -40)} strokeWidth="3" /></g>;
    case 'jeans':
    default:
      return <g>{hip}{legs(58)}<path d="M84 180 L84 230 M116 180 L116 230" stroke={shade(a, 30)} strokeWidth="1.5" strokeDasharray="3 3" /></g>;
  }
}

// ───────────── Main component ─────────────

export type AvatarProps = {
  spec: AvatarSpec;
  size?: number;
  crop?: 'full' | 'head' | 'torso' | 'legs' | 'upper';
  emote?: string | null;
  animated?: boolean;
  className?: string;
  title?: string;
};

const CROPS: Record<string, string> = {
  full: '-30 -60 260 320',
  head: '28 -34 144 150',
  upper: '10 -40 180 200',
  torso: '20 80 160 120',
  legs: '30 150 140 110',
};

function AvatarImpl({ spec, size = 160, crop = 'full', emote = null, animated = false, className, title }: AvatarProps) {
  const uid = useId().replace(/:/g, '');
  const c = spec.bodyColors;
  const d = DIMS[spec.bodyType] ?? DIMS.classic;
  const by = (slot: string) => spec.items.find((i) => i.slot === slot);
  const hat = by('hat');
  const hair = by('hair');
  const face = by('face');
  const faceAcc = by('face_acc');
  const neck = by('neck');
  const back = by('back');
  const shoulder = by('shoulder');
  const waist = by('waist');
  const shirt = by('shirt');
  const pants = by('pants');
  const aura = by('aura');
  const anim = by('animation');
  const h = hair ? hairLayers(hair) : { back: null, front: null };
  const rightArmX = 200 - d.ax - d.aw;
  const glow = (it: AvatarItem | undefined) => (it?.glow ? { filter: `drop-shadow(0 0 6px ${it.colors?.[0] ?? '#fff'})` } : undefined);
  const classes = ['lv-avatar', animated ? `lv-idle-${anim?.style ?? 'default'}` : '', emote ? `lv-emote-${emote}` : '', className ?? ''].filter(Boolean).join(' ');
  const hideHair = hat?.style === 'helmet' || hat?.style === 'hood';
  const [vx, vy, vw, vh] = CROPS[crop].split(' ').map(Number);
  const height = (size * vh) / vw;
  return (
    <svg viewBox={CROPS[crop]} width={size} height={height} className={classes} role="img" aria-label={title ?? 'Avatar'}>
      {title && <title>{title}</title>}
      <g className="lv-root">
        {aura && <g style={glow(aura)}><Aura it={aura} uid={uid} /></g>}
        {back && <g style={glow(back)} className="lv-back"><Back it={back} /></g>}
        {waist?.style === 'tail' && <Waist it={waist} />}
        <ellipse cx="100" cy="244" rx="52" ry="8" fill="#000" opacity="0.18" />
        <g className="lv-legs">
          <rect x="70" y="174" width="28" height="62" rx="10" fill={c.leftLeg} />
          <rect x="102" y="174" width="28" height="62" rx="10" fill={c.rightLeg} />
          <rect x="68" y="228" width="32" height="12" rx="5" fill="#2b2f3f" />
          <rect x="100" y="228" width="32" height="12" rx="5" fill="#2b2f3f" />
          {pants && <Pants it={pants} d={d} />}
        </g>
        <g className="lv-torso">
          <rect x={d.tx} y="104" width={d.tw} height="74" rx="14" fill={c.torso} />
          {shirt && <Shirt it={shirt} d={d} />}
          {waist && waist.style !== 'tail' && <Waist it={waist} />}
          {neck && <Neck it={neck} />}
        </g>
        <g className="lv-arm-l" style={{ transformOrigin: `${d.ax + d.aw / 2}px 112px` }}>
          <rect x={d.ax} y="108" width={d.aw} height="64" rx="11" fill={c.leftArm} />
          {shirt && ['hoodie', 'jacket', 'suit', 'flannel', 'sweater'].includes(shirt.style) && <rect x={d.ax} y="108" width={d.aw} height="60" rx="10" fill={c0(shirt)} />}
          {shirt && ['tee', 'stripes', 'star', 'jersey', 'scrubs', 'dress'].includes(shirt.style) && <rect x={d.ax} y="108" width={d.aw} height="26" rx="10" fill={shirt.style === 'jersey' ? c1(shirt) : c0(shirt)} />}
          {shirt && ['armor', 'uniform'].includes(shirt.style) && <rect x={d.ax} y="108" width={d.aw} height="40" rx="10" fill={c0(shirt)} />}
        </g>
        <g className="lv-arm-r" style={{ transformOrigin: `${rightArmX + d.aw / 2}px 112px` }}>
          <rect x={rightArmX} y="108" width={d.aw} height="64" rx="11" fill={c.rightArm} />
          {shirt && ['hoodie', 'jacket', 'suit', 'flannel', 'sweater'].includes(shirt.style) && <rect x={rightArmX} y="108" width={d.aw} height="60" rx="10" fill={c0(shirt)} />}
          {shirt && ['tee', 'stripes', 'star', 'jersey', 'scrubs', 'dress'].includes(shirt.style) && <rect x={rightArmX} y="108" width={d.aw} height="26" rx="10" fill={shirt.style === 'jersey' ? c1(shirt) : c0(shirt)} />}
          {shirt && ['armor', 'uniform'].includes(shirt.style) && <rect x={rightArmX} y="108" width={d.aw} height="40" rx="10" fill={c0(shirt)} />}
        </g>
        <g className="lv-head">
          {!hideHair && h.back}
          <rect x="54" y="20" width="92" height="88" rx="34" fill={c.head} />
          <ellipse cx="74" cy="36" rx="12" ry="7" fill="#fff" opacity="0.18" />
          <Face it={face} />
          {faceAcc && <g style={glow(faceAcc)}><FaceAcc it={faceAcc} /></g>}
          {!hideHair && h.front}
          {hat && <g style={glow(hat)}><Hat it={hat} /></g>}
        </g>
        {shoulder && <Shoulder it={shoulder} />}
      </g>
    </svg>
  );
}

export const Avatar = memo(AvatarImpl);

/** Item preview: the item alone on a mannequin, cropped to the relevant body area. */
export function ItemPreview({ item, size = 120 }: { item: { slot: string; asset: any; category: string; name?: string }; size?: number }) {
  const spec: AvatarSpec = { bodyColors: MANNEQUIN, bodyType: 'classic', items: [] };
  const asset = { id: 0, slot: item.slot, ...(item.asset ?? {}) } as AvatarItem;
  let crop: AvatarProps['crop'] = 'full';
  if (['hat', 'hair', 'face', 'face_acc'].includes(item.slot)) crop = 'head';
  else if (['shirt', 'neck', 'waist'].includes(item.slot)) crop = 'torso';
  else if (item.slot === 'pants') crop = 'legs';
  else if (item.slot === 'shoulder') crop = 'upper';
  if (item.slot === 'face') spec.items = [asset];
  else if (item.slot === 'emote') spec.items = [{ id: 0, slot: 'face', style: 'happy', colors: ['#1f2330'] }];
  else if (item.slot === 'animation') spec.items = [{ id: 0, slot: 'face', style: 'happy', colors: ['#1f2330'] }, asset];
  else if (item.slot !== 'bundle') spec.items = [{ id: -1, slot: 'face', style: 'smile', colors: ['#9aa1b2'] }, asset];
  if (item.slot === 'bundle') {
    const a = item.asset?.colors?.[0] ?? '#7b2cbf';
    const b = item.asset?.colors?.[1] ?? '#e9c46a';
    return (
      <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={item.name ?? 'Bundle'}>
        <rect x="22" y="44" width="76" height="56" rx="8" fill={a} />
        <rect x="16" y="32" width="88" height="20" rx="6" fill={shade(a, 25)} />
        <rect x="54" y="32" width="12" height="68" fill={b} />
        <path d="M60 32 Q40 8 34 24 Q36 34 60 32 Q84 34 86 24 Q80 8 60 32Z" fill={b} />
      </svg>
    );
  }
  const emote = item.slot === 'emote' ? item.asset?.style : null;
  return <Avatar spec={spec} size={size} crop={crop} emote={emote} animated={item.slot === 'animation'} title={item.name} />;
}
