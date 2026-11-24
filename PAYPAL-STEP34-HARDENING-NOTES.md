# Step 34 — PayPal Sandbox Quarantine Hardening

## Changes
- Updated `cloudflare/paypal-payout/src/index.ts`: PayPal HTTP 4xx responses now call the database RPC with `p_rejected=true` and return `quarantined`; they are no longer recorded as `submitted`.
- HTTP 5xx/timeouts remain `reconciling` because provider acceptance may be ambiguous.
- An unreadable successful response or missing provider batch reference is now explicitly recorded as `reconciling`.
- Updated `031_us_paypal_sandbox_payout.sql`: `paypal_record_submission` accepts `p_rejected`; a definitive rejection is quarantined. Coins are not automatically released on this path, and no new payout identity is generated.
- Updated Worker README with the revised operational boundary.

## Checks performed in this workspace
- TypeScript strict typecheck passed using TypeScript 5.8.3 and the Worker package's compiler flags.
- Static assertions passed for 4xx quarantine, 5xx reconciliation, unreadable-success reconciliation, sandbox-only PayPal endpoint, and NG/US withdrawal disablement.
- ZIP integrity check passed.

## Not yet done
- SQL has NOT been executed in Supabase.
- No Supabase/PayPal network integration or sandbox end-to-end test was run.
- Worker has NOT been deployed.
- PayPal webhook registration and reconciliation drills remain pending.
- Do not enable NG or US withdrawals.

## Production safety
Staging remains recommended. If the project has only Production, do not run Migration 031 until the complete migration and dependencies are reviewed against the live schema, a current backup/rollback plan exists, and the operator explicitly approves the production change. This ZIP update does not change the live database or deployed Worker.
