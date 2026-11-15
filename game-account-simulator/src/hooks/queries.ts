import { type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { backend } from '@/api';
import { toAppError } from '@/api/errors';
import type * as T from '@/api/types';
import { toast } from '@/ui/Toast';

export const qk = {
  me: ['me'] as const,
  catalog: ['catalog'] as const,
  itemSets: ['itemSets'] as const,
  market: (q: Omit<T.CatalogQuery, 'page'>) => ['market', q] as const,
  item: (id: string) => ['item', id] as const,
  inventory: (userId: string) => ['inventory', userId] as const,
  favorites: ['favorites'] as const,
  setClaims: ['setClaims'] as const,
  outfits: ['outfits'] as const,
  discover: ['discover'] as const,
  game: (id: string) => ['game', id] as const,
  leaderboard: (id: string) => ['leaderboard', id] as const,
  profile: (u: string) => ['profile', u.toLowerCase()] as const,
  connections: (id: string, kind: string) => ['connections', id, kind] as const,
  friendRequests: ['friendRequests'] as const,
  blocked: ['blocked'] as const,
  feed: ['feed'] as const,
  activity: (id: string) => ['activity', id] as const,
  notifications: ['notifications'] as const,
  transactions: (kind: string | null) => ['transactions', kind] as const,
  quests: ['quests'] as const,
  achievements: ['achievements'] as const,
  analytics: ['analytics'] as const,
  search: (q: string) => ['search', q] as const,
  access: ['access'] as const,
};

/** Refresh everything an economy change can affect. */
export function invalidateEconomy(qc: QueryClient) {
  ['me', 'transactions', 'quests', 'achievements', 'analytics', 'inventory', 'notifications', 'feed', 'setClaims'].forEach((k) =>
    qc.invalidateQueries({ queryKey: [k] }),
  );
}

export function patchBalance(qc: QueryClient, s: Partial<T.EconomyState>) {
  qc.setQueryData<T.Me>(qk.me, (me) =>
    me && s.balance != null
      ? { ...me, wallet: { ...me.wallet, balance: s.balance }, profile: { ...me.profile, level: s.level ?? me.profile.level, xp: s.total_xp ?? me.profile.xp } }
      : me,
  );
}

export function showError(e: unknown, title = 'Something went wrong') {
  const err = toAppError(e);
  toast.error(err.code === 'NETWORK' ? 'No connection' : title, err.message);
}

// ── account ───────────────────────────────────────────────────────────────
export const useMe = () => useQuery({ queryKey: qk.me, queryFn: () => backend.getMe(), staleTime: 15_000 });
export const useQuests = () => useQuery({ queryKey: qk.quests, queryFn: () => backend.getDailyQuests() });
export const useAchievements = () => useQuery({ queryKey: qk.achievements, queryFn: () => backend.getAchievements() });
export const useAnalytics = () => useQuery({ queryKey: qk.analytics, queryFn: () => backend.getAnalytics() });

export function useTransactions(kind: T.TxnKind | null) {
  return useInfiniteQuery({
    queryKey: qk.transactions(kind),
    queryFn: ({ pageParam }) => backend.listTransactions(pageParam, 25, kind),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === 25 ? all.length : undefined),
  });
}

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: qk.notifications,
    queryFn: ({ pageParam }) => backend.listNotifications(pageParam, 30),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === 30 ? all.length : undefined),
  });
}

export function useClaimDaily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => backend.claimDailyReward(),
    onSuccess: (r) => {
      patchBalance(qc, r);
      toast.reward(`Day ${r.streak} reward`, r.reward, r.streak > 1 ? `${r.streak}-day streak!` : 'Come back tomorrow to start a streak.');
      toast.achievements(r.unlocked);
      invalidateEconomy(qc);
    },
    onError: (e) => showError(e, "Couldn't claim reward"),
  });
}

export function useClaimQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => backend.claimQuest(key),
    onSuccess: (r) => {
      patchBalance(qc, r);
      toast.reward('Quest reward claimed', r.reward);
      toast.achievements(r.unlocked);
      invalidateEconomy(qc);
    },
    onError: (e) => showError(e, "Couldn't claim quest"),
  });
}

// ── catalog ───────────────────────────────────────────────────────────────
export function useCatalog() {
  const q = useQuery({ queryKey: qk.catalog, queryFn: () => backend.getCatalog(), staleTime: 10 * 60_000 });
  const byId = useMemo(() => new Map((q.data ?? []).map((c) => [c.id, c])), [q.data]);
  return { ...q, byId };
}
export const useItemSets = () => useQuery({ queryKey: qk.itemSets, queryFn: () => backend.getItemSets(), staleTime: 30 * 60_000 });

export function useMarket(q: Omit<T.CatalogQuery, 'page'>) {
  return useInfiniteQuery({
    queryKey: qk.market(q),
    queryFn: ({ pageParam }) => backend.searchCatalog({ ...q, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.hasMore ? all.length : undefined),
    staleTime: 30_000,
  });
}

export const useItem = (id: string) => useQuery({ queryKey: qk.item(id), queryFn: () => backend.getItem(id) });
export const useInventory = (userId: string | undefined) =>
  useQuery({ queryKey: qk.inventory(userId ?? 'none'), queryFn: () => backend.listInventory(userId!), enabled: !!userId });
export const useFavoriteItems = () => useQuery({ queryKey: qk.favorites, queryFn: () => backend.listFavoriteItemIds() });
export const useSetClaims = () => useQuery({ queryKey: qk.setClaims, queryFn: () => backend.getSetClaims() });

export function usePurchase() {
  const qc = useQueryClient();
  return useMutation({
    // Purchases are safe to retry: the idempotency key makes the server replay the original result.
    retry: (count, e) => count < 2 && toAppError(e).retryable,
    mutationFn: (v: { item: T.CatalogItem; key: string }) => backend.purchaseItem(v.item.id, v.item.price, v.key),
    onSuccess: (r, v) => {
      patchBalance(qc, r);
      toast.success(r.status === 'duplicate' ? 'Already purchased' : `${v.item.name} is yours!`, r.serial_number ? `Serial #${r.serial_number}` : 'Find it in your inventory and avatar editor.');
      r.sets_completed.forEach((s) => toast.reward(`Set complete: ${s.name}`, s.reward_orbs));
      toast.achievements(r.unlocked);
      qc.invalidateQueries({ queryKey: ['item', v.item.id] });
      qc.invalidateQueries({ queryKey: ['market'] });
      qc.invalidateQueries({ queryKey: qk.catalog });
      invalidateEconomy(qc);
    },
  });
}

export function useToggleItemFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => backend.toggleItemFavorite(id),
    onSuccess: (_r, id) => {
      qc.invalidateQueries({ queryKey: qk.item(id) });
      qc.invalidateQueries({ queryKey: qk.favorites });
    },
    onError: (e) => showError(e),
  });
}

// ── avatar ────────────────────────────────────────────────────────────────
export const useOutfits = () => useQuery({ queryKey: qk.outfits, queryFn: () => backend.listOutfits() });

export function useSaveAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: T.AvatarConfig) => backend.saveAvatar(c),
    onSuccess: (avatar) => {
      qc.setQueryData<T.Me>(qk.me, (me) => (me ? { ...me, avatar } : me));
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => showError(e, "Couldn't save avatar"),
  });
}

// ── games ─────────────────────────────────────────────────────────────────
export const useDiscover = () => useQuery({ queryKey: qk.discover, queryFn: () => backend.getDiscover(), staleTime: 60_000 });
export const useGame = (id: string) => useQuery({ queryKey: qk.game(id), queryFn: () => backend.getGame(id) });
export const useLeaderboard = (id: string) => useQuery({ queryKey: qk.leaderboard(id), queryFn: () => backend.getLeaderboard(id, 25) });

// ── social ────────────────────────────────────────────────────────────────
export const useProfile = (username: string) => useQuery({ queryKey: qk.profile(username), queryFn: () => backend.getProfile(username), enabled: !!username });
export const useFriendRequests = () => useQuery({ queryKey: qk.friendRequests, queryFn: () => backend.listFriendRequests() });
export const useBlocked = () => useQuery({ queryKey: qk.blocked, queryFn: () => backend.listBlocked() });
export const useFeed = () => useQuery({ queryKey: qk.feed, queryFn: () => backend.getFeed(40), staleTime: 30_000 });
export const useUserActivity = (id: string | undefined, enabled = true) =>
  useQuery({ queryKey: qk.activity(id ?? ''), queryFn: () => backend.getUserActivity(id!), enabled: !!id && enabled });
export const useUserSearch = (q: string) => useQuery({ queryKey: qk.search(q), queryFn: () => backend.searchUsers(q), enabled: q.trim().length >= 2, staleTime: 20_000 });

export function useConnections(userId: string | undefined, kind: 'friends' | 'followers' | 'following', enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.connections(userId ?? '', kind),
    queryFn: ({ pageParam }) => backend.listConnections(userId!, kind, pageParam, 40),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === 40 ? all.length : undefined),
    enabled: !!userId && enabled,
  });
}

export function invalidateSocial(qc: QueryClient) {
  ['profile', 'connections', 'friendRequests', 'me', 'feed', 'search', 'blocked', 'notifications'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

/** Social actions with consistent feedback. */
export function useSocialAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: { type: 'friend' | 'accept' | 'decline' | 'cancel' | 'unfriend' | 'follow' | 'unfollow' | 'block' | 'unblock'; userId?: string; requestId?: string; name?: string }) => {
      switch (a.type) {
        case 'friend': {
          const r = await backend.sendFriendRequest(a.userId!);
          return { msg: r.status === 'friends' ? `You and ${a.name ?? 'this player'} are now friends` : 'Friend request sent', unlocked: r.unlocked };
        }
        case 'accept':
          await backend.respondFriendRequest(a.requestId!, true);
          return { msg: 'Friend request accepted' };
        case 'decline':
          await backend.respondFriendRequest(a.requestId!, false);
          return { msg: 'Request declined' };
        case 'cancel':
          await backend.cancelFriendRequest(a.requestId!);
          return { msg: 'Request cancelled' };
        case 'unfriend':
          await backend.removeFriend(a.userId!);
          return { msg: 'Removed from friends' };
        case 'follow': {
          const r = await backend.follow(a.userId!);
          return { msg: r.followed_back ? `Following — ${a.name ?? 'they'} followed you back!` : `Following ${a.name ?? ''}`.trim() };
        }
        case 'unfollow':
          await backend.unfollow(a.userId!);
          return { msg: 'Unfollowed' };
        case 'block':
          await backend.block(a.userId!);
          return { msg: `${a.name ?? 'Player'} blocked` };
        case 'unblock':
          await backend.unblock(a.userId!);
          return { msg: 'Player unblocked' };
      }
    },
    onSuccess: (r) => {
      if (r?.msg) toast.success(r.msg);
      if (r && 'unlocked' in r) toast.achievements(r.unlocked);
      invalidateSocial(qc);
      qc.invalidateQueries({ queryKey: qk.quests });
      qc.invalidateQueries({ queryKey: qk.achievements });
    },
    onError: (e) => showError(e, "Couldn't do that"),
  });
}
