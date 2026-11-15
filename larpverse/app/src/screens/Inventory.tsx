import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Button, Empty, ErrorBlock, ItemThumb, ItemTile, LoadMore, PageHeader, Q, RarityLabel, Sheet, Sparks, Spinner, Tabs } from '../components/ui';
import { CATEGORY_LABELS, cap, dateTime, full } from '../lib/format';
import { useErrorToast, useMe, useSession } from '../state';
import type { Item, Paged } from '../types';
import { CATEGORIES } from './Marketplace';

type Detail = { item: Item; purchase: { id: number; pricePaid: number; createdAt: number; status: string } | null; history: { id: number; action: string; source: string | null; details: string | null; createdAt: number }[] };

export function Inventory() {
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');
  const [rarity, setRarity] = useState('');
  const [equipped, setEquipped] = useState('');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const qs = `category=${category}&sort=${sort}${rarity ? `&rarity=${rarity}` : ''}${equipped ? `&equipped=${equipped}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
  const list = useInfiniteQuery({
    queryKey: ['inventory', me.account.id, 'list', qs],
    queryFn: ({ pageParam }) => api.get<Paged<Item> & { totals: { count: number; value: number } }>(`/api/inventory?${qs}&limit=60&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (l) => l.nextOffset,
  });
  const detail = useQuery({ queryKey: ['inventory-item', me.account.id, open], queryFn: () => api.get<Detail>(`/api/inventory/${open}`), enabled: open != null });
  const equip = useMutation({
    mutationFn: ({ id, on }: { id: number; on: boolean }) => api.post(on ? '/api/avatar/equip' : '/api/avatar/unequip', { itemId: id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); qc.invalidateQueries({ queryKey: ['inventory-item'] }); qc.invalidateQueries({ queryKey: ['avatar'] }); api.get('/api/me').then(setMe); },
    onError,
  });
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const totals = list.data?.pages[0]?.totals;
  return (
    <div className="page">
      <PageHeader title="Inventory" subtitle={totals ? <>{full(totals.count)} items · value <Sparks amount={totals.value} size={12} compactNum /></> : null} />
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); setQ(text.trim()); }}>
        <SearchIcon size={18} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search your items" aria-label="Search your items" />
      </form>
      <Tabs value={category} onChange={setCategory} tabs={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
      <div className="filters-row">
        <select className="select-sm" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="recent">Recently acquired</option><option value="oldest">Oldest first</option><option value="name">Name</option><option value="rarity">Rarity</option><option value="value">Value</option>
        </select>
        <select className="select-sm" value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="Rarity">
          <option value="">Any rarity</option>{['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map((r) => <option key={r} value={r}>{cap(r)}</option>)}
        </select>
        <select className="select-sm" value={equipped} onChange={(e) => setEquipped(e.target.value)} aria-label="Equipped">
          <option value="">All</option><option value="1">Equipped</option><option value="0">Not equipped</option>
        </select>
      </div>
      {list.isLoading ? <Spinner /> : list.error ? <ErrorBlock error={list.error} retry={() => list.refetch()} /> : items.length === 0 ? <Empty title="No items" text="Items you buy or receive appear here." action={<Link to="/marketplace" className="btn btn-primary btn-md">Visit the Marketplace</Link>} /> : (
        <div className="grid item-grid">
          {items.map((i) => (
            <ItemTile key={i.id} item={i} onClick={() => setOpen(i.id)} footer={<span className="small">{i.equipped ? <span className="owned">Wearing</span> : i.serial ? `#${i.serial}` : <RarityLabel rarity={i.rarity} />}</span>} />
          ))}
          <LoadMore disabled={!list.hasNextPage || list.isFetchingNextPage} onVisible={() => list.fetchNextPage()} />
        </div>
      )}
      <Sheet open={open != null} onClose={() => setOpen(null)} title="Item details" tall>
        <Q q={detail}>
          {(d) => (
            <>
              <div className="confirm-item">
                <ItemThumb item={d.item} size={96} />
                <div>
                  <strong>{d.item.name}</strong>
                  <div className="muted small">{CATEGORY_LABELS[d.item.category]} · <RarityLabel rarity={d.item.rarity} /></div>
                  {d.item.serial && <div className="pill">Serial #{d.item.serial}{d.item.stock ? ` of ${full(d.item.stock)}` : ''}</div>}
                </div>
              </div>
              <div className="ledger">
                <div><span>Acquired</span><span>{dateTime(d.item.acquiredAt)}</span></div>
                <div><span>Source</span><span>{cap(d.item.source ?? '—')}</span></div>
                {d.purchase && <div><span>Paid</span><Sparks amount={d.purchase.pricePaid} /></div>}
              </div>
              <div className="row-gap">
                {!['bundle', 'none'].includes(d.item.slot) && <Button loading={equip.isPending} variant={d.item.equipped ? 'secondary' : 'primary'} onClick={() => equip.mutate({ id: d.item.id, on: !d.item.equipped })}>{d.item.equipped ? 'Take off' : 'Wear'}</Button>}
                <Link to={`/item/${d.item.id}`} className="btn btn-ghost btn-md">View in Marketplace</Link>
              </div>
              <h4>History</h4>
              <div className="timeline">
                {d.history.map((h) => <div key={h.id} className="timeline-row"><span className={`dot ${h.action}`} /><div><strong>{cap(h.action)}</strong>{h.source && <span className="muted"> · {h.source}</span>}{h.details && <div className="muted tiny">{h.details}</div>}<div className="muted tiny">{dateTime(h.createdAt)}</div></div></div>)}
              </div>
            </>
          )}
        </Q>
      </Sheet>
    </div>
  );
}
