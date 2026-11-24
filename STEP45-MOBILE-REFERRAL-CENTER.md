# Step45 — Mobile Referral Center

The Android app now has a Referral Center navigation tab and Home shortcut. Members can view their own invite code, share it using the native share sheet, apply one referral code through the existing `apply_referral_code` RPC, and see status counts/history for referrals they initiated.

The implementation reuses the existing referral schema and policies; no migration was added. Referral rewards remain disabled by default in migration 003. The mobile client never credits coins and cannot invoke the service-role-only qualification function.

Validation: 10/10 Step45 contract checks passed. Full TypeScript/build validation remains pending because project dependencies are not installed in this workspace. No Production, SQL, Worker, or payout changes were made.
