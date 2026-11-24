# Vyra PayPal Payout Worker — sandbox only

This is an isolated US/USD PayPal sandbox implementation. It does not modify the Nigeria payout-details Worker. The API base URL is hard-coded to PayPal Sandbox; the Worker refuses any `PAYPAL_ENV` other than `sandbox`.

## Routes

- `POST /v1/paypal-recipient` — authenticated US member submits an email; Worker checks active US profile, encrypts the email using AES-256-GCM, stores ciphertext plus a SHA-256 hash of a 10-minute one-use token, and returns the token once.
- Member calls `create_us_paypal_withdrawal_request(amount, token)` in Supabase. This reserves coins and creates a US/USD `paypal` withdrawal only when the US config and USD exchange rate are enabled in the staging database.
- `POST /v1/admin/paypal-payouts/{withdrawal_id}/submit` — verifies caller JWT and `is_finance_admin()`, claims only an approved request, and submits to PayPal using a deterministic sender batch ID and `PayPal-Request-Id`.
- `POST /v1/webhooks/paypal` — verifies the PayPal webhook signature with PayPal's verification endpoint, correlates the batch and sender item, checks USD amount, then calls an idempotent database settlement RPC.

## Secrets

Set with `wrangler secret put`, never in source control or app environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENCRYPTION_KEY` (base64 32-byte AES key). Set exact HTTPS `ALLOWED_ORIGIN` values and `PAYPAL_KEY_VERSION=v1`.

## Critical safety boundaries

- Apply `supabase/migrations/031_us_paypal_sandbox_payout.sql` to a dedicated staging project first; do not apply to Production as part of this step.
- The migration explicitly keeps NG and US withdrawal configs disabled. For sandbox lifecycle tests only, use a separate staging DB and synthetic accounts.
- PayPal credentials and encryption key are not present in this ZIP. No credentials were requested or embedded.
- A timeout/5xx or unreadable success response is treated as ambiguous and must be reconciled with the same sender batch ID. Once a provider batch ID is known (or the attempt is marked submitted), the Worker refuses to create another payout request and returns `already_submitted`. A 4xx response is quarantined for manual review; coins are not automatically released and no new payout ID is created. Never create a new batch ID for retry.
- Success/failure settlement is driven only by a verified and correlated item webhook. Duplicate events are idempotent. Failed events release the reserved coins once.
- Production PayPal mode is intentionally unsupported. Do not change the hard-coded sandbox API URL to production without a separately reviewed production design and approval.
- The source has not been deployed or run against Supabase/PayPal. Migration, database verification, sandbox end-to-end acceptance, PayPal webhook registration, and operational reconciliation remain required. Staging is strongly recommended; if only Production exists, do not apply the migration until its SQL and dependencies have been independently reviewed and a rollback/backup plan is ready.
