# Step65 — Codemagic dependency-install parity

## Source comparison

The owner supplied `probable-carnival-main.zip`, a previously built Expo application. Its `codemagic.yaml` installs dependencies with:

```bash
npm install --legacy-peer-deps
```

The Vyra Rewards Global workflow previously used `npm install`. Step65 changes only that install command to the same mode used by the known successful reference workflow.

## Why this change is limited

`--legacy-peer-deps` tells npm to use the legacy peer-dependency resolution behavior. It may help when installation fails with an `ERESOLVE` peer-dependency conflict. It does **not** fix `EAI_AGAIN`, DNS failures, blocked HTTPS access, registry outages, or missing packages.

The workflow retains the Vyra-specific environment and build path: Node 22.13.0, Java 17, npm workspaces (`apps/web`, `apps/admin`, `apps/mobile`), Expo prebuild for Android, and Gradle `assembleDebug`. The reference app's Expo 51 / React Native 0.74.5 versions were not copied; Vyra remains on its own Expo 58 / React Native 0.88.0 configuration.

## Lockfile note

There is still no committed root `package-lock.json`. A successful `npm install` in Codemagic may generate a lockfile inside that temporary build checkout, but it will not automatically commit it to GitHub. For repeatable builds, generate and review the lockfile in a network-enabled environment, then commit it. Do not fabricate it.

## Verification boundary

This step updates the Codemagic install command and adds source-contract tests. It does not claim a live Codemagic run, npm installation, APK build, device test, Supabase change, or Cloudflare deployment. The decisive next evidence is the Codemagic build log: distinguish `ERESOLVE` from `EAI_AGAIN` / DNS / timeout.
