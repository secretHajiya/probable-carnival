# Step48 — Mobile Withdrawal Center (read-only)

## Included
- Added a native `Withdrawals` destination from the Home tiles and bottom navigation (`Payouts` short label).
- Added `WithdrawalCenterPanel` and `withdrawalService`.
- Reads only the signed-in member's own `withdrawal_requests` rows (maximum 50, newest first) and the member-visible `withdrawal_config` row.
- Displays country/currency, request amount, fee, status, request/review timestamps, and rejection reason.
- Uses existing RLS and existing schema; no SQL migration or new table was added.

## Safety boundary
- This is deliberately a read-only mobile screen. It does not call `create_withdrawal_request`, `create_us_paypal_withdrawal_request`, payout-detail Worker endpoints, PayPal Worker endpoints, or any wallet mutation RPC.
- Even if an enabled config row is visible, mobile submission remains locked until country-specific payout acceptance and release approval are completed.
- Bank account and PayPal recipient details are never selected or displayed.
- Missing config is treated as unavailable/disabled; it is never interpreted as permission to submit.
- NG and US withdrawal configurations remain disabled according to the existing project status. This source change does not alter Production.

## Verification
- `tests/step48_mobile_withdrawal_center.mjs`: 15/15 source-contract checks.
- Historical suites: Step31 15/15; Step32 10/10; Step40 10/10; Step41 10/10; Step42 runtime simulation 7/7 (run with `node --experimental-strip-types`); Step43 10/10; Step45 10/10; Step46 10/10; Step47 13/13.
- The Step45/47 navigation assertions were generalized to allow the new Payouts tab; their feature checks remain intact.
- No dependency-backed Expo typecheck/build, live Supabase query, Android device test, SQL migration, Worker deployment, payout, or withdrawal activation was performed.

## Next
- Complete native profile settings and full app accessibility/responsive review.
- Then perform dependency-backed builds and live integration acceptance only after the source audit and security gates are complete.
