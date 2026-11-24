# Member Referral Center — Acceptance Checklist

## Scope
The member page reads the signed-in member's referral code and referrals they initiated. Applying a code calls the authenticated `public.apply_referral_code(text)` RPC. The browser never awards coins.

## Required migration
Apply `supabase/migrations/003_referral_system.sql` only after checking the deployed migration history and schema. It creates the referral reward configuration, assigns referral codes to new profiles, implements one-time code application, and grants referral qualification only to `service_role`.

## Manual staging checks
1. Sign in as Member A; open `/referrals`; confirm a referral code appears.
2. Copy the code and verify the clipboard content exactly matches the displayed code.
3. Sign in as a new Member B; apply Member A's code; confirm success.
4. As Member B, attempt to apply a second code; confirm the RPC rejects it.
5. Attempt to apply Member B's own code; confirm self-referral is rejected.
6. Attempt an unknown code; confirm it is rejected without profile/referral changes.
7. As Member A, confirm only Member A's own initiated referral appears.
8. Confirm the page shows status only and does not expose the referred member's email or personal profile data.
9. Confirm no coins are credited merely by applying a code.
10. Confirm referral reward config is disabled by default and qualification RPC is not executable by `anon` or `authenticated`.
11. Configure a non-production test reward in staging; qualify an eligible referred member through the trusted service path.
12. Retry qualification; confirm unique referral reward and wallet ledger idempotency prevent a second credit.
13. Confirm the dashboard's referral count agrees with the number of `rewarded` referrals under the same member account.

## Not yet verified
No Supabase staging execution, live referral registration, reward qualification, TypeScript build, or production deployment is claimed by this source increment.
