# Android native build preparation — Step 02

## What changed
- The Expo app configuration now declares the Android application ID `com.vyra.rewardsglobal`, internet/network permissions, and Android keyboard pan behavior.
- The unused Expo EAS project-ID placeholder was removed; this project is preparing for Codemagic, not EAS.
- Added mobile typecheck and Expo prebuild scripts.
- Added a Codemagic workflow that installs dependencies in CI, generates the Android native project, and produces a **debug APK**.

## Build workflow
Codemagic reads `codemagic.yaml` from the repository root. Select workflow `vyra-android-debug`. The workflow uses Node 22.13.0 and Java 17. It runs `npm install` only on the Codemagic build machine; no local install is requested.

## Required configuration before a connected app build
Set these Codemagic environment variables (or a protected variable group):
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key only.

Never add a Supabase service-role key, CPX hash, Unity S2S private key, or payout secrets to mobile environment variables. Public `EXPO_PUBLIC_` values are bundled into the app.

## Important limitations
- This workflow is a CI recipe; it has **not** been run in Codemagic in this step.
- No generated `android/` directory is committed. Expo prebuild generates it on the CI machine from app config and installed native modules.
- The workflow builds a debug APK, not a signed release APK/AAB. Signing credentials and release workflow are a later release task.
- Unity LevelPlay dependency is present, but no App Key, ad unit, initialization code, S2S callback, or reward-credit path is configured yet. Do not show live ads or issue ad rewards at this stage.
- No Expo project ID, app icon, splash artwork, Unity credentials, or production secrets were invented.
