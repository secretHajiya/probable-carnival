from pathlib import Path
root=Path(__file__).resolve().parents[1]
sql=(root/'supabase/migrations/030_single_super_admin_exchange_rate_activation.sql').read_text().lower()
ui=(root/'apps/admin/src/features/settings/AdminExchangeRates.tsx').read_text()
svc=(root/'apps/admin/src/features/settings/exchangeRateDrafts.ts').read_text()
checks={
 'active super_admin role required': "ar.role='super_admin'" in sql and 'ar.is_active=true' in sql,
 'MFA aal2 required': "v_aal <> 'aal2'" in sql,
 'atomic pending-only transition': "v_draft.status <> 'pending'" in sql and "status='activated'" in sql,
 'live rate previous row closed': 'set effective_to=v_now' in sql,
 'new live rate inserted': 'insert into public.exchange_rates' in sql,
 'audit records old and new rate': "'previous_live_rates',v_old" in sql and "'coins_per_major_unit',v_new.coins_per_major_unit" in sql,
 'RPC execute limited to authenticated': 'to authenticated' in sql and 'from public,anon' in sql,
 'UI explicit confirmation': 'window.confirm' in ui,
 'UI exposes approve activate': 'Approve &amp; Activate' in ui,
 'client calls guarded RPC': 'admin_activate_exchange_rate_draft' in svc,
 'no second approver requirement': 'no second approver is required' in (root/'STEP28_SINGLE_SUPER_ADMIN_EXCHANGE_RATE_APPROVAL.md').read_text().lower(),
}
for label,ok in checks.items(): print(('PASS' if ok else 'FAIL')+' '+label)
print(f'{sum(checks.values())}/{len(checks)} PASS')
raise SystemExit(0 if all(checks.values()) else 1)
