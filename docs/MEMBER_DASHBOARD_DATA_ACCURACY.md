# Member Dashboard data accuracy update

This update corrects two display semantics in `apps/web/src/dashboard/Dashboard.tsx`:

- The referral metric now counts only rows with `status = rewarded`, and is labelled **Rewarded referrals**. Pending or merely qualified referrals are not presented as already rewarded.
- Recent wallet activity no longer prefixes every ledger entry with `+`. Known debit entries (`reward_reversed`, `withdrawal_reserved`, `withdrawal_paid`) display a minus sign; known credit entries display a plus sign; `admin_adjustment` and unknown types display no assumed direction.
- Dashboard loading now catches rejected requests and always clears the loading state, rather than leaving the screen in a permanent loading state after an unexpected network/client exception.

## Data/security assumptions

The dashboard uses the signed-in Supabase user ID for every member-scoped query. The database must retain the existing row-level security policies for `wallet_accounts`, `wallet_ledger`, `withdrawal_requests`, and `referrals`. The client does not use a service-role key.

## Verification status

Source-level review was performed against the schema in `supabase/migrations/001_initial_schema.sql`, including the `referrals.status` values and `ledger_entry_type` enum. ZIP integrity is checked after packaging. A production Supabase session test and dependency-backed TypeScript/Vite build have not been run here; do not treat this update as live-backend verification.
