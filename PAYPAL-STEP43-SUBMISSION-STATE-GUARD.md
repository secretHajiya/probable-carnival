# PayPal Step 43 — Submission state and provider-reference guard

## What changed

Migration `033_paypal_submission_state_guard.sql` replaces the Step31 submission RPC with stricter transition validation:

- Locks the payout attempt before checking or changing it.
- Requires provider batch and item references to be supplied together.
- Requires provider references for a confirmed submission.
- Rejects conflicting provider identifiers instead of silently retaining the old value.
- Prevents a previously acknowledged `submitted` payout from being downgraded to `reconciling` or `quarantined`.
- Rejects terminal attempts and requires the related PayPal payout record to exist.
- Preserves service-role-only execution.
- Keeps the internal sender batch reference in `payout_records.provider_reference`; the PayPal provider batch ID remains in `paypal_payout_attempts.provider_batch_id` so the two identifiers are not confused.

## Safety and limitations

- This is a source-only migration; it has **not** been applied to Supabase Production.
- No staging database was created or assumed.
- No PayPal API call, webhook registration, Worker deployment, withdrawal, refund, or payout was performed.
- NG and US withdrawals remain disabled by the existing Step31 safety statement; this migration does not enable them.
- The Step43 test is a source/contract check, not a PostgreSQL execution test. Database behavior still needs validation against a disposable/non-production database before production approval.

## Before production

1. Confirm Migration 031 and 032 dependencies against the actual Production schema and function signatures.
2. Take a database backup and prepare a tested rollback script.
3. Validate migration 033 on a non-production PostgreSQL/Supabase database.
4. Run a real PayPal Sandbox end-to-end test with withdrawals still disabled for members.
5. Only then consider a separately approved Production migration and deployment.
