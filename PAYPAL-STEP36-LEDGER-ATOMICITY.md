# Step36 — PayPal wallet-ledger atomicity guard

This is a source-level hardening change only. It is NOT deployed to Supabase or Cloudflare.

Changes in migration 031:
- Require the PayPal event type to match the requested outcome.
- Require exactly one `processing` withdrawal transition before marking it paid/failed.
- Require exactly one PayPal payout-record update.
- Require exactly one wallet-account row on failed payout release.
- Require the corresponding idempotent wallet-ledger insert to succeed.
- Any failed invariant raises inside the SQL transaction, rolling back the event claim and all balance/status changes together.

Still required before production execution: inspect the live Production schema against migration prerequisites, run SQL in an isolated test database or a reviewed transaction-safe rehearsal, deploy Worker secrets/configuration, and perform PayPal Sandbox end-to-end tests. Do not enable NG or US withdrawals.
