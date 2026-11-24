# Step55 — Arabic right-to-left layout support

## Changes
- Added a shared native `DirectionProvider` and `isRTL()` helper. Arabic (`ar`) activates right-to-left layout; English, French, Spanish, Portuguese, German, Turkish, Hindi and Chinese remain left-to-right.
- Added direction-aware `Text` and `TextInput` wrappers. Arabic text uses `writingDirection: 'rtl'` and right alignment, while existing explicit centered text styles remain intact.
- Wrapped the signed-in native app shell and the authentication/configuration/country-selection shells in the direction provider, so direction context is shared by Home, navigation and all embedded member panels.
- Updated all ten native feature panels to use the direction-aware text component, including Spin, Quiz, Daily Check-in, rewarded/banner ads, Referrals, Activity, Inbox/Support, Withdrawals and Profile Settings.
- Did not call `I18nManager.forceRTL()` or `allowRTL()`. Direction follows the saved language immediately and does not require an app restart or force device-wide RTL behavior.
- No database schema, Supabase RPC, Worker, reward-crediting, payout or withdrawal behavior changed. No SQL or Production operation was performed.

## Validation
- Step55 focused Arabic RTL source/contract suite: 28/28 passed.
- TypeScript transpile/syntax checks passed for App.tsx, DirectionProvider.tsx and all ten native feature panels.
- Cumulative listed local suites passed 234/234: Step31 15, Step32 10, Step40 10, Step41 10, Step42 runtime 7, Step43 10, Step45 10, Step46 10, Step47 13, Step48 15, Step49 14, Step50 21, Step51 9, Step52 12, Step53 20, Step54 20, Step55 28. Run Step42 using `node --experimental-strip-types` on Node 22.
- Full Expo `tsc --noEmit`, Android build, physical-device acceptance and visual RTL verification were not completed. The workspace lacks the installed app dependencies and Expo base tsconfig required for the full typecheck.
- ZIP integrity check passed after packaging.

## Remaining
- Verify Arabic layout visually on Android devices at different screen widths, including navigation order, cards, long labels and text inputs.
- Dynamic server-authored quiz questions, explanations, spin reward-segment labels and unknown provider/server error strings may still arrive in their source language; RTL text direction does not translate those values.
- Full Expo typecheck/build, Android device acceptance, live Supabase tests and LevelPlay device/callback testing remain pending.
- NG and US withdrawals remain disabled. No payout, Worker deployment or Production SQL change was performed.
