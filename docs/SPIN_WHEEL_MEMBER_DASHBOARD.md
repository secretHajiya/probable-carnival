# Spin & Win — Member Dashboard Integration

## Database dependency

Migration `024_spin_wheel_rewards.sql` creates the secure server-side spin function, configuration table, and member spin history. The Production owner reported successful execution and verified both tables, both functions, RLS enabled on both tables, and authenticated-only execution on both functions.

## Member experience

- The dashboard includes a Spin & Win panel.
- The panel remains in a Coming soon state while the configuration row is disabled or not visible to a regular member.
- When an administrator enables the feature, the panel loads active weighted segments and the member's remaining daily spins.
- The spin outcome and wallet credit are determined by the `spin_wheel()` database function, not by client-side random selection.
- The wheel animates to the returned segment and displays the credited reward.
- Recent spin history is shown from the member's own RLS-protected rows.
- The dashboard refreshes the wallet after a successful spin.

## Important safety behavior

- The member UI does not enable the feature or modify reward weights.
- The database function enforces the daily limit and credits the wallet transactionally.
- Withdrawal configuration is not changed by this feature and must remain disabled until separately approved.
- No rewarded-ad extra spins are included; no ad integration has been implemented for this feature.

## Acceptance checks still required

1. Confirm the regular member sees Coming soon while `is_enabled=false`.
2. In a controlled test environment, enable the wheel using the admin configuration RPC and verify the member sees the configured segments.
3. Spin once and verify the returned reward matches exactly one new `spin_wheel_spins` row and one matching wallet ledger entry.
4. Verify wallet balance refreshes and the remaining-spin count decreases.
5. Attempt another spin after the daily allowance is exhausted; the server must reject it.
6. Verify a second member cannot read the first member's spin history.
7. Verify anon cannot execute either function.
8. Verify withdrawal configuration remains disabled.

Do not claim browser or production UI testing until these checks are actually performed.
