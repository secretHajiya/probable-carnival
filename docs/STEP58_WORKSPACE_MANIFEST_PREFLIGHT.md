# Step58 — Workspace manifest preflight

## Scope

Step58 inspects the actual npm workspace manifests and Codemagic workflow, adds a repeatable static contract test, and retries lockfile generation using the local npm cache preference.

## Results

- Root workspaces are `apps/web`, `apps/admin`, and `apps/mobile`; their package names match the scripts that address them.
- Web/Admin share React, React DOM, Supabase, TypeScript, Vite, and Vite React plugin ranges.
- Mobile declares Expo `~58.0.0`, React `19.3.0`, React Native `0.88.0`, Expo Secure Store, and Unity LevelPlay.
- Root Node engine and Codemagic Node/Java pins are consistent with the declared runtime requirements checked here.
- `npm install --package-lock-only --ignore-scripts --no-audit --no-fund --prefer-offline` was attempted with a 90-second limit and timed out. No lockfile was generated.
- Codemagic remains on `npm install`; it must not be switched to `npm ci` until a valid root lockfile has been generated and committed.

## Validation

Run from the standalone project root:

```sh
node --test apps/mobile/tests/step58_workspace_manifest_preflight.mjs
node --test apps/mobile/tests/step57_lockfile_readiness.mjs
node apps/mobile/tests/step56_android_build_preflight.mjs
```

Step58 contract test: 17/17. This is static manifest/CI validation only. It does not install packages, typecheck TypeScript, run Expo prebuild, invoke Gradle, create an APK, or test on a device.

## Remaining blocker

A network-enabled npm registry environment is still required to resolve the complete transitive dependency graph and produce an authentic `package-lock.json`. Review the generated lockfile, then change CI to `npm ci` only after confirming clean installation.

No Supabase SQL, Cloudflare Worker, PayPal, withdrawal, production setting, GitHub repository, or Codemagic build was changed or deployed.
