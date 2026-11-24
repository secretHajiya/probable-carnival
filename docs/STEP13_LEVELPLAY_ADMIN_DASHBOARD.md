# Step 13 — LevelPlay Admin Dashboard Configuration

## What changed
- Added `apps/admin/src/features/rewards/AdminLevelPlay.tsx`.
- Added a LevelPlay Ads navigation entry and route in `apps/admin/src/main.tsx`.
- Added responsive styling in `apps/admin/src/style.css`.
- Uses existing Migration 026 RPCs only: `admin_get_levelplay_reward_config` and `admin_update_levelplay_reward_config`. No new SQL migration is required.

## Safety behavior
- Reads and writes only through the two admin RPCs; database admin authorization and audit logging remain authoritative.
- Existing `is_enabled` value is loaded as-is. The Migration 026 seed default remains disabled. This change does not enable it.
- Enabling requires non-empty App Key and Placement Name and positive expected reward and coin values; browser confirmation warns that live S2S tests must already have passed.
- No S2S private key field exists. Keep `LEVELPLAY_S2S_PRIVATE_KEY` only in the Cloudflare Worker secret store.
- Does not deploy, edit, or replace `cloudflare/levelplay-rewarded-callback`; does not touch the CPX callback, withdrawals, Spin & Win or Quiz settings.
- The screen does not establish Unity dashboard settings or prove that a live callback works.

## Admin use
1. Sign in using an account that passes `is_active_admin` and the database configuration-admin check used by Migration 026.
2. Open **LevelPlay Ads**.
3. Confirm the displayed state is Disabled until the full callback setup and verification are complete.
4. Enter only the exact App Key, placement, S2S reward amount, and intended Vyra coin award after those values are confirmed from the Unity project and reward design. Do not guess values.
5. Save while disabled first. Do not enable until Cloudflare Worker deployment, secret configuration, Unity callback macros/signature, invalid-signature rejection, stale timestamp rejection, duplicate event idempotency and wallet reconciliation are verified in staging.

## Validation status
- Source-level wiring reviewed against the exact RPC argument names and JSON fields in `026_levelplay_rewarded_s2s.sql`.
- No Production RPC was called from this build step.
- No Cloudflare deployment, Unity dashboard update, live callback, or wallet credit was performed.
- Run `npm run build:admin` in the later controlled build stage; dependencies are not installed or modified in this step.
