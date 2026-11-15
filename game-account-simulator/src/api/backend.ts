import type * as T from './types';

export type AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'PASSWORD_RECOVERY' | 'USER_UPDATED' | 'SESSION_EXPIRED';

export interface SessionInfo {
  userId: string;
  email: string | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

/**
 * The one contract every screen talks to. Two implementations:
 *  - SupabaseBackend (online, server-authoritative)
 *  - LocalBackend (offline demo, on-device)
 */
export interface Backend {
  readonly mode: 'online' | 'offline';

  // ── Auth ──────────────────────────────────────────────────────────────
  getSession(): Promise<SessionInfo | null>;
  onAuthChange(cb: (event: AuthEvent, session: SessionInfo | null) => void): () => void;
  checkUsername(username: string): Promise<{ available: boolean; reason: string | null }>;
  signUp(input: SignUpInput): Promise<{ needsEmailConfirmation: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  verifyRecoveryCode(email: string, code: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  resendConfirmation(email: string): Promise<void>;

  // ── Account ───────────────────────────────────────────────────────────
  getMe(): Promise<T.Me>;
  touchPresence(): Promise<void>;
  updateProfile(input: { display_name: string; bio: string; status_text: string; profile_theme: string }): Promise<void>;
  changeUsername(newUsername: string, idempotencyKey: string): Promise<{ username: string; cost: number } & T.EconomyState>;
  updateSettings(patch: Partial<T.Settings>): Promise<T.Settings>;
  claimDailyReward(): Promise<T.DailyClaimResult>;
  getDailyQuests(): Promise<T.DailyQuests>;
  claimQuest(key: string): Promise<{ reward: number; unlocked: T.UnlockedAchievement[] } & T.EconomyState>;
  getAchievements(): Promise<T.AchievementProgress[]>;
  getAnalytics(): Promise<T.Analytics>;
  listTransactions(page: number, pageSize: number, kind?: T.TxnKind | null): Promise<T.Transaction[]>;
  listNotifications(page: number, pageSize: number): Promise<T.AppNotification[]>;
  markNotificationsRead(ids?: string[]): Promise<void>;
  deleteNotification(id: string): Promise<void>;

  // ── Marketplace & inventory ───────────────────────────────────────────
  getCatalog(): Promise<T.CatalogItem[]>;
  getItemSets(): Promise<T.ItemSet[]>;
  searchCatalog(q: T.CatalogQuery): Promise<{ items: T.CatalogItem[]; hasMore: boolean }>;
  getItem(id: string): Promise<T.ItemDetail>;
  purchaseItem(id: string, expectedPrice: number, idempotencyKey: string): Promise<T.PurchaseResult>;
  toggleItemFavorite(id: string): Promise<{ favorited: boolean; favorites_count: number }>;
  listFavoriteItemIds(): Promise<string[]>;
  listInventory(userId: string): Promise<T.InventoryEntry[]>;
  getSetClaims(): Promise<string[]>;

  // ── Avatar ────────────────────────────────────────────────────────────
  saveAvatar(config: T.AvatarConfig): Promise<T.AvatarConfig>;
  listOutfits(): Promise<T.Outfit[]>;
  saveOutfit(name: string, config: T.AvatarConfig, isPublic: boolean): Promise<{ id: string; unlocked: T.UnlockedAchievement[] }>;
  updateOutfit(id: string, name: string, isPublic: boolean, config?: T.AvatarConfig): Promise<void>;
  deleteOutfit(id: string): Promise<void>;
  wearOutfit(id: string): Promise<{ status: 'ok' | 'missing_items'; missing: { item_id: string; name: string; price: number }[] }>;

  // ── Games ─────────────────────────────────────────────────────────────
  getDiscover(): Promise<T.Discover>;
  getGame(id: string): Promise<T.GameDetail>;
  getLeaderboard(gameId: string, limit?: number): Promise<T.Leaderboard>;
  rateGame(gameId: string, vote: 1 | -1 | null): Promise<{ my_vote: 1 | -1 | null; likes: number; dislikes: number }>;
  toggleGameFavorite(gameId: string): Promise<{ favorited: boolean; favorites: number }>;
  listGamePasses(): Promise<T.GamePassListing[]>;
  purchaseGamePass(passId: string, expectedPrice: number, idempotencyKey: string): Promise<{ status: string; unlocked: T.UnlockedAchievement[] } & T.EconomyState>;
  startGameSession(gameId: string): Promise<T.GameSession>;
  submitGameScore(sessionId: string, score: number, durationMs: number, stats: Record<string, unknown>): Promise<T.ScoreResult>;

  // ── Social ────────────────────────────────────────────────────────────
  getProfile(username: string): Promise<T.PublicProfile>;
  searchUsers(query: string): Promise<(T.PlayerCard & { is_friend: boolean; followers: number })[]>;
  listConnections(userId: string, kind: 'friends' | 'followers' | 'following', page: number, pageSize: number): Promise<T.Connection[]>;
  listFriendRequests(): Promise<{ incoming: T.FriendRequest[]; outgoing: T.FriendRequest[] }>;
  sendFriendRequest(userId: string): Promise<{ status: 'pending' | 'friends'; unlocked: T.UnlockedAchievement[] }>;
  respondFriendRequest(requestId: string, accept: boolean): Promise<void>;
  cancelFriendRequest(requestId: string): Promise<void>;
  removeFriend(userId: string): Promise<void>;
  follow(userId: string): Promise<{ followed_back: boolean }>;
  unfollow(userId: string): Promise<void>;
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  listBlocked(): Promise<(T.PlayerCard & { since: string })[]>;
  report(userId: string, reason: string, details: string): Promise<void>;
  getFeed(limit?: number): Promise<T.FeedEvent[]>;
  getUserActivity(userId: string): Promise<T.FeedEvent[]>;

  // ── Developer (server-authorized; offline backend always refuses) ─────
  getAccess(): Promise<{ is_developer: boolean; role: 'developer' | 'owner' | null }>;
  admin: AdminApi;
}

export interface AdminApi {
  searchAccounts(query: string, filter: string, page: number, pageSize: number): Promise<{ total: number; accounts: T.AdminAccountRow[] }>;
  getAccount(userId: string): Promise<T.AdminAccountDetail>;
  listInventory(userId: string): Promise<T.AdminInventoryRow[]>;
  listTransactions(userId: string | null, kind: string | null, page: number, pageSize: number): Promise<T.AdminTransactionRow[]>;
  listActivity(userId: string): Promise<T.FeedEvent[]>;
  adjustBalance(userId: string, delta: number, reason: string, key: string): Promise<{ balance: number; duplicate: boolean }>;
  setBalance(userId: string, balance: number, reason: string, key: string): Promise<{ balance: number; duplicate: boolean }>;
  updateProfile(userId: string, username: string | null, displayName: string | null, bio: string | null, reason: string): Promise<T.AdminAccountRow>;
  setStats(userId: string, level: number | null, xp: number | null, reputation: number | null, reason: string): Promise<T.AdminAccountRow>;
  setFlags(userId: string, isTest: boolean | null, status: 'active' | 'suspended' | null, reason: string): Promise<T.AdminAccountRow>;
  addNpcFollowers(userId: string, count: number, reason: string): Promise<{ added: number; followers: number }>;
  grantItem(userId: string, itemId: string, reason: string): Promise<{ serial_number: number | null }>;
  grantSet(userId: string, setKey: string, reason: string): Promise<{ granted: number }>;
  revokeItem(inventoryItemId: string, reason: string): Promise<void>;
  grantPass(userId: string, passId: string, reason: string): Promise<void>;
  revokePass(userId: string, passId: string, reason: string): Promise<void>;
  listReports(status: string | null): Promise<T.AdminReport[]>;
  resolveReport(reportId: string, status: 'reviewed' | 'dismissed', reason: string): Promise<void>;
  setRole(userId: string, role: 'developer' | 'owner' | null, reason: string): Promise<T.AdminAccountRow>;
  auditLogs(page: number, pageSize: number, targetUser?: string | null): Promise<T.AuditLogRow[]>;
  systemStatus(): Promise<T.SystemStatus>;
  diagnostics(): Promise<{ ran_at: string; checks: T.DiagnosticCheck[] }>;
  catalogLookup(query: string): Promise<T.AdminCatalogLookup>;
}
