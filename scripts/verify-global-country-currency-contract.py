#!/usr/bin/env python3
"""Static cross-surface checks for NG/US member onboarding and currency display.

Source inspection only: no Supabase, browser, payout Worker, or live user accounts.
"""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parents[1]
def read(path):
    p = ROOT / path
    if not p.is_file(): raise AssertionError(f"missing {path}")
    return p.read_text(encoding='utf-8')
checks=[]
def check(name, ok):
    if not ok: raise AssertionError(name)
    checks.append(name)

migration = read('supabase/migrations/023_global_member_country_onboarding.sql')
web_main = read('apps/web/src/main.tsx')
web_country = read('apps/web/src/country/CountrySelection.tsx')
web_auth = read('apps/web/src/auth/authService.ts')
web_dashboard = read('apps/web/src/dashboard/Dashboard.tsx')
mobile_app = read('apps/mobile/App.tsx')
mobile_service = read('apps/mobile/src/services/member.service.ts')
withdrawals = read('apps/web/src/withdrawals/WithdrawalHistory.tsx')
admin_ui = read('apps/admin/src/features/settings/AdminCountryCurrency.tsx')
admin_service = read('apps/admin/src/features/settings/countryCurrency.ts')

check('Migration seeds only NG/US country and NGN/USD currency metadata', all(x in migration for x in ["('NG', 'Nigeria', 'NGN'", "('US', 'United States', 'USD'", "('NGN', 'Nigerian Naira'", "('USD', 'United States Dollar'"]))
check('Country onboarding does not write to withdrawal_config', not any(x in migration.lower() for x in ['insert into public.withdrawal_config', 'update public.withdrawal_config', 'delete from public.withdrawal_config']))
check('Country RPC requires authenticated identity', 'if auth.uid() is null then' in migration)
check('Country RPC accepts only NG and US', "v_country not in ('NG', 'US')" in migration)
check('Country RPC checks both country and currency are enabled', 'c.is_enabled = true and x.is_enabled = true' in migration)
check('Country RPC locks profile row before one-time selection', 'for update' in migration and 'where id = auth.uid() and country_code is null' in migration)
check('Country RPC rejects changing an existing different country', 'country_already_selected_contact_support' in migration)
check('Country RPC revokes public/anon and grants authenticated only', 'revoke all on function public.set_member_country(text) from public, anon' in migration and 'grant execute on function public.set_member_country(text) to authenticated' in migration)
check('Web routes authenticated members with no country to country selection', 'if (!profile?.country_code) return <CountrySelection' in web_main)
check('Web country selector offers Nigeria and United States explicitly', "setCountry('NG')" in web_country and "setCountry('US')" in web_country)
check('Web country selector saves through set_member_country RPC', 'setMemberCountry(country)' in web_country and "rpc('set_member_country'" in web_auth)
check('Web refreshes profile after successful country save', 'await onSelected()' in web_country and 'refreshProfile' in web_main)
check('Mobile app blocks dashboard until country is selected', 'if (!profile?.country_code) return <Shell>' in mobile_app)
check('Mobile app offers explicit NG and US choices', "setCountry('NG')" in mobile_app and "setCountry('US')" in mobile_app)
check('Mobile country service calls same set_member_country RPC and reloads profile', "rpc('set_member_country'" in mobile_service and 'return this.getProfile(authData.user.id)' in mobile_service)
check('Web dashboard maps NG to NGN and US to USD', "NG: { code: 'NGN'" in web_dashboard and "US: { code: 'USD'" in web_dashboard)
check('Web dashboard uses one shared coin balance field', "available_coins,pending_coins,lifetime_earned_coins" in web_dashboard and ".eq('user_id', user.id)" in web_dashboard)
check('Web dashboard displays conversion only when an active rate exists', 'setCoinsPerMajorUnit(activeRate ? Number(activeRate.coins_per_major_unit) : null)' in web_dashboard and 'Currency conversion rate not configured' in web_dashboard)
check('Withdrawal UI fails closed for missing or disabled country config', "setAvailability({ status: 'disabled'" in withdrawals and '!config.data.is_enabled' in withdrawals)
check('US withdrawal is not routed into Nigeria bank transfer flow', "countryCode !== 'NG'" in withdrawals and "availability.status !== 'enabled'" in withdrawals and 'US PayPal integration is still pending' in withdrawals)
check('Admin country/currency UI explicitly does not configure rates or payouts', 'does not create exchange rates, enable withdrawals, or activate payouts' in admin_ui)
check('Admin country/currency changes use audited database RPCs, not direct table writes', "'admin_upsert_country_setting'" in admin_service and "'admin_upsert_currency_setting'" in admin_service)

print(f'PASS {len(checks)} global country/currency source-contract checks')
for item in checks: print(f'  PASS: {item}')
print('REVIEW NOTE: Admin UI currently manages country/currency metadata only; no exchange-rate management screen was found in the Admin source.')
print('REVIEW NOTE: The Web dashboard reads exchange_rates but displays no money estimate when no active row exists; no exchange rate is seeded by migration 023.')
print('SCOPE: static source inspection only; no browser, Production Supabase, payout, or Android runtime tests were performed.')
