# Step 35 — PayPal Idempotent Resubmission Guard

## Changes
- `paypal_claim_payout` now returns the stored payout-attempt status.
- The Worker checks the stored provider batch ID/status before decrypting recipient data or calling PayPal.
- If PayPal has already acknowledged the payout, the Worker returns `already_submitted` and does not issue another create-payout request.
- Worker README documents this operational boundary.

## Verification
- Static assertions verify the SQL returns `status`, and the Worker guard executes before the PayPal create-payout fetch.
- ZIP integrity checked.
- TypeScript strict typecheck is run only if the compiler is available in this workspace; no network install is performed.

## Not done
- No SQL applied to Supabase.
- No Worker deployed.
- No PayPal sandbox E2E or webhook test run.
- NG/US withdrawal configuration remains disabled in the migration; do not enable either.
