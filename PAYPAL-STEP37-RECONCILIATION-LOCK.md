# Step37 — PayPal ambiguous-submission resubmit lock

## Change

The PayPal payout Worker now refuses to call `POST /v1/payments/payouts` when the database reports an attempt as `reconciling`. It returns `reconciliation_required` with the existing deterministic `sender_batch_id` so an operator can reconcile the existing attempt. It also refuses terminal `quarantined`, `succeeded`, and `failed` attempts. A known provider batch or `submitted` attempt continues to return `already_submitted`.

## Why

A network timeout, 5xx response, unreadable response, or missing provider batch reference may occur after PayPal accepted a payout. Retrying the create-payout call without first reconciling could create a duplicate payment. Reusing the same idempotency key is useful but is not a substitute for an explicit reconciliation gate.

## Validation

- Static source assertions confirm all non-resubmittable states are checked before recipient decryption and before the PayPal create-payout fetch.
- ZIP integrity is checked after packaging.
- No live PayPal request, Supabase SQL execution, or Cloudflare deployment was performed.

## Remaining

A secure reconciliation endpoint/operator workflow still needs implementation and Sandbox acceptance. Keep NG and US withdrawal configuration disabled.
