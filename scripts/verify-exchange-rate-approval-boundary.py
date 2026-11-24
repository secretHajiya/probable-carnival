#!/usr/bin/env python3
"""Static safety contract checks for exchange-rate proposal/approval boundary."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
migration = (ROOT / 'supabase/migrations/029_exchange_rate_proposals.sql').read_text()
ui = (ROOT / 'apps/admin/src/features/settings/AdminExchangeRates.tsx').read_text()
api = (ROOT / 'apps/admin/src/features/settings/exchangeRateDrafts.ts').read_text()
activation = (ROOT / 'supabase/migrations/030_single_super_admin_exchange_rate_activation.sql').read_text().lower()

checks = [
    ('proposal table has RLS enabled', 'alter table public.exchange_rate_drafts enable row level security' in migration.lower()),
    ('direct anon/authenticated table access revoked', 'revoke all on public.exchange_rate_drafts from anon, authenticated' in migration.lower()),
    ('list RPC is SECURITY DEFINER with empty search_path', 'admin_list_exchange_rate_drafts()' in migration and 'security definer\nset search_path = \'\'' in migration),
    ('save RPC is SECURITY DEFINER with empty search_path', 'admin_save_exchange_rate_draft(' in migration and migration.count('security definer\nset search_path = \'\'') >= 2),
    ('list RPC checks authenticated configuration admin', 'auth.uid() is null or not public.is_configuration_admin()' in migration),
    ('save RPC checks authenticated configuration admin', migration.count('auth.uid() is null or not public.is_configuration_admin()') >= 2),
    ('country/currency must match enabled default configuration', 'cs.default_currency_code = v_currency' in migration and 'cs.is_enabled = true and cu.is_enabled = true' in migration),
    ('proposal amount must be a positive integer', 'p_coins_per_major_unit is null or p_coins_per_major_unit <= 0' in migration),
    ('rationale length is bounded', 'not between 5 and 500' in migration),
    ('proposal migration starts drafts as pending only', "check (status = 'pending')" in migration),
    ('writes use a transaction advisory lock', 'pg_advisory_xact_lock(74102, 24)' in migration),
    ('every upsert records before/after audit data', 'before_data, after_data' in migration and "'exchange_rate_draft_upsert'" in migration and 'v_before' in migration and 'v_after' in migration),
    ('RPC execute grants exclude PUBLIC and anon', migration.count('revoke all on function public.admin_') >= 2 and migration.count('from public, anon') >= 2),
    ('frontend only calls proposal list/save RPCs', "'admin_list_exchange_rate_drafts'" in api and "'admin_save_exchange_rate_draft'" in api),
    ('activation RPC is separate from proposal save/list RPCs', 'admin_activate_exchange_rate_draft' in api and 'admin_save_exchange_rate_draft' in api),
    ('activation RPC requires one active Super Admin', "ar.role='super_admin'" in activation and 'ar.is_active=true' in activation and 'admin_roles_single_active_super_admin_idx' in activation),
    ('activation requires MFA step-up', "v_aal <> 'aal2'" in activation),
    ('frontend has no direct live exchange_rates table write', ".from('exchange_rates')" not in ui + api and '.from(\"exchange_rates\")' not in ui + api),
    ('frontend displays pending and activated states', "status: 'pending' | 'activated'" in api and 'activated' in ui.lower()),
]
failed = []
for name, ok in checks:
    print(('PASS' if ok else 'FAIL') + ' - ' + name)
    if not ok:
        failed.append(name)
print(f'RESULT: {len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    raise SystemExit(1)
