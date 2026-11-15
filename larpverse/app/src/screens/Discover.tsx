import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Empty, ErrorBlock, ExperienceTile, LoadMore, Spinner, Tabs } from '../components/ui';
import { cap } from '../lib/format';
import type { Experience, Paged } from '../types';

const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'popular', label: 'Popular' },
  { value: 'recommended', label: 'For you' },
  { value: 'top_rated', label: 'Top rated' },
  { value: 'recent', label: 'Recently updated' },
  { value: 'newest', label: 'New' },
  { value: 'most_visited', label: 'Most visited' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'history', label: 'Played' },
] as const;

export function Discover() {
  const [params, setParams] = useSearchParams();
  const sort = (params.get('sort') as any) ?? 'popular';
  const genre = params.get('genre') ?? '';
  const [text, setText] = useState(params.get('q') ?? '');
  const q = params.get('q') ?? '';
  const genres = useQuery({ queryKey: ['genres'], queryFn: () => api.get<{ genres: string[] }>('/api/experiences/genres'), staleTime: Infinity });
  const list = useInfiniteQuery({
    queryKey: ['experiences', sort, genre, q],
    queryFn: ({ pageParam }) => api.get<Paged<Experience>>(`/api/experiences?sort=${sort}&limit=24&offset=${pageParam}${genre ? `&genre=${genre}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset,
  });
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="page">
      <h1 className="page-title">Discover</h1>
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); set('q', text.trim()); }}>
        <SearchIcon size={18} />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search experiences" aria-label="Search experiences" />
      </form>
      <Tabs value={sort} onChange={(v) => set('sort', v)} tabs={SORTS.map((s) => ({ value: s.value, label: s.label }))} />
      <div className="chips">
        <button className={`chip ${!genre ? 'active' : ''}`} onClick={() => set('genre', '')}>All genres</button>
        {genres.data?.genres.map((g) => <button key={g} className={`chip ${genre === g ? 'active' : ''}`} onClick={() => set('genre', g)}>{cap(g)}</button>)}
      </div>
      {list.isLoading ? <Spinner /> : list.error ? <ErrorBlock error={list.error} retry={() => list.refetch()} /> : items.length === 0 ? (
        <Empty title="Nothing here yet" text={sort === 'favorites' ? 'Favorite an experience to see it here.' : sort === 'history' ? 'Experiences you play will show up here.' : 'Try another filter.'} />
      ) : (
        <div className="grid exp-grid">
          {items.map((e) => <ExperienceTile key={e.id} exp={e} />)}
          <LoadMore disabled={!list.hasNextPage || list.isFetchingNextPage} onVisible={() => list.fetchNextPage()} />
        </div>
      )}
    </div>
  );
}
