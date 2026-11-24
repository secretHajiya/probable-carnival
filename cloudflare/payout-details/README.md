# Payout details Worker (implementation draft)

This Worker is an implementation draft for **Nigeria bank transfer only**. It is not deployed and is not enabled for production use.

## Routes
- `POST /v1/payout-details` — verifies Supabase bearer JWT, accepts NG bank account name, 10-digit account number and bank code, encrypts the payload with AES-256-GCM, stores only ciphertext and a SHA-256 token hash, and returns the opaque token once (10-minute TTL).
- `GET /v1/admin/payout-details/{withdrawal_id}` — verifies JWT and calls `is_finance_admin()` with the caller JWT before retrieving/decrypting the record. Writes an audit row before returning the minimum fields.

## Deploy configuration
Set Cloudflare secrets (never commit these):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYOUT_ENCRYPTION_KEY` — base64-encoded 32-byte random key

Set vars:
- `PAYOUT_KEY_VERSION=v1`
- `ALLOWED_ORIGIN` — comma-separated exact HTTPS origins for member and admin apps (no wildcard)

Generate key locally with a cryptographically secure generator; do not send it in chat or commit it. Example using OpenSSL: `openssl rand -base64 32`.

## Required integration sequence
1. Review Production `pg_get_functiondef` for `create_withdrawal_request`, `is_finance_admin`, and the exact grants/RLS.
2. Apply migration `013_secure_payout_details_vault.sql` to staging first. It replaces the create-withdrawal RPC; inspect the diff and test transaction rollback before production.
3. Deploy Worker with secrets, then run all `PD-01` through `PD-20` in the acceptance document.
4. The member form integration now calls the Worker, passes the returned token directly to `create_withdrawal_request`, and discards the token after the RPC.
5. The Finance Dashboard now includes a finance-only reveal action that calls the Worker endpoint. It does not query the vault from the browser.
6. Production enablement is a separate approval after staging evidence and a controlled no-payout test.

## Limitations
- Only `NG` + `bank_transfer` is accepted. Do not pass Opay, PalmPay, mobile money, USDT or other methods through this endpoint.
- Admin decryption currently supports only the configured current key version. Key rotation needs a version-to-key map and a tested re-encryption/retirement procedure.
- Add Cloudflare rate limiting/WAF rules before public deployment. The current Worker has strict origin checking and body size check but no distributed rate limiter. The reveal endpoint additionally refuses to return details once the withdrawal is paid, rejected, cancelled, failed, or missing.
- The member/admin UI wiring is now present in source, but this code has not been deployed, run against Supabase, or security-audited. Do not enable withdrawal submission based on source review alone.

## Strict origin allowlist

Set `ALLOWED_ORIGIN` to a comma-separated list of exact HTTPS origins, for example `https://app.example.com,https://admin.example.com`. No wildcard is accepted. The Worker returns CORS headers only for an exact listed origin.
