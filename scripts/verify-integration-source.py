#!/usr/bin/env python3
"""Source-level contract checks for the Vyra standalone integration bundle."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name: str, condition: bool):
    checks.append((name, bool(condition)))

migrations = ROOT / "supabase/migrations"
m004 = (migrations / "004_wallet_read_safety.sql").read_text()
m005 = (migrations / "005_withdrawal_workflow.sql").read_text()
m006 = (migrations / "006_admin_finance_dashboard.sql").read_text()
m013 = (migrations / "013_secure_payout_details_vault.sql").read_text()
m020 = (migrations / "020_admin_country_currency_settings.sql").read_text()
m021 = (migrations / "021_admin_reward_provider_management.sql").read_text()
withdrawals = (ROOT / "apps/web/src/withdrawals/WithdrawalHistory.tsx").read_text()
cpx = (ROOT / "supabase/functions/cpx-wall-config/index.ts").read_text()
web_main = (ROOT / "apps/web/src/main.tsx").read_text()
admin_main = (ROOT / "apps/admin/src/main.tsx").read_text()
workspace = (ROOT / "package.json").read_text()

check("004 wallet read-safety migration exists", "wallet_ledger" in m004 and "revoke insert, update, delete" in m004)
check("005 defines withdrawal_config", "create table if not exists public.withdrawal_config" in m005)
check("005 does not install legacy token-only create RPC", "create or replace function public.create_withdrawal_request" not in m005)
check("005 contains finance review primitive", "create or replace function public.review_withdrawal_request" in m005)
check("006 contains finance overview/list/audited review RPCs", all(x in m006 for x in ("admin_get_finance_overview", "admin_list_withdrawals", "admin_review_withdrawal_audited")))
check("013 owns the secure token-consuming create RPC", "create or replace function public.create_withdrawal_request" in m013 and "token_hash" in m013 and "consumed_at" in m013)
check("020 uses configuration-admin role gate", "is_configuration_admin" in m020 and "role in ('admin','super_admin')" in m020)
check("020 synchronizes country settings to operational countries", "insert into public.countries" in m020 and "update public.provider_apps set is_enabled=false" in m020)
check("021 adapts existing provider tables, no shadow provider tables", "alter table public.reward_providers" in m021 and "alter table public.provider_apps" in m021 and "create table if not exists public.reward_providers" not in m021 and "reward_provider_apps" not in m021)
check("021 uses configuration-admin role gate", "is_configuration_admin()" in m021)
check("021 stores mappings in existing provider_apps", "insert into public.provider_apps" in m021)
check("Member withdrawal UI checks country config", "from('withdrawal_config')" in withdrawals and "availability.status !== 'enabled'" in withdrawals)
check("CPX wall config uses country-specific app mapping", 'eq("country_code", profile.country_code)' in cpx and 'eq("provider_id", provider.id)' in cpx)
check("CPX wall config rejects wildcard/missing origin by exact allowlist", "allowed.includes(origin)" in cpx and '?? "*"' not in cpx)
check("CPX wall config no longer depends on CPX_APP_ID", "CPX_APP_ID" not in cpx)
check("Member routes include all current member modules", all(x in web_main for x in ("EarnCenter", "WithdrawalHistory", "ReferralCenter", "DailyCheckin", "MemberCareCenter")))
check("Admin routes include all current admin modules", all(x in admin_main for x in ("AdminSupportInbox", "AdminMemberDirectory", "AdminSecurityCenter", "AdminFraudReview", "AdminRewardConfiguration", "AdminCountryCurrency", "AdminRewardProviders")))
check("Root npm workspaces cover web and admin", '"apps/web"' in workspace and '"apps/admin"' in workspace and '"build"' in workspace)

failed = [name for name, ok in checks if not ok]
for name, ok in checks:
    print(("PASS" if ok else "FAIL") + "  " + name)
print(f"\n{len(checks)-len(failed)}/{len(checks)} source contract checks passed")
if failed:
    sys.exit(1)
