# Step 31 — US PayPal sandbox implementation

**Baseline:** Master Step30. **Date:** 2026-11-23.

## Implemented in source

1. Migration `031_us_paypal_sandbox_payout.sql` adds a US-only PayPal recipient vault, payout attempt/idempotency table, webhook event deduplication table, and US/USD-specific withdrawal RPC.
2. Separate Cloudflare Worker at `cloudflare/paypal-payout/`; Nigeria bank payout Worker is untouched.
3. Recipient email is encrypted with AES-GCM; only a SHA-256 token hash is stored; token lifetime is 10 minutes.
4. Finance-admin authentication is checked before payout submission. Database claim accepts only approved US/USD PayPal requests.
5. Deterministic sender batch ID and PayPal request ID are reused. Ambiguous responses stay in reconciliation and do not release coins.
6. PayPal webhook signature is verified with PayPal's verification endpoint; event ID is deduplicated; sender item, batch, currency and amount are correlated before settlement.
7. Success marks the withdrawal paid and writes one ledger entry. A verified failed payout releases the reserved coins exactly once.
8. The migration explicitly leaves NG and US withdrawal configs disabled.

## Local verification performed

- Worker TypeScript strict typecheck: see `STEP31_VERIFICATION.txt`.
- Static contract checks: see `tests/step31_contract_checks.mjs` and `STEP31_VERIFICATION.txt`.
- ZIP integrity and cumulative archive comparison: see `STEP31_VERIFICATION.txt`.

## Not performed / remaining gates

- Migration 031 has **not** been applied to Production or staging.
- No PayPal credentials were available; no OAuth, payout, or webhook request was sent.
- Worker has not been deployed; webhook endpoint has not been registered in PayPal Developer Dashboard.
- Member withdrawal UI and Finance Dashboard UI have not yet been wired to these new endpoints/RPCs.
- Full PP-01 through PP-25 acceptance has not been executed. Only dedicated staging Supabase and PayPal sandbox with synthetic accounts can establish that evidence.
- Do not enable NG or US withdrawals. Do not use real money or real recipients.

## Staging sequence

1. Create/confirm an isolated staging Supabase project and apply migrations 001–030 in the documented order, then 031.
2. Confirm the staging US country row is enabled and USD; configure a test-only USD rate and a test-only withdrawal config in staging only.
3. Configure Cloudflare secrets from PayPal Sandbox app credentials and a generated AES-256 key; use exact HTTPS origins.
4. Deploy the Worker to a new sandbox-only Worker name and register its webhook URL in the PayPal Sandbox app.
5. Wire member recipient capture and withdrawal creation, then Finance submission.
6. Execute PP-01–PP-25 and preserve sanitized evidence. Reconcile all attempts, provider batches, webhook events, payout records and wallet ledger entries.
7. Production requires a separate security review and explicit owner approval; this Step31 Worker intentionally cannot call PayPal Production.
