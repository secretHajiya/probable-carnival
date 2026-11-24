# Local Source Check Report — 2026-11-21 (Global Dashboard update)

Project: `vyra-rewards-global-standalone`

## Static source checks

| Check suite | Result |
|---|---:|
| Integration source contract checks | 18/18 passed |
| Secure payout source checks | 17/17 passed |
| CPX source checks | 10/10 passed |
| Global Dashboard source checks | 13/13 passed |
| **Total** | **58/58 passed** |

These checks inspect source contracts and safeguards. They do not prove runtime behavior or successful deployment.

## Global Dashboard source changes

- Added `supabase/migrations/023_global_member_country_onboarding.sql` for NG/US country and NGN/USD currency metadata, plus authenticated one-time member country selection RPC.
- Added first-login country selection UI (Nigeria / United States).
- Added currency/country display to the Member Dashboard while retaining one shared coin balance.
- Monetary estimates are shown only if an active `exchange_rates` row exists; this change does not invent or seed conversion rates.
- Withdrawal UI checks both NG and US configuration and cannot route US members into Nigeria bank transfer. US PayPal remains unimplemented.
- Existing Admin Country & Currency Management screen is reused; no duplicate admin module was created.
- Updated project status documents to reflect manually applied Production migrations, owner-reported 24 tables / RLS / 27 policies, completed CPX Cloudflare Worker, and confirmed NG/US withdrawal configs both disabled.

## Build attempt and limitation

`npm install --ignore-scripts --no-audit --no-fund` timed out after 120 seconds in this runtime. No `node_modules` or `package-lock.json` was created. A direct TypeScript check therefore reports missing `react`, `react/jsx-runtime`, and `@supabase/supabase-js` modules. A valid dependency-backed build cannot be claimed.

## Not tested / not claimed

- Migration 023 was subsequently applied manually by the owner in Production. The owner verified NG/US country rows, NGN/USD currency rows, function existence, and `set_member_country(text)` execute privileges (`authenticated=true`, `anon=false`, `public=false`).
- No live Supabase or Cloudflare changes were made by this local work.
- No browser smoke test, real account onboarding test, Admin authorization matrix, or E2E withdrawal test was run.
- No signed Android build or physical-device test was run.
- NG and US withdrawal configs remain as owner-confirmed: min 5,000, max 500,000, fee 0, `is_enabled=false`.

## Next safe sequence

1. Do not rerun migration 023; it has been applied and verified by the owner.
2. On a machine with npm registry access, run `npm install` and `npm run build` from this directory.
3. Browser-test new NG and US member onboarding, currency labels, shared coin balance, and missing-rate behavior.
4. Test Admin authorization for each role.
5. Keep both withdrawals disabled until NG bank transfer and US PayPal have separate completed acceptance tests and explicit approval.
