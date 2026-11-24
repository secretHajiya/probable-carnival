# Android native build preparation — Step66

## Current Codemagic workflow
Codemagic reads `codemagic.yaml` from the repository root. Workflow `vyra-android-release` uses Node 22.13.0 and Java 17, installs workspace dependencies with `npm install --legacy-peer-deps`, validates Expo config, runs Expo prebuild, and executes `./gradlew assembleRelease`.

The release Gradle variant runs the React Native bundle task and packages the JavaScript/assets into the APK. This avoids requiring a Metro server on the developer computer when the installed APK launches. The expected artifact is `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.

## Required public mobile configuration
Set these Codemagic environment variables (or a protected variable group) if the connected mobile app requires them:
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key only.

Never add a Supabase service-role key, CPX hash, Unity S2S private key, or payout secrets to mobile environment variables. Public `EXPO_PUBLIC_` values are bundled into the app.

## Signing and release limitations
- The release APK embeds the JavaScript bundle and can launch without a Metro server.
- No generated `android/` directory is committed; Expo prebuild generates it on the CI machine.
- This workflow creates a release-variant APK with the JavaScript bundle embedded. It does not by itself configure a Play Store production signing key or generate an AAB.
- Configure secure Android release signing in Codemagic before publishing to Google Play.
- No actual Codemagic build, APK installation, emulator test, or physical-device test is claimed by this source change. The next build log and APK must be checked.
- No generated `android/` directory is committed; Expo prebuild generates it on the CI machine.
- Unity LevelPlay dependency exists, but live ad credentials/initialization and reward-credit acceptance remain separate work.

## Security
Never commit `.env` files or private server/provider secrets.
