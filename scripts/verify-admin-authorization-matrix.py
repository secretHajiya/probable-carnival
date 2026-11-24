#!/usr/bin/env python3
"""Static authorization boundary checks for Vyra Rewards Global web/admin source.

This is source inspection only. It does not connect to Supabase or prove live RLS behavior.
"""
from pathlib import Path
import re, sys
ROOT=Path(__file__).resolve().parents[1]
def read(path):
    p=ROOT/path
    if not p.is_file(): raise AssertionError(f"missing {path}")
    return p.read_text(encoding='utf-8')
checks=[]
def check(name, condition):
    if not condition: raise AssertionError(name)
    checks.append(name)

admin=read('apps/admin/src/main.tsx')
web_main=read('apps/web/src/main.tsx')
auth_provider=read('apps/web/src/auth/AuthProvider.tsx')
roles=read('supabase/migrations/001_initial_schema.sql')
finance=read('supabase/migrations/006_admin_finance_dashboard.sql')
members=read('supabase/migrations/016_admin_member_directory.sql')
security=read('supabase/migrations/017_admin_security_audit.sql')
country=read('supabase/migrations/020_admin_country_currency_settings.sql')
fraud=read('supabase/migrations/018_admin_fraud_review.sql')
spin=read('supabase/migrations/024_spin_wheel_rewards.sql')
quiz=read('supabase/migrations/025_secure_quiz_rewards.sql')
client_files=list((ROOT/'apps').glob('**/*'))
client_text='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in client_files if p.is_file() and p.suffix in {'.ts','.tsx','.js','.jsx'})

check('Member Web blocks dashboard access when no authenticated user exists', 'if (!user) return <AuthScreen />' in web_main)
check('Member Web fails closed when profile loading fails', 'if (profileError) return' in web_main)
check('Member Web requires country selection before member features', '!profile?.country_code' in web_main)
check('Member auth provider restores session and subscribes to auth state changes', 'auth.getSession()' in auth_provider and 'onAuthStateChange' in auth_provider)
check('Admin app does not treat a valid Supabase session as sufficient; it calls is_active_admin()', "rpc('is_active_admin')" in admin and 'adminGate' in admin)
check('Admin gate fails closed on RPC error or non-true result', "!error && data === true ? 'allowed' : 'denied'" in admin)
check('is_active_admin requires an active row and one of the four declared roles', "ar.is_active = true" in roles and "('support','finance_reviewer','admin','super_admin')" in roles)
check('Finance read/list/review RPCs each enforce is_finance_admin()', len(re.findall(r'not public\.is_finance_admin\(\)', finance)) >= 3)
check('Finance role helper excludes support-only accounts', "('finance_reviewer','admin','super_admin')" in roles)
check('Member directory RPC enforces active-admin authorization', 'not public.is_active_admin()' in members)
check('Admin role inventory is restricted to super_admin', "ar.role = 'super_admin'" in security)
check('Country/currency configuration role helper limits access to admin/super_admin', "ar.role in ('admin','super_admin')" in country)
check('Fraud review read/write RPCs enforce active-admin authorization', len(re.findall(r'not public\.is_active_admin\(\)', fraud)) >= 2)
check('Spin configuration writes enforce active-admin authorization', 'not public.is_active_admin()' in spin)
check('Quiz configuration writes enforce active-admin authorization', 'not public.is_active_admin()' in quiz)
check('Client source uses only anon-key env variable name; no service-role key literal', 'VITE_SUPABASE_SERVICE_ROLE_KEY' not in client_text and 'service_role' not in client_text.lower())
check('Admin UI loads finance and configuration capabilities from database helpers', "rpc('is_finance_admin')" in admin and "rpc('is_configuration_admin')" in admin)
check('Configuration views are hidden behind a client capability check', "configurationViews.includes(activeView) && !capabilities.configuration" in admin)
check('Finance dashboard is not rendered to non-finance admins', 'if (!capabilities.finance || accessDenied)' in admin)

print(f'PASS {len(checks)} source authorization checks')
for item in checks: print(f'  PASS: {item}')
print('REVIEW NOTE: client navigation is now least-privilege filtered using existing database capability helpers; server RPC guards remain authoritative.')
print('SCOPE: static source checks only; no browser, Supabase Production, user-role accounts, or RLS requests were exercised.')
