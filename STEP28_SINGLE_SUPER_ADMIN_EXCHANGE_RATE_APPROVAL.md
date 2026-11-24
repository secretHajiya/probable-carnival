# Step28 — Single Super Admin Approval & Activation

## Policy implemented in source
- Configuration Admins may continue preparing/updating pending proposals.
- Only an active `super_admin` may approve and activate a pending proposal.
- A single Super Admin performs both actions; no second approver is required.
- Activation requires an MFA step-up JWT claim (`aal2`).
- Support, Finance Reviewer, and regular Admin are rejected by the database RPC, regardless of UI visibility.
- Approval + activation occur in one database transaction. The previous active rate(s) are closed at the activation timestamp and a new `exchange_rates` row is inserted.
- Audit log stores the actor, previous live rate(s), new rate, and activation timestamp.
- Repeated activation is rejected because only `pending` proposals can be activated.

## Deployment boundary
- New migration: `supabase/migrations/030_single_super_admin_exchange_rate_activation.sql`.
- Migration is source-only in this ZIP. It has NOT been executed in Production.
- UI shows an explicit confirmation before activation and reports the MFA requirement.
- Do not enable withdrawals or payout configuration as part of this step.
- No CPX or LevelPlay Worker changes.

## Required acceptance tests before Production
1. Active Super Admin with `aal2`: pending proposal activates and exactly one current rate remains for the country/currency pair.
2. Same Super Admin without `aal2`: denied; no rows or audit records change.
3. Support, Finance Reviewer, regular Admin: denied even with `aal2`.
4. Anonymous user: denied.
5. Already activated proposal: second activation denied.
6. Disabled country/currency: activation denied.
7. Verify audit before/after payload and actor/timestamp.
8. Verify member-facing rate readers select the newly effective row correctly.
9. Confirm NG and US withdrawal configs remain disabled.

## Important caveat
Migration 030 adds a partial unique index that enforces at most one active `super_admin` row globally. If duplicate active Super Admin rows already exist, migration creation fails safely and must be reconciled manually before deployment. MFA (`aal2`) must be configured for the one active Super Admin account.
