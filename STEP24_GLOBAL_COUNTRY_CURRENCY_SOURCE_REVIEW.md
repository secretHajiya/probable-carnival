# Step 24 — Global Country & Currency Source Contract Review

Date: 2026-11-23
Base: cumulative Master Step23 Admin Authorization Source Review ZIP.

## Result

- 22/22 focused static source-contract checks passed.
- The NG/US country-selection contract is consistent across Member Web and the React Native mobile app: both offer NG and US, both call the same authenticated `set_member_country(text)` RPC, and both require a selected country before showing the member dashboard.
- Migration 023 accepts only NG/US, checks that country and default currency are enabled, locks the member profile row, prevents changing a previously selected different country, and grants execution to `authenticated` while revoking `public` and `anon`.
- Country onboarding does not write to `withdrawal_config`.
- The Web dashboard uses one shared coin balance and maps NG to NGN and US to USD. It only displays a money estimate when it finds an active exchange-rate row.
- Withdrawal UI fails closed for missing/disabled configurations and does not route US members into the Nigeria bank-transfer form.
- Admin country/currency changes use the audited database RPCs.

## Remaining findings

1. The Admin source currently has a Country & Currency metadata screen, but no exchange-rate management screen was found. The dashboard can read `exchange_rates`, but migration 023 does not seed a rate. Until an approved active rate is configured, the UI correctly withholds the local-currency estimate.
2. No exchange rates were invented or inserted. No Production database was contacted or changed.
3. Support / Finance Reviewer frontend menu scope remains the separate open question recorded in Step23; this step does not alter role permissions.

## Scope and limitations

- Static source inspection only; no browser tests, real NG/US member sessions, Production Supabase requests, payout calls, or Android runtime tests were performed.
- No SQL was run and no migrations were applied.
- No CPX or LevelPlay Worker source/configuration was changed or deployed.
- Dependency installation and Web/Admin builds remain pending because the prior npm install attempt timed out and registry access was unavailable (`EAI_AGAIN`).
- Withdrawal configs remain disabled; this step does not authorize activation.

## Added files

- `scripts/verify-global-country-currency-contract.py`
- `STEP24_GLOBAL_COUNTRY_CURRENCY_SOURCE_REVIEW.md`
