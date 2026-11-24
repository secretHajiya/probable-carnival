# Step53 — Member Mobile Referral, Notifications & Support localization

## Scope

This increment extends the existing nine-language Member Mobile localization system to the Referral Center and Notifications & Support panels:

- English (`en`)
- Arabic (`ar`)
- French (`fr`)
- Spanish (`es`)
- Portuguese (`pt`)
- German (`de`)
- Turkish (`tr`)
- Hindi (`hi`)
- Chinese (`zh`)

Hausa is not included. Legacy `preferred_language = 'ha'` continues to use the existing English fallback; this increment does not rewrite profile data.

## Implementation

- Added `apps/mobile/src/services/referral-inbox-i18n.ts` with matching translation keys for all nine supported languages.
- Passed the saved profile language from `App.tsx` into `ReferralCenterPanel` and `MemberInboxPanel`.
- Localized Referral Center headings, invite-code guidance/share text, referral status counts, code-entry actions, empty state and reward-safety explanation.
- Localized Inbox/Support tabs, notifications read labels, ticket creation and reply forms, category labels, ticket states, empty/loading/error fallbacks and action labels.
- Kept referral code application on the existing `apply_referral_code` RPC; no client-side wallet credit was added.
- Kept notifications, tickets and messages on the existing member services/RPCs and RLS model.
- No SQL migration, Supabase Production change, Cloudflare deployment, payout, or withdrawal activation was performed.

## Validation

- `apps/mobile/tests/step53_referral_inbox_localization.mjs`: 20/20 checks passed.
- Existing Step45 referral contract test was updated to assert the localized native share-sheet message and passed 10/10.
- Step31/32/40/41/42/43/45/46/47/48/49/50/51/52 historical source/contract suites passed in the cumulative local rerun. Step42 requires `node --experimental-strip-types` on Node 22.
- TS/TSX transpile syntax checks passed for the changed mobile files.
- Full Expo typecheck was attempted but cannot pass in this workspace because app dependencies/types (`react`, `react-native`, Supabase SDK, Expo and native SDK packages) are not installed. This is not a successful full typecheck or Android build.

## Remaining localization work

- Spin Wheel, Quiz Rewards and rewarded/banner ads panels.
- Arabic right-to-left layout and visual acceptance.
- Provider/database error localization where structured error codes are available; raw upstream error messages may still be English.
- Full Expo typecheck, Android build, live Supabase and physical-device acceptance.
