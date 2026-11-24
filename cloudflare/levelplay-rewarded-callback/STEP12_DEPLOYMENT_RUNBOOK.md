# Vyra LevelPlay S2S Worker — Step 12 Deployment Runbook

This runbook deploys the **separate** `vyra-levelplay-rewarded-callback` Worker. It does not deploy, edit, rename, or replace `cloudflare/cpx-callback`.

## Current status

- Migration 026: user reported successful execution in Supabase.
- RPC permissions: user-provided query output confirmed admin RPCs are authenticated-only and `process_levelplay_reward` is service-role-only.
- RLS: user-provided query output confirmed RLS is enabled on both LevelPlay tables.
- Local Worker contract tests: run with `node scripts/test-levelplay-worker.mjs`; they mock the Supabase RPC and do not contact Production.
- Cloudflare deployment, secrets, Unity callback configuration, live S2S delivery, and real wallet credit are **not** verified or completed.

## Before deployment — do not skip

1. Confirm the exact LevelPlay App Key and Placement Name in the Unity LevelPlay dashboard.
2. Confirm the Unity S2S callback's exact reward amount (`[REWARDS]`) and decide the Vyra coin award. Do not guess either value.
3. Confirm the Unity callback private key. It must be copied directly into a Cloudflare Worker secret, never into source code, `.env`, mobile app configuration, GitHub files, screenshots, or chat.
4. Confirm the intended authenticated Supabase user ID is passed to `LevelPlay.setDynamicUserId()` as 32 hexadecimal characters without hyphens.
5. Keep `levelplay_reward_config.is_enabled = false` until a controlled end-to-end test has passed.
6. Keep `the database LevelPlay config remains disabled` in the mobile app until the callback is deployed and verified.

## Deploy as an independent Worker

Use the Cloudflare dashboard's Workers & Pages flow to create/deploy a new Worker named `vyra-levelplay-rewarded-callback`, or use Wrangler from this directory:

```bash
cd cloudflare/levelplay-rewarded-callback
npx wrangler deploy
```

The `wrangler.toml` in this directory identifies this Worker and its entry point. Verify the deployed Worker name before confirming deployment. Do not run deployment commands from `cloudflare/cpx-callback`.

## Add secrets to this Worker only

In the Cloudflare dashboard, open the newly created `vyra-levelplay-rewarded-callback` Worker, then Settings → Variables and Secrets. Add these as encrypted secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LEVELPLAY_S2S_PRIVATE_KEY`

Never paste secret values into this runbook. The service-role key grants powerful database access; restrict who can view or edit this Worker.

## Unity callback configuration

Use the deployed URL shown by Cloudflare; do not guess or manually construct it. Configure the callback to send these fields exactly as expected by the Worker:

- `applicationUserId=[USER_ID]` (the Worker also accepts `USER_ID` and other documented aliases)
- `rewards=[REWARDS]`
- `eventId=[EVENT_ID]`
- `timestamp` and `signature` supplied by LevelPlay when the Private Key is configured
- Optional dashboard parameters `App key` and `Placement name`, accepted as `appKey` and `placementName`

Signature expected by the Worker:

`MD5(TIMESTAMP + EVENT_ID + USER_ID + REWARDS + LEVELPLAY_S2S_PRIVATE_KEY)`

The Worker accepts GET query parameters, form-encoded POST, and JSON POST. Confirm the exact generated URL in the current Unity dashboard before saving. LevelPlay's event-handler documentation describes `timestamp` in `YYYYMMDDHHMM` format and a lowercase `signature` parameter. Never send the private key as a callback parameter.

## Controlled verification order

1. Confirm the deployed Worker responds to a harmless request without exposing secrets. A request with no valid callback fields should be rejected; this is expected.
2. Test an invalid signature; it must be rejected and must not call the reward RPC.
3. Test an expired timestamp; it must be rejected and must not call the reward RPC.
4. With the database config disabled, a correctly signed callback must not credit the wallet.
5. Configure exact App Key, Placement Name, Unity reward amount, and Vyra coin award through the admin RPC, but keep `is_enabled=false` initially.
6. Confirm a valid callback while disabled does not credit.
7. Enable only for a controlled test account after reviewing the amount and placement. Deliver one valid test event.
8. Verify exactly one `levelplay_reward_events` row, one matching `wallet_ledger` row, and the expected wallet balance increase.
9. Replay the exact same `EVENT_ID`; it must return `<EVENT_ID>:OK` without a second credit.
10. Test wrong App Key, Placement Name, reward amount, and unknown/ineligible user; none may credit.
11. If any result is unexpected, immediately set `is_enabled=false` via the admin configuration RPC and investigate before further tests.
12. Only after all checks pass should the mobile S2S-ready flag be considered for enabling.

## Important limitations

- Local tests use a mocked Supabase RPC. They do not prove live database schema behavior or Cloudflare runtime behavior.
- No App Key, Placement Name, reward amount, coin conversion, callback URL, or secret is supplied by this repository.
- Do not enable real user rewards or advertise that ads pay until live verification is complete.
- CPX remains on its existing Cloudflare Worker and is out of scope for this deployment.


## Step 17 update
The mobile app now reads App Key, Rewarded Ad Unit ID, Placement and enabled status from the authenticated `get_levelplay_mobile_config()` RPC. Apply Migration 027 before using this version. Do not configure these SDK identifiers as Expo build-time variables. The S2S private key remains a Cloudflare Worker secret only.
