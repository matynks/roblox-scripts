#!/usr/bin/env bash
# Builds a BloxyBox release APK locally (no Expo account needed).
#
# Requirements: Node 20+, JDK 17 (needed for the Gradle toolchain), Android SDK with platform 36, build-tools
# 36.0.0, NDK 27.1.12297006 and CMake 3.22.1 (see README).
#
# Environment:
#   ANDROID_HOME                    Android SDK directory (required)
#   BLOXYBOX_ARCHS                  ABIs to build (default: arm64-v8a,armeabi-v7a)
#   EXPO_PUBLIC_SUPABASE_URL        optional; baked into the APK (see .env.example)
#   EXPO_PUBLIC_SUPABASE_ANON_KEY   optional; baked into the APK
#   BLOXYBOX_UPLOAD_STORE_FILE / _STORE_PASSWORD / _KEY_ALIAS / _KEY_PASSWORD
#                                   your release keystore; without it the APK is
#                                   signed with the debug key (testing only)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK directory}"
export ANDROID_HOME
ARCHS="${BLOXYBOX_ARCHS:-arm64-v8a,armeabi-v7a}"
VERSION="$(node -p "require('./app.json').expo.version")"

echo "==> Regenerating the native Android project (expo prebuild)"
npx expo prebuild --platform android --clean --no-install

echo "==> Building release APK for: $ARCHS"
(cd android && ./gradlew assembleRelease -PreactNativeArchitectures="$ARCHS" --no-daemon)

mkdir -p dist
OUT="dist/bloxybox-$VERSION-release.apk"
cp android/app/build/outputs/apk/release/app-release.apk "$OUT"

echo
echo "APK: $OUT ($(du -h "$OUT" | cut -f1))"
if [[ -z "${BLOXYBOX_UPLOAD_STORE_FILE:-}" ]]; then
  echo "NOTE: signed with the DEBUG key. Fine for installing on your own phone;"
  echo "      set BLOXYBOX_UPLOAD_STORE_FILE etc. (see README) for a distributable build."
fi
if [[ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ]] && ! grep -qs '^EXPO_PUBLIC_SUPABASE_URL=https' .env; then
  echo "NOTE: no Supabase URL baked in. The app will show the Server setup screen on first launch."
fi
