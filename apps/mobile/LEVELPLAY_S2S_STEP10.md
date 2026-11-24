# LevelPlay S2S reward verification — Step 10

Implemented a separate Cloudflare Worker and forward-only Supabase Migration 026. The callback validates the Unity MD5 signature, timestamp freshness, event/user/reward fields, and then delegates all eligibility/configuration/idempotency/wallet work to a service-role-only SQL RPC.

The SQL configuration is disabled by default. An authorized configuration admin must set the real Unity App Key, Placement Name, numeric reward amount, and Vyra coin award using `admin_update_levelplay_reward_config`; enabling is an explicit separate choice. No reward values or Unity IDs have been fabricated.

The RPC checks the exact app key, placement and reward amount, active member, enabled country, and unique event ID. It writes the event, wallet balance, and wallet ledger in one transaction. Repeated event IDs for the same user return duplicate success without another credit.

**Not deployed or production-tested.** Migration 026 is new and has not been run. Worker secrets and Unity callback URL are not configured. Keep `the database LevelPlay config remains disabled` until the end-to-end checklist in the Worker README passes.


## Step 17 update
The mobile app now reads App Key, Rewarded Ad Unit ID, Placement and enabled status from the authenticated `get_levelplay_mobile_config()` RPC. Apply Migration 027 before using this version. Do not configure these SDK identifiers as Expo build-time variables. The S2S private key remains a Cloudflare Worker secret only.
