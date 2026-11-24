# Secure payout — staging runbook (next gate)

This is a controlled test plan, not evidence that staging or Production has been tested. Use a dedicated staging Supabase project and synthetic test accounts/bank details only. Do not enable any Production country or perform a real payout during these tests.

## Gate 0 — preflight

1. Run `supabase/verification/013_secure_payout_preflight.sql` in staging.
2. Every `required_column`, `pgcrypto_extension`, `finance_admin_rpc`, `create_withdrawal_rpc_signature`, `withdrawal_status_enum`, `withdrawal_config_table`, and `ledger_idempotency_unique` check must PASS.
3. Inspect the returned current `create_withdrawal_request` definition and compare its wallet-ledger columns, withdrawal status values, profile status values, country fields, and balance semantics with Migration 013. Stop if any mismatch exists.
4. Confirm all `withdrawal_config.is_enabled` values are false. Do not proceed by changing Production settings.
5. Review `013_secure_payout_postdeploy.sql` so the expected grants and RLS state are understood before migration.

## Gate 1 — migration

1. Back up staging and apply `013_secure_payout_details_vault.sql` only to staging.
2. Apply `022_atomic_audited_payout_reveal.sql` only after 013 passes.
3. Run `013_secure_payout_postdeploy.sql` and `022_atomic_payout_reveal_postdeploy.sql`.
4. Expected: vault exists; RLS enabled; anon/authenticated have no direct SELECT; service_role can SELECT; authenticated can execute the withdrawal RPC and atomic reveal RPC; anon cannot execute either; no country is enabled.
5. If any result differs, stop and roll back staging. Do not patch Production ad hoc.

## Gate 2 — Worker configuration

Set secrets only with the Cloudflare secret mechanism (never in source control or Vite variables): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYOUT_ENCRYPTION_KEY` (base64 of exactly 32 random bytes), `PAYOUT_KEY_VERSION`. Set `ALLOWED_ORIGIN` to the exact comma-separated HTTPS origins for the staging member and staging admin apps. Keep service-role and encryption secrets Worker-only.

Before deployment, confirm the Worker URL uses HTTPS, the two allowed origins are exact (no wildcard), and the deployed build corresponds to the source in this ZIP. Do not use a real member's bank details.

## Gate 3 — required test cases

| ID | Test | Expected result |
|---|---|---|
| P01 | No Authorization header on token issue | 401 |
| P02 | Invalid/expired Supabase JWT | 401 |
| P03 | Origin not in allowlist | 403, no CORS permission |
| P04 | Wrong content type | 415 |
| P05 | Oversized request | 413 |
| P06 | Account number not exactly 10 digits | 400 |
| P07 | Unsupported country or payout method | 400 |
| P08 | Valid synthetic bank details | 201; token returned; vault contains ciphertext only |
| P09 | Inspect vault row | No plaintext account number/name/bank code |
| P10 | Use another member's token | RPC rejects; wallet unchanged |
| P11 | Use expired token | RPC rejects; wallet unchanged |
| P12 | Reuse consumed token | RPC rejects; wallet changes only once |
| P13 | Submit amount outside configured min/max | RPC rejects; wallet unchanged |
| P14 | Insufficient available coins | RPC rejects; no withdrawal or ledger row |
| P15 | Valid request | One withdrawal, one vault link, one reservation ledger row, exact coin debit |
| P16 | Non-finance user calls reveal endpoint | 403 |
| P17 | Finance admin requests details for paid/rejected/cancelled request | 409 |
| P18 | Finance admin reveals eligible synthetic request | Details returned and audit row written before response |
| P19 | Audit insert fails | Reveal fails closed; no bank details returned |
| P20 | Unknown key version / wrong encryption key | 503 or decrypt failure; no plaintext returned |
| P21 | Non-finance user calls atomic reveal RPC directly | Permission denied; no ciphertext returned |
| P22 | Concurrent status transition and reveal | Both serialize on the withdrawal row; reveal only if eligible at lock time |
| P23 | Audit insert fails during reveal | RPC rolls back and Worker returns no payout details |

For each failed RPC test, verify the wallet balance, withdrawal count, vault `consumed_at`/`withdrawal_id`, and ledger count are unchanged. For the valid request, verify exactly one debit and one idempotency key.

## Gate 4 — security observations / known limitations

- The Worker currently validates the format of a Nigerian bank code; it does not verify that the bank/account pair exists. Add a trusted bank directory/name-enquiry integration before real payouts.
- Add edge rate limiting and abuse monitoring to token issuance before public production exposure. The current source does not implement per-user/IP rate limiting itself.
- Admin reveal now uses Migration 022: it locks the withdrawal row, checks the eligible status, locks the vault row, and writes the audit record in one authenticated database transaction before returning ciphertext to the Worker. Confirm all status-transition RPCs also lock the withdrawal row; otherwise a concurrent transition may still need a shared locking convention.
- Keep bank details out of logs, analytics, crash reports, browser storage, screenshots, exports, and support messages.
- Do not enable withdrawals until all staging cases pass, a human payout/reconciliation procedure exists, and Finance approval is documented.

## Status

Migration 022 hardens the reveal path at source level. The Worker no longer makes a separate status read and audit insert using service-role requests. It calls an authenticated RPC that performs status check, row locks, and audit insert atomically, and returns ciphertext only. This change is not deployed or staging-tested.

Source and ZIP checks are not a substitute for staging execution. No staging/Production migration, Cloudflare deployment, account validation, or live payout is claimed by this runbook.
