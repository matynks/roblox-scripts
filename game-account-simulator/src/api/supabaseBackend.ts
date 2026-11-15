import 'react-native-url-polyfill/auto';

import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { seasonForDate } from '@/domain/rules';

import type { AdminApi, AuthEvent, Backend, SessionInfo, SignUpInput } from './backend';
import { AppError, toAppError } from './errors';
import { authStorage } from './sessionStorage';
import type * as T from './types';

const SLOT_GROUPS: Record<string, string[]> = {
  clothing: ['shirt', 'pants', 'shoes'],
  accessories: ['hat', 'face_accessory', 'neck', 'back'],
  avatar: ['hair', 'face'],
};

const CATALOG_COLUMNS =
  'id,name,description,slot,rarity,price,is_for_sale,is_limited,stock_total,stock_remaining,season_key,set_key,is_starter,featured,creator_name,asset,sales_count,favorites_count,created_at';

export class SupabaseBackend implements Backend {
  readonly mode = 'online' as const;
  readonly client: SupabaseClient;
  private userId: string | null = null;
  private email: string | null = null;
  private explicitSignOut = false;

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
        lock: processLock,
      },
    });
    if (Platform.OS !== 'web') {
      // Refresh tokens only while the app is in the foreground.
      AppState.addEventListener('change', (state) => {
        if (state === 'active') this.client.auth.startAutoRefresh();
        else this.client.auth.stopAutoRefresh();
      });
    }
    this.client.auth.onAuthStateChange((_e, session) => {
      this.userId = session?.user.id ?? null;
      this.email = session?.user.email ?? null;
    });
  }

  // ── helpers ───────────────────────────────────────────────────────────
  private async rpc<R>(fn: string, args: Record<string, unknown> = {}): Promise<R> {
    try {
      const { data, error } = await this.client.rpc(fn, args);
      if (error) throw error;
      return data as R;
    } catch (e) {
      throw toAppError(e);
    }
  }

  private async run<R>(p: PromiseLike<{ data: R | null; error: any }>): Promise<R> {
    try {
      const { data, error } = await p;
      if (error) throw error;
      return data as R;
    } catch (e) {
      throw toAppError(e);
    }
  }

  private async me(): Promise<string> {
    if (this.userId) return this.userId;
    const { data } = await this.client.auth.getSession();
    if (!data.session) throw new AppError('NOT_AUTHENTICATED', 'Your session ended. Please sign in again.');
    this.userId = data.session.user.id;
    return this.userId;
  }

  // ── auth ──────────────────────────────────────────────────────────────
  async getSession(): Promise<SessionInfo | null> {
    const { data } = await this.client.auth.getSession();
    if (!data.session) return null;
    this.userId = data.session.user.id;
    this.email = data.session.user.email ?? null;
    return { userId: data.session.user.id, email: data.session.user.email ?? null };
  }

  onAuthChange(cb: (event: AuthEvent, session: SessionInfo | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event, session) => {
      const info = session ? { userId: session.user.id, email: session.user.email ?? null } : null;
      if (event === 'SIGNED_OUT') {
        cb(this.explicitSignOut ? 'SIGNED_OUT' : 'SESSION_EXPIRED', null);
        this.explicitSignOut = false;
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') {
        cb(event, info);
      }
    });
    return () => data.subscription.unsubscribe();
  }

  checkUsername(username: string) {
    return this.rpc<{ available: boolean; reason: string | null }>('check_username_available', { p_username: username });
  }

  async signUp(input: SignUpInput) {
    const { data, error } = await this.client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { username: input.username.trim(), display_name: input.displayName.trim(), terms_accepted: true },
        emailRedirectTo: 'blockora://auth-callback',
      },
    });
    if (error) throw toAppError(error);
    // With email confirmation on, an existing email returns a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new AppError('EMAIL_TAKEN', 'An account with this email already exists.');
    }
    return { needsEmailConfirmation: !data.session };
  }

  async signIn(email: string, password: string) {
    const { error } = await this.client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAppError(error);
  }

  async signOut() {
    this.explicitSignOut = true;
    await this.client.auth.signOut();
    this.userId = null;
  }

  async requestPasswordReset(email: string) {
    const { error } = await this.client.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'blockora://reset-password' });
    if (error) throw toAppError(error);
  }

  async verifyRecoveryCode(email: string, code: string) {
    const { error } = await this.client.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    if (error) throw toAppError(error);
  }

  async updatePassword(newPassword: string) {
    const { error } = await this.client.auth.updateUser({ password: newPassword });
    if (error) throw toAppError(error);
  }

  async resendConfirmation(email: string) {
    const { error } = await this.client.auth.resend({ type: 'signup', email: email.trim() });
    if (error) throw toAppError(error);
  }

  /** Handles blockora://reset-password?code=… and blockora://auth-callback?code=… links. */
  async handleDeepLink(url: string): Promise<'recovery' | 'signed_in' | null> {
    const code = /[?&]code=([^&#]+)/.exec(url)?.[1];
    if (!code) return null;
    const { error } = await this.client.auth.exchangeCodeForSession(decodeURIComponent(code));
    if (error) throw toAppError(error);
    return url.includes('reset-password') ? 'recovery' : 'signed_in';
  }

  // ── account ───────────────────────────────────────────────────────────
  getMe() {
    return this.rpc<T.Me>('get_me');
  }
  async touchPresence() {
    await this.rpc('touch_presence').catch(() => undefined);
  }
  async updateProfile(i: { display_name: string; bio: string; status_text: string; profile_theme: string }) {
    await this.rpc('update_profile', {
      p_display_name: i.display_name,
      p_bio: i.bio,
      p_status_text: i.status_text,
      p_profile_theme: i.profile_theme,
    });
  }
  changeUsername(newUsername: string, key: string) {
    return this.rpc<{ username: string; cost: number } & T.EconomyState>('change_username', { p_new_username: newUsername, p_idempotency_key: key });
  }
  async updateSettings(patch: Partial<T.Settings>) {
    const uid = await this.me();
    return this.run<T.Settings>(this.client.from('user_settings').update(patch).eq('user_id', uid).select().single());
  }
  claimDailyReward() {
    return this.rpc<T.DailyClaimResult>('claim_daily_reward');
  }
  getDailyQuests() {
    return this.rpc<T.DailyQuests>('get_daily_quests');
  }
  claimQuest(key: string) {
    return this.rpc<{ reward: number; unlocked: T.UnlockedAchievement[] } & T.EconomyState>('claim_quest', { p_quest_key: key });
  }
  getAchievements() {
    return this.rpc<T.AchievementProgress[]>('get_achievements');
  }
  getAnalytics() {
    return this.rpc<T.Analytics>('get_account_analytics');
  }
  async listTransactions(page: number, pageSize: number, kind?: T.TxnKind | null) {
    const uid = await this.me();
    let q = this.client
      .from('currency_transactions')
      .select('id,amount,balance_after,kind,description,reference_type,reference_id,created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (kind) q = q.eq('kind', kind);
    return this.run<T.Transaction[]>(q);
  }
  async listNotifications(page: number, pageSize: number) {
    const uid = await this.me();
    return this.run<T.AppNotification[]>(
      this.client
        .from('notifications')
        .select('id,kind,title,body,data,read_at,created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1),
    );
  }
  async markNotificationsRead(ids?: string[]) {
    await this.rpc('mark_notifications_read', { p_ids: ids ?? null });
  }
  async deleteNotification(id: string) {
    await this.run(this.client.from('notifications').delete().eq('id', id));
  }

  // ── marketplace ───────────────────────────────────────────────────────
  getCatalog() {
    return this.run<T.CatalogItem[]>(this.client.from('catalog_items').select(CATALOG_COLUMNS).order('id').range(0, 1999));
  }
  getItemSets() {
    return this.run<T.ItemSet[]>(this.client.from('item_sets').select('*').order('sort_order'));
  }
  async searchCatalog(q: T.CatalogQuery) {
    let query = this.client.from('catalog_items').select(CATALOG_COLUMNS).eq('is_for_sale', true);
    const season = seasonForDate(new Date());
    query = query.or(`season_key.is.null,season_key.eq.${season}`);
    if (q.category in SLOT_GROUPS) query = query.in('slot', SLOT_GROUPS[q.category]);
    if (q.category === 'collectibles') query = query.eq('is_limited', true);
    if (q.category === 'special') query = query.or('season_key.not.is.null,rarity.in.(legendary,mythic)');
    if (q.slot) query = query.eq('slot', q.slot);
    if (q.rarity) query = query.eq('rarity', q.rarity);
    if (q.maxPrice != null) query = query.lte('price', q.maxPrice);
    const term = q.search?.trim();
    if (term) query = query.ilike('name', `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`);
    const order: Record<T.MarketSort, [string, boolean][]> = {
      featured: [['featured', false], ['sales_count', false]],
      popular: [['sales_count', false]],
      newest: [['created_at', false]],
      price_asc: [['price', true]],
      price_desc: [['price', false]],
      favorites: [['favorites_count', false]],
    };
    for (const [col, asc] of order[q.sort]) query = query.order(col, { ascending: asc });
    query = query.order('id').range(q.page * q.pageSize, q.page * q.pageSize + q.pageSize);
    const rows = await this.run<T.CatalogItem[]>(query);
    return { items: rows.slice(0, q.pageSize), hasMore: rows.length > q.pageSize };
  }
  async getItem(id: string): Promise<T.ItemDetail> {
    const uid = await this.me();
    const [item, copies, fav, points] = await Promise.all([
      this.run<T.CatalogItem>(this.client.from('catalog_items').select(CATALOG_COLUMNS).eq('id', id).single()),
      this.run<T.ItemDetail['owned_copies']>(
        this.client.from('inventory_items').select('id,serial_number,acquired_at').eq('user_id', uid).eq('item_id', id),
      ),
      this.run<{ item_id: string }[]>(this.client.from('item_favorites').select('item_id').eq('user_id', uid).eq('item_id', id)),
      this.run<T.ItemDetail['price_points']>(
        this.client.from('item_price_points').select('day,avg_price,volume').eq('item_id', id).order('day', { ascending: false }).limit(30),
      ),
    ]);
    let set: T.ItemDetail['set'] = null;
    if (item.set_key) {
      const [s, members] = await Promise.all([
        this.run<T.ItemSet>(this.client.from('item_sets').select('*').eq('key', item.set_key).single()),
        this.run<{ id: string }[]>(this.client.from('catalog_items').select('id').eq('set_key', item.set_key)),
      ]);
      set = { ...s, items: members.map((m) => m.id) };
    }
    return { item, owned_copies: copies, favorited: fav.length > 0, price_points: points.reverse(), set };
  }
  purchaseItem(id: string, expectedPrice: number, key: string) {
    return this.rpc<T.PurchaseResult>('purchase_item', { p_item_id: id, p_expected_price: expectedPrice, p_idempotency_key: key });
  }
  toggleItemFavorite(id: string) {
    return this.rpc<{ favorited: boolean; favorites_count: number }>('toggle_item_favorite', { p_item_id: id });
  }
  async listFavoriteItemIds() {
    const uid = await this.me();
    const rows = await this.run<{ item_id: string }[]>(this.client.from('item_favorites').select('item_id').eq('user_id', uid));
    return rows.map((r) => r.item_id);
  }
  listInventory(userId: string) {
    return this.run<T.InventoryEntry[]>(
      this.client
        .from('inventory_items')
        .select('id,user_id,item_id,serial_number,acquired_via,price_paid,acquired_at')
        .eq('user_id', userId)
        .order('acquired_at', { ascending: false })
        .range(0, 1999),
    );
  }
  async getSetClaims() {
    const uid = await this.me();
    const rows = await this.run<{ set_key: string }[]>(this.client.from('collection_claims').select('set_key').eq('user_id', uid));
    return rows.map((r) => r.set_key);
  }

  // ── avatar ────────────────────────────────────────────────────────────
  saveAvatar(config: T.AvatarConfig) {
    return this.rpc<T.AvatarConfig>('save_avatar', { p_config: config });
  }
  async listOutfits() {
    const uid = await this.me();
    const rows = await this.run<any[]>(this.client.from('outfits').select('*').eq('user_id', uid).order('updated_at', { ascending: false }));
    return rows.map((r) => ({ ...r, height_scale: Number(r.height_scale), head_scale: Number(r.head_scale) })) as T.Outfit[];
  }
  saveOutfit(name: string, config: T.AvatarConfig, isPublic: boolean) {
    return this.rpc<{ id: string; unlocked: T.UnlockedAchievement[] }>('save_outfit', { p_name: name, p_config: config, p_is_public: isPublic });
  }
  async updateOutfit(id: string, name: string, isPublic: boolean, config?: T.AvatarConfig) {
    await this.rpc('update_outfit', { p_outfit_id: id, p_name: name, p_is_public: isPublic, p_config: config ?? null });
  }
  async deleteOutfit(id: string) {
    await this.rpc('delete_outfit', { p_outfit_id: id });
  }
  wearOutfit(id: string) {
    return this.rpc<{ status: 'ok' | 'missing_items'; missing: { item_id: string; name: string; price: number }[] }>('wear_outfit', { p_outfit_id: id });
  }

  // ── games ─────────────────────────────────────────────────────────────
  getDiscover() {
    return this.rpc<T.Discover>('get_discover');
  }
  getGame(id: string) {
    return this.rpc<T.GameDetail>('get_game', { p_game_id: id });
  }
  getLeaderboard(gameId: string, limit = 25) {
    return this.rpc<T.Leaderboard>('get_leaderboard', { p_game_id: gameId, p_limit: limit });
  }
  rateGame(gameId: string, vote: 1 | -1 | null) {
    return this.rpc<{ my_vote: 1 | -1 | null; likes: number; dislikes: number }>('rate_game', { p_game_id: gameId, p_vote: vote });
  }
  toggleGameFavorite(gameId: string) {
    return this.rpc<{ favorited: boolean; favorites: number }>('toggle_game_favorite', { p_game_id: gameId });
  }
  async listGamePasses(): Promise<T.GamePassListing[]> {
    const uid = await this.me();
    const [passes, owned] = await Promise.all([
      this.run<any[]>(this.client.from('game_passes').select('id,game_id,name,description,price,perk_type,perk_value,icon,sales_count,games(title,thumbnail)').order('price')),
      this.run<{ pass_id: string }[]>(this.client.from('game_pass_ownership').select('pass_id').eq('user_id', uid)),
    ]);
    const mine = new Set(owned.map((o) => o.pass_id));
    return passes.map(({ games, ...p }) => ({ ...p, perk_value: Number(p.perk_value), game_title: games?.title ?? '', thumbnail: games?.thumbnail, owned: mine.has(p.id) }));
  }
  purchaseGamePass(passId: string, expectedPrice: number, key: string) {
    return this.rpc<{ status: string; unlocked: T.UnlockedAchievement[] } & T.EconomyState>('purchase_game_pass', {
      p_pass_id: passId,
      p_expected_price: expectedPrice,
      p_idempotency_key: key,
    });
  }
  startGameSession(gameId: string) {
    return this.rpc<T.GameSession>('start_game_session', { p_game_id: gameId });
  }
  submitGameScore(sessionId: string, score: number, durationMs: number, stats: Record<string, unknown>) {
    return this.rpc<T.ScoreResult>('submit_game_score', {
      p_session_id: sessionId,
      p_score: Math.max(0, Math.floor(score)),
      p_duration_ms: Math.max(0, Math.floor(durationMs)),
      p_stats: stats,
    });
  }

  // ── social ────────────────────────────────────────────────────────────
  getProfile(username: string) {
    return this.rpc<T.PublicProfile>('get_profile', { p_username: username });
  }
  searchUsers(query: string) {
    return this.rpc<(T.PlayerCard & { is_friend: boolean; followers: number })[]>('search_users', { p_query: query, p_limit: 30 });
  }
  listConnections(userId: string, kind: 'friends' | 'followers' | 'following', page: number, pageSize: number) {
    return this.rpc<T.Connection[]>('list_connections', { p_user: userId, p_kind: kind, p_limit: pageSize, p_offset: page * pageSize });
  }
  listFriendRequests() {
    return this.rpc<{ incoming: T.FriendRequest[]; outgoing: T.FriendRequest[] }>('list_friend_requests');
  }
  sendFriendRequest(userId: string) {
    return this.rpc<{ status: 'pending' | 'friends'; unlocked: T.UnlockedAchievement[] }>('send_friend_request', { p_target: userId });
  }
  async respondFriendRequest(requestId: string, accept: boolean) {
    await this.rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept });
  }
  async cancelFriendRequest(requestId: string) {
    await this.rpc('cancel_friend_request', { p_request_id: requestId });
  }
  async removeFriend(userId: string) {
    await this.rpc('remove_friend', { p_target: userId });
  }
  follow(userId: string) {
    return this.rpc<{ followed_back: boolean }>('follow_user', { p_target: userId });
  }
  async unfollow(userId: string) {
    await this.rpc('unfollow_user', { p_target: userId });
  }
  async block(userId: string) {
    await this.rpc('block_user', { p_target: userId });
  }
  async unblock(userId: string) {
    await this.rpc('unblock_user', { p_target: userId });
  }
  listBlocked() {
    return this.rpc<(T.PlayerCard & { since: string })[]>('list_blocked_users');
  }
  async report(userId: string, reason: string, details: string) {
    await this.rpc('report_user', { p_target: userId, p_reason: reason, p_details: details });
  }
  getFeed(limit = 40) {
    return this.rpc<T.FeedEvent[]>('get_feed', { p_limit: limit });
  }
  getUserActivity(userId: string) {
    return this.rpc<T.FeedEvent[]>('get_user_activity', { p_user: userId, p_limit: 30 });
  }

  // ── developer ─────────────────────────────────────────────────────────
  getAccess() {
    return this.rpc<{ is_developer: boolean; role: 'developer' | 'owner' | null }>('get_my_access');
  }

  readonly admin: AdminApi = {
    searchAccounts: (query, filter, page, pageSize) =>
      this.rpc('admin_search_accounts', { p_query: query, p_filter: filter, p_limit: pageSize, p_offset: page * pageSize }),
    getAccount: (userId) => this.rpc('admin_get_account', { p_user_id: userId }),
    listInventory: (userId) => this.rpc('admin_list_inventory', { p_user_id: userId }),
    listTransactions: (userId, kind, page, pageSize) =>
      this.rpc('admin_list_transactions', { p_user_id: userId, p_kind: kind, p_limit: pageSize, p_offset: page * pageSize }),
    listActivity: (userId) => this.rpc('admin_list_activity', { p_user_id: userId, p_limit: 50 }),
    adjustBalance: (userId, delta, reason, key) =>
      this.rpc('admin_adjust_balance', { p_user_id: userId, p_delta: delta, p_reason: reason, p_idempotency_key: key }),
    setBalance: (userId, balance, reason, key) =>
      this.rpc('admin_set_balance', { p_user_id: userId, p_balance: balance, p_reason: reason, p_idempotency_key: key }),
    updateProfile: (userId, username, displayName, bio, reason) =>
      this.rpc('admin_update_profile', { p_user_id: userId, p_username: username, p_display_name: displayName, p_bio: bio, p_reason: reason }),
    setStats: (userId, level, xp, reputation, reason) =>
      this.rpc('admin_set_stats', { p_user_id: userId, p_level: level, p_xp: xp, p_reputation: reputation, p_reason: reason }),
    setFlags: (userId, isTest, status, reason) =>
      this.rpc('admin_set_account_flags', { p_user_id: userId, p_is_test_account: isTest, p_account_status: status, p_reason: reason }),
    addNpcFollowers: (userId, count, reason) => this.rpc('admin_add_npc_followers', { p_user_id: userId, p_count: count, p_reason: reason }),
    grantItem: (userId, itemId, reason) => this.rpc('admin_grant_item', { p_user_id: userId, p_item_id: itemId, p_reason: reason }),
    grantSet: (userId, setKey, reason) => this.rpc('admin_grant_set', { p_user_id: userId, p_set_key: setKey, p_reason: reason }),
    revokeItem: async (inventoryItemId, reason) => {
      await this.rpc('admin_revoke_item', { p_inventory_item_id: inventoryItemId, p_reason: reason });
    },
    grantPass: async (userId, passId, reason) => {
      await this.rpc('admin_grant_pass', { p_user_id: userId, p_pass_id: passId, p_reason: reason });
    },
    revokePass: async (userId, passId, reason) => {
      await this.rpc('admin_revoke_pass', { p_user_id: userId, p_pass_id: passId, p_reason: reason });
    },
    listReports: (status) => this.rpc('admin_list_reports', { p_status: status, p_limit: 100 }),
    resolveReport: async (reportId, status, reason) => {
      await this.rpc('admin_resolve_report', { p_report_id: reportId, p_status: status, p_reason: reason });
    },
    setRole: (userId, role, reason) => this.rpc('admin_set_developer_role', { p_user_id: userId, p_role: role, p_reason: reason }),
    auditLogs: (page, pageSize, targetUser) =>
      this.rpc('admin_list_audit_logs', { p_limit: pageSize, p_offset: page * pageSize, p_target_user: targetUser ?? null, p_action: null }),
    systemStatus: () => this.rpc('admin_system_status'),
    diagnostics: () => this.rpc('admin_run_diagnostics'),
    catalogLookup: (query) => this.rpc('admin_catalog_lookup', { p_query: query }),
  };
}
