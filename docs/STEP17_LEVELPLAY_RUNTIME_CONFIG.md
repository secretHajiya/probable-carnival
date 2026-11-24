# Step 17 — LevelPlay Admin-to-Mobile Runtime Configuration

## Change
The member app no longer reads App Key, Ad Unit ID, Placement Name, or an S2S-ready flag from Expo build-time environment variables. After sign-in it calls `get_levelplay_mobile_config()` and receives only `is_enabled`, `app_key`, `ad_unit_id`, and `placement_name`. The RPC requires an authenticated session. It does not expose expected reward amount, Vyra coin conversion, callback payloads, audit data, or the Cloudflare S2S private key.

The Admin LevelPlay screen now manages the Ad Unit ID as well as App Key, Placement, expected callback reward amount, coin award, and enabled status. Writes continue through an audited admin RPC.

## Required production action
Migration `027_levelplay_mobile_runtime_config.sql` is NEW and has NOT been run in Production. The owner must review and execute it once in Supabase SQL Editor before this app version can load runtime settings. Migration 026 is not rerun. The new admin writer has a six-argument signature; the updated Admin Dashboard must be deployed together with Migration 027.

## Safety
- Existing `is_enabled=false` remains unchanged.
- The mobile app does not credit coins; only the Cloudflare S2S Worker and `process_levelplay_reward` can do that.
- Never put the S2S private key in Supabase client-visible config, Expo env, or the mobile binary.
- Do not enable ads until the actual Unity App Key, Rewarded Ad Unit ID, Placement, callback reward amount, coin conversion, Worker secrets, signature and duplicate-event tests are verified.
- This migration and source changes have only local/static checks; no live database, callback, or device build was performed.
