# Step 08 — Daily Check-in & Streak (Android)

## Production contract reviewed

This implementation follows the existing `supabase/migrations/014_daily_checkin_rewards.sql` migration and the existing web member implementation at `apps/web/src/checkins/DailyCheckin.tsx`.

- History: authenticated member reads only their own `daily_checkins` rows (`checkin_date`, `streak_day`, `reward_coins`), ordered newest first. Existing RLS enforces ownership.
- Claim: calls `public.claim_daily_checkin()` with no client-supplied reward, date, timezone, or user ID.
- The database function checks authentication, active account, `daily_checkin_config.is_enabled`, configured reward amount/timezone, and duplicate same-day claims. It writes the check-in and wallet ledger and updates the wallet in one database transaction.
- The returned `available_coins` is the server-confirmed balance. The mobile app refreshes its wallet snapshot after a successful claim.
- A disabled configuration returns `daily_checkin_disabled`; the app displays that as a normal unavailable state. No client-side reward fallback exists.

## Production safety

- No SQL migration added; the existing migration is reused. Do not rerun migration 014.
- Do not enable `daily_checkin_config` as part of this code change. Admin must explicitly configure and enable it when ready.
- No changes to the CPX Cloudflare Worker, CPX callback, Spin & Win, Quiz, or withdrawal configuration.
- No wallet balance is calculated or credited on-device.

## Validation

Archive integrity and source-level integration checks were performed when packaging. No npm install, TypeScript compiler, Expo prebuild, Android Gradle build, device test, or live Production RPC test was run.
