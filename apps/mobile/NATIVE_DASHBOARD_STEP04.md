# Step 04 — Native Member Dashboard

This step replaces the post-login placeholder list with a native React Native dashboard shell.

## Included
- Home tab with live wallet values from the existing member service.
- Earn tab listing the reward integrations and their actual pending/disabled status.
- Activity tab with an honest empty state (no fabricated transactions).
- Profile tab with the signed-in member profile and sign-out.
- Bottom tab navigation implemented with React Native primitives; no new navigation dependency.
- Pull-to-refresh reloads the signed-in member snapshot.

## Safety and backend behavior
- No client-side wallet crediting or reward simulation.
- Spin & Win and Quiz remain disabled by their server-side defaults.
- Rewarded Ads remain pending until Unity credentials and a server-to-server verification callback are configured.
- Withdrawal history is not represented as active functionality; withdrawal settings remain disabled.
- Admin Dashboard remains a separate React/Vite web application.

## Validation
Archive integrity and source/config presence were checked when packaging. TypeScript, Expo prebuild, Gradle, Codemagic, device, and live Supabase tests have not been run.
