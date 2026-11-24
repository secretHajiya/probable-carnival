# Integration audit — increment 022

## Scope completed in source

- Restored migration 004 wallet read restrictions and member read grants.
- Restored migration 005 withdrawal configuration plus the finance review primitive. The legacy length-only `create_withdrawal_request` implementation was deliberately excluded; migration 013 remains the sole secure token-consuming implementation.
- Restored migration 006 finance overview, withdrawal listing, and audited review RPCs.
- Member withdrawal form now checks the authenticated profile country and active `withdrawal_config` row. It fails closed if the country is not supported, configuration is disabled/missing, or configuration cannot be read. It uses the profile country rather than a hard-coded country value.
- Added root npm workspace scripts to install and build the separate Member Web and Admin Dashboard apps consistently.
- Migration 020 now synchronizes admin-managed country enablement/default currency with the operational `public.countries` table.
- Migration 021 now extends the existing `reward_providers` table and writes app mappings to the existing `provider_apps` table. This removes the schema collision/shadow-table issue between migration 001 and the former provider-management migration. Country/currency and provider configuration writes require the dedicated `is_configuration_admin()` check (admin/super_admin only), not the broader support-admin check.

## Ordered standalone migration chain

1. `001_initial_schema.sql`
2. `002_auth_profiles_i18n.sql`
3. `003_referral_system.sql`
4. `004_wallet_read_safety.sql`
5. `005_withdrawal_workflow.sql`
6. `006_admin_finance_dashboard.sql`
7. `013_secure_payout_details_vault.sql`
8. `014_daily_checkin_rewards.sql`
9. `015_notifications_support.sql`
10. `016_admin_member_directory.sql`
11. `017_admin_security_audit.sql`
12. `018_admin_fraud_review.sql`
13. `019_admin_reward_configuration_read.sql`
14. `020_admin_country_currency_settings.sql`
15. `021_admin_reward_provider_management.sql`

The numbering gap 007–012 is intentional in this consolidated chain: later feature migrations were consolidated into the standalone equivalents shown above. Do not deploy the old Step 10 `create_withdrawal_request` function separately.

## Important deployment behavior

- Migration 020 synchronizes `country_settings` to `countries`. On a clean standalone database, NG remains disabled by the country-settings seed until an authorized admin enables it and NGN is enabled. This does not configure an exchange rate or withdrawal limits.
- Migration 021 uses the existing `reward_providers` UUID identity and `provider_apps` table. Provider and app mapping rows default disabled. CPX remains disabled.
- `withdrawal_config` rows default disabled. The secure create-withdrawal RPC also requires a valid, unexpired, unused token from the payout Worker, a matching active country, an active exchange rate, an allowed amount, and sufficient wallet balance.
- The Member Web and Admin Dashboard remain separate Vite applications. They share Supabase Auth but each has independent routing and deployment origins. The payout Worker must allowlist both exact origins if both use its endpoints.

## Verification performed

- Source-level review of migration dependencies and function/table references.
- `scripts/verify-integration-source.py`: 18/18 source contract checks passed.
- `scripts/secure-payout-source-check.py`: 15/15 payout source checks passed.
- TypeScript syntax transpilation: 34 `.ts` / `.tsx` source files, zero syntax errors. This is not a full semantic typecheck.
- ZIP integrity check after packaging.

## Not verified / still required

- No Supabase staging database was connected; SQL migrations have not been executed against PostgreSQL in this session.
- No dependency installation, full `tsc -b`, Vite build, browser test, or mobile device test was completed. The runtime had no app `node_modules`; standalone `tsc` therefore reports missing React/Supabase packages and cannot be treated as a project typecheck.
- No production `pg_get_functiondef`, RLS, grants, constraints, or schema comparison was performed.
- No Cloudflare Worker deployment, CORS test, rate-limit test, payout reveal test, CPX callback test, or real-money payout was performed.

## Staging acceptance checklist

- [ ] Apply migrations 001–006 and 013–021 in order to an empty staging project.
- [ ] Verify all functions compile and their `SECURITY DEFINER`, `search_path`, grants, and internal authorization checks.
- [ ] Verify member A cannot read member B's wallet, ledger, referrals, notifications, tickets, or withdrawals.
- [ ] Verify normal authenticated members cannot execute admin RPCs successfully.
- [ ] Verify finance reviewers can use finance RPCs but do not gain super-admin-only role inventory.
- [ ] Verify country admin changes update `countries` and disabled countries are rejected by member RPCs.
- [ ] Verify provider app mappings appear through `provider_apps` and disabled mappings are not used for live offers.
- [ ] Verify wallet ledger reconciliation, duplicate provider callbacks, reversals, and concurrency.
- [ ] Verify payout token is one-use, expires, is bound to the correct user/country, and cannot be replayed.
- [ ] Keep withdrawal and CPX enablement off until the complete staging evidence is reviewed.
