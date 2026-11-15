import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Bell, CheckCheck, Gamepad2, Gift, Megaphone, ShieldAlert, ShoppingBag, Trash2, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Button, Empty, ErrorBlock, Headshot, LoadMore, PageHeader, Spinner } from '../components/ui';
import { timeAgo } from '../lib/format';
import { useErrorToast, useMe, useSession } from '../state';
import type { Notification, Paged } from '../types';

const ICONS: Record<string, any> = {
  friend_request: UserPlus, friend_accept: UserPlus, follow: UserPlus, purchase: ShoppingBag, sale: ShoppingBag, reward: Gift,
  badge: Award, group: Users, game_invite: Gamepad2, event: Megaphone, announcement: Megaphone, system: Bell, security: ShieldAlert,
};

function target(n: Notification): string | null {
  const d = n.data ?? {};
  if (n.type === 'game_invite' && d.experienceId) return `/play/${d.experienceId}?session=${d.sessionId}${d.accessCode ? `&code=${d.accessCode}` : ''}`;
  if (d.itemId) return `/item/${d.itemId}`;
  if (d.groupId) return `/groups/${d.groupId}`;
  if (n.type === 'friend_request') return '/friends?tab=requests';
  if (d.accountId) return `/profile/${d.accountId}`;
  if (n.type === 'reward' || n.type === 'purchase' || n.type === 'sale') return '/wallet/transactions';
  if (n.type === 'security') return '/settings/security';
  return null;
}

export function Notifications() {
  const me = useMe();
  const { setMe } = useSession();
  const qc = useQueryClient();
  const nav = useNavigate();
  const onError = useErrorToast();
  const q = useInfiniteQuery({
    queryKey: ['notifications', me.account.id],
    queryFn: ({ pageParam }) => api.get<Paged<Notification> & { unread: number }>(`/api/notifications?limit=40&offset=${pageParam}`),
    initialPageParam: 0,
    getNextPageParam: (l) => l.nextOffset,
  });
  const after = (unread: number) => { setMe({ ...me, unreadNotifications: unread }); qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['home'] }); };
  const read = useMutation({ mutationFn: (id: number) => api.post<{ unread: number }>(`/api/notifications/${id}/read`), onSuccess: (r) => after(r.unread) });
  const readAll = useMutation({ mutationFn: () => api.post<{ unread: number }>('/api/notifications/read-all'), onSuccess: (r) => after(r.unread), onError });
  const del = useMutation({ mutationFn: (id: number) => api.del<{ unread: number }>(`/api/notifications/${id}`), onSuccess: (r) => after(r.unread), onError });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <div className="page">
      <PageHeader title="Notifications" right={<Button size="sm" variant="ghost" icon={<CheckCheck size={16} />} onClick={() => readAll.mutate()} disabled={!me.unreadNotifications}>Read all</Button>} />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBlock error={q.error} retry={() => q.refetch()} /> : items.length === 0 ? <Empty icon={<Bell size={30} />} title="You’re all caught up" /> : (
        <div className="list card">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const to = target(n);
            return (
              <div key={n.id} className={`row notif ${n.read ? '' : 'unread'}`} onClick={() => { if (!n.read) read.mutate(n.id); if (to) nav(to); }} role="button" tabIndex={0}>
                {n.actor ? <Headshot account={n.actor} size={40} presence={false} /> : <span className="notif-icon"><Icon size={20} /></span>}
                <div className="row-main">
                  <strong>{n.title}</strong>
                  {n.body && <div className="muted small">{n.body}</div>}
                  <div className="muted tiny">{timeAgo(n.createdAt)}</div>
                </div>
                <button className="icon-btn" aria-label="Delete notification" onClick={(e) => { e.stopPropagation(); del.mutate(n.id); }}><Trash2 size={16} /></button>
              </div>
            );
          })}
          <LoadMore disabled={!q.hasNextPage || q.isFetchingNextPage} onVisible={() => q.fetchNextPage()} />
        </div>
      )}
    </div>
  );
}
