import { AlertTriangle, ChevronLeft, Loader2, RefreshCw, X } from 'lucide-react';
import { ReactNode, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, assetUrl } from '../api';
import { compact, full, RARITY_COLORS } from '../lib/format';
import type { AccountCard, Experience, Item } from '../types';
import { BadgeIcon, ExperienceArt, SparkIcon, VerifiedMark } from './Art';
import { Avatar, ItemPreview } from './Avatar';

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'spark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
};

export function Button({ variant = 'primary', size = 'md', loading, icon, block, children, className, disabled, ...rest }: BtnProps) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className ?? ''}`} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 className="spin" size={16} /> : icon}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ label, children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={`icon-btn ${className ?? ''}`} {...rest}>{children}</button>;
}

/** Fictional currency amount. `tag` adds the small "RP" marker that labels it as roleplay currency. */
export function Sparks({ amount, size = 16, compactNum = false, tag = false, className }: { amount: number; size?: number; compactNum?: boolean; tag?: boolean; className?: string }) {
  return (
    <span className={`sparks ${className ?? ''}`} title={`${full(amount)} Sparks (fictional roleplay currency)`}>
      <SparkIcon size={size} />
      <span>{compactNum ? compact(amount) : full(amount)}</span>
      {tag && <span className="rp-tag">RP</span>}
    </span>
  );
}

export function PageHeader({ title, back = true, right, subtitle }: { title: ReactNode; back?: boolean; right?: ReactNode; subtitle?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="page-header">
      {back && <IconButton label="Back" onClick={() => (window.history.length > 1 ? nav(-1) : nav('/'))}><ChevronLeft size={22} /></IconButton>}
      <div className="page-header-title">
        <h1>{title}</h1>
        {subtitle && <div className="muted small">{subtitle}</div>}
      </div>
      <div className="page-header-right">{right}</div>
    </div>
  );
}

export function Section({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`section ${className ?? ''}`}>
      {(title || action) && <div className="section-head"><h2>{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

export function Rail({ children }: { children: ReactNode }) {
  return <div className="rail">{children}</div>;
}

export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`tabs ${className ?? ''}`} role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={t.value === value} className={`tab ${t.value === value ? 'active' : ''}`} onClick={() => onChange(t.value)}>{t.label}</button>
      ))}
    </div>
  );
}

export function Sheet({ open, onClose, title, children, footer, tall }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; footer?: ReactNode; tall?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className={`sheet ${tall ? 'sheet-tall' : ''}`} role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        {title && <div className="sheet-head"><h3>{title}</h3><IconButton label="Close" onClick={onClose}><X size={20} /></IconButton></div>}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <div className="spinner-block"><Loader2 className="spin" size={28} />{label && <span className="muted">{label}</span>}</div>;
}

export function ErrorBlock({ error, retry }: { error: unknown; retry?: () => void }) {
  const e = error as ApiError;
  const offline = e?.code === 'network';
  return (
    <div className="error-block">
      <AlertTriangle size={28} />
      <div>
        <strong>{offline ? 'You’re offline' : 'Something went wrong'}</strong>
        <p className="muted">{e?.message ?? 'Please try again.'}</p>
      </div>
      {retry && <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={retry}>Retry</Button>}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return <div className="empty">{icon}<strong>{title}</strong>{text && <p className="muted">{text}</p>}{action}</div>;
}

/** Render a react-query result: spinner, error with retry, or children. */
export function Q<T>({ q, children, label }: { q: { data?: T; isLoading: boolean; error: unknown; refetch: () => any }; children: (d: T) => ReactNode; label?: string }) {
  if (q.isLoading) return <Spinner label={label} />;
  if (q.error && !q.data) return <ErrorBlock error={q.error} retry={() => q.refetch()} />;
  if (q.data === undefined) return null;
  return <>{children(q.data)}</>;
}

export function Headshot({ account, size = 44, presence = true }: { account: Pick<AccountCard, 'avatar' | 'picture' | 'displayName' | 'presence'>; size?: number; presence?: boolean }) {
  const src = assetUrl(account.picture);
  const status = account.presence?.status ?? 'offline';
  return (
    <span className={`headshot ${presence ? `presence-${status}` : ''}`} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <Avatar spec={account.avatar} crop="head" size={size} title={account.displayName} />}
    </span>
  );
}

export function Name({ account, showBadges = false, size }: { account: Pick<AccountCard, 'displayName' | 'verified' | 'badges'>; showBadges?: boolean; size?: number }) {
  return (
    <span className="name-line">
      <span className="name-text">{account.displayName}</span>
      {account.verified && <VerifiedMark size={size ?? 15} />}
      {showBadges && account.badges.filter((b) => b.key !== 'roleplay_verified').slice(0, 3).map((b) => <BadgeIcon key={b.key} badge={b} size={10} />)}
    </span>
  );
}

export function presenceText(a: Pick<AccountCard, 'presence'>): string {
  const p = a.presence;
  if (p?.status === 'in_experience') return p.experienceName ? `Playing ${p.experienceName}` : 'In an experience';
  if (p?.status === 'online') return 'Online';
  return 'Offline';
}

export function AccountRow({ account, right, sub, to }: { account: AccountCard; right?: ReactNode; sub?: ReactNode; to?: string }) {
  const body = (
    <>
      <Headshot account={account} />
      <div className="row-main">
        <Name account={account} />
        <div className="muted small">{sub ?? `@${account.username} · ${presenceText(account)}`}</div>
      </div>
      {right && <div className="row-right" onClick={(e) => e.preventDefault()}>{right}</div>}
    </>
  );
  return to === undefined ? <Link className="row" to={`/profile/${account.id}`}>{body}</Link> : to ? <Link className="row" to={to}>{body}</Link> : <div className="row">{body}</div>;
}

export function FriendBubble({ account }: { account: AccountCard }) {
  return (
    <Link to={`/profile/${account.id}`} className="friend-bubble">
      <Headshot account={account} size={62} />
      <span className="ellipsis">{account.displayName}</span>
      {account.presence?.status === 'in_experience' && <span className="tiny accent ellipsis">{account.presence.experienceName ?? 'Playing'}</span>}
    </Link>
  );
}

export function RarityLabel({ rarity }: { rarity: string }) {
  return <span className="rarity" style={{ color: RARITY_COLORS[rarity], borderColor: RARITY_COLORS[rarity] }}>{rarity}</span>;
}

export function ItemThumb({ item, size = 110 }: { item: Pick<Item, 'slot' | 'asset' | 'category' | 'name' | 'thumbnail' | 'rarity'>; size?: number }) {
  const src = assetUrl(item.thumbnail);
  return (
    <div className="item-thumb" style={{ ['--rarity' as any]: RARITY_COLORS[item.rarity] ?? '#9aa4b5' }}>
      {src ? <img src={src} alt={item.name} loading="lazy" decoding="async" /> : <ItemPreview item={item} size={size} />}
    </div>
  );
}

export function ItemTile({ item, to, footer, onClick }: { item: Item; to?: string; footer?: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      <ItemThumb item={item} />
      {item.isLimited && <span className="limited-tag">LIMITED</span>}
      <div className="item-tile-name ellipsis2">{item.name}</div>
      <div className="item-tile-foot">
        {footer ?? (item.owned ? <span className="owned">Owned</span> : !item.onSale ? <span className="muted small">Off sale</span> : item.price === 0 ? <span className="free">Free</span> : <Sparks amount={item.price} size={13} compactNum />)}
      </div>
    </>
  );
  if (onClick) return <button type="button" className="item-tile" onClick={onClick}>{inner}</button>;
  return <Link to={to ?? `/item/${item.id}`} className="item-tile">{inner}</Link>;
}

export function ExperienceTile({ exp, wide }: { exp: Experience; wide?: boolean }) {
  return (
    <Link to={`/experiences/${exp.id}`} className={`exp-tile ${wide ? 'exp-tile-wide' : ''}`}>
      <ExperienceArt art={exp.art} thumbnail={exp.thumbnail} title={exp.name} />
      <div className="exp-tile-name ellipsis">{exp.name}</div>
      <div className="exp-tile-meta muted tiny">
        {exp.rating != null && <span>👍 {exp.rating}%</span>}
        <span>● {compact(exp.playing)} playing</span>
      </div>
    </Link>
  );
}

export function Field({ label, hint, children, error }: { label: ReactNode; hint?: ReactNode; children: ReactNode; error?: string | null }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`toggle-row ${disabled ? 'disabled' : ''}`}>
      <span><span className="toggle-label">{label}</span>{hint && <span className="field-hint">{hint}</span>}</span>
      <input type="checkbox" className="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div className="stat"><strong>{value}</strong><span className="muted tiny">{label}</span></div>;
}

/** Calls fn when the element scrolls into view — used for infinite lists. */
export function LoadMore({ onVisible, disabled }: { onVisible: () => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (disabled || !ref.current) return;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) onVisible(); }, { rootMargin: '200px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [onVisible, disabled]);
  return <div ref={ref} style={{ height: 1 }} />;
}

export function Notice({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'warn' | 'rp' }) {
  return <div className={`notice notice-${kind}`}>{children}</div>;
}
