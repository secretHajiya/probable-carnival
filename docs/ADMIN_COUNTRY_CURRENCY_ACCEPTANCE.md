# Admin Country & Currency Management — Acceptance Checks

## Scope
Admin-managed ISO country/currency metadata and country enablement. Migration 020 synchronizes country code, name, default currency and enabled state to `public.countries`, which is used by member eligibility and withdrawal RPCs. This feature does not create exchange rates, withdrawal limits, bank validation, or payout-provider credentials.

## Database prerequisites
- Apply migrations 001–006 and 013–019 before migration 020 in the standalone sequence.
- `public.admin_audit_logs` must contain actor/action/target/before/after fields.
- `public.is_configuration_admin()` must authorize only active `admin` and `super_admin` roles. Support and finance-reviewer roles must not be able to change country/currency configuration.
- Migration 020 must be applied in staging after checking the existing migration history and country rows.

## Security and consistency checks
1. Anonymous and ordinary authenticated users cannot read country/currency/app settings tables directly.
2. Anonymous and ordinary authenticated users cannot execute configuration RPCs successfully.
3. Support and finance-reviewer roles are rejected by country/currency write RPCs.
4. Active admin/super_admin can list settings and make audited changes.
5. A country cannot be enabled until its default currency exists and is enabled.
6. A valid country update synchronizes `country_settings` and `public.countries` in the same transaction.
7. Disabling a country also disables its existing provider app mappings in `public.provider_apps`.
8. Disabling a currency used by an enabled country is rejected.
9. New NG / NGN settings are seeded disabled. This does not configure an exchange rate or enable withdrawals.
10. Each successful change writes before/after audit data.

## UI checks
- New currency and country forms default to disabled.
- Timezone values are validated by PostgreSQL against `pg_timezone_names`.
- Refresh, validation errors, and mobile-width layout work.
- Disabled country/currency state is visible to admins.

## Release gate
Do not enable a country for real rewards or withdrawals until the operational country row, exchange rate, provider availability, reward rules, withdrawal limits, and payout workflow have each been verified in staging. No live Supabase test or deployment is claimed by this source increment.
