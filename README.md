## Latest increment — Step66 Android release bundle fix

The Codemagic Android workflow now builds the release Gradle variant (`assembleRelease`) and collects `app-release.apk`, so React Native packages the JavaScript bundle instead of relying on a Metro server on the user's computer. This is a source/configuration change only; a new Codemagic build and physical-device verification are still required. Play Store production signing/AAB configuration remains separate. See `docs/STEP66_ANDROID_RELEASE_BUNDLE_FIX.md`.

# Vyra Rewards Global

Standalone rebuild of Vyra Rewards Global. This project is designed to run independently of AppDeploy.

## Repository map
See [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## Latest increment — Step64 EAI_AGAIN case studies and recovery runbook

Step64 records published reports where `EAI_AGAIN` was resolved by correcting DNS/network configuration, changing networks, or repairing a CI/container resolver. It adds an evidence-led recovery order for the exact machine or CI job that generates the npm lockfile. This is documentation and source-contract coverage only: no dependency versions were changed, no lockfile was fabricated, and no Android build or deployment was performed. See `docs/STEP64_EAI_AGAIN_CASE_STUDIES_AND_REMEDIATION.md`.

## Current status (Step55)
The native Member app now applies right-to-left layout and right-aligned text inputs when Arabic is selected. All ten native feature panels use direction-aware text; other supported languages remain left-to-right. Step55 source checks passed 28/28 and the cumulative listed local suites passed 234/234. Full Expo typecheck/build and Android device/visual acceptance remain pending. Dynamic server-authored questions, explanations, reward labels and unknown provider errors still need separate translation coverage. No SQL, Production, Worker, payout or withdrawal activation was performed; NG and US withdrawals remain disabled. See `docs/STEP55_ARABIC_RTL.md`.

## Local setup
Use Node.js 20.19+ and npm 10+ from this directory:

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
npm run dev:web
npm run dev:admin
```

Build both apps with `npm run build`. The two apps are separate deployable frontends but share the same Supabase project and security model. Set the public Supabase URL/anon key and the payout Worker URL independently in each app's environment; never add service-role or provider secrets to Vite variables.

## Withdrawal security status
- Member Withdrawal History contains a bank-transfer submission flow, but it is shown only when the signed-in member's country has an enabled `withdrawal_config` row. The UI fails closed when configuration cannot be verified.
- The source includes a Cloudflare Worker draft for encrypted payout-details storage and a one-use token flow. It has not been deployed or tested against staging/Production. Do not enable withdrawal configuration until the Worker, migration 013, finance reveal/audit, limits, exchange rate, reconciliation and end-to-end tests have passed.
- See `docs/SECURE_PAYOUT_DETAILS_SERVICE.md`, `docs/SECURE_PAYOUT_DETAILS_ACCEPTANCE.md`, and `docs/SECURE_PAYOUT_STAGING_RUNBOOK.md`.

## Security
- Never commit `.env` files.
- Never put `SUPABASE_SERVICE_ROLE_KEY` or `CPX_SECURE_HASH` in frontend variables.
- Keep CPX rewards disabled until callback verification and reversal tests pass.
- Real-money payouts remain disabled until a verified payout provider and reconciliation workflow are implemented.

## Step 06 status
Earn Center UI and the authenticated server-side CPX wall configuration function have been added. CPX remains disabled until signed postback processing, idempotent wallet crediting, and reversal handling are implemented and tested. See `docs/CPX_EARN_CENTER_STEP06.md`.


## Secure payout implementation draft
A Cloudflare payout-details Worker and staging migration draft are included under `cloudflare/payout-details/` and `supabase/migrations/013_secure_payout_details_vault.sql`. This is source implementation only: it has not been deployed or tested against Supabase. Withdrawals must remain disabled until staging tests, security review, rate limiting, key rotation, and admin audit verification pass.

## Referral Center implementation
- Member Referral Center reads only the signed-in member's referral rows under RLS.
- Referral code application calls `public.apply_referral_code(text)`; it does not award coins in the browser.
- The Step 08 referral migration is copied into the standalone sequence as `003_referral_system.sql`. Apply it only after reviewing the existing production schema and migration history.
- Referral reward qualification remains service-role-only and disabled by default until an administrator configures the threshold and reward.
- No live Supabase test or production deployment is claimed.


## Member Daily Check-in
The member dashboard now links to `/check-in`. The page reads the signed-in member's check-in history and claims through the server-side `claim_daily_checkin()` RPC. Apply migration `014_daily_checkin_rewards.sql` after the standalone base, auth, referral and secure-payout migrations. Rewards are disabled by default; configure an approved amount and IANA timezone in staging only after the acceptance checks in `docs/DAILY_CHECKIN_MEMBER_ACCEPTANCE.md` pass.


## Member Notifications & Support
- The member dashboard links to `/support`, which provides an in-app notification inbox and member-owned support tickets.
- Notification reads and ticket actions use authenticated database RPCs; row-level security limits member reads to their own records.
- Migration `015_notifications_support.sql` ports the Step 16 support/notification schema and RPC contract into the standalone sequence after migration 014.
- Admin ticket listing, message retrieval and replies require `public.is_active_admin()`; admin replies write an audit log and notify the member.
- Apply and validate the migration in staging using `docs/MEMBER_NOTIFICATIONS_SUPPORT_ACCEPTANCE.md` before production use. No email/push/realtime delivery or live Supabase test is claimed.


## Admin Support Inbox
The Admin Dashboard now has a Support Inbox view. It uses the migration 015 admin RPCs to list tickets, read messages and send audited replies; the RPCs enforce `is_active_admin()` server-side. A finance-denied account can open the Support Inbox separately, but the support RPCs still independently reject non-admin users. Closed tickets are read-only in the UI because the current reply RPC does not provide a reopen action. See `docs/ADMIN_SUPPORT_INBOX_ACCEPTANCE.md`. This is source-level implementation only; no staging/production RPC test or dependency-backed build is claimed.


## Latest increment — Admin Member Directory
A read-only Admin Dashboard view is available at Members. It uses the `admin_list_members` SECURITY DEFINER RPC, gated by `is_active_admin()`, with bounded pagination and filters for name/UUID, account status, and country. It intentionally does not permit account-status changes, wallet edits, or access to payout details. Apply standalone migration `016_admin_member_directory.sql` before enabling this view in a connected environment.


## Admin Account Security & Audit History
The Admin Dashboard includes read-only audit history and a super-admin-only role inventory. Apply `supabase/migrations/017_admin_security_audit.sql` only after reviewing the database prerequisites and completing the acceptance checks in `docs/ADMIN_SECURITY_AUDIT_ACCEPTANCE.md`. This migration has not been deployed to production.


## Admin fraud review (increment 018)
The Admin Dashboard includes a human review queue backed by admin-only RPCs. Fraud cases are inserted only by a trusted service-role signal-ingestion process; this increment does not implement automated detection or ingestion. `restricted` is a review label only and does not suspend accounts or modify wallet balances. Review `docs/ADMIN_FRAUD_REVIEW_ACCEPTANCE.md` and apply migration `018_admin_fraud_review.sql` in staging only after checking its prerequisites.


## Admin reward configuration
The Admin Dashboard includes a read-only Reward Rules overview backed by migration `019_admin_reward_configuration_read.sql`. It does not permit changing rates or enabling rewards. Apply and verify the migration in staging before use.

### Admin Country & Currency Management (Migration 020)
The Admin Dashboard includes a Countries & Currencies screen. It lists configured records and permits active admins to create/update country and currency metadata through server-side `SECURITY DEFINER` RPCs guarded by `public.is_active_admin()`. Successful changes are written to `admin_audit_logs`; direct table access is revoked. New NG / NGN seed records are disabled. This feature does not configure exchange rates or activate withdrawals/payouts. Review `docs/ADMIN_COUNTRY_CURRENCY_ACCEPTANCE.md` and apply `supabase/migrations/020_admin_country_currency_settings.sql` to staging before Production.


## Admin Reward Provider Management (Migration 021)
The Admin Dashboard includes a provider catalogue and per-platform/per-country external app mapping screen. Provider and app records default to disabled; enabling a provider requires a server-side secret reference identifier, while actual secret values remain outside the browser and database catalogue. Enabling an app mapping requires both its provider and country to be enabled. All writes use admin-checked `SECURITY DEFINER` RPCs and write before/after audit data. CPX is seeded disabled and no CPX app ID or credential is activated. This is configuration only: callback signature/IP verification, idempotent reward credit, duplicate/reversal handling, and live provider tests remain separate release gates. Review `docs/ADMIN_REWARD_PROVIDER_MANAGEMENT_ACCEPTANCE.md` and apply `supabase/migrations/021_admin_reward_provider_management.sql` in staging only after checking prerequisites.


## Integration foundation (migrations 004–006)
The standalone migration chain now includes the missing wallet read-safety, withdrawal configuration/review, and finance dashboard RPC migrations. Migration 005 intentionally omits the old length-only payout token RPC; the only `create_withdrawal_request(bigint,text)` implementation is the hashed, one-use token implementation in migration 013. Apply the migrations in numeric order on a clean staging database.

The member Withdrawal History now reads the signed-in profile country and enabled `withdrawal_config` row before displaying the bank transfer form. If the country is unsupported, the config is absent, or the config cannot be verified, the form stays hidden (fail closed). The current Worker supports Nigeria bank transfer only.

## Operational settings adapters (migrations 020–021)
Migration 020 keeps the admin country settings synchronized with the operational `public.countries` table used by member eligibility and withdrawal RPCs. Migration 021 extends the existing `reward_providers` and `provider_apps` tables from migration 001; it does not create a shadow provider catalogue. Admin provider mappings therefore write to the same provider-app table used by the backend integration. Currency metadata does not create exchange rates; exchange-rate setup and withdrawal enablement remain separate controlled operations.

## Staging gate — integration increment
Before production use, run the checklist in `docs/INTEGRATION_AUDIT_NEXT.md`, including migration replay on a clean staging database, member-vs-admin RLS tests, country/provider consistency checks, callback replay/reversal tests, and payout token consumption tests. No live Supabase or Cloudflare test is claimed by this source package.


## CPX callback staging adapter
The active Production callback is the owner-reported Cloudflare Worker. Its source is now included at `cloudflare/cpx-callback/src/index.js`; see that directory README for required secrets and the current Nigeria-only app mapping. The `supabase/functions/cpx-postback/` Edge Function is a historical/staging adapter only and must not be deployed over or substituted for the active Worker. Owner-reported Production tests for credit, duplicate and reversal have already passed; packaging this source does not repeat those live tests.


## Latest increment — secure payout reveal hardening
Migration `022_atomic_audited_payout_reveal.sql` makes finance payout-detail reveal atomic: authenticated finance-admin check, withdrawal/vault row locks, eligible-status validation, and audit insert occur in one transaction. Worker decrypts ciphertext only after the RPC succeeds. This is source-level work; staging and production deployment are not claimed.


## Current deployment note (2026-11-21)
Historical feature sections above describe how individual modules were originally introduced; they are not a live deployment checklist. Use `docs/OWNER_REPORTED_STATUS_AND_REMAINING_WORK.md` as the single current status source. Production migrations 001–006 and 013–023 and the owner-reported CPX setup must not be replayed. Migration 023 has been applied manually in Production and verified by the owner; Supabase CLI migration history remains empty because SQL Editor was used.


## Admin Dashboard entry gate
The Admin app checks the existing `public.is_active_admin()` database helper before rendering feature views and fails closed on errors. Feature-level RPC authorization remains mandatory. See `docs/ADMIN_DASHBOARD_ENTRY_GATE.md`; verify execute permission and role scenarios in staging before deployment.


## Cloudflare CPX callback source (owner-supplied)

The deployed CPX callback source supplied by the project owner is now included under `cloudflare/cpx-callback/`, with a Wrangler configuration and secret/deployment notes. It calls the existing nine-argument `process_cpx_reward` RPC and currently checks the Nigeria web mapping (`external_app_id=37222`, `country_code=NG`) only. Do not infer US CPX support from the Global country selector. The source package does not deploy the Worker or change any Production secrets.

## Spin & Win (Migration 024)

The member dashboard now includes the Spin & Win panel. It stays in a Coming soon state while the database configuration is disabled. Once enabled by an authorized administrator, the member UI calls the server-side `spin_wheel()` RPC for the authoritative result and wallet credit. See `docs/SPIN_WHEEL_MEMBER_DASHBOARD.md` and `supabase/verification/024_spin_wheel_postdeploy.sql`.


## React Native conversion (Step 01)
The new `apps/mobile` workspace is the React Native/Expo member-app conversion starter. The existing `apps/web` member web app and `apps/admin` dashboard remain available while screens are migrated. See `docs/REACT_NATIVE_CONVERSION_PLAN.md`. This is a conversion starter, not feature parity or a release build.

## Step 16 — Member + Admin cross-app audit
Step 17 adds a least-privilege LevelPlay runtime configuration path: Admin manages the exact App Key, Rewarded Ad Unit ID and Placement through an audited RPC; the signed-in member app reads only those non-secret SDK identifiers through `get_levelplay_mobile_config()`. Migration `027_levelplay_mobile_runtime_config.sql` is new and MUST be reviewed and applied manually in Supabase before deploying these app changes. LevelPlay remains disabled by default. No S2S private key or reward conversion values are exposed to the mobile app. See `docs/STEP17_LEVELPLAY_RUNTIME_CONFIG.md`.


## Step 30 — US PayPal payout readiness
The Step30 audit confirmed PayPal is not implemented in the current payout Worker or database request flow. The existing vault and RPC are Nigeria bank-transfer-only. See `docs/US_PAYPAL_PAYOUT_READINESS_AUDIT.md` and the 25-case `docs/US_PAYPAL_PAYOUT_ACCEPTANCE.md`. The readiness assertions are run with `python scripts/verify-us-paypal-readiness.py`. This step adds no live payout code and does not enable withdrawals.

## Step 33 — Web/Admin build preflight
The Step32 UI source contract and CPX local integration suite pass in the current working environment. The dependency-backed Web/Admin production build is blocked because npm install timed out and the required React/Supabase/Vite packages are absent. Run `npm install`, `npm run preflight:web-admin`, then `npm run build:web` and `npm run build:admin` in an environment with npm registry access. Browser acceptance is still pending. See `docs/STEP33_WEB_ADMIN_BUILD_PREFLIGHT.md`. No production database, Worker, PayPal payout, or withdrawal configuration was changed.

### Step 43 — PayPal submission state guard

Added a source-only SQL hardening migration and contract test to prevent PayPal provider-reference conflicts and payout state regression. See `PAYPAL-STEP43-SUBMISSION-STATE-GUARD.md`. The migration is not applied to Production.

## Mobile Activity History (Step46)
The native Activity tab reads the signed-in member's own `wallet_ledger` rows using the existing read-only RLS policy. It displays newest-first entries in 25-row pages, with refresh/load-more states. It adds no ledger writes or migration. See `STEP46-MOBILE-ACTIVITY-HISTORY.md`. Static contract checks pass; native build/device and live backend tests remain pending.

## Step48 — Mobile Withdrawal Center (read-only)
The Android member app now includes a Withdrawal Center showing the signed-in member's own withdrawal history and statuses. The screen is intentionally read-only: it does not create withdrawal requests or call bank/PayPal payout services, even if configuration is visible. Existing RLS is relied upon; no SQL migration or Production change was made. NG/US withdrawals remain disabled. See `docs/STEP48_MOBILE_WITHDRAWAL_CENTER.md`.

## Latest cumulative update — Step49
- Added native Profile Settings: members can edit their display name and preferred language (English, Arabic, French, Spanish, Portuguese, German, Turkish, Hindi, Chinese); email, country, and account status remain read-only.
- Profile updates derive the user ID from the active Supabase session, update only the two allowed fields, and rely on the existing own-profile RLS policy. Country remains managed by the one-time country-selection RPC.
- Step49 source-contract checks passed 14/14; the combined Step31–Step49 local rerun passed 114/114 (PayPal runtime simulation run with `node --experimental-strip-types`).
- No Expo build, live Supabase test, SQL migration, Worker deployment, or Production change was performed. Native UI translation for the saved language preference remains a separate task. See `vyra-rewards-global-standalone/docs/STEP49_MOBILE_PROFILE_SETTINGS.md`.


## Step52 — Mobile feature localization
- Added nine-language feature translations and wired Activity History, Withdrawal Center and Daily Check-in to the saved member language.
- Removed remaining Hausa copy from Daily Check-in.
- Referral, Inbox/Support, Spin, Quiz, ads, Arabic RTL and full native build remain pending. See `docs/STEP52_MOBILE_FEATURE_LOCALIZATION.md`.


## Step54 — Native Spin, Quiz and LevelPlay localization
Spin & Win, Quiz Rewards, Unity LevelPlay rewarded ads and banner disclosure now consume the saved member language across English, Arabic, French, Spanish, Portuguese, German, Turkish, Hindi and Chinese. Hausa remains excluded. Known LevelPlay SDK status messages are translated; dynamic provider content may still be in its source language. Step54 checks passed 20/20 and the carried-forward local suite passed 206/206. Arabic RTL and full Expo/Android build/device validation remain pending. No Production SQL or Worker deployment was performed. See `docs/STEP54_SPIN_QUIZ_ADS_LOCALIZATION.md`.

## Latest mobile milestone
- Step55: Arabic right-to-left text/layout support.
- Step56: Android build-readiness preflight (`npm --workspace @vyra/mobile run preflight:android`). This validates source/configuration only; it does not create an APK. See `docs/STEP56_ANDROID_BUILD_READINESS.md`.
## Latest delivery: Step57 — Dependency lockfile readiness

Step57 audited the npm workspace and Codemagic dependency-install workflow. The archive still has no root `package-lock.json`; registry resolution timed out during two generation attempts, so no lockfile was fabricated and CI remains on `npm install`. See `docs/STEP57_DEPENDENCY_LOCKFILE_READINESS.md`. Focused checks: 6/6 passed. This is not a dependency install or Android build.


## Latest delivery: Step58 — Workspace manifest preflight

Step58 adds a static contract test for the root npm workspaces, package identities, shared Web/Admin dependency ranges, Mobile SDK declarations, and Codemagic runtime/install commands. The lockfile generation retry timed out again, so no lockfile was fabricated and CI remains on `npm install`. The Step58 test passes 17/17; this is not a dependency-backed build. See `docs/STEP58_WORKSPACE_MANIFEST_PREFLIGHT.md`.

## Latest delivery: Step59 — Expo Android configuration audit

Step59 adds a repeatable static audit for the actual Expo app config, Android application identity/version, deep-link scheme, permissions, Secure Store and Unity LevelPlay package declarations, Android build scripts, Codemagic prebuild/Gradle/artifact steps, generated-native-folder policy, missing lockfile state, and mobile environment-secret hygiene. Focused checks pass 25/25; all listed carried-forward suites Step31–Step59 pass 317/317. No dependency installation, Expo prebuild, Gradle build, APK/AAB, emulator, or physical-device test is claimed. The root `package-lock.json` remains absent and CI correctly remains on `npm install`. See `docs/STEP59_EXPO_ANDROID_CONFIG_AUDIT.md`.


## Latest delivery: Step60 — Dependency lockfile readiness guard

Step60 adds `npm run check:lockfile`, which requires a genuine npm v3 root lockfile and entries for all three workspaces before deterministic CI installation can be enabled. The Step59 archive still has no root lockfile; registry resolution timed out, so no synthetic lockfile was created. The new focused guard test passes by verifying the expected blocked state. Codemagic remains on `npm install`; no dependency install or Android build is claimed. See `docs/STEP60_LOCKFILE_READINESS.md`.

Step61 adds `npm run preflight:dependencies`, a fail-closed check for the three npm workspaces, Node engine floor, package metadata, and the Expo / React Native / React version pins. Registry-backed lockfile generation timed out and the npm cache was empty, so no synthetic `package-lock.json` was created; Codemagic remains on `npm install`. See `docs/STEP61_DEPENDENCY_RESOLUTION_PREFLIGHT.md`.

## Step61 validation summary

The Step61 dependency-resolution preflight adds a fail-closed manifest check for all three npm workspaces and the mobile Expo / React / React Native versions. The genuine registry-backed lockfile attempt timed out and the npm cache was empty. No synthetic lockfile was created, and Codemagic remains on `npm install`. The Step61 contract test passes 19/19; all 23 available suites from Step31 through Step61 passed when executed. These are source/contract tests, not an installed dependency tree or native Android build. See `docs/STEP61_DEPENDENCY_RESOLUTION_PREFLIGHT.md`.

## Latest delivery: Step62 — npm registry connectivity diagnostic

Step62 adds `npm run diagnose:npm-registry`, a read-only DNS + HTTPS ping diagnostic for `registry.npmjs.org`, plus eight deterministic tests for DNS failures, HTTP failures, request errors, successful reachability and timeout wiring. In this environment the live diagnostic returned `EAI_AGAIN` at DNS resolution; an offline lockfile attempt returned `ENOTCACHED` because the required package metadata is not cached. Therefore no genuine `package-lock.json` could be generated, and Codemagic remains on `npm install`. The diagnostic does not modify npm settings or create a lockfile. The Step62 focused test passes 8/8; all 24 available source/runtime test files executed in this run passed 338/338 checks. No dependency installation, Expo prebuild, Gradle/APK build, device test, SQL/Production change, or Worker deployment is claimed. See `docs/STEP62_NPM_REGISTRY_CONNECTIVITY_DIAGNOSTIC.md`.


## Step63 — npm network root-cause confirmation

See `docs/STEP63_ROOT_CAUSE_AND_REMOTE_AGENT_HANDOFF.md` for the confirmed DNS/network blocker, safe recovery commands, and guidance on using a remote coding agent. No lockfile was fabricated and no build/deployment is claimed.


## Step65 — Codemagic dependency install parity
The Android workflow now uses `npm install --legacy-peer-deps`, matching the install command in the owner's previously built Expo reference app. This only changes peer-dependency resolution behavior; it does not solve DNS/network errors such as `EAI_AGAIN`. Node 22.13.0, Java 17, the three npm workspaces, Expo 58 and the Gradle debug APK task remain unchanged. See `docs/STEP65_CODEMAGIC_INSTALL_PARITY.md`. A live Codemagic run is still required to identify the actual install result.
