# Step 16 — Member App + Admin Dashboard Cross-App Audit

Date: 2026-11-22
Scope: static source audit of `apps/mobile`, `apps/admin`, Supabase migrations and the LevelPlay Cloudflare Worker. No production endpoint was contacted.

## Confirmed architecture

- `apps/mobile` is the Expo / React Native Android member app.
- `apps/admin` is the separate React / Vite Admin Dashboard.
- `apps/web` remains the legacy/fallback member web app during migration.
- Both frontends use the public Supabase URL + anon key only. The mobile Supabase client persists auth through Expo SecureStore.
- Admin entry checks `is_active_admin()` and fails closed; sensitive feature RPCs retain their own server-side authorization.
- Member wallet reads come from `profiles` and `wallet_accounts`; reward panels call server-side RPCs rather than crediting coins in the client.
- CPX Android offerwall URL is requested from the backend for the signed-in user; the active CPX callback remains the Cloudflare Worker, not the old Edge Function.

## Cross-app feature wiring reviewed

| Feature | Member app | Admin app | Backend authority | Static result |
|---|---|---|---|---|
| Wallet/profile | `member.service.ts` | Finance overview / member directory | Supabase RLS + RPC | Connected in source |
| CPX | `cpx.service.ts` | Reward Providers | CPX callback Worker + `process_cpx_reward` | Source contract present; NG mapping only |
| Spin & Win | `SpinWheelPanel` | `AdminSpinWheel` | `spin_wheel()` + config RPC | Connected; default disabled |
| Quiz | `QuizRewardsPanel` | `AdminQuizRewards` | quiz RPCs | Connected; default disabled |
| Daily check-in | `DailyCheckinPanel` | no separate admin switch in current route inventory | `claim_daily_checkin()` | Member RPC path present |
| LevelPlay | `RewardedAdsPanel` + LevelPlay service | `AdminLevelPlay` | S2S Worker + `process_levelplay_reward` | Partial integration; see blocker below |
| Withdrawals | Member flow remains fail-closed | Finance review | audited finance RPCs + payout Worker | Keep both countries disabled |

## Release-blocking integration gap found — LevelPlay configuration split

The Admin Dashboard saves LevelPlay settings in `levelplay_reward_config` through `admin_update_levelplay_reward_config`. The member app does **not** read an authorized runtime member-facing configuration from that database setting. Instead, its native service uses build-time Expo variables:

- `EXPO_PUBLIC_LEVELPLAY_APP_KEY`
- `EXPO_PUBLIC_LEVELPLAY_REWARDED_AD_UNIT_ID`
- `EXPO_PUBLIC_LEVELPLAY_REWARDED_PLACEMENT`
- `EXPO_PUBLIC_LEVELPLAY_S2S_READY`

Therefore changing the Admin setting alone does not configure or activate the mobile app. This is a configuration drift risk, not a reason to enable the feature. Keep `EXPO_PUBLIC_LEVELPLAY_S2S_READY=false` and the database config disabled until a separately reviewed runtime/config strategy and full S2S end-to-end test are implemented.

Do not expose the S2S private key or service-role key to either frontend. Do not create a public RPC that returns sensitive configuration. A future member-facing RPC should return only explicitly safe public fields, verify account/country eligibility, and preserve the database enabled flag as the authoritative kill switch.

## Build / validation result

- Existing static contract scripts: passed (admin inventory 11/11, CPX Worker 11/11, CPX callback 10/10, global dashboard 13/13, integration source 18/18, LevelPlay Admin 12/12, secure payout 17/17).
- LevelPlay Worker local contract tests: passed. Tests use mocked Supabase RPC responses; no Production endpoint was contacted.
- LevelPlay Worker `node --check`: passed.
- Admin `tsc -b`: blocked because workspace dependencies are absent (`react`, `@supabase/supabase-js`, JSX runtime types unavailable). This output is not a valid source-level typecheck result.
- Mobile `tsc --noEmit`: blocked because Expo/React Native/Supabase dependencies and Expo base tsconfig are absent. This output is not a valid source-level typecheck result.
- No npm install, web build, admin build, Expo prebuild, Gradle build, APK/AAB build, browser test, live Supabase test or Cloudflare deployment was performed.

## Production safeguards retained

- Do not replay migrations 001–026; the owner reported the applicable migrations through 026 already applied manually in Production.
- Do not replace or deploy over the active CPX Cloudflare Worker.
- Do not enable LevelPlay, Spin & Win, Quiz or withdrawals in Production without explicit approval and completed end-to-end verification.
- No provider secrets or service-role keys are included in frontend configuration.

## Next required engineering work

1. Resolve the LevelPlay Admin-to-member configuration split with a least-privilege design and tests.
2. Install dependencies only in the intended build environment, then run Admin and legacy web builds plus mobile typecheck.
3. Fix any real compiler/runtime errors revealed by those dependency-backed checks.
4. Run Expo prebuild and Android Gradle build in Codemagic after source/build checks pass.
5. Perform staging authorization, RLS, callback replay/reversal and wallet reconciliation tests before any production feature activation.
