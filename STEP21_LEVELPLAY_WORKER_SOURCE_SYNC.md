# Step 21 — LevelPlay Worker Source Sync

Date: 2026-11-23

## Canonical source

The LevelPlay rewarded callback Worker source is retained at:

`cloudflare/levelplay-rewarded-callback/src/index.js`

This source is the same file as the separately saved `vyra-levelplay-rewarded-callback-index.js` artifact that was recovered from the project Library. The source file is 9,648 bytes and passed `node --check` during this packaging step.

## Implemented callback behavior

- Supports GET and POST callbacks, including JSON and URL-encoded POST bodies.
- Accepts Unity callback parameter aliases for event ID, user ID, reward amount, timestamp, signature, app key, and placement name.
- Validates the MD5 S2S signature using the Worker-only `LEVELPLAY_S2S_PRIVATE_KEY` secret.
- Parses Unity's `YYYYMMDDHHMM` timestamp format and numeric/parseable timestamp forms, with a configurable callback age limit.
- Accepts UUIDs with or without hyphens and normalizes the UUID before calling Supabase.
- Calls `public.process_levelplay_reward` through the Supabase REST RPC endpoint using the Worker-only service-role secret.
- Returns the event ID acknowledgement on successful processing and logs duplicate/credit status.

## Deployment configuration recorded from the user's setup

Worker URL:
`https://vyra-levelplay-rewarded-callback.abdullahiwaziri9004.workers.dev/`

Unity S2S callback URL:
`https://vyra-levelplay-rewarded-callback.abdullahiwaziri9004.workers.dev/?appKey=[APP_KEY]&appUserId=[USER_ID]&rewards=[REWARDS]&eventId=[EVENT_ID]`

Required Cloudflare Worker secrets (values intentionally excluded):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LEVELPLAY_S2S_PRIVATE_KEY`

Optional Worker variable:

- `LEVELPLAY_MAX_CALLBACK_AGE_SECONDS` (defaults to 86400; accepted range 60–604800)

The user reports that the Worker has been deployed and the Unity S2S callback configuration is Active/saved. Saving the callback configuration is confirmed by the user's report; an end-to-end signed callback credit is **not** claimed as tested in this packaging step.

## Security notes

Never place the Supabase service-role key or LevelPlay S2S private key in frontend code, source-control public files, or the ZIP. Keep both only in Cloudflare Worker Secrets. No secret values are included in this archive.

## Packaging verification

- Previous cumulative Step20 archive was opened and passed ZIP integrity verification.
- Canonical Worker source was confirmed present in Step20 at the path above.
- `node --check` passed for the saved standalone Worker source.
- This Step21 archive preserves all Step20 files and adds this status record; it does not modify or redeploy the live Worker.
