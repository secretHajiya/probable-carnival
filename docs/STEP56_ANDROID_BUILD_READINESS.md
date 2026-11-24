# Step56 — Android build readiness preflight

## Purpose
Prepare the existing Expo/React Native Android workspace for a later CI debug-APK build without starting GitHub/Codemagic or changing backend production services.

## Changes
- Added `apps/mobile/tests/step56_android_build_preflight.mjs` with 35 source/configuration assertions covering app identity, Android package/version/permissions, keyboard mode, Expo/React Native dependency declarations, native modules, workspace scripts, Codemagic Node/Java pins, Expo prebuild and Gradle artifact steps, generated-native-project policy, and mobile-secret hygiene.
- Added `preflight:android` to the mobile workspace and `preflight:mobile:android` to the repository scripts.
- Preserved the existing Codemagic workflow and its Java 17 / Node 22.13.0 build environment; no CI workflow was run or deployment started.

## Results
- Step56 focused preflight: 35/35 passed.
- Carried-forward local suites from Steps31–55: 234/234 passed.
- Combined listed local suites: 269/269 passed.
- Source ZIP integrity passed after packaging.

## Build blockers / limitations found
- `node_modules` is absent; Expo CLI and native packages are not installed in this workspace.
- `apps/mobile/tsconfig.json` extends `expo/tsconfig.base`, which is supplied by the Expo dependency and therefore cannot be resolved here.
- No `android/` native project exists; this is intentional because Expo prebuild generates it on the CI machine.
- No Android SDK / `adb` was available in this environment, and no emulator or physical device test was possible.
- Local Java is 21, while the existing Codemagic workflow pins Java 17. CI uses the documented pinned version; local Gradle build was not attempted.
- The repository has no `package-lock.json`. Codemagic currently uses `npm install`; for reproducible CI, generate and commit a workspace lockfile before changing the workflow to `npm ci`.
- The app config has no icon/splash artwork, Firebase `google-services.json`, or production credentials. These were not invented or added. Only add real approved assets/configuration when supplied by the project owner.
- The configured pipeline targets a debug APK only, not a signed release APK/AAB.

## Commands
From repository root:

```bash
npm --workspace @vyra/mobile run preflight:android
npm --workspace @vyra/mobile run typecheck
npm --workspace @vyra/mobile run prebuild:android
```

A full build requires installing the workspace dependencies and an Android build environment. The existing CI workflow performs Expo config validation, Android prebuild, and `./gradlew assembleDebug`.

## Safety boundary
No Supabase SQL, Production database, Cloudflare Worker, CPX callback, LevelPlay server-to-server callback, PayPal payout, withdrawal setting, or wallet-credit behavior was changed. NG and US withdrawals remain disabled. No GitHub upload, Codemagic run, APK, signed release, or device acceptance test was performed.
