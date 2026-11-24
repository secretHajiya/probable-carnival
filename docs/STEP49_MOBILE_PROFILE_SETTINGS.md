# Step49 — Native Mobile Profile Settings

## Included
- Replaced the read-only Profile placeholder in `apps/mobile/App.tsx` with `ProfileSettingsPanel`.
- Members can update their own display name and preferred language.
- Supported language choices match the existing Member Web locale catalogue: English, Arabic, French, Spanish, Portuguese, German, Turkish, Hindi, and Chinese.
- The panel displays email, selected country, and account status as read-only account information.
- Sign out remains available from Profile Settings.
- Added `profileSettingsService`, which validates the display name (2–80 characters), validates the locale against a fixed allowlist, obtains the authenticated user from Supabase Auth, updates only `display_name` and `preferred_language` for that authenticated user's profile row, then reloads the saved profile.

## Security and scope
- No user ID is accepted from the UI/service caller; the service derives it from `auth.getUser()`.
- The update query is scoped to the authenticated user's own `profiles.id` and continues to rely on the existing profiles RLS policy.
- `country_code` is deliberately not editable here. The one-time country selection remains controlled by the existing `set_member_country` RPC.
- Email and account status are read-only.
- No new table, RPC, migration, Worker, or Production change was added.
- Saving `preferred_language` persists the preference; full translation of every native screen is a separate remaining task and is not claimed by this increment.

## Verification
- `tests/step49_mobile_profile_settings.mjs`: 14/14 source-contract checks passed.
- Historical local checks were rerun with Node 22 type stripping where the PayPal runtime simulation imports the Worker's `.ts` source:
  - Step31 15/15
  - Step32 10/10
  - Step40 10/10
  - Step41 10/10
  - Step42 7/7
  - Step43 10/10
  - Step45 10/10
  - Step46 10/10
  - Step47 13/13
  - Step48 15/15
  - Step49 14/14
- Total rerun checks: 114/114.
- Expo dependencies are not installed in this workspace. No dependency-backed mobile typecheck, Expo prebuild, Android build, emulator/device test, live Supabase test, or browser test is claimed.

## Next
- Complete native localization using the persisted preferred language, then run accessibility/responsive review and dependency-backed Expo typecheck/build in an environment with dependencies available.
