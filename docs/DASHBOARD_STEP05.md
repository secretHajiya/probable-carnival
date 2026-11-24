# Step 05 — Member dashboard foundation

## Added
- Replaced the authenticated placeholder screen with a responsive member dashboard.
- Reads the signed-in member's wallet totals from `wallet_accounts`.
- Reads the six latest wallet ledger entries from `wallet_ledger`.
- Displays withdrawal request count and referral count from their respective tables.
- Includes account email, preferred language, referral code, refresh, and sign-out.
- Uses the authenticated Supabase client; reads are constrained by the existing user-owned RLS policies.

## Important boundaries
- This is a read-only dashboard foundation. It does not create rewards, withdrawals, referrals, or ledger entries.
- An empty wallet is shown as zero only when the wallet row exists; a missing row is shown as zero in the summary, not treated as a successful wallet initialization.
- Counts are request/referral records, not proof of successful payment or referral reward.
- The UI has not been connected to live Supabase credentials in this environment.

## Verification
- Source-level inspection completed.
- `npm install` did not finish within the available execution window, so TypeScript/Vite production build and browser verification could not be run.
- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, install dependencies, and run `npm run build` in `apps/web` before deployment.
