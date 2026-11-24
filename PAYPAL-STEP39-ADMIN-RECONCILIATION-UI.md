# Step 39 — Admin Dashboard PayPal reconciliation UI

- Added a Finance-only navigation entry to the existing Admin Dashboard.
- Added a read-only queue view for `reconciling` and `quarantined` PayPal payout attempts.
- Added provider batch inspection using the existing authenticated Worker endpoints and the signed-in Supabase access token.
- Displays expected amount/currency, batch status, completion time, and minimal payout-item fields.
- No controls to submit, settle, mark paid/failed, or refund; verified webhook remains the only settlement path.
- Requires the existing `VITE_PAYPAL_PAYOUT_WORKER_URL` environment variable.

## Validation
- Source-level checks: completed during packaging.
- ZIP integrity: verified.
- Dependency installation, full Admin build, live Worker calls, SQL execution, and PayPal Sandbox E2E: not performed.
- Migration 031 and 032 remain unapplied; no deployment was performed.
