# Vyra Rewards Global — React Native Conversion Plan

## Verified source baseline (22 Nov 2026)
- `apps/web` is the current member-facing React 19 + Vite web app.
- `apps/admin` is a separate React 19 + Vite admin dashboard and remains a web app.
- `apps/mobile` is the new Expo / React Native Android member-app workspace.
- Supabase remains the shared backend; existing migrations and Cloudflare CPX Worker are retained.

## Target repository layout
- `apps/mobile`: React Native Android member app (Expo prebuild; Codemagic CI).
- `apps/admin`: keep React/Vite; no need to convert admin to React Native.
- `apps/web`: retain as web/PWA fallback until mobile feature parity and acceptance tests are complete.
- `supabase` and `cloudflare`: retain backend, migrations and callbacks.

## Step 01 delivered
- Added Expo SDK 58 / React Native 0.88 mobile workspace.
- Added Supabase client with SecureStore-backed auth persistence.
- Added initial sign-in, registration/email OTP, country selection via `set_member_country`, and live wallet read.
- Added Unity LevelPlay React Native dependency 9.5.0. No credentials or fake rewards added.

## Step 02 delivered
- Added Codemagic Android debug-build workflow at repository root.
- Updated Expo Android application configuration and removed unused EAS project-ID placeholder.
- Added CI build notes and mobile typecheck / prebuild scripts.
- Workflow generates Android native project during CI; generated `android/` is not committed.

## Step 03 delivered — mobile foundation and backend services
- Added typed member domain contracts for supported country, profile, wallet and member snapshot.
- Extracted Supabase authentication operations into `auth.service.ts` (signup, signup OTP, sign-in, sign-out).
- Extracted profile/wallet reads and the existing `set_member_country` RPC into `member.service.ts`.
- Updated the initial app shell to use the service layer rather than issuing profile/wallet queries inline.
- Missing wallet records are now displayed as unavailable rather than being represented as a real zero balance.
- Added `apps/mobile/MOBILE_ARCHITECTURE.md` documenting the architecture, verified repository contracts and security invariants.
- No Production SQL migration or withdrawal setting was changed.

## Security and production constraints
- Mobile app contains only Supabase URL and anon key; never service-role, CPX hash, or LevelPlay S2S private key.
- Rewarded Ads require Unity S2S callback, signature verification, idempotency and server-side wallet credit. Mobile reward callbacks are not proof of payment.
- Keep NG/US withdrawal configurations disabled. Keep Spin & Win and Quiz configs disabled unless separately authorized.
- Never replay already-applied migrations 001–006 and 014–025 in Production.

## Remaining conversion slices
1. Complete the mobile dashboard and migrate member features screen-by-screen: earn/CPX, referral, check-in, support, quiz, spin, and withdrawal history (read-only until withdrawals are authorized).
2. Add LevelPlay native initialization and rewarded-ad lifecycle, then Cloudflare S2S verification plus forward-only Supabase migration for idempotency and admin configuration.
3. Run typecheck, Android debug/release builds, device tests, RLS/security and callback replay tests before production activation.
4. Only after full parity and review, prepare signed release and GitHub/Codemagic release flow.

## Honest validation status
- ZIP integrity and archive contents checked for this step.
- No dependency install, TypeScript check, Expo prebuild, Codemagic build, Android Gradle build, device test, or live Supabase test was run.


## Step 04 — Native Member Dashboard
- Added Home, Earn, Activity, and Profile tabs using native React Native components.
- Added pull-to-refresh for the member profile and wallet snapshot.
- Reward integrations remain clearly marked pending; no fake rewards or client-side wallet crediting.
- Admin Dashboard remains web-based.


## Step 05 — CPX Android offerwall integration (source prepared)
- Authenticated native request to `cpx-wall-config` using the Android platform mapping.
- URL host validation and external-browser launch; wallet refresh on return.
- Existing Cloudflare callback Worker preserved.
- Requires updated Edge Function deployment and Admin Android mapping verification before production use.
- No SQL migration or live deployment performed.


## Step 06 — Native Spin & Win integration
- Added Android Spin & Win screen and typed service using the existing `spin_wheel()` RPC.
- Server remains authoritative for random selection, daily limits, history, and wallet credit.
- Feature remains disabled by default; no migration or withdrawal setting changed.


## Step 07 — Native Quiz Rewards (implemented in source; runtime validation pending)
- Added typed mobile RPC client for `get_quiz_question` and `submit_quiz_answer`.
- Added native quiz question/answer panel with server-only grading and wallet refresh after confirmed reward.
- Reuses already-applied Migration 025; no new SQL required. Quiz remains disabled by default.


## Step 08 — Daily Check-in Android integration

Added a native Daily Check-in panel and service using the already-applied migration 014 contract. Member history is read through RLS; claims use `claim_daily_checkin()` and wallet refresh follows only a server-confirmed claim. No new SQL, no config enablement, and no withdrawal changes. See `apps/mobile/DAILY_CHECKIN_ANDROID_STEP08.md`.


## Step 09 — Unity LevelPlay Rewarded Ads foundation
- Added a typed React Native LevelPlay 9.5.0 rewarded-ad service and Earn screen panel.
- Uses the authenticated Supabase UUID in LevelPlay dynamic user ID format (32 hex characters).
- Client `onAdRewarded` is informational only; no client-side wallet credit.
- Added fail-closed env gates; S2S-ready flag remains false.
- Added Android AD_ID permission for current LevelPlay Android integration requirements.
- Cloudflare LevelPlay S2S callback, event idempotency migration, actual dashboard identifiers, and device build remain pending.
