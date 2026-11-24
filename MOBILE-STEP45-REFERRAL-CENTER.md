# Step45 — Mobile Referral Center

## Delivered
- Added `ReferralCenterPanel` to the React Native app.
- Added a Referral Center navigation tab and Home dashboard shortcut.
- Reads the signed-in member's own `profiles.referral_code` and `profiles.referred_by`.
- Lists only referrals where `referrer_user_id` equals the signed-in user, with a 100-row limit; database RLS remains authoritative.
- Applies codes only through the existing `apply_referral_code` RPC.
- Uses the native share sheet to share the member's referral code.
- Shows pending, qualified, rewarded and rejected statuses without exposing invitee personal data.
- Does not credit coins in the client and does not call `qualify_referral`; qualification remains service-role-only.

## Existing backend behavior preserved
Migration `003_referral_system.sql` remains unchanged. Its referral reward configuration defaults to `is_enabled=false` and `referrer_reward_coins=0`. Therefore the UI does not promise or estimate referral rewards. Server-side qualification/rewarding remains disabled until an authorized administrator configures it and the trusted backend qualifies the referral.

## Validation
- `node tests/step45_mobile_referral_center_contract.mjs`: 10/10 passed.
- Full TypeScript/app build was not run: dependencies are not installed in this extracted workspace (`node_modules` absent). A global `tsc` invocation therefore reports missing React/React Native/Supabase modules and missing project compiler context; this is not a passing typecheck.
- No Supabase SQL, Production settings, Cloudflare Worker, provider configuration, or withdrawal settings were changed.
- No Android APK was built and no device/browser acceptance test was performed.
