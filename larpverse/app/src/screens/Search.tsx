import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { GroupEmblem } from '../components/Art';
import { AccountRow, Empty, ExperienceTile, ItemTile, PageHeader, Q, Section, Tabs } from '../components/ui';
import { compact } from '../lib/format';
import type { AccountCard, Experience, Item, Paged } from '../types';

type Results = { people?: Paged<AccountCard>; experiences?: Paged<Experience>; items?: Paged<Item>; groups?: Paged<{ id: number; name: string; emblem: any; members: number }> };

export function Search() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const type = (params.get('type') as 'all' | 'people' | 'experiences' | 'items' | 'groups') ?? 'all';
  const [text, setText] = useState(q);
  const res = useQuery({ queryKey: ['search', q, type], queryFn: () => api.get<Results>(`/api/search?q=${encodeURIComponent(q)}&type=${type}`), enabled: q.length > 0 });
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); n.set(k, v); setParams(n, { replace: true }); };
  const more = (t: string) => <button className="link small" onClick={() => set('type', t)}>See all</button>;
  return (
    <div className="page">
      <PageHeader title="Search" />
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); set('q', text.trim()); }}>
        <SearchIcon size={18} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="People, experiences, items, groups" aria-label="Search" autoFocus />
      </form>
      <Tabs value={type} onChange={(v) => set('type', v)} tabs={[{ value: 'all', label: 'All' }, { value: 'people', label: 'People' }, { value: 'experiences', label: 'Experiences' }, { value: 'items', label: 'Items' }, { value: 'groups', label: 'Groups' }]} />
      {!q ? <Empty icon={<SearchIcon size={28} />} title="Search Larpverse" text="Find friends, experiences, marketplace items and groups." /> : (
        <Q q={res}>
          {(r) => {
            const none = !(r.people?.items.length || r.experiences?.items.length || r.items?.items.length || r.groups?.items.length);
            if (none) return <Empty title={`No results for “${q}”`} />;
            return (
              <>
                {r.people && r.people.items.length > 0 && <Section title="People" action={type === 'all' ? more('people') : null}><div className="list card">{r.people.items.map((p) => <AccountRow key={p.id} account={p} />)}</div></Section>}
                {r.experiences && r.experiences.items.length > 0 && <Section title="Experiences" action={type === 'all' ? more('experiences') : null}><div className="grid exp-grid">{r.experiences.items.map((e) => <ExperienceTile key={e.id} exp={{ ...e, playing: (e as any).playing ?? 0 } as Experience} />)}</div></Section>}
                {r.items && r.items.items.length > 0 && <Section title="Marketplace" action={type === 'all' ? more('items') : null}><div className="grid item-grid">{r.items.items.map((i) => <ItemTile key={i.id} item={i} />)}</div></Section>}
                {r.groups && r.groups.items.length > 0 && <Section title="Groups" action={type === 'all' ? more('groups') : null}><div className="list card">{r.groups.items.map((g) => <Link key={g.id} to={`/groups/${g.id}`} className="row"><GroupEmblem emblem={g.emblem} size={42} /><div className="row-main"><strong>{g.name}</strong><div className="muted tiny">{compact(g.members)} members</div></div></Link>)}</div></Section>}
              </>
            );
          }}
        </Q>
      )}
    </div>
  );
}
