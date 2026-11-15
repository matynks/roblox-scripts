import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Search as SearchIcon, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { AccountRow, Button, Empty, ErrorBlock, LoadMore, PageHeader, Q, Spinner, Tabs } from '../components/ui';
import { timeAgo } from '../lib/format';
import { useErrorToast, useMe, useToast } from '../state';
import type { AccountCard, Paged } from '../types';

type Requests = { incoming: { id: number; createdAt: number; account: AccountCard }[]; outgoing: { id: number; createdAt: number; account: AccountCard }[] };

export function Friends() {
  const me = useMe();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as 'friends' | 'requests' | 'find' | 'following' | 'followers') ?? 'friends';
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { push } = useToast();
  const friends = useQuery({ queryKey: ['friends', me.account.id], queryFn: () => api.get<Paged<AccountCard>>(`/api/accounts/${me.account.id}/friends?limit=100`), enabled: tab === 'friends' });
  const reqs = useQuery({ queryKey: ['friends', 'requests', me.account.id], queryFn: () => api.get<Requests>('/api/social/requests') });
  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: number; accept: boolean }) => api.post(`/api/social/requests/${id}/${accept ? 'accept' : 'decline'}`),
    onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['friends'] }); push({ title: v.accept ? 'Friend added' : 'Request declined' }); },
    onError,
  });
  const cancel = useMutation({ mutationFn: (id: number) => api.del(`/api/social/friends/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ['friends'] }), onError });
  const incoming = reqs.data?.incoming.length ?? 0;
  return (
    <div className="page">
      <PageHeader title="Friends" />
      <Tabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} tabs={[
        { value: 'friends', label: 'Friends' },
        { value: 'requests', label: <>Requests{incoming > 0 && <span className="count inline">{incoming}</span>}</> },
        { value: 'find', label: 'Find people' },
        { value: 'following', label: 'Following' },
        { value: 'followers', label: 'Followers' },
      ]} />
      {tab === 'friends' && (
        <Q q={friends}>
          {(d) => d.items.length === 0 ? <Empty title="No friends yet" text="Find people to roleplay with." action={<Button onClick={() => setParams({ tab: 'find' })}>Find people</Button>} /> : (
            <div className="list card">{d.items.map((f) => <AccountRow key={f.id} account={f} />)}</div>
          )}
        </Q>
      )}
      {tab === 'requests' && (
        <Q q={reqs}>
          {(d) => (
            <>
              <h3 className="list-title">Received</h3>
              {d.incoming.length === 0 ? <p className="muted">No pending requests.</p> : (
                <div className="list card">
                  {d.incoming.map((r) => (
                    <AccountRow key={r.id} account={r.account} sub={`Sent ${timeAgo(r.createdAt)}`} right={
                      <div className="row-gap">
                        <button className="icon-btn ok" aria-label="Accept" onClick={() => respond.mutate({ id: r.id, accept: true })}><Check size={18} /></button>
                        <button className="icon-btn" aria-label="Decline" onClick={() => respond.mutate({ id: r.id, accept: false })}><X size={18} /></button>
                      </div>
                    } />
                  ))}
                </div>
              )}
              <h3 className="list-title">Sent</h3>
              {d.outgoing.length === 0 ? <p className="muted">No sent requests.</p> : (
                <div className="list card">{d.outgoing.map((r) => <AccountRow key={r.id} account={r.account} sub={`Sent ${timeAgo(r.createdAt)}`} right={<Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.account.id)}>Cancel</Button>} />)}</div>
              )}
            </>
          )}
        </Q>
      )}
      {tab === 'find' && <FindPeople />}
      {(tab === 'following' || tab === 'followers') && <SocialListBody accountId={me.account.id} list={tab} />}
    </div>
  );
}

function FindPeople() {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const me = useMe();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const [sent, setSent] = useState<Set<number>>(new Set());
  const res = useQuery({ queryKey: ['people', q], queryFn: () => api.get<{ people: Paged<AccountCard> }>(`/api/search?type=people&q=${encodeURIComponent(q)}`), enabled: q.length > 0 });
  const add = useMutation({ mutationFn: (id: number) => api.post(`/api/social/friends/${id}/request`), onSuccess: (_, id) => { setSent(new Set([...sent, id])); qc.invalidateQueries({ queryKey: ['friends'] }); }, onError });
  return (
    <>
      <form className="searchbar" onSubmit={(e) => { e.preventDefault(); setQ(text.trim()); }}>
        <SearchIcon size={18} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search by username or display name" aria-label="Search people" autoFocus />
      </form>
      {q && (res.isLoading ? <Spinner /> : res.error ? <ErrorBlock error={res.error} retry={() => res.refetch()} /> : (
        <div className="list card">
          {res.data!.people.items.filter((p) => p.id !== me.account.id).map((p) => (
            <AccountRow key={p.id} account={p} right={sent.has(p.id) ? <span className="muted small">Sent</span> : <button className="icon-btn" aria-label={`Add ${p.displayName}`} onClick={() => add.mutate(p.id)}><UserPlus size={18} /></button>} />
          ))}
          {res.data!.people.items.length === 0 && <p className="muted pad">No one found.</p>}
        </div>
      ))}
    </>
  );
}

function SocialListBody({ accountId, list }: { accountId: number; list: string }) {
  const q = useInfiniteQuery({
    queryKey: ['social-list', accountId, list],
    queryFn: ({ pageParam }) => api.get<Paged<AccountCard>>(`/api/accounts/${accountId}/${list}?limit=50&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (l) => l.nextOffset,
  });
  if (q.isLoading) return <Spinner />;
  if (q.error) return <ErrorBlock error={q.error} retry={() => q.refetch()} />;
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  if (items.length === 0) return <Empty title={`No ${list} yet`} />;
  return <div className="list card">{items.map((a) => <AccountRow key={a.id} account={a} />)}<LoadMore disabled={!q.hasNextPage || q.isFetchingNextPage} onVisible={() => q.fetchNextPage()} /></div>;
}

export function SocialList() {
  const { id, list } = useParams();
  const title = list === 'friends' ? 'Friends' : list === 'followers' ? 'Followers' : 'Following';
  return (
    <div className="page">
      <PageHeader title={title} />
      <SocialListBody accountId={Number(id)} list={list ?? 'friends'} />
    </div>
  );
}
