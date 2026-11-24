# Step 09 — Unity LevelPlay Rewarded Ads (Android foundation)

## What is included
- Uses the existing `unity-levelplay-mediation` 9.5.0 dependency.
- Adds a typed Rewarded Ads service using the documented React Native API: `LevelPlayInitRequest`, `LevelPlay.init`, `LevelPlayRewardedAd`, `loadAd`, `isAdReady`, `isPlacementCapped`, `showAd`, and `LevelPlay.setDynamicUserId`.
- Adds a native Rewarded Ads panel in the Earn tab.
- Sets the LevelPlay S2S user identifier to the signed-in Supabase UUID without hyphens (32 hexadecimal characters; reversible by the Worker).
- The client `onAdRewarded` event is informational only. It never credits coins and never invokes a wallet reward RPC.
- A completed client event only offers a wallet refresh; the balance remains controlled by the database/backend.

## Fail-closed configuration
The button remains disabled unless all four public build variables are present/true:
- `EXPO_PUBLIC_LEVELPLAY_APP_KEY`
- `EXPO_PUBLIC_LEVELPLAY_REWARDED_AD_UNIT_ID`
- `EXPO_PUBLIC_LEVELPLAY_REWARDED_PLACEMENT`
- `EXPO_PUBLIC_LEVELPLAY_S2S_READY=true`

`EXPO_PUBLIC_LEVELPLAY_S2S_READY` MUST remain `false` until the Cloudflare Worker S2S callback is implemented, deployed, signature-tested, duplicate-tested, and verified to credit the wallet exactly once. No S2S private key belongs in `.env`, Expo config, or the mobile binary.

## Still pending (not falsely marked complete)
- User must provide the actual LevelPlay Android App Key, Rewarded Ad Unit ID, and exact Placement name from their Unity dashboard.
- Cloudflare Worker endpoint for LevelPlay S2S is not implemented in this step.
- A forward-only Supabase migration for event idempotency and admin settings has not been written/applied. It must be designed after reviewing the current wallet schema and existing reward RPC conventions.
- No ad should be shown and no reward should be issued until the S2S backend is complete.
- No Android build or device test has been run.

## Official Unity references
- React Native plugin integration: https://docs.unity.com/en-us/grow/levelplay/sdk/react/plugin-integration
- React Native rewarded ads: https://docs.unity.com/en-us/grow/levelplay/sdk/react/rewarded-ads-integration
- S2S callback settings and signature formula: https://docs.unity.com/grow/levelplay/platform/settings/server-to-server-callback

The Unity callback requires USER_ID, REWARDS, EVENT_ID; its private-key signature is MD5(TIMESTAMP + EVENT_ID + USER_ID + REWARDS + PRIVATE_KEY). The Worker must validate this on the server, enforce idempotency on EVENT_ID, and acknowledge successful callbacks with HTTP 200 containing `EVENT_ID:OK`.
