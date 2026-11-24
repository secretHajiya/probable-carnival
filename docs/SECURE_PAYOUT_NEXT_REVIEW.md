# Secure payout integration — next review

## Changes in this increment
- Added an explicit Hide bank details action to the Finance Dashboard.
- Clears revealed payout details from React state when the admin signs out.
- Uses numeric arithmetic for the withdrawal fee multiplication before casting to bigint, avoiding intermediate bigint overflow.
- Clarified that Worker `ALLOWED_ORIGIN` is a comma-separated exact-origin allowlist for both member and admin apps.

## Source-level checks
- Member withdrawal form exists in `apps/web/src/withdrawals/WithdrawalHistory.tsx`. It obtains a short-lived token from the Worker and passes it directly to `create_withdrawal_request`.
- Finance reveal exists in `apps/admin/src/main.tsx` and calls the Worker, not the vault table.
- Migration 013 hashes and locks the token, checks owner/expiry/consumption/context, reserves wallet coins, creates the request, and links the vault row in one transaction.
- Fee multiplication now uses PostgreSQL numeric arithmetic to avoid bigint intermediate overflow.

## Not verified
- No Supabase staging or Production migration execution.
- No Worker deployment or secret configuration.
- No live bank-account validation or payout.
- No end-to-end API test.
- Dependency-backed TypeScript/Vite build has not been run because package dependencies are not installed in this environment.

Keep `withdrawal_config.is_enabled = false` until all acceptance tests pass in staging and an authorized operational payout process is approved.


## Hardening added in this revision
- The migration now discovers the actual installed `pgcrypto` schema and creates a schema-qualified SHA-256 helper. This avoids assuming the extension lives in `public` or `extensions` while the withdrawal RPC uses an empty search path.
- The Worker only reveals bank details while the withdrawal is in `requested`, `under_review`, `approved`, or `processing`. Paid, rejected, cancelled, failed, or missing requests are denied.
- The Worker opportunistically deletes only expired, unconsumed token rows. Consumed vault rows remain linked to withdrawals for the approved payout operation.
- Member bank fields are cleared from React state immediately after the Worker has encrypted them, even if the subsequent withdrawal RPC fails.
- Admin revealed details are cleared when the browser tab becomes hidden and after 30 seconds without another reveal-state change.

## Verification still required
The pgcrypto helper, RLS, service-role permissions, enum values, and ledger insert must be tested against the actual staging database. Worker routes must be tested with real Supabase JWTs and both exact allowed origins. These changes are source-level only; they do not mean the Worker or migration has been deployed.


## Atomic audited reveal hardening (Migration 022)
- Replaced the Worker’s separate service-role status lookup + vault lookup + audit insert with `admin_reveal_payout_details_envelope(uuid)` called using the finance admin’s Supabase JWT.
- The RPC checks `is_finance_admin()`, locks the withdrawal row, validates the status, locks the linked vault row, and writes `payout_details_viewed` audit in one transaction.
- The RPC returns ciphertext/nonce/key version only; the Worker decrypts after the transaction commits.
- This closes the identified split-read/audit race at the reveal operation boundary, provided status-changing RPCs follow the same withdrawal-row locking convention.
- Still requires Migration 022 staging execution, ACL verification, JWT tests, and concurrency tests.
