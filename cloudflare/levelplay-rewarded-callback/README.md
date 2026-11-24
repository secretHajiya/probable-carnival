# Vyra LevelPlay Rewarded Ads S2S Worker (Step 10)

This is a separate Cloudflare Worker. It does **not** replace or modify `cloudflare/cpx-callback`.

## Required Worker secrets

Set these with `wrangler secret put` (never put values in this repository):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LEVELPLAY_S2S_PRIVATE_KEY` (the private key from the LevelPlay S2S callback configuration)

Optional variable: `LEVELPLAY_MAX_CALLBACK_AGE_SECONDS` (default 86400; allowed 60–604800 seconds).

## LevelPlay callback URL parameters

Configure the S2S URL with the required LevelPlay macros using the documented query keys, for example `applicationUserId=[USER_ID]&rewards=[REWARDS]&eventId=[EVENT_ID]`. Enable the optional `App key` and `Placement name` parameters in the Unity dashboard; the Worker accepts their usual `appKey` and `placementName` query names. When a Private key is configured, LevelPlay supplies `timestamp` and `signature`; do not invent or manually add timestamp/signature macros unless the current Unity UI explicitly instructs you to. The signature is verified as `MD5(TIMESTAMP + EVENT_ID + USER_ID + REWARDS + PRIVATE_KEY)`. Keep the private key only in Cloudflare Worker secrets. The Worker accepts LevelPlay's `YYYYMMDDHHMM` timestamp format and its legacy uppercase parameter aliases.

`USER_ID` must be the 32-character lowercase/uppercase hex form of the authenticated Supabase UUID without hyphens, matching `LevelPlay.setDynamicUserId()` in the mobile app.

## Deployment sequence

1. Review and manually run `supabase/migrations/026_levelplay_rewarded_s2s.sql` in Supabase SQL Editor. Do not run it until you have reviewed the SQL.
2. In the admin dashboard, use the new admin RPC `admin_update_levelplay_reward_config` to set the exact LevelPlay App Key, Placement Name, numeric reward amount sent by Unity, Vyra coin award, and keep `is_enabled=false` until end-to-end tests pass. The config is disabled by default.
3. Add Worker secrets, then deploy this Worker from this directory.
4. Configure the Unity callback URL with the macros above. Do not set the mobile `EXPO_PUBLIC_LEVELPLAY_S2S_READY=true` until the callback is deployed and verified.
5. Test valid signature, invalid signature, stale timestamp, disabled config, unknown user, wrong app/placement/reward, duplicate event, and wallet ledger/balance consistency.

The Worker acknowledges only after the database RPC returns `{ success: true }`; duplicate events are acknowledged without a second credit. It returns `<EVENT_ID>:OK` as required by Unity. The worker logs event IDs and processing outcome only, not the private key or callback signature.

## Safety

- No client-side reward credit is performed.
- No CPX code or secrets are changed.
- No LevelPlay app key, ad unit ID, placement, reward amount, or coin conversion has been invented.
- The migration's config is disabled and has no active reward values until an admin explicitly configures it.
