# Migration 023 — Source Review

Review date: 2026-11-21
Scope: local source review only; no Supabase connection or Production write was performed.

## Result

The source migration is consistent with the archived schema definitions in migrations 001 and 020:

- `public.countries` has `code`, `name`, `currency_code`, and `is_enabled`; `code` is the primary key.
- `public.profiles.country_code` is `char(2)` and references `public.countries(code)`.
- `public.country_settings` and `public.currency_settings` are created in migration 020 with the columns referenced by migration 023; their country/currency codes are primary keys.
- The migration seeds NG/US and NGN/USD as enabled for onboarding. It also aligns `public.countries` with those codes and enables those country records for general eligibility.
- `set_member_country(text)` is `SECURITY DEFINER`, has an empty search path, requires `auth.uid()`, allows only NG/US, verifies enabled country/currency metadata, locks the member profile row, and rejects changing an existing country through this RPC. Execute is revoked from `PUBLIC` and `anon`, then granted to `authenticated`.
- Migration 023 contains no reference to `public.withdrawal_config` and does not change `is_enabled` for either withdrawal row. Country availability and withdrawal availability remain separate controls.

## Important deployment distinction

`countries.is_enabled=true`, `country_settings.is_enabled=true`, and `currency_settings.is_enabled=true` allow NG/US to be offered for member onboarding and currency display. They do **not** enable withdrawals. The two `withdrawal_config` rows must remain `is_enabled=false`.

## Deployment status — updated after owner verification

- [x] Local source review complete.
- [x] Owner reports applying this migration manually in Supabase SQL Editor.
- [x] Owner-provided read-only output confirms NG/US and NGN/USD metadata enabled and `set_member_country(text)` exists.
- [x] Owner-provided privilege output confirms authenticated EXECUTE=true, anon=false, public=false.
- [x] Owner rechecked both NG and US `withdrawal_config.is_enabled=false`.
- [ ] Run web builds and browser acceptance tests.

Do not rerun migration 023 or migrations 001–022. The Production facts above are owner-reported; this review is not a direct database connection or independent live test.
