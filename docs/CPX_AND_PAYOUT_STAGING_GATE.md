# CPX + Withdrawal staging gate — execution checklist

**Purpose:** Prepare and record controlled staging verification for CPX rewards and secure withdrawals. This document is a test plan, not proof that any external service or database has been tested.

## Safety boundary

- Use a separate Supabase staging project and synthetic member accounts only.
- Keep CPX `reward_providers.is_enabled = false` and all country `provider_apps.is_enabled = false` until the CPX tests pass and CPX Support confirms app ID `37222` and callback configuration.
- Keep every `withdrawal_config.is_enabled = false` during initial staging setup. Never use Production member balances, real bank details, or live payouts for negative tests.
- Never put `SUPABASE_SERVICE_ROLE_KEY`, `CPX_APP_SECURITY_HASH`, payout encryption keys, or bank details in Vite variables, source files, logs, chat, or Git.
- Record only test IDs, timestamps, HTTP status, and sanitized result codes. Do not record callback secrets or personal data.

## Gate A — CPX database preflight

1. Run `supabase/verification/CPX_STAGING_PREFLIGHT.sql` against staging.
2. Require CPX-01 through CPX-12 all PASS. Any FAIL is a hard stop.
3. Inspect `pg_get_functiondef` for the exact nine-argument RPC. Confirm its transaction lock, row lock, status-1 credit, status-2 reversal, duplicate handling, and ledger idempotency semantics match this Edge Function.
4. Confirm the staging function's `proargnames` are exactly the names in the Worker README. Do not rely only on a function signature with matching types.
5. Confirm the approved `CPX_REWARD_COINS_PER_USD` value in the product reward-economy specification. Do not choose a rate from the callback's `amount_local`, `amount_usd`, or any client value.
6. Set the CPX App Security Hash and approved conversion rate as Supabase Edge Function secrets. Do not paste either into this checklist.

## Gate B — CPX callback tests

Use only a synthetic active user and a unique synthetic transaction ID per test. For each test, capture the before/after available balance, matching `offer_completions` count, callback receipt count, and wallet-ledger rows.

| ID | Request | Expected result |
|---|---|---|
| C01 | Missing or invalid hash | 401; no DB writes and no wallet change |
| C02 | Correct hash, unknown user UUID | 409; no wallet change |
| C03 | Correct hash, inactive user | 409; no wallet change |
| C04 | Correct hash, CPX provider disabled | 409; no wallet change |
| C05 | Correct hash, country app mapping disabled/missing | 409; no wallet change |
| C06 | Correct hash, mismatched callback app_id | 409; no wallet change |
| C07 | Valid signed `type=out` | Acknowledged as ignored; no DB writes or wallet change |
| C08 | Invalid signed `type=out` | 401; not acknowledged as accepted; no DB writes |
| C09 | Valid status=1 complete | Exactly one completion and one credit using approved server rate |
| C10 | Repeat same status=1 transaction | Idempotent response; zero additional credit or ledger entry |
| C11 | Valid status=2 reversal | Original reward reversed once; wallet/ledger match RPC contract |
| C12 | Repeat same status=2 reversal | No second reversal |
| C13 | Same transaction ID, conflicting user | Rejected or safely deduplicated; never credits second user |
| C14 | Cross-country app mapping | Reject mismatched country/app mapping |
| C15 | Oversized/malformed values | 400; no DB writes |

For C09-C12 verify the exact ledger idempotency keys and final balances directly in staging. A 200 response alone is not proof of correct credit/reversal.

## Gate C — secure withdrawal tests

Follow `docs/SECURE_PAYOUT_STAGING_RUNBOOK.md` and `supabase/verification/013_secure_payout_preflight.sql`. Apply migrations 013 and 022 only after their preflight checks pass. Then run the P01-P23 cases in that runbook, including concurrent reveal/status-transition tests.

Additional hard stops:
- Confirm `withdrawal_config` exists and all rows are disabled before testing.
- Confirm the Worker is deployed to a staging environment with exact HTTPS origin allowlists and Worker-only secrets.
- Confirm the token is one-time, bound to the authenticated user, and cannot be replayed or transferred.
- Confirm audit failure causes reveal failure and no plaintext is returned.
- Do not test actual bank settlement until a bank name-enquiry integration, rate limiting, human reconciliation, and approved payout operations are in place.

## Gate D — evidence and release decision

Record each case as `PASS`, `FAIL`, or `BLOCKED`, with timestamp, staging deployment version, sanitized HTTP/result code, and tester. Do not mark a gate complete if any case is BLOCKED.

Release gates:
- [ ] CPX Support confirms callback URL and app ID 37222.
- [ ] CPX preflight CPX-01..CPX-12 all PASS.
- [ ] CPX callback C01..C15 all PASS.
- [ ] Payout preflight and P01..P23 all PASS.
- [ ] Approved reward conversion rate and country/currency configuration documented.
- [ ] Finance payout reconciliation and incident/rollback procedures approved.
- [ ] Independent security review completed.

**Current status at authoring:** Source-level checks only. No staging SQL, Edge Function deployment, live CPX callback, Cloudflare payout Worker deployment, bank validation, or real payout has been executed in this workspace. Keep Production CPX and withdrawals disabled.
