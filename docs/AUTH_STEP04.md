# Step 04 — Authentication and member profile foundation

## Included
- Supabase browser client using only the public anon/publishable key.
- Email/password sign-up and sign-in.
- Email confirmation-aware signup response.
- Forgot-password email request and password update service.
- Auth session provider and member profile loading.
- Member language captured during signup and profile language update helper.
- Forward-only SQL migration `002_auth_profiles_i18n.sql` to expand allowed member locales and align the auth-user profile trigger with signup metadata.
- Example auth screen and styles.

## Integration status
This step adds reusable authentication modules to the standalone source tree. It does **not** yet replace or wire the full member application entry point, because the standalone repository currently has no migrated `App.tsx`, `main.tsx`, or Vite package manifest. Do not describe the full website login flow as integrated or production-ready yet.

## Required configuration
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the web app environment. Configure Supabase Auth Site URL and redirect allow-list for the deployed domain, including `/reset-password`. Keep service-role keys and CPX hashes on the server only.

## Database
Apply migration 002 only after confirming migration 001 is already applied to the target database. Never rerun migration 001 on an existing database. Test signup trigger, confirmation, sign-in, profile read, language update, password recovery, and sign-out using separate test accounts before launch.

## Security notes
- Admin role is never accepted from signup metadata or browser input.
- `admin_roles` remains server-managed; client-side profile data is not authorization.
- Country selection is not writable by this client helper yet.
- Wallet credit, referral rewards, withdrawal, and provider operations are not exposed by these auth modules.
- Email confirmation behavior depends on Supabase project Auth settings and SMTP configuration.
