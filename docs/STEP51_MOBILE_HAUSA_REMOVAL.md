# Step51 — Remove Hausa from Member Mobile language options

## User instruction
Remove Hausa from the Member Mobile app's supported language choices while continuing the next localization work.

## Implemented
- Removed `ha` from `MEMBER_LANGUAGES`; the Member Mobile language picker now offers exactly English, Arabic, French, Spanish, Portuguese, German, Turkish, Hindi, and Chinese.
- Removed the Hausa translation dictionary from `apps/mobile/src/services/i18n.ts`.
- Existing member profiles that still contain `preferred_language = 'ha'` safely fall back to English in the native app and Profile Settings; the profile is not silently rewritten in the database.
- No SQL migration, database constraint change, Admin language change, Worker, payout, or Production setting was changed.

## Scope
This step removes Hausa from the Member Mobile supported-language selector and runtime dictionary. It does not yet translate all embedded feature panels (Referral, Activity, Inbox/Support, Withdrawal, Spin, Quiz, Check-in, and Ads) into the remaining nine languages. That remains a separate localization increment. Arabic RTL support also remains pending.

## Validation
Run `node tests/step51_mobile_remove_hausa.mjs` and the existing Step50 localization contract. These are source-contract checks, not a full Expo typecheck, Android build, or device test.
