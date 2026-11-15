-- Larpverse initial schema.
-- All timestamps are integer milliseconds since the Unix epoch.
-- JSON columns hold UTF-8 JSON text and are validated by the server before writing.

-- ───────────────────────── Identity & access ─────────────────────────

CREATE TABLE users (
  id                  INTEGER PRIMARY KEY,
  username            TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash       TEXT    NOT NULL,
  staff_role          TEXT    NOT NULL DEFAULT 'user'
                      CHECK (staff_role IN ('owner','admin','moderator','user')),
  status              TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  mfa_secret          TEXT,
  mfa_enabled         INTEGER NOT NULL DEFAULT 0 CHECK (mfa_enabled IN (0,1)),
  failed_logins       INTEGER NOT NULL DEFAULT 0,
  locked_until        INTEGER,
  created_at          INTEGER NOT NULL,
  last_login_at       INTEGER,
  password_changed_at INTEGER
);

-- Default permission set for each staff role.
CREATE TABLE role_permissions (
  staff_role TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (staff_role, permission)
);

-- Per-user grants (granted = 1) or revocations (granted = 0) layered on top of the role.
CREATE TABLE user_permission_overrides (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT    NOT NULL,
  granted    INTEGER NOT NULL CHECK (granted IN (0,1)),
  PRIMARY KEY (user_id, permission)
);

CREATE TABLE files (
  id            INTEGER PRIMARY KEY,
  public_id     TEXT    NOT NULL UNIQUE,
  owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  mime          TEXT    NOT NULL,
  size          INTEGER NOT NULL,
  sha256        TEXT    NOT NULL,
  storage_name  TEXT    NOT NULL,
  purpose       TEXT    NOT NULL,
  created_at    INTEGER NOT NULL
);

-- Platform accounts (personas). A login user owns one primary account and may own more
-- (alternates, or fictional accounts created by staff for roleplay scenarios).
CREATE TABLE accounts (
  id             INTEGER PRIMARY KEY,
  owner_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name   TEXT    NOT NULL,
  is_fictional   INTEGER NOT NULL DEFAULT 0 CHECK (is_fictional IN (0,1)),
  is_primary     INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  status         TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  last_online_at INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX idx_accounts_owner ON accounts(owner_user_id);

CREATE TABLE auth_sessions (
  id                INTEGER PRIMARY KEY,
  token_hash        TEXT    NOT NULL UNIQUE,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acting_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  device_name       TEXT,
  ip                TEXT,
  user_agent        TEXT,
  created_at        INTEGER NOT NULL,
  last_seen_at      INTEGER NOT NULL,
  expires_at        INTEGER NOT NULL,
  elevated_until    INTEGER,
  revoked_at        INTEGER
);
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);

-- Short-lived tokens for the second login step when two-step verification is on.
CREATE TABLE mfa_challenges (
  token_hash TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  attempts   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE login_history (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  username   TEXT    NOT NULL,
  success    INTEGER NOT NULL,
  reason     TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_login_history_user ON login_history(user_id, created_at DESC);

CREATE TABLE profiles (
  account_id         INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  bio                TEXT    NOT NULL DEFAULT '',
  status_text        TEXT    NOT NULL DEFAULT '',
  announcement       TEXT,
  picture_file_id    INTEGER REFERENCES files(id) ON DELETE SET NULL,
  banner_color       TEXT    NOT NULL DEFAULT '#6d4aff',
  join_date_override INTEGER,
  -- Staged display statistics, e.g. {"followers": 125000, "visits": 2000000, "presence": "online"}.
  stat_overrides     TEXT    NOT NULL DEFAULT '{}',
  showcase_item_ids  TEXT    NOT NULL DEFAULT '[]',
  username_changed_at INTEGER
);

CREATE TABLE account_settings (
  account_id    INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  privacy       TEXT NOT NULL DEFAULT '{}',
  notifications TEXT NOT NULL DEFAULT '{}',
  preferences   TEXT NOT NULL DEFAULT '{}'
);

-- ───────────────────────── Fictional economy ─────────────────────────

CREATE TABLE wallets (
  account_id      INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  balance         INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0 AND balance <= 1000000000000),
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  lifetime_spent  INTEGER NOT NULL DEFAULT 0,
  last_daily_at   INTEGER,
  updated_at      INTEGER NOT NULL
);

-- Append-only ledger. Every balance change writes exactly one row in the same transaction.
CREATE TABLE transactions (
  id                      INTEGER PRIMARY KEY,
  account_id              INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount                  INTEGER NOT NULL,
  balance_after           INTEGER NOT NULL,
  type                    TEXT    NOT NULL,
  description             TEXT    NOT NULL,
  counterparty_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  reference_type          TEXT,
  reference_id            INTEGER,
  is_scripted             INTEGER NOT NULL DEFAULT 0,
  created_by_user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at              INTEGER NOT NULL
);
CREATE INDEX idx_transactions_account ON transactions(account_id, id DESC);

-- ───────────────────────── Marketplace & inventory ─────────────────────────

CREATE TABLE items (
  id                 INTEGER PRIMARY KEY,
  sku                TEXT    NOT NULL UNIQUE,
  name               TEXT    NOT NULL,
  description        TEXT    NOT NULL DEFAULT '',
  category           TEXT    NOT NULL CHECK (category IN
                       ('hat','hair','face','accessory','shirt','pants','bundle',
                        'animation','emote','collectible','special')),
  slot               TEXT    NOT NULL,
  asset              TEXT    NOT NULL DEFAULT '{}',
  price              INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  rarity             TEXT    NOT NULL DEFAULT 'common'
                       CHECK (rarity IN ('common','uncommon','rare','epic','legendary','mythic')),
  is_limited         INTEGER NOT NULL DEFAULT 0,
  stock              INTEGER CHECK (stock IS NULL OR stock >= 0),
  sold_count         INTEGER NOT NULL DEFAULT 0,
  on_sale            INTEGER NOT NULL DEFAULT 1,
  is_featured        INTEGER NOT NULL DEFAULT 0,
  is_archived        INTEGER NOT NULL DEFAULT 0,
  creator_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  thumbnail_file_id  INTEGER REFERENCES files(id) ON DELETE SET NULL,
  tags               TEXT    NOT NULL DEFAULT '[]',
  bundle_item_ids    TEXT    NOT NULL DEFAULT '[]',
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE INDEX idx_items_category ON items(category);

CREATE TABLE item_favorites (
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, item_id)
);

CREATE TABLE purchases (
  id                    INTEGER PRIMARY KEY,
  account_id            INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id               INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  price_paid            INTEGER NOT NULL,
  transaction_id        INTEGER REFERENCES transactions(id),
  creator_transaction_id INTEGER REFERENCES transactions(id),
  status                TEXT    NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','refunded')),
  created_at            INTEGER NOT NULL,
  refunded_at           INTEGER,
  refund_transaction_id INTEGER REFERENCES transactions(id)
);
CREATE INDEX idx_purchases_account ON purchases(account_id, id DESC);

CREATE TABLE inventory (
  id            INTEGER PRIMARY KEY,
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  source        TEXT    NOT NULL,
  source_ref    INTEGER,
  serial_number INTEGER,
  acquired_at   INTEGER NOT NULL,
  UNIQUE (account_id, item_id)
);

CREATE TABLE inventory_history (
  id         INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  action     TEXT    NOT NULL,
  source     TEXT,
  details    TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_inventory_history ON inventory_history(account_id, item_id);

-- ───────────────────────── Avatar ─────────────────────────

CREATE TABLE avatars (
  account_id  INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  body_colors TEXT    NOT NULL,
  body_type   TEXT    NOT NULL DEFAULT 'classic',
  updated_at  INTEGER NOT NULL
);

CREATE TABLE avatar_equipped (
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  slot        TEXT    NOT NULL,
  equipped_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, item_id)
);

CREATE TABLE outfits (
  id         INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  data       TEXT    NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ───────────────────────── Social ─────────────────────────

-- One row per unordered pair; account_a < account_b.
CREATE TABLE friendships (
  id           INTEGER PRIMARY KEY,
  account_a    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  account_b    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  requester_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  status       TEXT    NOT NULL CHECK (status IN ('pending','accepted')),
  created_at   INTEGER NOT NULL,
  responded_at INTEGER,
  CHECK (account_a < account_b),
  UNIQUE (account_a, account_b)
);
CREATE INDEX idx_friendships_b ON friendships(account_b);

CREATE TABLE follows (
  follower_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  followee_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX idx_follows_followee ON follows(followee_id);

CREATE TABLE notifications (
  id               INTEGER PRIMARY KEY,
  account_id       INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type             TEXT    NOT NULL,
  title            TEXT    NOT NULL,
  body             TEXT    NOT NULL DEFAULT '',
  data             TEXT    NOT NULL DEFAULT '{}',
  actor_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  is_scripted      INTEGER NOT NULL DEFAULT 0,
  read_at          INTEGER,
  created_at       INTEGER NOT NULL
);
CREATE INDEX idx_notifications_account ON notifications(account_id, id DESC);

CREATE TABLE user_groups (
  id                    INTEGER PRIMARY KEY,
  name                  TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  description           TEXT    NOT NULL DEFAULT '',
  owner_account_id      INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  emblem                TEXT    NOT NULL DEFAULT '{}',
  is_public             INTEGER NOT NULL DEFAULT 1,
  member_count_override INTEGER,
  shout                 TEXT,
  shout_at              INTEGER,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);

CREATE TABLE group_members (
  group_id   INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  rank       TEXT    NOT NULL CHECK (rank IN ('owner','admin','member','pending')),
  joined_at  INTEGER NOT NULL,
  PRIMARY KEY (group_id, account_id)
);
CREATE INDEX idx_group_members_account ON group_members(account_id);

CREATE TABLE group_posts (
  id         INTEGER PRIMARY KEY,
  group_id   INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  body       TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_group_posts ON group_posts(group_id, id DESC);

-- ───────────────────────── Badges ─────────────────────────

CREATE TABLE badges (
  id                  INTEGER PRIMARY KEY,
  key                 TEXT    NOT NULL UNIQUE,
  name                TEXT    NOT NULL,
  description         TEXT    NOT NULL DEFAULT '',
  icon                TEXT    NOT NULL DEFAULT 'star',
  color               TEXT    NOT NULL DEFAULT '#8b5cf6',
  kind                TEXT    NOT NULL CHECK (kind IN ('system','awarded','custom')),
  required_staff_role TEXT,
  perks               TEXT    NOT NULL DEFAULT '{}',
  sort                INTEGER NOT NULL DEFAULT 100,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE TABLE account_badges (
  account_id         INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  badge_id           INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  label_override     TEXT,
  awarded_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  awarded_at         INTEGER NOT NULL,
  PRIMARY KEY (account_id, badge_id)
);

-- ───────────────────────── Experiences ─────────────────────────

CREATE TABLE experiences (
  id                  INTEGER PRIMARY KEY,
  name                TEXT    NOT NULL,
  description         TEXT    NOT NULL DEFAULT '',
  creator_account_id  INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  creator_group_id    INTEGER REFERENCES user_groups(id) ON DELETE SET NULL,
  genre               TEXT    NOT NULL DEFAULT 'roleplay',
  art                 TEXT    NOT NULL DEFAULT '{}',
  thumbnail_file_id   INTEGER REFERENCES files(id) ON DELETE SET NULL,
  engine              TEXT    NOT NULL DEFAULT 'larp' CHECK (engine IN ('larp','showcase')),
  default_scenario_id INTEGER,
  max_players         INTEGER NOT NULL DEFAULT 12,
  is_featured         INTEGER NOT NULL DEFAULT 0,
  status              TEXT    NOT NULL DEFAULT 'public' CHECK (status IN ('public','private','archived')),
  visits              INTEGER NOT NULL DEFAULT 0,
  likes               INTEGER NOT NULL DEFAULT 0,
  dislikes            INTEGER NOT NULL DEFAULT 0,
  favorites_override  INTEGER,
  active_override     INTEGER,
  created_at          INTEGER NOT NULL,
  updated_at          INTEGER NOT NULL
);

CREATE TABLE experience_favorites (
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  created_at    INTEGER NOT NULL,
  PRIMARY KEY (account_id, experience_id)
);

CREATE TABLE experience_votes (
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  vote          INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at    INTEGER NOT NULL,
  PRIMARY KEY (account_id, experience_id)
);

CREATE TABLE play_history (
  id            INTEGER PRIMARY KEY,
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  experience_id INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  session_id    INTEGER,
  started_at    INTEGER NOT NULL,
  ended_at      INTEGER
);
CREATE INDEX idx_play_history ON play_history(account_id, started_at DESC);

-- ───────────────────────── LARP game ─────────────────────────

CREATE TABLE game_roles (
  id              INTEGER PRIMARY KEY,
  key             TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  color           TEXT    NOT NULL DEFAULT '#64748b',
  icon            TEXT    NOT NULL DEFAULT 'user',
  permissions     TEXT    NOT NULL DEFAULT '[]',
  salary          INTEGER NOT NULL DEFAULT 10 CHECK (salary >= 0),
  work_zone       TEXT,
  max_per_session INTEGER,
  is_default      INTEGER NOT NULL DEFAULT 0,
  host_only       INTEGER NOT NULL DEFAULT 0,
  sort            INTEGER NOT NULL DEFAULT 100,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE TABLE scenarios (
  id          INTEGER PRIMARY KEY,
  key         TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  config      TEXT    NOT NULL DEFAULT '{}',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

CREATE TABLE game_items (
  id          INTEGER PRIMARY KEY,
  key         TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  icon        TEXT    NOT NULL DEFAULT 'box',
  price       INTEGER NOT NULL DEFAULT 10 CHECK (price >= 0),
  sold_in     TEXT,
  effect      TEXT    NOT NULL DEFAULT '{}',
  created_at  INTEGER NOT NULL
);

CREATE TABLE characters (
  id             INTEGER PRIMARY KEY,
  account_id     INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL,
  bio            TEXT    NOT NULL DEFAULT '',
  appearance     TEXT    NOT NULL DEFAULT '{}',
  stats          TEXT    NOT NULL DEFAULT '{}',
  cash           INTEGER NOT NULL DEFAULT 0 CHECK (cash >= 0),
  favorite_role_id INTEGER REFERENCES game_roles(id) ON DELETE SET NULL,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL,
  last_played_at INTEGER
);
CREATE INDEX idx_characters_account ON characters(account_id);

CREATE TABLE character_inventory (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  game_item_id INTEGER NOT NULL REFERENCES game_items(id) ON DELETE CASCADE,
  quantity     INTEGER NOT NULL CHECK (quantity >= 0),
  PRIMARY KEY (character_id, game_item_id)
);

CREATE TABLE larp_sessions (
  id              INTEGER PRIMARY KEY,
  experience_id   INTEGER NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
  scenario_id     INTEGER NOT NULL REFERENCES scenarios(id),
  host_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  name            TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','active','paused','ended')),
  privacy         TEXT    NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','friends','private')),
  access_code     TEXT,
  max_players     INTEGER NOT NULL DEFAULT 12,
  settings        TEXT    NOT NULL DEFAULT '{}',
  state           TEXT,
  summary         TEXT,
  created_at      INTEGER NOT NULL,
  started_at      INTEGER,
  ended_at        INTEGER
);
CREATE INDEX idx_larp_sessions_status ON larp_sessions(status);

CREATE TABLE session_participants (
  session_id   INTEGER NOT NULL REFERENCES larp_sessions(id) ON DELETE CASCADE,
  account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE SET NULL,
  role_id      INTEGER REFERENCES game_roles(id) ON DELETE SET NULL,
  is_host      INTEGER NOT NULL DEFAULT 0,
  is_bot       INTEGER NOT NULL DEFAULT 0,
  status       TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active','left','kicked')),
  stats        TEXT    NOT NULL DEFAULT '{}',
  joined_at    INTEGER NOT NULL,
  left_at      INTEGER,
  PRIMARY KEY (session_id, account_id)
);

CREATE TABLE session_log (
  id               INTEGER PRIMARY KEY,
  session_id       INTEGER NOT NULL REFERENCES larp_sessions(id) ON DELETE CASCADE,
  kind             TEXT    NOT NULL,
  actor_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  payload          TEXT    NOT NULL DEFAULT '{}',
  created_at       INTEGER NOT NULL
);
CREATE INDEX idx_session_log ON session_log(session_id, id);

-- ───────────────────────── Scripted events, presets, audit ─────────────────────────

CREATE TABLE scripted_events (
  id                 INTEGER PRIMARY KEY,
  name               TEXT    NOT NULL,
  description        TEXT    NOT NULL DEFAULT '',
  scope              TEXT    NOT NULL CHECK (scope IN ('platform','game')),
  type               TEXT    NOT NULL,
  params             TEXT    NOT NULL DEFAULT '{}',
  run_count          INTEGER NOT NULL DEFAULT 0,
  last_run_at        INTEGER,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);

CREATE TABLE event_runs (
  id                   INTEGER PRIMARY KEY,
  event_id             INTEGER REFERENCES scripted_events(id) ON DELETE CASCADE,
  triggered_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  target               TEXT    NOT NULL DEFAULT '{}',
  result               TEXT    NOT NULL DEFAULT '{}',
  created_at           INTEGER NOT NULL
);

CREATE TABLE presets (
  id                 INTEGER PRIMARY KEY,
  name               TEXT    NOT NULL,
  kind               TEXT    NOT NULL,
  description        TEXT    NOT NULL DEFAULT '',
  data               TEXT    NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);

-- Delayed work, e.g. scripted notifications scheduled N seconds into a recording.
CREATE TABLE scheduled_jobs (
  id         INTEGER PRIMARY KEY,
  run_at     INTEGER NOT NULL,
  kind       TEXT    NOT NULL,
  payload    TEXT    NOT NULL,
  done_at    INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_scheduled_jobs ON scheduled_jobs(done_at, run_at);

CREATE TABLE audit_logs (
  id                INTEGER PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  acting_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  action            TEXT    NOT NULL,
  target_type       TEXT,
  target_id         INTEGER,
  details           TEXT    NOT NULL DEFAULT '{}',
  ip                TEXT,
  created_at        INTEGER NOT NULL
);
CREATE INDEX idx_audit_logs ON audit_logs(id DESC);

CREATE TABLE system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
