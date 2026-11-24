# Step61 — Dependency resolution preflight

## Scope
Step61 adds a repeatable static preflight for the root npm workspace and its three package manifests. It checks the declared workspaces, private package status, Node engine floor, required workspace metadata, and the pinned Expo / React / React Native versions. Run it with `npm run preflight:dependencies`.

## Registry-backed dependency resolution / lockfile result
A genuine lockfile generation was attempted from the Step60 project using:

`npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=20000`

The command exceeded the execution time limit in this environment. The npm cache was empty, so offline lockfile generation was not possible. No `package-lock.json` was created or fabricated. The Step61 preflight therefore intentionally exits with status 2 and reports the missing lockfile.

## CI and build status
Codemagic remains unchanged on `npm install`. Do not switch to `npm ci` until a real registry-resolved npm v3 lockfile has been generated and validated. Dependency installation, Expo prebuild, Gradle, APK/AAB, emulator, and physical-device builds/tests have not been completed in this step.

## Validation
`node apps/mobile/tests/step61_dependency_resolution_preflight.mjs` runs source/contract checks for the manifest guard. These checks do not prove that the external packages resolve or install. No Supabase SQL, Production configuration, Cloudflare Worker, payout, withdrawal, GitHub, or Codemagic deployment changes were made. NG and US withdrawals remain disabled.
