import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Crown, Gem, Glasses, Package, Palette, Scissors, Search as SearchIcon, Shirt, SlidersHorizontal, Smile, Sparkles, Star, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Empty, ErrorBlock, FriendBubble, ItemTile, LoadMore, Q, Rail, Section, Sheet, Spinner, Tabs, Toggle } from '../components/ui';
import { cap } from '../lib/format';
import type { AccountCard, Item, Paged } from '../types';

export const CATEGORIES = [
  { value: 'all', label: 'All', icon: Star },
  { value: 'accessories', label: 'Accessories', icon: Glasses },
  { value: 'hats', label: 'Hats', icon: Crown },
  { value: 'hair', label: 'Hair', icon: Scissors },
  { value: 'faces', label: 'Faces', icon: Smile },
  { value: 'clothing', label: 'Clothing', icon: Shirt },
  { value: 'shirts', label: 'Shirts', icon: Shirt },
  { value: 'pants', label: 'Pants', icon: Palette },
  { value: 'bundles', label: 'Bundles', icon: Package },
  { value: 'animations', label: 'Animations', icon: Zap },
  { value: 'emotes', label: 'Emotes', icon: Sparkles },
  { value: 'collectibles', label: 'Collectibles', icon: Gem },
  { value: 'special', label: 'Special', icon: Star },
];

const SORTS = [
  { value: 'relevance', label: 'Relevance' }, { value: 'newest', label: 'Newest' }, { value: 'bestselling', label: 'Best selling' },
  { value: 'price_asc', label: 'Price: low to high' }, { value: 'price_desc', label: 'Price: high to low' }, { value: 'rarity', label: 'Rarity' },
  { value: 'favorited', label: 'Most favorited' },
];

type CatalogHome = { featured: Item[]; recommended: Item[]; newest: Item[]; bestselling: Item[]; limited: Item[]; featuredCreators: AccountCard[]; counts: Record<string, number> };

export function Marketplace() {
  const q = useQuery({ queryKey: ['catalog-home'], queryFn: () => api.get<CatalogHome>('/api/catalog/home') });
  const [text, setText] = useState('');
  return (
    <div className="page">
      <h1 className="page-title">Marketplace</h1>
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); if (text.trim()) window.location.hash = `#/marketplace/browse?q=${encodeURIComponent(text.trim())}`; }}>
        <SearchIcon size={18} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search the marketplace" aria-label="Search the marketplace" />
      </form>
      <div className="cat-grid">
        {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
          <Link key={c.value} to={`/marketplace/browse?category=${c.value}`} className="cat-tile"><c.icon size={22} /><span>{c.label}</span></Link>
        ))}
      </div>
      <Q q={q}>
        {(d) => (
          <>
            <Section title="Featured" action={<Link to="/marketplace/browse?featured=1" className="link small">See all</Link>}><Rail>{d.featured.map((i) => <ItemTile key={i.id} item={i} />)}</Rail></Section>
            <Section title="Recommended for you"><Rail>{d.recommended.map((i) => <ItemTile key={i.id} item={i} />)}</Rail></Section>
            <Section title="Limited collectibles" action={<Link to="/marketplace/browse?category=collectibles" className="link small">See all</Link>}><Rail>{d.limited.map((i) => <ItemTile key={i.id} item={i} />)}</Rail></Section>
            <Section title="New arrivals" action={<Link to="/marketplace/browse?sort=newest" className="link small">See all</Link>}><Rail>{d.newest.map((i) => <ItemTile key={i.id} item={i} />)}</Rail></Section>
            <Section title="Best sellers" action={<Link to="/marketplace/browse?sort=bestselling" className="link small">See all</Link>}><Rail>{d.bestselling.map((i) => <ItemTile key={i.id} item={i} />)}</Rail></Section>
            {d.featuredCreators.length > 0 && <Section title="Featured creators"><Rail>{d.featuredCreators.map((a) => <FriendBubble key={a.id} account={a} />)}</Rail></Section>}
          </>
        )}
      </Q>
    </div>
  );
}

export function MarketplaceBrowse() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(false);
  const [text, setText] = useState(params.get('q') ?? '');
  const category = params.get('category') ?? 'all';
  const sort = params.get('sort') ?? 'relevance';
  const qs = new URLSearchParams(params);
  qs.set('limit', '30');
  const list = useInfiniteQuery({
    queryKey: ['catalog', qs.toString()],
    queryFn: ({ pageParam }) => { const p = new URLSearchParams(qs); p.set('offset', String(pageParam)); return api.get<Paged<Item>>(`/api/catalog/items?${p}`); },
    initialPageParam: 0,
    getNextPageParam: (l) => l.nextOffset,
  });
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v && v !== 'all') next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const activeFilters = ['rarity', 'minPrice', 'maxPrice', 'limited', 'onSale', 'hideOwned', 'free'].filter((k) => params.get(k)).length;
  return (
    <div className="page">
      <h1 className="page-title">{CATEGORIES.find((c) => c.value === category)?.label ?? 'Marketplace'}</h1>
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); set('q', text.trim()); }}>
        <SearchIcon size={18} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search items" aria-label="Search items" />
        <button type="button" className="icon-btn" aria-label="Filters" onClick={() => setFilters(true)}><SlidersHorizontal size={18} />{activeFilters > 0 && <span className="count">{activeFilters}</span>}</button>
      </form>
      <Tabs value={category} onChange={(v) => set('category', v)} tabs={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} />
      <div className="row-between">
        <span className="muted small">{params.get('q') ? `Results for “${params.get('q')}”` : ' '}</span>
        <select className="select-sm" value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort">
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      {list.isLoading ? <Spinner /> : list.error ? <ErrorBlock error={list.error} retry={() => list.refetch()} /> : items.length === 0 ? <Empty title="No items found" text="Try a different search or filter." /> : (
        <div className="grid item-grid">
          {items.map((i) => <ItemTile key={i.id} item={i} />)}
          <LoadMore disabled={!list.hasNextPage || list.isFetchingNextPage} onVisible={() => list.fetchNextPage()} />
        </div>
      )}
      <Sheet open={filters} onClose={() => setFilters(false)} title="Filters" footer={<><Button variant="ghost" onClick={() => { ['rarity', 'minPrice', 'maxPrice', 'limited', 'onSale', 'hideOwned', 'free'].forEach((k) => params.delete(k)); setParams(new URLSearchParams(params), { replace: true }); }}>Reset</Button><Button onClick={() => setFilters(false)}>Show results</Button></>}>
        <div className="field-label">Rarity</div>
        <div className="chips">
          {['', 'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].map((r) => (
            <button key={r || 'any'} className={`chip ${(params.get('rarity') ?? '') === r ? 'active' : ''}`} onClick={() => set('rarity', r)}>{r ? cap(r) : 'Any'}</button>
          ))}
        </div>
        <div className="two-col">
          <label className="field"><span className="field-label">Min price</span><input inputMode="numeric" value={params.get('minPrice') ?? ''} onChange={(e) => set('minPrice', e.target.value.replace(/\D/g, ''))} /></label>
          <label className="field"><span className="field-label">Max price</span><input inputMode="numeric" value={params.get('maxPrice') ?? ''} onChange={(e) => set('maxPrice', e.target.value.replace(/\D/g, ''))} /></label>
        </div>
        <Toggle label="Limited collectibles only" checked={params.get('limited') === '1'} onChange={(v) => set('limited', v ? '1' : '')} />
        <Toggle label="Available to buy" checked={params.get('onSale') === '1'} onChange={(v) => set('onSale', v ? '1' : '')} />
        <Toggle label="Free items" checked={params.get('free') === '1'} onChange={(v) => set('free', v ? '1' : '')} />
        <Toggle label="Hide items I own" checked={params.get('hideOwned') === '1'} onChange={(v) => set('hideOwned', v ? '1' : '')} />
      </Sheet>
    </div>
  );
}
