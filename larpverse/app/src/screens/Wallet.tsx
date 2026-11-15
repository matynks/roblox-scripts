import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, CalendarCheck, Gamepad2, History, Receipt, ShoppingBag, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { SparkIcon } from '../components/Art';
import { Button, Empty, ErrorBlock, ItemThumb, LoadMore, Notice, PageHeader, Q, Section, Sparks, Spinner, Tabs } from '../components/ui';
import { cap, dateTime, full } from '../lib/format';
import { useErrorToast, useMe, useSession, useToast } from '../state';
import type { Item, Paged } from '../types';

type WalletData = { balance: number; lifetimeEarned: number; lifetimeSpent: number; dailyReward: number; dailyAvailableAt: number | null; currency: { notice: string } };
type Tx = { id: number; amount: number; balanceAfter: number; type: string; description: string; scripted: boolean; createdAt: number };

const TX_LABELS: Record<string, string> = {
  starting_balance: 'Starting balance', purchase: 'Purchase', sale: 'Sale', refund: 'Refund', refund_reversal: 'Sale refunded', reward: 'Reward',
  daily_reward: 'Daily reward', game_reward: 'Game reward', event_reward: 'Event reward', admin_add: 'Adjustment', admin_remove: 'Adjustment',
  admin_set: 'Adjustment', scripted: 'Roleplay transaction', fee: 'Fee',
};

export function Wallet() {
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { push } = useToast();
  const w = useQuery({ queryKey: ['wallet', me.account.id], queryFn: () => api.get<WalletData>('/api/wallet') });
  const recent = useQuery({ queryKey: ['wallet', me.account.id, 'recent'], queryFn: () => api.get<Paged<Tx>>('/api/wallet/transactions?limit=5') });
  const daily = useMutation({
    mutationFn: () => api.post<{ balance: number; amount: number }>('/api/wallet/daily'),
    onSuccess: (r) => { push({ kind: 'success', title: `+${r.amount} Sparks daily reward` }); setMe({ ...me, wallet: { balance: r.balance } }); qc.invalidateQueries({ queryKey: ['wallet'] }); },
    onError,
  });
  return (
    <div className="page">
      <PageHeader title="Wallet" />
      <Q q={w}>
        {(d) => (
          <>
            <div className="wallet-card">
              <div className="muted small">Your balance</div>
              <div className="wallet-balance"><SparkIcon size={34} /><span>{full(d.balance)}</span></div>
              <div className="wallet-sub"><span>Sparks · fictional roleplay currency</span></div>
              <div className="wallet-lifetime"><span>Earned {full(d.lifetimeEarned)}</span><span>Spent {full(d.lifetimeSpent)}</span></div>
            </div>
            <Notice kind="rp">{d.currency.notice}</Notice>
            <Section title="Earn Sparks">
              <div className="earn-grid">
                <button className="earn card" disabled={Boolean(d.dailyAvailableAt) || daily.isPending} onClick={() => daily.mutate()}>
                  <CalendarCheck size={22} /><strong>Daily reward</strong>
                  <span className="muted small">{d.dailyAvailableAt ? `Back ${dateTime(d.dailyAvailableAt)}` : <>Claim <Sparks amount={d.dailyReward} size={12} /></>}</span>
                </button>
                <Link to="/discover?sort=featured" className="earn card"><Gamepad2 size={22} /><strong>Play LARP</strong><span className="muted small">Complete scenario objectives</span></Link>
                <Link to="/groups" className="earn card"><Users size={22} /><strong>Groups & events</strong><span className="muted small">Join roleplay events</span></Link>
                <Link to="/marketplace" className="earn card"><ShoppingBag size={22} /><strong>Create & sell</strong><span className="muted small">Creators earn from sales</span></Link>
              </div>
            </Section>
            <Section title="Recent activity" action={<Link to="/wallet/transactions" className="link small">All transactions</Link>}>
              <Q q={recent}>{(r) => <TxList items={r.items} />}</Q>
            </Section>
            <div className="row-gap">
              <Link to="/wallet/transactions" className="btn btn-secondary btn-md"><History size={16} /> Transaction history</Link>
              <Link to="/wallet/purchases" className="btn btn-secondary btn-md"><Receipt size={16} /> Purchase history</Link>
            </div>
          </>
        )}
      </Q>
    </div>
  );
}

function TxList({ items }: { items: Tx[] }) {
  if (items.length === 0) return <Empty title="No transactions yet" />;
  return (
    <div className="list card">
      {items.map((t) => (
        <div key={t.id} className="row tx">
          <span className={`tx-icon ${t.amount >= 0 ? 'in' : 'out'}`}>{t.amount >= 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span>
          <div className="row-main"><strong>{t.description}</strong><div className="muted tiny">{TX_LABELS[t.type] ?? cap(t.type)} · {dateTime(t.createdAt)}</div></div>
          <div className="tx-amount">
            <span className={t.amount >= 0 ? 'pos' : 'neg'}>{t.amount >= 0 ? '+' : '−'}{full(Math.abs(t.amount))}</span>
            <span className="muted tiny">bal {full(t.balanceAfter)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Transactions() {
  const me = useMe();
  const [dir, setDir] = useState<'all' | 'in' | 'out'>('all');
  const q = useInfiniteQuery({
    queryKey: ['wallet', me.account.id, 'tx', dir],
    queryFn: ({ pageParam }) => api.get<Paged<Tx> & { last30Days: { incoming: number; outgoing: number } }>(`/api/wallet/transactions?limit=40&offset=${pageParam}${dir !== 'all' ? `&direction=${dir}` : ''}`),
    initialPageParam: 0,
    getNextPageParam: (l) => l.nextOffset,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const totals = q.data?.pages[0]?.last30Days;
  return (
    <div className="page">
      <PageHeader title="Transactions" subtitle="Fictional Sparks ledger" />
      {totals && <div className="stats-row card"><div className="stat"><strong className="pos">+{full(totals.incoming)}</strong><span className="muted tiny">In · 30 days</span></div><div className="stat"><strong className="neg">−{full(totals.outgoing)}</strong><span className="muted tiny">Out · 30 days</span></div></div>}
      <Tabs value={dir} onChange={setDir} tabs={[{ value: 'all', label: 'All' }, { value: 'in', label: 'Incoming' }, { value: 'out', label: 'Outgoing' }]} />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBlock error={q.error} retry={() => q.refetch()} /> : <><TxList items={items} /><LoadMore disabled={!q.hasNextPage || q.isFetchingNextPage} onVisible={() => q.fetchNextPage()} /></>}
    </div>
  );
}

type Purchase = { id: number; item: Item; pricePaid: number; status: string; createdAt: number; refundedAt: number | null; refundable: boolean };

export function Purchases() {
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const onError = useErrorToast();
  const { push } = useToast();
  const q = useInfiniteQuery({
    queryKey: ['wallet', me.account.id, 'purchases'],
    queryFn: ({ pageParam }) => api.get<Paged<Purchase>>(`/api/wallet/purchases?limit=40&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (l) => l.nextOffset,
  });
  const refund = useMutation({
    mutationFn: (id: number) => api.post<{ balance: number; refunded: number }>(`/api/wallet/purchases/${id}/refund`),
    onSuccess: (r) => { push({ kind: 'success', title: `Refunded ${full(r.refunded)} Sparks` }); setMe({ ...me, wallet: { balance: r.balance } }); qc.invalidateQueries({ queryKey: ['wallet'] }); qc.invalidateQueries({ queryKey: ['inventory'] }); },
    onError,
  });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="page">
      <PageHeader title="Purchases" subtitle={`Refunds are available for ${me.config.economy.refundWindowMinutes} minutes (not for limited items)`} />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBlock error={q.error} retry={() => q.refetch()} /> : items.length === 0 ? <Empty title="No purchases yet" action={<Link to="/marketplace" className="btn btn-primary btn-md">Visit the Marketplace</Link>} /> : (
        <div className="list card">
          {items.map((p) => (
            <div key={p.id} className="row">
              <Link to={`/item/${p.item.id}`} className="mini-thumb"><ItemThumb item={p.item} size={48} /></Link>
              <div className="row-main"><strong>{p.item.name}</strong><div className="muted tiny">{dateTime(p.createdAt)}{p.status === 'refunded' ? ` · refunded ${dateTime(p.refundedAt)}` : ''}</div></div>
              <div className="tx-amount">
                <Sparks amount={p.pricePaid} size={12} />
                {p.status === 'refunded' ? <span className="pill">Refunded</span> : p.refundable && <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Refund ${p.item.name}? It will leave your inventory.`)) refund.mutate(p.id); }}>Refund</Button>}
              </div>
            </div>
          ))}
          <LoadMore disabled={!q.hasNextPage || q.isFetchingNextPage} onVisible={() => q.fetchNextPage()} />
        </div>
      )}
    </div>
  );
}
