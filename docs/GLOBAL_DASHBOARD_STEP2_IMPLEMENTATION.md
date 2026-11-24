# Global Dashboard — Step 2 implementation notes

## Agreed product rules
- Initial country choices: Nigeria (NG) and United States (US).
- NG uses NGN (₦); US uses USD ($).
- Wallet balances remain one shared coin balance. Country selection does not create separate wallets or change coin totals.
- Monetary estimates are calculated only from an active `exchange_rates.coins_per_major_unit` record. No default conversion rate is invented.
- Withdrawal configs remain NG and US: min 5,000 coins, max 500,000 coins, fee 0 bps, `is_enabled=false`.
- Country/currency availability is separate from withdrawal enablement. Migration 023 makes NG/US selectable but does not change either withdrawal config.
- Nigeria payout is bank transfer. US payout is planned for PayPal; it is not implemented in the current payout Worker.

## Source changes in this increment
- `apps/web/src/country/CountrySelection.tsx`: first-login country choice.
- `apps/web/src/auth/authService.ts`: calls `set_member_country` RPC; no direct client write to protected `profiles.country_code`.
- `apps/web/src/main.tsx`: requires country selection before member pages.
- `apps/web/src/dashboard/Dashboard.tsx`: displays NGN/USD and the shared coin balance; monetary estimate only when a valid exchange rate exists.
- `apps/web/src/withdrawals/WithdrawalHistory.tsx`: checks the config for both countries; US cannot fall through to the NG bank-transfer flow.
- `supabase/migrations/023_global_member_country_onboarding.sql`: seeds enabled NG/US country and NGN/USD currency metadata and adds one-time member country-selection RPC.
- Existing Admin Dashboard Country & Currency Management screen is retained; it already uses audited migration 020 RPCs.

## Production deployment status and remaining acceptance
1. Migration 023 has been applied manually by the owner; owner-provided checks confirm NG/US and NGN/USD are enabled, and `set_member_country(text)` exists.
2. Owner-provided EXECUTE check: authenticated=true, anon=false, public=false. Do not rerun migration 023 or migrations 001–022.
3. Build both web apps and resolve actual build errors.
4. Test country selection with a new member profile, then verify the choice persists after sign-out/sign-in.
5. Test NG and US display, shared coins, and missing exchange-rate behavior.
6. Configure approved exchange rates through the controlled admin process before showing currency estimates.
7. Test Admin authorization and all member/admin acceptance cases.
8. Keep both withdrawal configs false. Complete NG bank-transfer and US PayPal integration separately before any enablement.

## Not claimed complete
- Migration 023 application and its country/currency rows and RPC execute privileges are owner-reported as verified in Production.
- Member/Admin builds and browser tests have not passed yet.
- Exchange-rate values have not been approved or seeded by this change.
- US PayPal payout is not implemented.
- Neither withdrawal configuration is enabled (`withdrawal_config.is_enabled=false` for NG and US).
