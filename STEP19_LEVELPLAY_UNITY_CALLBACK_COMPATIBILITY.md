# Step 19 — LevelPlay Unity Callback Compatibility

- Updated the separate LevelPlay Worker to accept Unity's callback query names: `applicationUserId`, `rewards`, `eventId`, `timestamp`, `signature`, `appKey`, and `placementName`.
- Kept uppercase aliases for backward-compatible local tests.
- Added parsing for LevelPlay's documented `YYYYMMDDHHMM` timestamp format (interpreted as UTC for age validation).
- Updated callback setup documentation: required macros are USER_ID, REWARDS, EVENT_ID; App key and Placement name are optional dashboard parameters; timestamp/signature are supplied with private-key signing.
- CPX Worker files were not changed.
- No Cloudflare deployment, Production Supabase request, live callback, or real reward credit was performed.
