# Step62 — npm Registry Connectivity Diagnostic

## Purpose

This step separates a network/DNS problem from package-manifest or lockfile problems. It adds a read-only diagnostic for the official npm registry endpoint and deterministic tests for success and failure paths.

## Command

From `vyra-rewards-global-standalone`:

```bash
npm run diagnose:npm-registry
npm run check:lockfile
```

The diagnostic checks DNS for `registry.npmjs.org`, then requests `https://registry.npmjs.org/-/ping`. It does not install packages, modify npm configuration, or create/edit a lockfile. Exit code 2 means the registry is not reachable from the current environment.

## Observed Step62 result

- Live DNS lookup returned `EAI_AGAIN` for `registry.npmjs.org`.
- `npm install --package-lock-only --ignore-scripts --offline --fetch-retries=0` returned `ENOTCACHED` for `@supabase/supabase-js`, confirming the local npm cache does not contain the metadata needed to create a complete lockfile.
- The focused Step62 deterministic test passed 8/8.
- All 24 available source/runtime test files were executed; 338/338 checks passed, including the Step42 runtime simulation under Node's type-stripping flag.

## Required next action

Run the registry diagnostic in an environment with DNS and HTTPS access to `registry.npmjs.org`. Then, from the repository root and using the project's selected npm version:

```bash
npm install --package-lock-only --ignore-scripts
npm run check:lockfile
npm ci --ignore-scripts
```

Only after these commands succeed should CI be changed from `npm install` to `npm ci`. Do not hand-write or fabricate package integrity hashes.

## Scope and safety

This step does not change Codemagic, application dependency declarations, Expo configuration, Supabase SQL/Production, Cloudflare Workers, payout behavior, or withdrawal settings. No dependency installation, Expo prebuild, Gradle/APK build, emulator, or physical-device test is claimed. NG and US withdrawals remain disabled.
