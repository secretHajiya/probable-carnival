# Android Spin & Win — Step 06

- Native member UI reads `spin_wheel_config` only when member RLS allows it; disabled config remains hidden and is presented as unavailable.
- A spin calls the existing authenticated `spin_wheel()` RPC. The database selects the result, applies the daily limit, writes spin history, and credits the wallet atomically.
- The wheel animation displays the server-returned result; no client-side random reward or wallet credit is performed.
- Recent history reads only the signed-in member's rows under the existing RLS policy.
- No SQL migration was added. Migration 024 is already applied in Production according to the project owner. `is_enabled` remains false until an administrator explicitly enables it after testing.
- Withdrawal settings are untouched and remain disabled.

## Validation
ZIP structure and integrity checks only. No TypeScript check, Expo prebuild, Android build, live Supabase RPC, or device test was performed.
