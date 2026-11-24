#!/usr/bin/env python3
"""Static checks for least-privilege Admin Dashboard navigation."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ui = (ROOT / 'apps/admin/src/main.tsx').read_text()
roles = (ROOT / 'supabase/migrations/001_initial_schema.sql').read_text()
config = (ROOT / 'supabase/migrations/020_admin_country_currency_settings.sql').read_text()
finance = (ROOT / 'supabase/migrations/006_admin_finance_dashboard.sql').read_text()
checks = [
    ('UI obtains finance capability from the existing database helper', "rpc('is_finance_admin')" in ui),
    ('UI obtains configuration capability from the existing database helper', "rpc('is_configuration_admin')" in ui),
    ('capability lookup fails closed on errors', 'finance: !finance.error && finance.data === true' in ui and 'configuration: !configuration.error && configuration.data === true' in ui),
    ('role capability loading is shown before rendering admin tools', 'Checking administrator permissions' in ui),
    ('configuration screens are explicitly guarded', "configurationViews.includes(activeView) && !capabilities.configuration" in ui),
    ('configuration navigation is hidden unless configuration capability is true', "{capabilities.configuration && <>" in ui and "onClick={()=>setActiveView('exchangeRates')}" in ui),
    ('non-finance admins do not receive finance dashboard data view', 'if (!capabilities.finance || accessDenied)' in ui),
    ('non-finance landing page explicitly hides finance and payout data', 'Finance dashboard access is not assigned' in ui and 'payout details and finance review actions are hidden' in ui),
    ('support role remains an active admin role in database policy', "'support','finance_reviewer','admin','super_admin'" in roles),
    ('finance capability remains limited to finance_reviewer/admin/super_admin', "'finance_reviewer','admin','super_admin'" in roles),
    ('configuration capability remains limited to admin/super_admin', "'admin','super_admin'" in config),
    ('finance RPCs retain server-side finance-admin checks', finance.count('public.is_finance_admin()') >= 3),
    ('configuration RPCs retain server-side configuration-admin checks', config.count('public.is_configuration_admin()') >= 3),
    ('role inventory remains super-admin-only at database layer', "ar.role = 'super_admin'" in (ROOT / 'supabase/migrations/017_admin_security_audit.sql').read_text()),
]
failed=[]
for label, ok in checks:
    print(('PASS' if ok else 'FAIL') + ' - ' + label)
    if not ok: failed.append(label)
print(f'RESULT: {len(checks)-len(failed)}/{len(checks)} checks passed')
if failed: raise SystemExit(1)
