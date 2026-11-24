# Step57 — Dependency lockfile readiness

## Purpose
Audit the monorepo dependency graph and prepare reproducible installation without fabricating package resolution data or changing the CI workflow prematurely.

## Verified project inputs
- Root npm workspace includes `apps/web`, `apps/admin`, and `apps/mobile`.
- Root requires Node `>=22.13.0`.
- Mobile uses Expo `~58.0.0`, React `19.3.0`, React Native `0.88.0`, and Unity LevelPlay `9.5.0`.
- Codemagic currently pins Node `22.13.0` and Java `17` and runs `npm install`.

## Result / blocker
- No root `package-lock.json` exists in the supplied Step56 archive.
- Attempted `npm install --package-lock-only --ignore-scripts --no-audit --no-fund` twice. Both attempts timed out while resolving packages; no lockfile was produced.
- A lockfile was deliberately not hand-authored: transitive package versions and integrity hashes must come from npm's resolver/registry. Inventing them would make the build less reliable, not more.
- Codemagic was deliberately left on `npm install`. Do not change it to `npm ci` until a valid root lockfile is generated and committed.

## Owner-side command when registry access is available
Run from repository root:

```bash
npm install --package-lock-only --ignore-scripts --no-audit --no-fund
npm ci
npm --workspace @vyra/mobile run preflight:android
npm --workspace @vyra/mobile run typecheck
```

Review the generated `package-lock.json`, commit it with the project, and only then switch the Codemagic install step from `npm install` to `npm ci`.

## Validation
- `apps/mobile/tests/step57_lockfile_readiness.mjs`: 6/6 checks pass. These checks intentionally confirm the current missing-lockfile blocker; they do not claim dependency installation or Android build success.
- No `node_modules` installation, Expo prebuild, Gradle build, APK, GitHub upload, or Codemagic run was completed in this step.
- No Supabase SQL, Production data, Cloudflare Worker, CPX/LevelPlay callback, payout, wallet credit, or withdrawal setting was changed. NG and US withdrawals remain disabled.
