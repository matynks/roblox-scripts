# BloxyBox

BloxyBox is an original Android account-simulator playground. You create a
Boxling avatar, earn and spend **BoxCoins** (simulated currency), buy items and
Game Passes, follow other players and play original mini-games.

> **Everything in BloxyBox is simulated.** BoxCoins, followers and stats exist
> only inside this app and have no real-world value. BloxyBox never connects to,
> reads or modifies any other platform's accounts, currency or game servers, and
> there are no real-money purchases.

* Platform: **Android only** (portrait, tuned for the Samsung Galaxy A15).
* Stack: Expo SDK 57 · React Native 0.86 (New Architecture, Hermes) · TypeScript ·
  Expo Router · Supabase · TanStack Query · Zustand · Reanimated 4 · Gesture Handler · expo-sqlite.
* Architecture, schema, navigation map and risk assessment: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
* What is done, what is tested and known limitations: [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md).

---

## 1. Project layout

```
bloxybox/
├── src/app/            Screens (Expo Router file-based routes)
├── src/features/       Feature logic + data hooks (auth, wallet, market, inventory,
│                       avatar, passes, discover, social, games, dev)
├── src/games/          Mini-game engine: registry, GameShell, box-stack/, lane-dash/
├── src/components/     Design system (ui/), brand art, feature components
├── src/api/            Supabase RPC wrapper, row types, error mapping, query keys
├── src/lib/            Config, Supabase client, secure/kv storage, query client, formatting
├── src/stores/         Zustand stores (session, preferences, toasts)
├── supabase/
│   ├── migrations/     Schema, RLS, server functions, catalog (apply in order)
│   └── tests/          SQL test suite + local Supabase shim
├── plugins/            Expo config plugin for release signing
├── scripts/            test-db.sh (database tests), build-apk.sh (local APK build)
└── docs/               Architecture, testing strategy, release checklist
```

---

## 2. Backend setup (Supabase)

BloxyBox needs a Supabase project. The free tier is enough.

1. Create a project at <https://supabase.com/dashboard>.
2. Apply the database migrations, **in filename order**, using either:
   * **Supabase CLI** (recommended):
     ```bash
     cd bloxybox
     npx supabase login
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push
     ```
   * **SQL editor**: open each file in `supabase/migrations/` in order and run it.
3. *(Optional, for development)* Authentication → Providers → Email: turn **Confirm email** off,
   so new accounts can sign in immediately. With it on, the app tells new players to
   confirm their e-mail and then sign in.
4. Copy **Project URL** and the **anon / publishable key** from Project Settings → API.

The anon key is designed to be public: it ships inside the app. All protection comes
from Row Level Security and server-side functions. **Never** put the `service_role`
key, a database password or any other secret in the app or in `.env` (the setup
screen actively refuses secret keys).

### Granting the developer role (Modify Menu)

The developer role can only be granted with SQL by the project owner (SQL editor or
service role). There is no in-app way to obtain it.

```sql
-- find the user id
select id, username from public.profiles where username = 'your_username';

-- grant
insert into public.user_roles (user_id, role, note)
values ('<user-id>', 'developer', 'granted by <you>');

-- revoke
delete from public.user_roles where user_id = '<user-id>' and role = 'developer';
```

**Opening the Modify Menu:** Settings → About → tap the *Version · build* line
**7 times within 4 seconds**, then **long-press the BloxyBox logo** within 6 seconds.
The app then asks the server; only accounts with the developer role are let in.
Everyone else sees nothing, and the attempt is recorded in `dev_audit_log`.
Every Modify Menu action is checked on the server and audited.

---

## 3. App configuration

Two options:

* **Bake the backend into the build** (recommended for your own builds):
  ```bash
  cp .env.example .env
  # edit .env: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
  ```
* **Configure on the phone**: if a build has no values, the first launch shows a
  *Server setup* screen. Enter the project URL and anon key; they are checked
  against the server and stored encrypted on the device (Settings → Server lets
  you change them later).

---

## 4. Development

Requirements: Node 20+ (22 recommended), npm, **JDK 17** (React Native's Gradle plugin compiles with a Java 17 toolchain; a newer JDK may run Gradle, but 17 must be installed), Android SDK (see §6).

```bash
cd bloxybox
npm install
npx expo run:android      # builds a debug app, installs it on a connected device/emulator, starts Metro
```

BloxyBox uses native modules that Expo Go doesn't include, so use `expo run:android`
(or an EAS development build), not Expo Go. Connect the Galaxy A15 with USB
debugging enabled (Settings → About phone → Software information → tap *Build
number* 7 times → Developer options → USB debugging).

Useful commands:

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript, strict mode |
| `npm run lint` | ESLint (Expo + React Compiler rules) |
| `npm test` | Jest unit and component tests |
| `npm run test:db` | Database test suite against a throwaway local PostgreSQL |
| `npm run test:all` | All of the above |

---

## 5. Testing

* **Jest** (`npm test`): game rules (Box Stack, Lane Dash, RNG), marketplace filters,
  Discover sections, auth validation, error mapping, config/secret-key validation,
  chunked secure storage, the hidden-sequence state machine, catalog consistency
  (every item has artwork, every playable experience has a game), and component
  renders (every avatar part, purchase confirmation, profile SIM labelling, both games).
* **Database** (`npm run test:db`): needs PostgreSQL 15+ server binaries (`initdb`,
  `pg_ctl`, `psql`). The runner starts a temporary server, applies a small Supabase
  shim (roles, `auth.users`, `auth.uid()`, Supabase's default grants), all
  migrations and the helpers, then runs each `supabase/tests/*.sql` file in a fresh
  database. It covers RLS and privileges as `anon`/`authenticated`, the function
  allow-list, sign-up provisioning, the ledger invariant, purchases, ownership,
  Game Passes, reward validation and caps, social features and developer
  authorisation and auditing.

Details and the manual on-device checklist: [`docs/TESTING.md`](docs/TESTING.md).

---

## 6. Building an Android APK

### Option A — EAS Build (cloud, easiest)

```bash
npm install -g eas-cli
eas login
eas init                     # links the project to your Expo account
# Add EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY as EAS environment
# variables (preview + production), or leave them out to use the setup screen.
eas build -p android --profile preview      # installable .apk
eas build -p android --profile production   # .aab for Google Play
```

EAS creates and stores the signing keystore for you.

### Option B — Local Gradle build

Install **JDK 17**, the Android SDK command-line tools and these packages:

```bash
sdkmanager "platform-tools" "platforms;android-36" "build-tools;36.0.0" \
           "ndk;27.1.12297006" "cmake;3.22.1"
export ANDROID_HOME=/path/to/android-sdk
```

Then:

```bash
cd bloxybox
npm install
./scripts/build-apk.sh                       # → dist/bloxybox-<version>-release.apk
BLOXYBOX_ARCHS=arm64-v8a ./scripts/build-apk.sh   # smaller, faster: 64-bit ARM only (Galaxy A15)
```

**Signing.** Without a keystore the release APK is signed with the public debug
key, which is fine for installing on your own phone and **not** for distribution.
For a real release, create an upload key once and keep it safe (never commit it):

```bash
keytool -genkeypair -v -storetype JKS -keystore bloxybox-upload.jks \
  -alias bloxybox -keyalg RSA -keysize 2048 -validity 10000

export BLOXYBOX_UPLOAD_STORE_FILE=/secure/path/bloxybox-upload.jks
export BLOXYBOX_UPLOAD_STORE_PASSWORD=...
export BLOXYBOX_UPLOAD_KEY_ALIAS=bloxybox
export BLOXYBOX_UPLOAD_KEY_PASSWORD=...
./scripts/build-apk.sh
```

The `plugins/withReleaseSigning.js` config plugin reads these variables at build
time; nothing secret is written into the repository.

---

## 7. Installing on the Galaxy A15

1. Copy the `.apk` to the phone (USB, Google Drive, etc.), or with USB debugging on:
   `adb install -r dist/bloxybox-1.0.0-release.apk`.
2. When opening the file, allow your file manager/browser to *Install unknown apps*
   (Settings → Apps → ⋮ → Special access → Install unknown apps).
3. Open **BloxyBox**. If the build had no backend values, enter your Supabase URL
   and anon key on the setup screen, then create an account.

An APK signed with a different key can't be installed over an existing one;
uninstall the old one first (this deletes local data only; your account is on the server).

---

## 8. Adding a mini-game

1. Create `src/games/<slug>/logic.ts` (pure rules, unit-tested) and a component
   implementing `GameProps` (`src/games/types.ts`).
2. Register it in `src/games/registry.ts`.
3. Add an `experiences` row (status `playable`) with its reward and anti-abuse
   limits in a new migration. The catalog consistency test fails if a playable
   experience has no implementation.
