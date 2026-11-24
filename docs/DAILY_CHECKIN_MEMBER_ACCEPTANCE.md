# Daily Check-in — Member UI Acceptance

## Delivered
- `/check-in` member route linked from the dashboard.
- Reads only the signed-in member's `daily_checkins` rows; row privacy is enforced by the existing RLS policy.
- Calls the existing `claim_daily_checkin()` RPC and displays its server-returned reward, streak day, date and available balance.
- No client-side wallet writes or locally invented reward amounts.
- Maps known server errors (`daily_checkin_disabled`, `already_checked_in_today`, `active_account_required`, `authentication_required`) to member-facing messages.

## Database contract
- Apply `supabase/migrations/014_daily_checkin_rewards.sql` after migrations 001–003 and 013.
- The migration is ported from the Step 15 source RPC. It relies on `daily_checkins`, `wallet_accounts`, `wallet_ledger`, `profiles`, `is_active_admin()` and `auth.uid()` already established by migration 001.
- Daily rewards remain disabled (`is_enabled=false`, `reward_coins=0`) until an authorized operator explicitly configures them. No reward value or timezone is assumed.
- `claim_daily_checkin()` performs the check-in insert, ledger insert and wallet increment in one database transaction, protected by a per-user/per-local-date advisory lock.

## Acceptance checks before enabling
1. Apply migration to a disposable Supabase staging project.
2. Confirm authenticated members can select only their own check-in rows; anon cannot read or claim.
3. Confirm direct client insert/update/delete on `daily_checkins` and wallet tables is denied.
4. Confirm RPC returns `daily_checkin_disabled` while defaults remain disabled.
5. Configure a test reward and valid IANA timezone in staging only.
6. Claim once: exactly one check-in row, one ledger row and one wallet increment.
7. Claim again on the same local date: `already_checked_in_today`; no extra ledger or balance change.
8. Simulate concurrent claims: only one succeeds.
9. Test next-day streak continuation and a missed-day reset.
10. Verify a suspended account cannot claim.

## Verification boundary
TypeScript syntax and ZIP integrity checks are source-package checks only. No Supabase migration, staging RPC, concurrency, RLS, or browser end-to-end test is claimed as completed.
