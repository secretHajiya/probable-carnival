# Step 42 — PayPal webhook runtime simulation

## What changed
- Added `tests/step42_paypal_webhook_runtime.mjs`.
- The test imports and executes the actual Cloudflare Worker TypeScript handler using Node 22's built-in TypeScript type stripping.
- Outbound PayPal OAuth/signature-verification calls and the Supabase finalization RPC are mocked locally. No credentials, network access, Supabase project, or PayPal account are used.

## Runtime scenarios covered
1. Verified payout success sends `succeeded` and exact USD minor units to `paypal_finalize_event`.
2. Verified payout failure sends `failed`.
3. Duplicate-event RPC result is returned to the caller.
4. Database amount/currency mismatch quarantine result is surfaced.
5. Invalid webhook signature blocks the finalization RPC.
6. Signed unrelated event is acknowledged without settlement.
7. Malformed amount is rejected before the finalization RPC.

## Run
From `vyra-rewards-global-standalone/`:

```bash
node --experimental-strip-types tests/step42_paypal_webhook_runtime.mjs
```

Expected: `7/7 Step42 PayPal webhook runtime simulation checks passed`.

## Important limits
- This is a local handler simulation, not a live PayPal Sandbox webhook test.
- PayPal signature verification and Supabase RPC are mocked. In particular, the duplicate-event and mismatch outcomes are simulated RPC responses; this test does not prove the actual Production database constraints/functions.
- No SQL migration was applied, no Cloudflare Worker was deployed, no PayPal webhook was registered, and no payout was sent.
- US and NG withdrawals must remain disabled until database review, sandbox end-to-end testing, and operational approval are complete.
