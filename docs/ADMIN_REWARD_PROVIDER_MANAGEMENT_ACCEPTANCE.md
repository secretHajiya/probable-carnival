# Admin Reward Provider Management — Acceptance Checks

## Scope
Admin catalogue management for reward providers and per-platform/per-country external app IDs. This does not implement provider callbacks, survey walls, wallet crediting, reversals, payout, or live-provider verification.

## Database prerequisites
- Migration 021 extends the existing `reward_providers` and `provider_apps` tables from migration 001; it must not create duplicate shadow tables.
- `public.is_configuration_admin()` must exist and authorize only active `admin` / `super_admin` roles; support and finance-reviewer roles must be rejected.
- `public.admin_audit_logs` must contain `actor_user_id`, `action`, `target_type`, `target_id`, `before_data`, and `after_data`.
- Migration `020_admin_country_currency_settings.sql` must be applied first; `public.country_settings` is required by enabled app mappings.
- Apply `021_admin_reward_provider_management.sql` in staging only after checking migration history and schema compatibility.

## Security checks
1. Anonymous and ordinary authenticated users cannot select `reward_providers` or `provider_apps` directly.
2. Anonymous users cannot execute any of the three provider RPCs.
3. Support and finance-reviewer accounts are rejected by provider write RPCs; active admin/super_admin accounts are authorized.
4. An active admin/super_admin can list providers; the result contains only a boolean `secret_configured`, never `secret_reference` or a secret value.
5. Enabling a provider without a syntactically valid server-side secret reference is rejected.
6. Plain secret/token/password values are never entered in the dashboard or stored in these tables. References must be identifiers only.
7. An app mapping cannot be enabled until its provider, operational country, country setting, and default currency are enabled.
8. Every successful provider and app-mapping write produces before/after audit data.
9. New CPX provider row is disabled; no real credentials or CPX app ID are seeded.
10. Duplicate provider/platform/country mappings update one row rather than creating duplicates.

## UI checks
- Provider and mapping forms default to disabled.
- Provider table never displays secret references or secret values.
- Refresh, validation errors, and mobile-width layout work.
- Editing a provider preserves its existing secret reference when the reference field is left blank; the secret value is never shown.

## Release gate
Do not enable CPX or any other provider until the provider's official callback signing, source IP policy, external app ID, country eligibility, idempotent credit, duplicate callback, reversal, and staging end-to-end tests have passed. No live Supabase test or deployment is claimed by this source increment.
