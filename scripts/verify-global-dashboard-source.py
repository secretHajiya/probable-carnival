from pathlib import Path
root = Path(__file__).resolve().parents[1]
checks = []
def check(label, ok):
    checks.append((label, bool(ok)))

migration = (root / 'supabase/migrations/023_global_member_country_onboarding.sql').read_text()
main = (root / 'apps/web/src/main.tsx').read_text()
selector = (root / 'apps/web/src/country/CountrySelection.tsx').read_text()
auth = (root / 'apps/web/src/auth/authService.ts').read_text()
dashboard = (root / 'apps/web/src/dashboard/Dashboard.tsx').read_text()
withdrawals = (root / 'apps/web/src/withdrawals/WithdrawalHistory.tsx').read_text()
admin_main = (root / 'apps/admin/src/main.tsx').read_text()
admin_settings = (root / 'apps/admin/src/features/settings/AdminCountryCurrency.tsx').read_text()

check('023 is a new migration and includes both NG and US', "('NG', 'Nigeria', 'NGN'" in migration and "('US', 'United States', 'USD'" in migration)
check('023 makes NGN and USD selectable without touching withdrawal_config', 'currency_settings' in migration and 'insert into public.withdrawal_config' not in migration.lower() and 'update public.withdrawal_config' not in migration.lower())
check('023 adds authenticated SECURITY DEFINER country RPC', 'function public.set_member_country' in migration and 'security definer' in migration and 'grant execute' in migration)
check('country RPC only accepts NG and US', "v_country not in ('NG', 'US')" in migration)
check('country choice is one-time', 'country_already_selected_contact_support' in migration)
check('member app blocks dashboard until country is selected', 'if (!profile?.country_code) return <CountrySelection' in main)
check('country picker offers Nigeria and United States', 'Nigeria' in selector and 'United States' in selector)
check('country selection uses RPC, not direct profile write', "rpc('set_member_country'" in auth)
check('dashboard uses shared coin balance and country currency metadata', 'wallet?.available_coins' in dashboard and 'COUNTRY_CURRENCY' in dashboard)
check('dashboard does not invent conversion rates', 'exchange_rates' in dashboard and 'Currency conversion rate not configured' in dashboard)
check('US cannot fall through to NG bank transfer', "countryCode !== 'NG'" in withdrawals and 'US PayPal integration is still pending' in withdrawals)
check('existing Admin Country & Currency screen is routed and retained', 'AdminCountryCurrency' in admin_main and 'AdminCountryCurrency' in admin_settings)
check('NG and US payout configs remain false in documented status', 'is_enabled=false' in (root / 'docs/OWNER_REPORTED_STATUS_AND_REMAINING_WORK.md').read_text())

for label, ok in checks:
    print(('PASS' if ok else 'FAIL') + ' - ' + label)
print(f'\n{sum(ok for _, ok in checks)}/{len(checks)} global dashboard source checks passed')
raise SystemExit(0 if all(ok for _, ok in checks) else 1)
