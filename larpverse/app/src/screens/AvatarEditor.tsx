import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, RotateCcw, Save, ShoppingBag, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Avatar } from '../components/Avatar';
import { Button, Empty, ItemThumb, Q, Sheet, Spinner, Tabs } from '../components/ui';
import { useErrorToast, useMe, useSession, useToast } from '../state';
import type { AvatarSpec, BodyColors, Item, Paged } from '../types';

type AvatarData = { bodyColors: BodyColors; bodyType: string; equipped: { itemId: number; slot: string; name: string; category: string; rarity: string; asset: any }[] };
type Outfit = { id: number; name: string; bodyColors: BodyColors; bodyType: string; itemIds: number[]; updatedAt: number };

const TABS = [
  { value: 'recent', label: 'Recent' }, { value: 'clothing', label: 'Clothing' }, { value: 'hats', label: 'Hats' }, { value: 'hair', label: 'Hair' },
  { value: 'faces', label: 'Faces' }, { value: 'accessories', label: 'Accessories' }, { value: 'collectibles', label: 'Collectibles' },
  { value: 'special', label: 'Special' }, { value: 'body', label: 'Body' }, { value: 'animations', label: 'Animations' }, { value: 'emotes', label: 'Emotes' },
  { value: 'outfits', label: 'Outfits' },
] as const;
type Tab = (typeof TABS)[number]['value'];

const SKIN = ['#ffdbac', '#f2c9a0', '#f1c27d', '#e0ac69', '#c68642', '#a0663f', '#8d5524', '#5c3a21', '#d7dbe6', '#9be7ff', '#b8f2b0', '#ffb3c7'];
const COLORS = ['#f5f5f7', '#1f2330', '#e63946', '#f4a261', '#ffd166', '#2a9d8f', '#8ac926', '#4f7cff', '#1d3557', '#7b2cbf', '#ff6b9a', '#7f5539', '#6b7280', '#2f3b52', '#00b4d8', '#c8b6ff'];
const PARTS: { key: keyof BodyColors; label: string }[] = [
  { key: 'head', label: 'Head' }, { key: 'torso', label: 'Torso' }, { key: 'leftArm', label: 'Left arm' }, { key: 'rightArm', label: 'Right arm' },
  { key: 'leftLeg', label: 'Left leg' }, { key: 'rightLeg', label: 'Right leg' },
];

export function AvatarEditor() {
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('recent');
  const [part, setPart] = useState<keyof BodyColors | 'skin'>('skin');
  const [emote, setEmote] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const av = useQuery({ queryKey: ['avatar', me.account.id], queryFn: () => api.get<AvatarData>('/api/avatar') });
  const category = tab === 'recent' || tab === 'body' || tab === 'outfits' ? 'all' : tab;
  const inv = useQuery({
    queryKey: ['inventory', me.account.id, 'avatar', category],
    queryFn: () => api.get<Paged<Item>>(`/api/inventory?category=${category}&limit=200&sort=recent`),
    enabled: tab !== 'body' && tab !== 'outfits',
  });
  const outfits = useQuery({ queryKey: ['outfits', me.account.id], queryFn: () => api.get<{ outfits: Outfit[] }>('/api/avatar/outfits'), enabled: tab === 'outfits' });
  const allOwned = useQuery({
    queryKey: ['inventory', me.account.id, 'avatar', 'all'],
    queryFn: () => api.get<Paged<Item>>('/api/inventory?category=all&limit=200&sort=recent'),
    enabled: tab === 'outfits',
  });

  const sync = (data: AvatarData) => {
    qc.setQueryData(['avatar', me.account.id], data);
    qc.invalidateQueries({ queryKey: ['inventory', me.account.id] });
    api.get('/api/me').then(setMe).catch(() => {});
  };
  const toggle = useMutation({
    mutationFn: ({ item, on }: { item: Item; on: boolean }) => api.post<AvatarData>(on ? '/api/avatar/equip' : '/api/avatar/unequip', { itemId: item.id }),
    onSuccess: sync,
    onError,
  });
  const body = useMutation({ mutationFn: (b: { bodyColors?: Partial<BodyColors>; bodyType?: string }) => api.patch<AvatarData>('/api/avatar', b), onSuccess: sync, onError });
  const reset = useMutation({ mutationFn: () => api.post<AvatarData>('/api/avatar/reset'), onSuccess: (d) => { sync(d); push({ title: 'Appearance reset' }); }, onError });
  const save = useMutation({
    mutationFn: (name: string) => api.post('/api/avatar/outfits', { name }),
    onSuccess: () => { setSaveOpen(false); setOutfitName(''); qc.invalidateQueries({ queryKey: ['outfits'] }); push({ kind: 'success', title: 'Outfit saved' }); setTab('outfits'); },
    onError,
  });
  const wear = useMutation({ mutationFn: (id: number) => api.post<{ avatar: AvatarData; skipped: number[] }>(`/api/avatar/outfits/${id}/wear`), onSuccess: (r) => { sync(r.avatar); if (r.skipped.length) push({ title: `${r.skipped.length} item(s) no longer owned were skipped` }); }, onError });
  const delOutfit = useMutation({ mutationFn: (id: number) => api.del(`/api/avatar/outfits/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['outfits'] }), onError });
  const updateOutfit = useMutation({ mutationFn: (id: number) => api.patch(`/api/avatar/outfits/${id}`, { updateLook: true }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['outfits'] }); push({ title: 'Outfit updated to your current look' }); }, onError });

  const spec: AvatarSpec | null = useMemo(() => av.data ? ({
    bodyColors: av.data.bodyColors, bodyType: av.data.bodyType,
    items: av.data.equipped.filter((e) => e.slot !== 'emote').map((e) => ({ id: e.itemId, slot: e.slot, ...e.asset })),
  }) : null, [av.data]);
  const equippedIds = new Set(av.data?.equipped.map((e) => e.itemId));
  const emotes = av.data?.equipped.filter((e) => e.slot === 'emote') ?? [];

  const items = (inv.data?.items ?? []).filter((i) => {
    if (tab === 'recent') return i.slot !== 'bundle';
    if (tab === 'collectibles' || tab === 'special') return true;
    return i.slot !== 'bundle';
  });

  const setColor = (color: string) => {
    if (part === 'skin') body.mutate({ bodyColors: { head: color, leftArm: color, rightArm: color } });
    else body.mutate({ bodyColors: { [part]: color } });
  };

  return (
    <div className="page avatar-editor">
      <div className="avatar-stage">
        {spec ? <Avatar spec={spec} size={200} animated emote={emote} /> : <Spinner />}
        <div className="avatar-stage-actions">
          <button className="icon-btn" aria-label="Reset appearance" title="Reset appearance" onClick={() => { if (confirm('Reset to the default look? Your items stay in your inventory.')) reset.mutate(); }}><RotateCcw size={18} /></button>
          <button className="icon-btn" aria-label="Save outfit" title="Save outfit" onClick={() => setSaveOpen(true)}><Save size={18} /></button>
          <Link className="icon-btn" aria-label="Shop" title="Shop" to="/marketplace"><ShoppingBag size={18} /></Link>
        </div>
        {emotes.length > 0 && (
          <div className="emote-strip">
            {emotes.map((e) => <button key={e.itemId} className={`chip ${emote === e.asset.style ? 'active' : ''}`} onClick={() => { setEmote(e.asset.style); setTimeout(() => setEmote(null), 2600); }}>{e.name}</button>)}
          </div>
        )}
      </div>
      <Tabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ value: t.value, label: t.label }))} />

      {tab === 'body' && av.data && (
        <div className="body-panel">
          <div className="field-label">Body type</div>
          <div className="chips">
            {['classic', 'slim', 'chunky'].map((b) => <button key={b} className={`chip ${av.data!.bodyType === b ? 'active' : ''}`} onClick={() => body.mutate({ bodyType: b })}>{b[0].toUpperCase() + b.slice(1)}</button>)}
          </div>
          <div className="field-label">Part</div>
          <div className="chips">
            <button className={`chip ${part === 'skin' ? 'active' : ''}`} onClick={() => setPart('skin')}>Skin (head & arms)</button>
            {PARTS.map((p) => <button key={p.key} className={`chip ${part === p.key ? 'active' : ''}`} onClick={() => setPart(p.key)}><span className="dot" style={{ background: av.data!.bodyColors[p.key] }} /> {p.label}</button>)}
          </div>
          <div className="swatches">
            {(part === 'skin' || part === 'head' ? [...SKIN, ...COLORS] : [...COLORS, ...SKIN]).map((c) => (
              <button key={c} className="swatch" style={{ background: c }} aria-label={`Color ${c}`} onClick={() => setColor(c)} />
            ))}
            <label className="swatch custom" aria-label="Custom color"><input type="color" onChange={(e) => setColor(e.target.value)} />+</label>
          </div>
        </div>
      )}

      {tab === 'outfits' && (
        <Q q={outfits}>
          {(d) => d.outfits.length === 0 ? <Empty title="No saved outfits" text="Save your current look to switch back any time." action={<Button onClick={() => setSaveOpen(true)}>Save current look</Button>} /> : (
            <div className="grid outfit-grid">
              {d.outfits.map((o) => {
                const ospec: AvatarSpec = {
                  bodyColors: o.bodyColors, bodyType: o.bodyType,
                  items: (allOwned.data?.items ?? []).filter((i) => o.itemIds.includes(i.id) && i.slot !== 'emote').map((i) => ({ id: i.id, slot: i.slot, ...i.asset })),
                };
                return (
                  <div key={o.id} className="outfit card">
                    <button className="outfit-preview" onClick={() => wear.mutate(o.id)} aria-label={`Wear ${o.name}`}><Avatar spec={ospec} size={96} /></button>
                    <div className="ellipsis"><strong>{o.name}</strong></div>
                    <div className="row-gap">
                      <Button size="sm" onClick={() => wear.mutate(o.id)}>Wear</Button>
                      <button className="icon-btn" aria-label="Update outfit" title="Update to current look" onClick={() => updateOutfit.mutate(o.id)}><Pencil size={16} /></button>
                      <button className="icon-btn" aria-label="Delete outfit" onClick={() => { if (confirm(`Delete ${o.name}?`)) delOutfit.mutate(o.id); }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Q>
      )}

      {tab !== 'body' && tab !== 'outfits' && (
        <Q q={inv}>
          {() => items.length === 0 ? <Empty title="Nothing here yet" text="Find something you like in the Marketplace." action={<Link to={`/marketplace/browse?category=${category}`} className="btn btn-primary btn-md">Shop</Link>} /> : (
            <div className="grid item-grid">
              {items.map((i) => {
                const on = equippedIds.has(i.id);
                const wearable = !['bundle', 'none'].includes(i.slot);
                return (
                  <button key={i.id} className={`item-tile equip ${on ? 'on' : ''}`} disabled={!wearable || toggle.isPending} onClick={() => toggle.mutate({ item: i, on: !on })}>
                    <ItemThumb item={i} />
                    {on && <span className="equipped-check"><Check size={14} /></span>}
                    <div className="item-tile-name ellipsis2">{i.name}</div>
                  </button>
                );
              })}
            </div>
          )}
        </Q>
      )}

      <Sheet open={saveOpen} onClose={() => setSaveOpen(false)} title="Save outfit">
        <label className="field"><span className="field-label">Name</span><input value={outfitName} onChange={(e) => setOutfitName(e.target.value)} maxLength={40} placeholder="e.g. Night out" autoFocus /></label>
        <Button block loading={save.isPending} disabled={!outfitName.trim()} onClick={() => save.mutate(outfitName.trim())}>Save</Button>
      </Sheet>
    </div>
  );
}
