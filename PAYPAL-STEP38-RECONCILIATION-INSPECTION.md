# Step 38 — Finance PayPal reconciliation inspection

## Delivered
- Added a service-role-only SQL RPC returning a bounded, minimal queue of `reconciling` and `quarantined` PayPal attempts.
- Added Finance-admin-authenticated Worker GET endpoints for listing the queue and inspecting a known PayPal payout batch.
- The detail endpoint returns a minimal projection of provider batch/item status and amounts; it does not expose receiver email or raw provider payloads.
- If no provider batch ID exists, the endpoint explicitly requires manual reconciliation rather than guessing by sender batch ID.
- No endpoint marks a payout paid/failed or releases coins. The existing verified PayPal webhook remains the only settlement path.

## Endpoints
- `GET /v1/admin/paypal-payouts/reconciliation`
- `GET /v1/admin/paypal-payouts/{withdrawal_uuid}/reconciliation-detail`

Both require a valid Supabase bearer token and `is_finance_admin() = true`.

## Deployment order and safety
1. Review Migration 031 and apply it only after its prerequisites and Production impact are approved.
2. Apply Migration 032.
3. Deploy the PayPal Worker with its existing sandbox-only secrets/configuration.
4. Exercise read-only inspection using PayPal Sandbox test payouts.
5. Keep NG and US withdrawal configuration disabled until full acceptance is complete.

The inspection API is read-only. Finance must compare the withdrawal ID (`sender_item_id`), expected amount/currency, provider batch, and item status. Settlement is still performed only by a valid, correlated, signature-verified PayPal webhook.

## Validation status
- Static route/RPC contract checks: performed during packaging.
- TypeScript strict typecheck: see packaging result.
- No Supabase SQL execution, Cloudflare deployment, PayPal API call, or end-to-end payout test was performed.
