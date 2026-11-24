#!/usr/bin/env python3
from pathlib import Path
root = Path(__file__).resolve().parents[1]
checks = []
def check(name, condition):
    checks.append((name, bool(condition)))

sql = (root / 'supabase/migrations/029_exchange_rate_proposals.sql').read_text()
ui = (root / 'apps/admin/src/features/settings/AdminExchangeRates.tsx').read_text()
api = (root / 'apps/admin/src/features/settings/exchangeRateDrafts.ts').read_text()
main = (root / 'apps/admin/src/main.tsx').read_text()

check('draft table is separate from live exchange_rates', 'create table if not exists public.exchange_rate_drafts' in sql and 'insert into public.exchange_rates' not in sql and 'update public.exchange_rates' not in sql)
check('draft status cannot be set to active', "status text not null default 'pending' check (status = 'pending')" in sql)
check('RLS enabled and direct client table access revoked', 'alter table public.exchange_rate_drafts enable row level security' in sql and 'revoke all on public.exchange_rate_drafts from anon, authenticated' in sql)
check('list RPC checks configuration admin', 'admin_list_exchange_rate_drafts' in sql and 'not public.is_configuration_admin()' in sql)
check('save RPC checks configuration admin', 'admin_save_exchange_rate_draft' in sql)
check('enabled country and enabled default currency required', 'cs.is_enabled = true and cu.is_enabled = true' in sql)
check('positive integer coin rate validated', 'p_coins_per_major_unit <= 0' in sql)
check('audit log records before and after values', "'exchange_rate_draft_upsert'" in sql and 'before_data, after_data' in sql)
check('RPC execute granted only to authenticated role', 'grant execute on function public.admin_list_exchange_rate_drafts() to authenticated' in sql and 'grant execute on function public.admin_save_exchange_rate_draft(text, text, bigint, text) to authenticated' in sql)
check('frontend calls only draft RPCs', 'admin_list_exchange_rate_drafts' in api and 'admin_save_exchange_rate_draft' in api and 'exchange_rates' not in api)
check('UI explicitly warns proposals do not activate live rates', 'does not activate live rates' in ui and 'pending proposal only' in ui)
check('UI requires a reason / approval reference', 'Reason / approval reference' in ui and 'required minLength={5}' in ui)
check('Admin Dashboard navigation and route exist', "'exchangeRates'" in main and "setActiveView('exchangeRates')" in main and '<AdminExchangeRates' in main)
check('migration number follows existing 028', (root / 'supabase/migrations/028_levelplay_interstitial_banner.sql').exists() and (root / 'supabase/migrations/029_exchange_rate_proposals.sql').exists() and (root / 'supabase/migrations/030_single_super_admin_exchange_rate_activation.sql').exists())

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(('PASS' if ok else 'FAIL') + ' - ' + name)
print(f'RESULT: {len(checks)-len(failed)}/{len(checks)} checks passed')
if failed:
    raise SystemExit(1)
