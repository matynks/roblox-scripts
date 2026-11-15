import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Heart, Shirt, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { SparkIcon } from '../components/Art';
import { Avatar } from '../components/Avatar';
import { AccountRow, Button, ItemThumb, ItemTile, Notice, PageHeader, Q, RarityLabel, Rail, Section, Sheet, Sparks } from '../components/ui';
import { CATEGORY_LABELS, compact, dateLabel, full } from '../lib/format';
import { useErrorToast, useMe, useSession, useToast } from '../state';
import type { AccountCard, Item } from '../types';

type Detail = { item: Item; creator: AccountCard | null; bundleItems: Item[]; moreFromCreator: Item[]; similar: Item[]; notice: string };

export function ItemDetail() {
  const { id } = useParams();
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { push } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [tryOn, setTryOn] = useState(false);
  const [result, setResult] = useState<{ item: Item; balance: number } | null>(null);
  const [buyError, setBuyError] = useState<ApiError | null>(null);
  const q = useQuery({ queryKey: ['item', id, me.account.id], queryFn: () => api.get<Detail>(`/api/catalog/items/${id}`) });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['item', id] });
    qc.invalidateQueries({ queryKey: ['catalog'] });
    qc.invalidateQueries({ queryKey: ['catalog-home'] });
    qc.invalidateQueries({ queryKey: ['inventory'] });
    qc.invalidateQueries({ queryKey: ['home'] });
    qc.invalidateQueries({ queryKey: ['wallet'] });
  };
  const buy = useMutation({
    mutationFn: (price: number) => api.post<{ balance: number; item: Item }>(`/api/catalog/items/${id}/purchase`, { expectedPrice: price }),
    onSuccess: (r) => {
      setConfirm(false);
      setResult(r);
      setMe({ ...me, wallet: { balance: r.balance } });
      refresh();
    },
    onError: (e: ApiError) => { setBuyError(e); if (e.code === 'price_changed') refresh(); },
  });
  const equip = useMutation({
    mutationFn: (on: boolean) => api.post(on ? '/api/avatar/equip' : '/api/avatar/unequip', { itemId: Number(id) }),
    onSuccess: (_, on) => { push({ kind: 'success', title: on ? 'Wearing it now' : 'Taken off' }); refresh(); qc.invalidateQueries({ queryKey: ['avatar'] }); api.get('/api/me').then(setMe); },
    onError,
  });
  const fav = useMutation({ mutationFn: (on: boolean) => (on ? api.post(`/api/catalog/items/${id}/favorite`) : api.del(`/api/catalog/items/${id}/favorite`)), onSuccess: refresh, onError });

  return (
    <div className="page">
      <PageHeader title="Item" />
      <Q q={q}>
        {({ item, creator, bundleItems, moreFromCreator, similar, notice }) => {
          const wearable = !['bundle', 'none'].includes(item.slot);
          const balance = me.wallet.balance;
          const after = balance - item.price;
          const preview = { ...me.account.avatar, items: [...me.account.avatar.items.filter((i) => i.slot !== item.slot), { id: item.id, slot: item.slot, ...item.asset }] };
          return (
            <>
              <div className="item-hero" style={{ ['--rarity' as any]: undefined }}>
                {tryOn && wearable ? <Avatar spec={preview} size={220} animated emote={item.slot === 'emote' ? item.asset.style : null} /> : <ItemThumb item={item} size={220} />}
                {wearable && <button className={`chip try-on ${tryOn ? 'active' : ''}`} onClick={() => setTryOn(!tryOn)}><Shirt size={14} /> {tryOn ? 'Show item' : 'Try on'}</button>}
              </div>
              <div className="item-head">
                <div>
                  <h1>{item.name}</h1>
                  <div className="muted small">{CATEGORY_LABELS[item.category] ?? item.category} · by {creator ? <Link to={`/profile/${creator.id}`} className="link">{creator.displayName}</Link> : 'Larpverse'}</div>
                </div>
                <button className={`icon-btn big ${item.favorite ? 'on' : ''}`} aria-label="Favorite" onClick={() => fav.mutate(!item.favorite)}><Heart size={22} fill={item.favorite ? 'currentColor' : 'none'} /></button>
              </div>
              <div className="item-meta">
                <RarityLabel rarity={item.rarity} />
                {item.isLimited && <span className="pill limited">Limited · {item.remaining != null ? `${full(item.remaining)} of ${full(item.stock)} left` : ''}</span>}
                {item.serial && <span className="pill">Your serial #{item.serial}</span>}
                <span className="muted small">{compact(item.soldCount)} sold · {compact(item.favorites ?? 0)} favorites</span>
              </div>
              <div className="buy-box card">
                {item.owned ? (
                  <>
                    <div className="owned-line"><CheckCircle2 size={20} /> You own this {item.acquiredAt ? `since ${dateLabel(item.acquiredAt)}` : ''}</div>
                    {wearable && <Button block variant={item.equipped ? 'secondary' : 'primary'} loading={equip.isPending} onClick={() => equip.mutate(!item.equipped)}>{item.equipped ? 'Take off' : 'Wear'}</Button>}
                  </>
                ) : !item.onSale ? (
                  <div className="muted">This item is not for sale right now{item.remaining === 0 ? ' — it sold out.' : '.'}</div>
                ) : (
                  <>
                    <div className="price-line">{item.price === 0 ? <span className="free big">Free</span> : <Sparks amount={item.price} size={22} tag className="big" />}</div>
                    <Button block size="lg" variant="spark" icon={<ShoppingCart size={18} />} onClick={() => { setBuyError(null); setConfirm(true); }}>{item.price === 0 ? 'Get' : 'Buy'}</Button>
                  </>
                )}
              </div>
              <Notice kind="rp"><SparkIcon size={14} /> {notice}</Notice>
              {item.description && <Section title="Description"><p className="pre">{item.description}</p></Section>}
              {bundleItems.length > 0 && <Section title={`Includes ${bundleItems.length} items`}><Rail>{bundleItems.map((b) => <ItemTile key={b.id} item={b} />)}</Rail></Section>}
              {creator && <Section title="Creator"><div className="list card"><AccountRow account={creator} /></div></Section>}
              {moreFromCreator.length > 0 && <Section title="More from this creator"><Rail>{moreFromCreator.map((m) => <ItemTile key={m.id} item={m} />)}</Rail></Section>}
              {similar.length > 0 && <Section title="Similar items"><Rail>{similar.map((m) => <ItemTile key={m.id} item={m} />)}</Rail></Section>}

              <Sheet open={confirm} onClose={() => setConfirm(false)} title="Confirm roleplay purchase">
                <div className="confirm-item">
                  <ItemThumb item={item} size={84} />
                  <div><strong>{item.name}</strong><div className="muted small">{CATEGORY_LABELS[item.category]}</div></div>
                </div>
                <div className="ledger">
                  <div><span>Price</span><Sparks amount={item.price} /></div>
                  <div><span>Your balance</span><Sparks amount={balance} /></div>
                  <div className={after < 0 ? 'neg' : ''}><span>Balance after</span><Sparks amount={Math.max(after, 0)} />{after < 0 && <span className="small"> (short {full(-after)})</span>}</div>
                </div>
                <Notice kind="rp">This is a fictional roleplay purchase using Sparks. Sparks have no real-world value and no real money is involved.</Notice>
                {buyError && <div className="field-error">{buyError.message}{buyError.code === 'insufficient_funds' && <> · <Link to="/wallet" className="link">Earn Sparks</Link></>}</div>}
                <Button block size="lg" variant="spark" disabled={after < 0} loading={buy.isPending} onClick={() => buy.mutate(item.price)}>
                  {after < 0 ? 'Not enough Sparks' : item.price === 0 ? 'Get for free' : `Buy for ${full(item.price)}`}
                </Button>
              </Sheet>

              <Sheet open={Boolean(result)} onClose={() => setResult(null)} title="Purchase complete">
                {result && (
                  <div className="purchase-done">
                    <div className="burst"><ItemThumb item={result.item} size={120} /></div>
                    <h3>You got {result.item.name}!</h3>
                    {result.item.serial && <div className="pill">Serial #{result.item.serial}</div>}
                    <div className="muted">New balance <Sparks amount={result.balance} /></div>
                    <div className="row-gap">
                      {wearable && <Button onClick={() => { equip.mutate(true); setResult(null); }}>Wear now</Button>}
                      <Button variant="secondary" onClick={() => setResult(null)}>Done</Button>
                    </div>
                  </div>
                )}
              </Sheet>
            </>
          );
        }}
      </Q>
    </div>
  );
}
