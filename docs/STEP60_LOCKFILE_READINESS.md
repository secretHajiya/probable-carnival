# Step60 — Dependency lockfile readiness guard

## Scope
Step60 adds an explicit, repeatable guard for the root npm workspace lockfile. It requires an npm v3 `package-lock.json` and verifies that all three declared workspaces (`apps/web`, `apps/admin`, `apps/mobile`) have package entries before a deterministic `npm ci` workflow can be considered.

## Current result
The Step59 archive has no root `package-lock.json`. A registry-backed `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --fetch-retries=0 --fetch-timeout=30000` attempt exceeded the execution time limit in this environment. No dependency installation completed and no lockfile was generated. A synthetic or hand-written lockfile was deliberately not created.

The new command `npm run check:lockfile` therefore exits with status 2 and explains the blocker. This is the expected fail-closed behavior, not a successful lockfile validation.

## CI status
`codemagic.yaml` remains unchanged and continues to use `npm install`. It must not switch to `npm ci` until a genuine registry-resolved lockfile is generated and validated. No Expo prebuild, Gradle build, APK/AAB, emulator, or physical-device test was performed.

## Validation
Run `node apps/mobile/tests/step60_lockfile_readiness.mjs`. Its checks validate the guard's behavior when the lockfile is absent. These are source/contract checks only; they do not establish that packages can be installed.

No Supabase SQL, Production settings, Cloudflare Worker, payout, withdrawal, GitHub, or Codemagic deployment changes were made. NG and US withdrawals remain disabled.
