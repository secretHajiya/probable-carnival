# Admin Dashboard implementation status

A first finance-admin UI exists at `apps/admin`. It provides Supabase email/password sign-in, finance overview, withdrawal listing/filtering, and approve/reject/needs-info actions through the audited Step 11 RPC.

## Security boundary
- The browser uses only the Supabase anon/publishable key. No service-role key is included.
- The UI does not grant or infer finance-admin privileges. Every finance RPC must enforce `is_finance_admin()` in the database.
- If an RPC returns `finance_admin_required` (or a permission-denied response), the UI clears finance data and displays an explicit access-denied screen.
- The review action calls `admin_review_withdrawal_audited`, never a direct table update.
- Do not grant finance-admin role from this UI.

## Production status
The project owner reported that all five Step 10/11 routines exist and supplied a privilege query showing `SECURITY DEFINER`, `authenticated` execute, and no `anon`/`public` execute. This is owner-reported evidence, not a live inspection by this project build. Internal role checks still require runtime testing with both a finance-admin account and an ordinary authenticated account.

`withdrawal_config` existence, its RLS policy, and its country rows still require the read-only post-deployment SQL check. Keep all country rows disabled until payout-details token issuance/validation and payout operations are implemented and tested.

## Build and integration status
- Source files are present; dependencies have not been installed in this environment.
- No successful TypeScript/Vite production build is claimed.
- No live Supabase API session or payout was performed.

## Run locally
1. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `apps/admin/.env.local`.
2. Run `npm install` inside `apps/admin`.
3. Run `npm run build`, then `npm run dev` for local testing.
4. Follow `docs/ADMIN_FINANCE_ACCEPTANCE_TESTS.md` before enabling access for operational use.
