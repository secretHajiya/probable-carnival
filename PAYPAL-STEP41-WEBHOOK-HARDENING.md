# Step 41 — PayPal Webhook Hardening

## Changes
- Verify PayPal's webhook signature before interpreting or acknowledging the event.
- Acknowledge signed, unrelated event types with HTTP 200 before requiring payout-item fields. This prevents unnecessary retries for event types the Worker intentionally does not process.
- Restrict settlement to the supported payout-item success, failed, blocked, and returned event types.
- Validate event ID, sender item UUID, batch reference length, USD currency, and exact two-decimal amount text.
- Convert amount to integer minor units without floating-point rounding and reject non-positive or unsafe integers.
- Call `paypal_finalize_event` only after all checks pass.

## Verification
Run `node tests/step41_paypal_webhook_hardening.mjs` and the existing Step31, Step32, and Step40 contract tests.

## Deployment status
Source-only change. No Supabase migration was executed, no Cloudflare Worker was deployed, no PayPal webhook was registered, and no live Sandbox end-to-end test was performed. Keep NG and US withdrawals disabled.
