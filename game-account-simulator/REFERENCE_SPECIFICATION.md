# Reference Specification

**Product:** Blockora — an independent, unofficial game-platform simulator for Android.
**Purpose of this document:** record what was learned from the two reference products, separate verified facts from assumptions, and state how Blockora implements (or deliberately diverges from) each concept.

> Blockora is not affiliated with, endorsed by, or connected to Roblox Corporation or zlarp.com. No Roblox code, art, sounds, trademarks or interface layouts are used. "Orbs", Blockora's currency, are simulated points with no monetary value and cannot be bought, sold, or exchanged for Robux or money.

---

## 0. Research method and its limits (read first)

| Source | Access from the build environment | How it was researched |
|---|---|---|
| roblox.com, create.roblox.com, en.help.roblox.com | **Blocked** by the build sandbox's network policy (HTTP 403 on CONNECT, DNS failure from the fetch tool) | Web-search result summaries of official Roblox help-center, Creator Hub and DevForum pages (URLs cited below) |
| zlarp.com/apps/game-account-simulator | **Blocked** the same way | Web-search result summaries of zlarp.com's own pages (URLs cited below) |

Consequences:

* Facts marked **Verified** come from search-indexed text of the cited official pages. Page ages were reported by the search tool; several Roblox pages were 1–2 years old, so details can have changed.
* Facts marked **Assumed** come from general product knowledge and were **not** re-verified for this document. They are used only as functional inspiration, never as a claim about the current product.
* Nothing was copied: no screenshots, assets, code or exact layouts were available or used.

---

## 1. Reference A — Roblox (functional findings)

### 1.1 Verified

| Area | Finding | Source |
|---|---|---|
| Display names | A display name can be changed **once every 7 days**; display names need not be unique; they must follow community rules or are reset to the username. | [Changing Your Display Name](https://en.help.roblox.com/hc/en-us/articles/4401938870292-Changing-Your-Display-Name) |
| Display names | Display-name length 3–20 characters (stated in the 2021 launch announcement; not confirmed on the current help page). | [Say "Hello" to Display Names!](https://devforum.roblox.com/t/say-hello-to-display-names/1036435) |
| Friends / Connections | Friend limit raised from **200 to 1,000** (Jan 2025); block limit raised from 100 to 1,000. | [Updating Friends API](https://devforum.roblox.com/t/updating-friends-api-deprecating-isonline-property-from-getfriendsasync/3171177) |
| Friends / Connections | "Friends" was renamed "Connections" in 2025 with "Trusted Connections" (13+); a later announcement renamed them back to "Friends" / "Trusted Friends". | [Trusted Connections](https://devforum.roblox.com/t/connecting-with-confidence-on-roblox-introducing-trusted-connections-age-estimation-and-privacy-tools/3820020), [Friends Are Back!](https://devforum.roblox.com/t/friends-are-back-expanding-trusted-friends-for-a-new-way-to-chat-and-play/4554217) |
| Marketplace | User-generated avatar items include clothing, accessories and other digital items; developer products include in-game currency and **game passes**. Acquired items are for personal entertainment inside the platform. | [Roblox Terms of Use](https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use) |
| Game passes | Ownership is checked by the experience (`UserOwnsGamePassAsync`); the experience must grant the perk itself; passes are promoted based on play history and **not shown to users who already own them**. | [Passes](https://create.roblox.com/docs/production/monetization/passes) |
| Avatar | Body scale presets (Normal / Slender / Classic) and height ranges; skin tone set with one pick or per-body-part in an Advanced mode; classic 2D clothing vs. layered 3D clothing (shirts, pants, shorts, dresses, shoes, full-body); emotes are triggered social animations. | [Character appearance](https://create.roblox.com/docs/characters/appearance), [Customizing Your Avatar](https://en.help.roblox.com/hc/en-us/articles/203313600-Browser-Customizing-Your-Avatar), [Marketplace asset categories](https://create.roblox.com/docs/marketplace/categories) |
| Discovery | Home "Recommended for You" uses a two-stage retrieval + personalized ranking pipeline driven by engagement, retention and monetization signals. Home also has Continue Playing, Friends, Sponsored and Curated sorts. Charts/Discover show top & trending sorts by genre; genre is shown on the experience page; experience pages have an Events section. | [Discovery](https://create.roblox.com/docs/discovery), [Genres](https://create.roblox.com/docs/production/publishing/experience-genres) |
| Profiles | Profiles have an "About"/blurb and customization options. | [All About Profiles, Blurbs, and Profile Customization](https://en.help.roblox.com/hc/en-us/articles/203313660-All-About-Profiles-Blurbs-and-Profile-Customization) |
| Badges | Platform-awarded badges and experience-awarded badges are listed on a profile (old article). | search summary of an older help-center badge article |

### 1.2 Assumed (general knowledge, not re-verified)

* Usernames are unique, 3–20 characters, letters/digits/one underscore, and changing one costs premium currency.
* Profile shows avatar, display name, @username, friends / followers / following counts, "About", favorite experiences, a collection/showcase, and badges.
* Marketplace supports search, category filters, sort (relevance, price, recently updated, bestselling), item pages with price, creator, description, favorites and purchase confirmation; "limited" items have fixed stock and serial numbers and a resale value history.
* Avatar editor: category tabs (recent, characters, clothing, accessories, head & body, animations), equipped state, saved outfits ("Creations"/outfits), body colors and scales.
* Notifications for friend requests, followers, purchases; privacy settings controlling who can message, join, see inventory.
* Experience page: title, creator, thumbnails, description, active players, visits, favorites, likes/dislikes, game passes, servers, badges.

---

## 2. Reference B — zlarp Game Account Simulator

### 2.1 Verified (from zlarp.com's own pages, via search summaries)

| Finding | Source |
|---|---|
| zlarp sells **simulator web apps for content creators** — props for videos, skits, photos and live demos. It is explicitly unrelated to live-action roleplay. | [zlarp.com](https://zlarp.com/), [How it works](https://zlarp.com/how-it-works) |
| The Game Account Simulator simulates a game account profile with an **avatar, inventory and followers that the user sets**, and lets the user change **username, in-game coins and friends**. | [Game Account Simulator](https://zlarp.com/apps/game-account-simulator) |
| A separate zlarp "Roblox Simulator" lists editable **username, currency balance, friends, followers, inventory items, avatar outfit, displayed games, profile and badges**. | [zlarp Roblox Simulator](https://zlarp.com/apps/roblox) |
| Values are edited in a hidden panel called **"Backstage"**. There is deliberately **no visible button**; on a phone you **press and hold the top of the screen ~1 s** and the panel slides up. **Everything saves as you type.** | [How it works](https://zlarp.com/blog/how-it-works) |
| The panel **cannot create transactions, statements or receipts**; no zlarp app can hold, send or receive real money. | [How it works](https://zlarp.com/how-it-works), [How we keep zlarp fun](https://zlarp.com/blog/how-we-keep-zlarp-fun) |
| Platforms: product page says iOS & Android, desktop & mobile browsers. Price listed as $10 / $10 per month / $9 on different pages (inconsistent). | [Game Account Simulator](https://zlarp.com/apps/game-account-simulator), [Developers](https://zlarp.com/developers) |
| zlarp states its apps are not made by or affiliated with the brands they resemble. | [zlarp Roblox Simulator](https://zlarp.com/apps/roblox) |

### 2.2 Not verified / unknown

* The exact field list, layout and validation of the Backstage panel.
* Whether values persist server-side, sync across devices, or are local-only.
* Whether any gameplay, marketplace purchasing or social interaction exists (the pages describe a display prop, not a playable platform).

---

## 3. Key differences and design stance

| Aspect | Roblox | zlarp simulator | **Blockora** |
|---|---|---|---|
| Nature | Real platform, real economy | Visual prop with editable numbers | Self-contained simulated platform with **real, working systems** (economy, marketplace, social, games) over simulated data |
| Currency | Robux (real money) | "in-game coins", display-only | **Orbs**: earned through play, rewards and quests; spent in the marketplace; full server-side ledger. Always labelled simulated; never purchasable with money |
| Account editing | Official settings only | Hidden "Backstage" (long-press), saves as you type, local display values | **Modify Menu**: developer-only, **authorized server-side** (`developer_roles` table + `SECURITY DEFINER` RPCs), every change validated, ledgered and **audit-logged with a reason** |
| Hidden entry | n/a | Hidden gesture is the access control | Hidden entry exists only for tidiness (long-press version label in Settings); it is **not** the access control. The entry is not even rendered unless the server confirms the role, and every RPC re-checks it |
| Followers / friends | Real social graph | Typed-in numbers | **Real social graph** between real players and simulated NPC players; counts are always derived from rows, never typed-in |
| Games | User-made experiences | "Displayed games" thumbnails | **Every listed game is playable** (4 original game engines, 14 themed experiences) with scoring, leaderboards and passes |
| Branding | Roblox | Resembles real brands | **Original brand**; deliberately *does not* imitate Roblox's look; "SIMULATED" labelling on currency |

**Deliberate divergence from zlarp:** zlarp's stated goal is that "nothing on screen gives the app away". Blockora takes the opposite position: it is its own brand, and simulated currency is always identifiable as such. That keeps the product from functioning as a tool for passing off fake account screenshots as real ones.

---

## 4. Feature comparison table

Legend: ✅ implemented · ◐ partial / simplified · ⏳ roadmap · — not applicable

| # | Feature | Roblox | zlarp | Blockora | Blockora notes |
|---|---|---|---|---|---|
| 1 | Home page | ✓ | — | ✅ | Greeting, wallet, daily reward, active event, continue playing, recommended, friends activity |
| 2 | Discover page | ✓ | — | ✅ | Recommended, Trending (time-decayed play score), Popular, Top rated, New, genre filter, search |
| 3 | User profiles | ✓ | ✓ (display) | ✅ | Avatar, bio, counts, badges, favorite games, showcase, level, profile theme, relationship actions |
| 4 | Username / display name | ✓ | ✓ | ✅ | Username 3–20 `[A-Za-z0-9_]`, ≤1 underscore, unique (case-insensitive); change costs 1,000 Orbs. Display name 3–20, changeable every 7 days |
| 5 | Avatar customization | ✓ | ✓ (outfit) | ✅ | 9 equip slots, skin tones, body types, height/head scale, live SVG preview |
| 6 | Avatar inventory | ✓ | ✓ | ✅ | Categories, search, sort, rarity, favorites, duplicates (limited copies), equip from inventory |
| 7 | Marketplace | ✓ | — | ✅ | Categories, search, filters, sort, featured/popular/new, item page, confirmation, ownership checks |
| 8 | Clothing & accessories | ✓ | ✓ | ✅ | ~110 original procedurally-drawn items |
| 9 | Friends | ✓ | ✓ (count) | ✅ | Requests, accept/decline/cancel, remove, 1,000 cap, privacy-aware |
| 10 | Followers / following | ✓ | ✓ (count) | ✅ | Follow/unfollow, lists, notifications |
| 11 | Experiences | ✓ | ✓ (displayed) | ✅ | 14 playable experiences on 4 original engines |
| 12 | Game details | ✓ | — | ✅ | Stats (visits, playing now, likes), passes, leaderboard, your best, rating, favorite |
| 13 | Game passes | ✓ | — | ✅ | Real perks enforced server-side (reward multipliers, extra life, etc.); owned passes are not promoted |
| 14 | Notifications | ✓ | — | ✅ | Friend requests, follows, rewards, achievements, level-ups, admin adjustments |
| 15 | Achievements / badges | ✓ | ✓ (display) | ✅ | 24 achievements with progress, rewards and profile badges |
| 16 | Account settings | ✓ | — | ✅ | Privacy, appearance (dark/light/system), haptics, password, sign out |
| 17 | Search & filtering | ✓ | — | ✅ | Unified search (players, games, items) + per-screen filters |
| 18 | Item ownership | ✓ | ✓ | ✅ | Server-verified on purchase, equip, outfit wear |
| 19 | Activity & statistics | ✓ | ✓ (display) | ✅ | Activity feed, account stats, per-game stats, analytics card |
| 20 | Currency balance & history | ✓ | ✓ (display only) | ✅ | Ledger with balance-after, idempotency keys, filters |
| 21 | Modify Menu | — | ✓ Backstage | ✅ | Server-authorized developer console (accounts, currency, profile, stats, inventory, audit, diagnostics) |
| 22 | Saved outfits | ✓ | — | ✅ | Up to 50, public sharing, wear (re-validated) |
| 23 | Limited items | ✓ | — | ✅ | Finite stock, serial numbers, sold-out state, price history |
| 24 | Privacy controls | ✓ | — | ✅ | Inventory / friends / activity visibility, who can friend you, blocking & reporting |
| 25 | Trading / resale | ✓ | — | ⏳ | Roadmap — needs anti-abuse design |
| 26 | Chat | ✓ | — | ⏳ | Out of scope (moderation burden) |
| 27 | Groups | ✓ | — | ⏳ | Roadmap |

---

## 5. Missing functionality in the references → opportunities

* zlarp offers editable numbers but no systems behind them → Blockora makes every number **earned and consistent** (followers are real rows, balances are ledger sums verifiable by diagnostics).
* Roblox progression is per-experience → Blockora adds **platform-level progression** (XP and levels across all games).
* Neither reference gives a daily reason to return without spending → **daily reward streak** and **daily quests**.
* Collections are implicit in Roblox → Blockora has **explicit item sets** with completion rewards.

## 6. Original Blockora features (summary — details in `PRODUCT_ROADMAP.md`)

1. Daily login streak with a 7-day escalating reward cycle.
2. Daily quests (play, score, collect, socialize) with claimable rewards.
3. Platform XP and levels; level-gated profile themes.
4. Limited items with serial numbers and a price-history sparkline.
5. Item sets ("collections") with completion bonuses.
6. Seasonal event banner with a live countdown and event-exclusive items.
7. Time-decayed trending algorithm and genre-affinity recommendations.
8. Simulated NPC community that accepts friend requests, follows back and populates leaderboards and the feed.
9. Account analytics card (earned vs. spent, favorite genre, play time).
10. Server-side diagnostics that prove economy integrity (ledger = balance, limited stock = owned copies, equipped ⊆ owned).
