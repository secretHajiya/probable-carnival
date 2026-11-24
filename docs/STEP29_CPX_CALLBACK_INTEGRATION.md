# Step29 — CPX callback integration verification

## Scope

Step29 verifies the repository copy of the **existing Production Cloudflare CPX Worker** using local mocked Supabase REST responses. It does not replace the Worker, deploy code, change CPX dashboard settings, run SQL, or contact Production.

The active architecture remains:

`CPX postback → Cloudflare Worker (cloudflare/cpx-callback) → public.process_cpx_reward`

The Supabase `functions/cpx-postback` source is historical/staging-only. Do not deploy it or change the CPX callback URL as part of this step. `cpx-wall-config` remains the separate authenticated offerwall configuration endpoint used by the app.

## Local verification

From `vyra-rewards-global-standalone/`, run:

```bash
npm run test:cpx-worker
python scripts/verify-cloudflare-cpx-worker.py
python scripts/verify-cpx-callback-source.py
```

The Node integration tests mock `fetch` and use a local-only test signature. They cover:

1. IP allowlist rejection before database access.
2. Invalid signature rejection before database access.
3. Missing Worker secrets.
4. Signed `type=out` acknowledgement without reward writes.
5. Valid Nigeria completion and the exact nine-argument RPC payload, including the current 500 Vyra coins/USD conversion.
6. Propagation of an RPC duplicate result.
7. Status 2 reversal request with zero new reward coins.
8. Disabled CPX provider gate.
9. Disabled Nigeria web-app mapping gate.
10. Unsupported HTTP method rejection.

These are mocked integration tests, not a live Cloudflare/Supabase test. The duplicate and reversal outcomes returned by the mock do not independently prove database idempotency or ledger correctness.

## Existing owner-reported state

The project owner previously reported that the Production CPX database RPC and active Cloudflare callback had been deployed and tested, including credit, duplicate, and reversal scenarios. This is owner-reported evidence; Step29 does not independently access or verify Production.

## Staging acceptance still required before enabling CPX

Use a separate Supabase staging project and synthetic accounts only. Follow `docs/CPX_AND_PAYOUT_STAGING_GATE.md` and require:

- CPX-01 through CPX-12 preflight PASS.
- C01 through C15 callback cases PASS, including actual before/after balances, `offer_completions`, callback receipts, and wallet-ledger entries.
- CPX Support confirmation of callback URL and app ID `37222`.
- Explicit confirmation of the approved 500 coins/USD conversion in the product reward-economy specification.
- Repeated completion and reversal callbacks produce no second credit or reversal in the database.

Keep `reward_providers.is_enabled = false` and country `provider_apps.is_enabled = false` until staging evidence and CPX Support confirmation are complete. Do not use Production balances or real member data for tests. Never put Worker secrets in source, frontend variables, logs, ZIP notes, or chat.

## Country scope

The current Worker deliberately resolves only the CPX Nigeria web mapping (`external_app_id=37222`, `country_code=NG`, `platform=web`). This does not establish Android or US CPX support. The mobile offerwall config service is separate; no mobile CPX callback credit is permitted. The app must never award coins merely because a member closes or returns from the offerwall.

## Step29 result

- Local mocked Worker integration tests: expected 10 cases.
- Production callback / Production database: not accessed by this step.
- Staging SQL / staging callback: not executed by this step.
- Cloudflare deployment / CPX dashboard edits: not performed.
- CPX enablement / withdrawal enablement: remain OFF.
