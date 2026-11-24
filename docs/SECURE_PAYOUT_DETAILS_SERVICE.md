# Secure payout-details service — implementation contract

## Status

**Design/contract only. Not deployed and not production-ready.** The current project contains no payout-details Worker, encrypted vault table, or admin-only retrieval endpoint. Do not enable member withdrawal submission until this contract is implemented and its acceptance tests pass.

## Why the current token check is insufficient

`create_withdrawal_request(bigint,text)` currently accepts any non-empty string of at least 16 characters. That does not prove that the token was issued by the server, belongs to `auth.uid()`, matches the selected country/method, is unexpired, or has not already been consumed. The current request RPC also hardcodes `payout_method = 'bank_transfer'`. A browser-generated random string must never be treated as a secure token.

## Required architecture

1. The member signs in using Supabase Auth. The browser sends its access token to the payout-details service over HTTPS.
2. The Worker validates the bearer token with Supabase Auth (`/auth/v1/user`). It must derive `user_id` from that verified response, never trust a user ID supplied in JSON.
3. The member submits only the country-specific fields required for the supported payout method. Validate field formats and lengths server-side. Never log request bodies, account numbers, tokens, ciphertext, or authorization headers.
4. The Worker creates a cryptographically random, single-use opaque token, encrypts the payout payload with AES-256-GCM using a key held only as a Cloudflare secret, and stores the ciphertext plus owner, country, method, key version, expiry, and consumed state in a private vault table through a server-only database credential.
5. The Worker returns the opaque token once. The browser may hold it only long enough to call the withdrawal RPC. It must not persist it in localStorage, analytics, URLs, or logs.
6. The withdrawal RPC must atomically verify that the token exists, belongs to `auth.uid()`, matches country and payout method, is not expired or consumed, and then consume it in the same transaction that reserves coins and creates the withdrawal. A failed request must not consume a valid token unless the whole transaction commits.
7. Finance admins retrieve payout details only through a separate Worker endpoint. That endpoint must validate the caller's Supabase JWT and verify finance-admin authorization server-side before decrypting. The browser/admin UI must never query the vault table or receive a service-role key.
8. Decryption occurs only in memory. Return only the fields needed for manual payout. Never expose ciphertext or encryption keys to the client. Audit every successful view without recording the sensitive values.
9. Rotate encryption keys using a `key_version` field and support decrypting old records until they are securely re-encrypted or retired. Define retention and deletion rules before production use.

## Proposed private vault record

The database design needs a private table with, at minimum:

- opaque token identifier (unique, high entropy)
- `user_id` (auth user owner)
- `country_code` and `payout_method`
- encrypted payload and AES-GCM nonce
- encryption `key_version`
- `expires_at`, `consumed_at`, `created_at`

Enable RLS and create **no member SELECT/INSERT/UPDATE/DELETE policies**. Only the server-side Worker credential may access this table. Do not put plaintext bank details in `withdrawal_requests`, `wallet_ledger`, audit logs, or application logs.

## Required Worker configuration

Store these as Cloudflare secrets/environment configuration, never in the frontend or repository:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (for Auth validation)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only vault access; never return it)
- `PAYOUT_ENCRYPTION_KEY` (32-byte AES-256 key)
- `ALLOWED_ORIGIN` (exact production app origin; no wildcard in production)

Use strict CORS allowlisting, HTTPS only, JSON size limits, rate limits, generic error messages, and request timeouts. Do not deploy with placeholder values. The Worker must fail closed if any secret is missing or malformed.

## API contract

- `POST /v1/payout-details`: authenticated member; validates and encrypts details; returns `{ token, expires_at }` once.
- `GET /v1/admin/payout-details/{withdrawal_id}`: finance-admin only; resolves the withdrawal's consumed vault record and returns the minimum payout fields needed for settlement. Every access is audited.
- `OPTIONS`: strict CORS preflight for the configured origin only.

Do not add a public token lookup endpoint. Do not accept a caller-supplied `user_id`, `is_admin`, or role claim as authorization. Do not put tokens in query strings.

## Integration blockers to resolve before coding/deployment

- Confirm the actual Production definitions of `create_withdrawal_request`, `admin_review_withdrawal_audited`, and `admin_list_withdrawals` with `pg_get_functiondef`; do not assume the pasted SQL is the deployed definition.
- Confirm Production enum values, RLS policies, vault-table privileges, and the exact `withdrawal_requests` columns.
- Decide and document supported country-specific bank fields and payout methods. The present schema only allows `bank_transfer`; do not imply Opay/Palmpay/mobile-money support until modeled and tested.
- Define how finance admins access decrypted payout details and how access is audited.
- Confirm data-retention, deletion, key-rotation, incident-response, and backup policies.

## Release gate

Withdrawal submission remains disabled until the Worker, private vault migration, atomic token-consumption RPC, admin retrieval/audit flow, and all tests in `SECURE_PAYOUT_DETAILS_ACCEPTANCE.md` are implemented and verified in a non-production environment. Then perform a controlled production test with a low-value test account and no real payout before enabling users.


## Implementation draft added (2026-11-21)

A Cloudflare Worker draft is now at `cloudflare/payout-details/` and migration draft `013_secure_payout_details_vault.sql` creates a private encrypted vault and replaces the withdrawal RPC with hashed-token validation and atomic consumption. Scope is intentionally limited to Nigeria bank transfer. The Worker is not deployed; the migration is not applied to Production. Staging validation, exact Production function-definition review, rate limiting, key rotation, and full PD acceptance evidence remain mandatory.
