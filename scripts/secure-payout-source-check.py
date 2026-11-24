#!/usr/bin/env python3
"""Offline source-contract checks for Vyra secure payout integration.
These checks do not replace staging, Worker, or database tests.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
worker = (ROOT / "cloudflare/payout-details/src/index.ts").read_text()
sql = (ROOT / "supabase/migrations/013_secure_payout_details_vault.sql").read_text()
reveal_sql = (ROOT / "supabase/migrations/022_atomic_audited_payout_reveal.sql").read_text()
member = (ROOT / "apps/web/src/withdrawals/WithdrawalHistory.tsx").read_text()
admin = (ROOT / "apps/admin/src/main.tsx").read_text()
checks = {
    "strict exact-origin allowlist": "allowedOrigins.includes(origin)" in worker and "access-control-allow-origin\": \"*" not in worker,
    "bearer token authentication": "authUser(request, env)" in worker,
    "AES-GCM encryption": "AES-GCM" in worker,
    "token stored as SHA-256 hash": "token_hash: tokenHash" in worker and "public.vyra_sha256" in sql,
    "atomic token row lock": "for update" in sql.lower(),
    "single-use token consumption": "consumed_at = now()" in sql,
    "withdrawal amount range enforced": "amount_out_of_allowed_range" in sql,
    "wallet reserve and request in same SQL function": "available_coins = available_coins - p_amount_coins" in sql and "insert into public.withdrawal_requests" in sql,
    "admin role checked inside authenticated database RPC": "rpc/admin_reveal_payout_details_envelope" in worker and "public.is_finance_admin()" in reveal_sql,
    "reveal blocked after terminal states": "v_withdrawal.status not in ('requested','under_review','approved','processing')" in reveal_sql,
    "reveal and audit are atomic under withdrawal row lock": "for update" in reveal_sql.lower() and "insert into public.admin_audit_logs" in reveal_sql and "payout_details_viewed" in reveal_sql,
    "worker no longer performs split status-read/audit writes": "admin_audit_logs" not in worker and "withdrawal_requests?select=id,status" not in worker,
    "RPC returns ciphertext only for Worker decryption": "encrypted_payload" in reveal_sql and "decryptPayload(envelope.encrypted_payload" in worker,
    "member calls secure worker": "/v1/payout-details" in member,
    "member does not persist bank details": "localStorage" not in member and "sessionStorage" not in member,
    "admin clears sensitive view on hide/timeout": "visibilitychange" in admin and "30_000" in admin,
    "pgcrypto schema is discovered dynamically": "from pg_extension e" in sql and "v_crypto_schema" in sql,
}
failed = [name for name, ok in checks.items() if not ok]
for name, ok in checks.items():
    print(("PASS" if ok else "FAIL") + " - " + name)
print(f"\n{len(checks)-len(failed)}/{len(checks)} source checks passed")
if failed:
    raise SystemExit(1)
