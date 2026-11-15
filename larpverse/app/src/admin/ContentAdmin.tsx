import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search as SearchIcon, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { api } from '../api';
import { BADGE_ICONS, BadgeIcon, ExperienceArt } from '../components/Art';
import { Button, Field, ItemThumb, PageHeader, Q, Sheet, Sparks, Tabs, Toggle } from '../components/ui';
import { compact, readFileAsDataUrl } from '../lib/format';
import { useToast } from '../state';
import type { Experience, Item, Paged } from '../types';
import { AccountPicker, useAdminMutation } from './common';

// ───────────── Badges ─────────────

export function BadgesAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'badges'], queryFn: () => api.get<{ badges: any[] }>('/api/admin/badges') });
  const [edit, setEdit] = useState<any | 'new' | null>(null);
  return (
    <div className="page">
      <PageHeader title="Badges" right={<Button size="sm" icon={<Plus size={14} />} onClick={() => setEdit('new')}>New badge</Button>} />
      <p className="muted small">System badges mirror real staff roles. “Roleplay Verified” is a Larpverse-only badge and never claims verification by any other company.</p>
      <Q q={q}>{(d) => (
        <div className="list card">{d.badges.map((b) => (
          <button key={b.id} className="row" onClick={() => setEdit(b)}>
            <BadgeIcon badge={b} />
            <div className="row-main"><strong>{b.name}</strong><div className="muted tiny">{b.kind} · {b.holders} holders · {Object.entries(b.perks).filter(([, v]) => v).map(([k]) => k).join(', ') || 'no perks'}</div></div>
          </button>
        ))}</div>
      )}</Q>
      {edit && <BadgeEditor badge={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'badges'] }); setEdit(null); }} />}
    </div>
  );
}

function BadgeEditor({ badge, onClose, onSaved }: { badge: any | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    key: badge?.key ?? '', name: badge?.name ?? '', description: badge?.description ?? '', icon: badge?.icon ?? 'star', color: badge?.color ?? '#8b5cf6',
    perks: { verified: false, featuredCreator: false, freeGroups: false, hostLimitBonus: 0, ...(badge?.perks ?? {}) },
  });
  const system = badge?.kind === 'system';
  const save = useAdminMutation(() => (badge
    ? api.patch(`/api/admin/badges/${badge.id}`, { name: f.name, description: f.description, icon: f.icon, color: f.color, ...(system ? {} : { perks: f.perks }) })
    : api.post('/api/admin/badges', f)), onSaved);
  const del = useAdminMutation(() => api.del(`/api/admin/badges/${badge.id}`), onSaved);
  return (
    <Sheet open onClose={onClose} title={badge ? `Edit ${badge.name}` : 'New badge'} tall footer={<Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Save</Button>}>
      <div className="center"><BadgeIcon badge={{ ...f, label: f.name }} size={36} /></div>
      {!badge && <Field label="Key" hint="lowercase_with_underscores"><input value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></Field>}
      <Field label="Label"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={40} /></Field>
      <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="two-col">
        <Field label="Icon"><select value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })}>{Object.keys(BADGE_ICONS).map((i) => <option key={i} value={i}>{i}</option>)}</select></Field>
        <Field label="Color"><input type="color" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} /></Field>
      </div>
      {!system && (
        <>
          <div className="field-label">Perks (connected to real platform behaviour)</div>
          <Toggle label="Shows the Roleplay Verified mark" checked={f.perks.verified} onChange={(v) => setF({ ...f, perks: { ...f.perks, verified: v } })} />
          <Toggle label="Featured Creator (spotlight in Discover/Marketplace)" checked={f.perks.featuredCreator} onChange={(v) => setF({ ...f, perks: { ...f.perks, featuredCreator: v } })} />
          <Toggle label="Free group creation" checked={f.perks.freeGroups} onChange={(v) => setF({ ...f, perks: { ...f.perks, freeGroups: v } })} />
          <Field label="Extra LARP host slots"><input type="number" min={0} max={30} value={f.perks.hostLimitBonus} onChange={(e) => setF({ ...f, perks: { ...f.perks, hostLimitBonus: Number(e.target.value) } })} /></Field>
        </>
      )}
      {badge?.kind === 'custom' && <Button variant="danger" size="sm" onClick={() => { if (confirm('Delete this badge from every account?')) del.mutate(undefined); }}>Delete badge</Button>}
    </Sheet>
  );
}

// ───────────── Catalog ─────────────

const CATS = ['hat', 'hair', 'face', 'accessory', 'shirt', 'pants', 'bundle', 'animation', 'emote', 'collectible', 'special'];
const SLOTS = ['hat', 'hair', 'face', 'face_acc', 'neck', 'back', 'shoulder', 'waist', 'shirt', 'pants', 'aura', 'animation', 'emote', 'bundle'];
const STYLE_HINTS: Record<string, string> = {
  hat: 'cap beanie tophat crown cowboy headphones halo horns partyhat helmet beret bunnyears chef wizard viking tiara flowercrown antenna fedora hood',
  hair: 'spiky bob long curly mohawk bun ponytail afro sidepart buzz pigtails wavy',
  face: 'smile grin cool wink determined sleepy surprised cheeky happy smirk kawaii robot angry stars',
  face_acc: 'glasses shades monocle mask eyepatch visor heartglasses', neck: 'scarf chain bowtie tie necklace bandana',
  back: 'wings angelwings batwings cape backpack sword guitar jetpack', shoulder: 'parrot cat dragon owl', waist: 'belt toolbelt tail',
  shirt: 'tee stripes hoodie jacket suit star tank flannel sweater jersey armor dress uniform scrubs', pants: 'jeans shorts cargo skirt joggers suitpants armorlegs',
  aura: 'sparkle flame frost rainbow shadow gold', animation: 'robot ninja bubbly zombie levitate elder superhero cartoony',
  emote: 'wave dance cheer salute shrug laugh spin jump clap bow victory',
};

export function CatalogAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [archived, setArchived] = useState(false);
  const list = useQuery({ queryKey: ['admin', 'items', 'list', q, cat, archived], queryFn: () => api.get<Paged<Item>>(`/api/admin/items?q=${encodeURIComponent(q)}&limit=200${cat ? `&category=${cat}` : ''}${archived ? '&archived=1' : ''}`) });
  const [edit, setEdit] = useState<Item | 'new' | null>(null);
  return (
    <div className="page">
      <PageHeader title="Catalog" right={<Button size="sm" icon={<Plus size={14} />} onClick={() => setEdit('new')}>New item</Button>} />
      <div className="searchbar"><SearchIcon size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" aria-label="Search items" /></div>
      <Tabs value={cat} onChange={setCat} tabs={[{ value: '', label: 'All' }, ...CATS.map((c) => ({ value: c, label: c }))]} />
      <Toggle label="Include archived" checked={archived} onChange={setArchived} />
      <Q q={list}>{(d) => (
        <div className="list card">{d.items.map((i) => (
          <button key={i.id} className="row" onClick={() => setEdit(i)}>
            <span className="mini-thumb"><ItemThumb item={i} size={44} /></span>
            <div className="row-main"><strong>{i.name}</strong><div className="muted tiny">{i.sku} · {i.rarity}{i.isLimited ? ` · ${i.remaining}/${i.stock} left` : ''}{i.isFeatured ? ' · featured' : ''}{!i.onSale ? ' · off sale' : ''}{i.isArchived ? ' · archived' : ''}</div></div>
            <Sparks amount={i.price} size={12} compactNum />
          </button>
        ))}</div>
      )}</Q>
      {edit && <ItemEditor item={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'items'] }); qc.invalidateQueries({ queryKey: ['catalog'] }); qc.invalidateQueries({ queryKey: ['catalog-home'] }); setEdit(null); }} />}
    </div>
  );
}

function ItemEditor({ item, onClose, onSaved }: { item: Item | null; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const file = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    name: item?.name ?? '', description: item?.description ?? '', category: item?.category ?? 'hat', slot: item?.slot ?? 'hat',
    style: item?.asset.style ?? 'cap', c0: item?.asset.colors?.[0] ?? '#e63946', c1: item?.asset.colors?.[1] ?? '#ffffff', glow: item?.asset.glow ?? false,
    price: String(item?.price ?? 100), rarity: item?.rarity ?? 'common', isLimited: item?.isLimited ?? false, stock: item?.stock?.toString() ?? '',
    onSale: item?.onSale ?? true, isFeatured: item?.isFeatured ?? false, isArchived: item?.isArchived ?? false, tags: (item?.tags ?? []).join(', '),
    creator: item?.creatorId ? [item.creatorId] : [] as number[],
  });
  const body = () => ({
    name: f.name, description: f.description, category: f.category, slot: f.slot, asset: { style: f.style, colors: [f.c0, f.c1], ...(f.glow ? { glow: true } : {}) },
    price: Number(f.price) || 0, rarity: f.rarity, isLimited: f.isLimited, stock: f.isLimited && f.stock ? Number(f.stock) : null, onSale: f.onSale,
    isFeatured: f.isFeatured, isArchived: f.isArchived, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), creatorAccountId: f.creator[0] ?? null,
  });
  const save = useAdminMutation(() => (item ? api.patch(`/api/admin/items/${item.id}`, body()) : api.post('/api/admin/items', body())), () => { push({ kind: 'success', title: 'Item saved' }); onSaved(); });
  const thumb = useAdminMutation(async (file: File | null) => api.post(`/api/admin/items/${item!.id}/thumbnail`, { dataUrl: file ? await readFileAsDataUrl(file, 512) : null }), () => { push({ title: 'Thumbnail updated' }); onSaved(); });
  const preview = { slot: f.slot, asset: { style: f.style, colors: [f.c0, f.c1], glow: f.glow }, category: f.category, name: f.name, thumbnail: item?.thumbnail ?? null, rarity: f.rarity } as any;
  return (
    <Sheet open onClose={onClose} title={item ? `Edit ${item.name}` : 'New marketplace item'} tall footer={<Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Save item</Button>}>
      <div className="center"><ItemThumb item={preview} size={140} /></div>
      {item && <div className="row-gap"><Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => file.current?.click()}>Custom thumbnail</Button>{item.thumbnail && <Button size="sm" variant="ghost" onClick={() => thumb.mutate(null)}>Use rendered preview</Button>}<input ref={file} hidden type="file" accept="image/*" onChange={(e) => { const x = e.target.files?.[0]; if (x) thumb.mutate(x); e.target.value = ''; }} /></div>}
      <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} /></Field>
      <Field label="Description"><textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="two-col">
        <Field label="Category"><select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Equip slot"><select value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}>{SLOTS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="Style" hint={STYLE_HINTS[f.slot] ? `Styles: ${STYLE_HINTS[f.slot]}` : undefined}><input value={f.style} onChange={(e) => setF({ ...f, style: e.target.value.trim() })} /></Field>
      <div className="two-col">
        <Field label="Primary color"><input type="color" value={f.c0} onChange={(e) => setF({ ...f, c0: e.target.value })} /></Field>
        <Field label="Secondary color"><input type="color" value={f.c1} onChange={(e) => setF({ ...f, c1: e.target.value })} /></Field>
      </div>
      <Toggle label="Glow effect" checked={f.glow} onChange={(v) => setF({ ...f, glow: v })} />
      <div className="two-col">
        <Field label="Price (Sparks)"><input inputMode="numeric" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Rarity"><select value={f.rarity} onChange={(e) => setF({ ...f, rarity: e.target.value as any })}>{['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map((r) => <option key={r}>{r}</option>)}</select></Field>
      </div>
      <Toggle label="Limited (serial numbers)" checked={f.isLimited} onChange={(v) => setF({ ...f, isLimited: v })} />
      {f.isLimited && <Field label="Stock"><input inputMode="numeric" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value.replace(/\D/g, '') })} /></Field>}
      <Toggle label="On sale" checked={f.onSale} onChange={(v) => setF({ ...f, onSale: v })} />
      <Toggle label="Featured" checked={f.isFeatured} onChange={(v) => setF({ ...f, isFeatured: v })} />
      <Toggle label="Archived (hidden from the Marketplace)" checked={f.isArchived} onChange={(v) => setF({ ...f, isArchived: v })} />
      <Field label="Tags" hint="Comma separated"><input value={f.tags} onChange={(e) => setF({ ...f, tags: e.target.value })} /></Field>
      <AccountPicker value={f.creator} onChange={(v) => setF({ ...f, creator: v })} label="Creator (receives the sale share)" />
    </Sheet>
  );
}

// ───────────── Experiences ─────────────

const GENRES = ['roleplay', 'adventure', 'simulator', 'tycoon', 'obby', 'horror', 'social', 'racing', 'sports', 'puzzle', 'showcase'];
const MOTIFS = ['city', 'market', 'night', 'stage', 'hospital', 'islands', 'pets', 'food', 'racing', 'haunted', 'sports', 'temple', 'pirate', 'cafe'];

export function ExperiencesAdmin() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'experiences'], queryFn: () => api.get<{ items: Experience[] }>('/api/admin/experiences') });
  const [edit, setEdit] = useState<Experience | 'new' | null>(null);
  return (
    <div className="page">
      <PageHeader title="Experiences" right={<Button size="sm" icon={<Plus size={14} />} onClick={() => setEdit('new')}>New</Button>} />
      <Q q={q}>{(d) => (
        <div className="list card">{d.items.map((e) => (
          <button key={e.id} className="row" onClick={() => setEdit(e)}>
            <span className="mini-art"><ExperienceArt art={e.art} thumbnail={e.thumbnail} /></span>
            <div className="row-main"><strong>{e.name}</strong><div className="muted tiny">{e.engine} · {e.genre} · {compact(e.visits)} visits · {compact(e.playing)} playing · {e.status}{e.isFeatured ? ' · featured' : ''}</div></div>
          </button>
        ))}</div>
      )}</Q>
      {edit && <ExperienceEditor exp={edit === 'new' ? null : edit} onClose={() => setEdit(null)} onSaved={() => { qc.invalidateQueries({ queryKey: ['admin', 'experiences'] }); qc.invalidateQueries({ queryKey: ['experiences'] }); qc.invalidateQueries({ queryKey: ['experience'] }); setEdit(null); }} />}
    </div>
  );
}

function ExperienceEditor({ exp, onClose, onSaved }: { exp: Experience | null; onClose: () => void; onSaved: () => void }) {
  const { push } = useToast();
  const file = useRef<HTMLInputElement>(null);
  const scenarios = useQuery({ queryKey: ['admin', 'scenarios'], queryFn: () => api.get<{ scenarios: any[] }>('/api/admin/game/scenarios') });
  const [f, setF] = useState({
    name: exp?.name ?? '', description: exp?.description ?? '', genre: exp?.genre ?? 'roleplay', engine: exp?.engine ?? 'larp',
    defaultScenarioId: exp?.defaultScenarioId?.toString() ?? '', maxPlayers: String(exp?.maxPlayers ?? 12), isFeatured: exp?.isFeatured ?? false,
    status: exp?.status ?? 'public', p0: exp?.art.palette?.[0] ?? '#6d4aff', p1: exp?.art.palette?.[1] ?? '#ff6b9a', motif: exp?.art.motif ?? 'city',
    tagline: exp?.art.tagline ?? '', visits: String(exp?.visits ?? 0), likes: String(exp?.likes ?? 0), dislikes: String(exp?.dislikes ?? 0),
    favoritesOverride: '', activeOverride: '', creator: exp?.creator ? [exp.creator.id] : [] as number[],
  });
  const n = (s: string) => (s === '' ? null : Number(s));
  const body = () => ({
    name: f.name, description: f.description, genre: f.genre, engine: f.engine, defaultScenarioId: n(f.defaultScenarioId), maxPlayers: Number(f.maxPlayers) || 12,
    isFeatured: f.isFeatured, status: f.status, art: { palette: [f.p0, f.p1], motif: f.motif, ...(f.tagline ? { tagline: f.tagline } : {}) },
    visits: Number(f.visits) || 0, likes: Number(f.likes) || 0, dislikes: Number(f.dislikes) || 0,
    ...(f.favoritesOverride !== '' ? { favoritesOverride: n(f.favoritesOverride) } : {}), ...(f.activeOverride !== '' ? { activeOverride: n(f.activeOverride) } : {}),
    creatorAccountId: f.creator[0] ?? null,
  });
  const save = useAdminMutation(() => (exp ? api.patch(`/api/admin/experiences/${exp.id}`, body()) : api.post('/api/admin/experiences', body())), () => { push({ kind: 'success', title: 'Experience saved' }); onSaved(); });
  const thumb = useAdminMutation(async (x: File | null) => api.post(`/api/admin/experiences/${exp!.id}/thumbnail`, { dataUrl: x ? await readFileAsDataUrl(x, 960) : null }), onSaved);
  return (
    <Sheet open onClose={onClose} title={exp ? `Edit ${exp.name}` : 'New experience'} tall footer={<Button block loading={save.isPending} onClick={() => save.mutate(undefined)}>Save experience</Button>}>
      <div className="exp-hero small"><ExperienceArt art={{ palette: [f.p0, f.p1], motif: f.motif, tagline: f.tagline }} thumbnail={exp?.thumbnail} /></div>
      {exp && <div className="row-gap"><Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => file.current?.click()}>Upload thumbnail</Button>{exp.thumbnail && <Button size="sm" variant="ghost" onClick={() => thumb.mutate(null)}>Use generated art</Button>}<input ref={file} hidden type="file" accept="image/*" onChange={(e) => { const x = e.target.files?.[0]; if (x) thumb.mutate(x); e.target.value = ''; }} /></div>}
      <Field label="Name"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={60} /></Field>
      <Field label="Description"><textarea rows={4} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <div className="two-col">
        <Field label="Genre"><select value={f.genre} onChange={(e) => setF({ ...f, genre: e.target.value })}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></Field>
        <Field label="Engine"><select value={f.engine} onChange={(e) => setF({ ...f, engine: e.target.value as any })}><option value="larp">LARP (playable)</option><option value="showcase">Showcase listing</option></select></Field>
      </div>
      {f.engine === 'larp' && <Field label="Default scenario"><select value={f.defaultScenarioId} onChange={(e) => setF({ ...f, defaultScenarioId: e.target.value })}><option value="">—</option>{scenarios.data?.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>}
      <div className="two-col">
        <Field label="Max players"><input type="number" min={1} max={50} value={f.maxPlayers} onChange={(e) => setF({ ...f, maxPlayers: e.target.value })} /></Field>
        <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="public">Public</option><option value="private">Private</option><option value="archived">Archived</option></select></Field>
      </div>
      <Toggle label="Featured" checked={f.isFeatured} onChange={(v) => setF({ ...f, isFeatured: v })} />
      <div className="field-label">Generated art</div>
      <div className="two-col">
        <Field label="Color A"><input type="color" value={f.p0} onChange={(e) => setF({ ...f, p0: e.target.value })} /></Field>
        <Field label="Color B"><input type="color" value={f.p1} onChange={(e) => setF({ ...f, p1: e.target.value })} /></Field>
      </div>
      <div className="two-col">
        <Field label="Motif"><select value={f.motif} onChange={(e) => setF({ ...f, motif: e.target.value })}>{MOTIFS.map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Tagline"><input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} maxLength={40} /></Field>
      </div>
      <div className="field-label">Statistics (fictional, shown on the listing)</div>
      <div className="two-col">
        <Field label="Visits"><input inputMode="numeric" value={f.visits} onChange={(e) => setF({ ...f, visits: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Extra players shown" hint="Added to live players"><input inputMode="numeric" value={f.activeOverride} placeholder={exp ? String(exp.playing - exp.livePlaying) : '0'} onChange={(e) => setF({ ...f, activeOverride: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <div className="two-col">
        <Field label="Likes"><input inputMode="numeric" value={f.likes} onChange={(e) => setF({ ...f, likes: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Dislikes"><input inputMode="numeric" value={f.dislikes} onChange={(e) => setF({ ...f, dislikes: e.target.value.replace(/\D/g, '') })} /></Field>
      </div>
      <Field label="Favorites shown" hint="Leave empty to keep the current value"><input inputMode="numeric" value={f.favoritesOverride} placeholder={exp ? String(exp.favorites) : ''} onChange={(e) => setF({ ...f, favoritesOverride: e.target.value.replace(/\D/g, '') })} /></Field>
      <AccountPicker value={f.creator} onChange={(v) => setF({ ...f, creator: v })} label="Creator" />
    </Sheet>
  );
}
