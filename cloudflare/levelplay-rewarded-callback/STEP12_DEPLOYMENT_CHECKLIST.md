# Step 12 — Deployment Checklist

Use this checklist only after reviewing `STEP12_DEPLOYMENT_RUNBOOK.md`.

- [ ] Exact LevelPlay App Key confirmed in Unity dashboard
- [ ] Exact Placement Name confirmed
- [ ] Exact callback `[REWARDS]` value confirmed
- [ ] Vyra coin award explicitly decided
- [ ] Dynamic User ID mapping verified (Supabase UUID without hyphens)
- [ ] New Worker name confirmed: `vyra-levelplay-rewarded-callback`
- [ ] Worker deployed independently; CPX Worker untouched
- [ ] Three secrets added to the new Worker as encrypted secrets
- [ ] Callback URL copied from Cloudflare deployment output
- [ ] Unity callback parameters and signature configuration verified
- [ ] Invalid signature rejected
- [ ] Expired timestamp rejected
- [ ] Disabled configuration prevents credit
- [ ] Valid controlled test event credited exactly once
- [ ] Duplicate event acknowledged without a second credit
- [ ] Wallet ledger and balance reconciled
- [ ] Wrong app/placement/reward and ineligible user rejected
- [ ] Mobile `EXPO_PUBLIC_LEVELPLAY_S2S_READY` remains false until all checks pass

**Current status:** none of the Cloudflare/Unity live deployment checkboxes are confirmed by this repository update.


## Step 17 update
The mobile app now reads App Key, Rewarded Ad Unit ID, Placement and enabled status from the authenticated `get_levelplay_mobile_config()` RPC. Apply Migration 027 before using this version. Do not configure these SDK identifiers as Expo build-time variables. The S2S private key remains a Cloudflare Worker secret only.
