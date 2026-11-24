# Step40 — Member PayPal Withdrawal Safety Contract

## Scope
This increment adds a repeatable source-level safety contract for the existing Member Withdrawal History PayPal path. It does not redesign or enable withdrawals.

## Guardrails checked
- US PayPal form is available only when the US withdrawal configuration is enabled.
- US requests use the dedicated recipient-token Worker route and `create_us_paypal_withdrawal_request` RPC.
- Nigeria continues to use its existing bank-transfer Worker and `create_withdrawal_request` RPC.
- The member history query/UI does not retrieve or reveal stored PayPal recipient email.
- The member clears the email after one-use token issuance.
- The PayPal Worker remains sandbox-only and requires Finance authorization for payout submission.

## Test
Run from this directory:

```bash
npm run test:step40-paypal-member-safety
```

## Not accepted / not performed
- No Supabase migration was applied.
- No withdrawal configuration was enabled.
- No Cloudflare Worker was deployed.
- No PayPal API, webhook, or end-to-end payout test was performed.
- This is a static source-contract test, not proof of runtime behavior.
