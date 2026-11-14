# BloxyBox — Release checklist

## Before building
- [ ] `npm run test:all` passes (typecheck, lint, Jest, database suite).
- [ ] `app.json`: bump `expo.version` (user-visible) and `android.versionCode` (+1 every release).
- [ ] All migrations are applied to the production Supabase project (`npx supabase db push`).
- [ ] Production Supabase settings reviewed: e-mail confirmation on, sensible auth rate limits, password minimum length ≥ 8.
- [ ] Developer roles reviewed: `select * from public.user_roles;` contains only intended accounts.
- [ ] `.env` / EAS environment variables point to the **production** project and contain only the URL and anon key.

## Build
- [ ] EAS: `eas build -p android --profile production` (AAB) and/or `--profile preview` (APK); **or**
- [ ] Local: `./scripts/build-apk.sh` with `BLOXYBOX_UPLOAD_*` set (never ship a debug-signed APK).
- [ ] Back up the upload keystore and its passwords somewhere safe. Losing it means users can't update in place.

## Verify the artefact
- [ ] `apksigner verify --print-certs <apk>` shows your upload certificate, not "Android Debug".
- [ ] `aapt2 dump badging <apk>`: package `com.bloxybox.app`, the expected versionCode/versionName, targetSdk 36.
- [ ] Permissions are only the expected ones (INTERNET, ACCESS_NETWORK_STATE, VIBRATE, …).
- [ ] Install on the Galaxy A15 and run the manual checklist in `docs/TESTING.md`.

## After release
- [ ] Tag the commit (`git tag v<version>`).
- [ ] Update `DEVELOPMENT_STATUS.md`.
- [ ] Watch `dev_diagnostics()` (ledger consistency) and rejected game sessions for abuse.
