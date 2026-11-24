# Vyra Rewards Global — CPX Callback Worker

This directory contains the Cloudflare Worker source supplied by the project owner for the currently deployed CPX callback. The Worker calls the existing Supabase RPC `public.process_cpx_reward`; it does not replace or replay any database migration.

## Required Cloudflare Worker secrets

Set these as Worker secrets (not in `wrangler.toml`, source control, or frontend `.env` files):

- `CPX_APP_SECURITY_HASH`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Example commands (run from this directory):

```bash
npx wrangler secret put CPX_APP_SECURITY_HASH
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Deploy only through the existing authorized Cloudflare account/workflow:

```bash
npx wrangler deploy
```

Do not run these commands merely to update this source ZIP. The owner reports that the Production Worker is already deployed and tested; this source is being added to the project repository for completeness and traceability.

## Current callback contract

- Accepts `GET` query parameters or `POST` form/JSON bodies.
- Allows only the three CPX source IP addresses explicitly listed in `src/index.js`.
- Validates the CPX MD5 signature using `trans_id` and `CPX_APP_SECURITY_HASH`.
- Ignores `type=out`; accepts `type=complete` or `type=bonus`.
- Accepts callback `status` 1 (credit) and 2 (reversal).
- Requires `user_id` to be a UUID.
- Resolves the enabled CPX provider and the exact web app mapping `external_app_id=37222`, `country_code=NG`.
- Uses the project RPC `process_cpx_reward` with its nine-argument contract.
- Applies the owner-provided conversion of 500 Vyra coins per USD of CPX commission.

## Important scope and safety notes

- This source currently supports the Nigeria CPX web-app mapping only. It is not a US CPX app mapping and must not be treated as one.
- The `SUPABASE_SERVICE_ROLE_KEY` is highly privileged. Keep it only in Cloudflare Worker secrets.
- Withdrawal configurations for NG and US must remain disabled. This Worker does not enable or alter withdrawals.
- The Supabase `cpx-postback` Edge Function elsewhere in the repository is a historical/staging adapter, not the active Production callback according to the owner. Do not deploy it over the Cloudflare Worker or switch callback URLs without an explicit migration plan.
- No live Cloudflare deployment or Production callback test is performed by packaging this source.

## Local mocked integration tests

From the standalone project root, run `npm run test:cpx-worker`. These tests mock Supabase REST responses and do not call Production. They validate Worker request handling and the outgoing RPC payload; they do not prove database credit, duplicate, or reversal behavior. See `docs/STEP29_CPX_CALLBACK_INTEGRATION.md` and `docs/CPX_AND_PAYOUT_STAGING_GATE.md` for the staging acceptance requirements.
