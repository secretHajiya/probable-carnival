# Step26 — Exchange Rate Proposal / Approval Boundary Review

## Scope
Static review of the Step25 exchange-rate proposal migration and Admin UI. This is not an implementation of approval or activation, and it does not connect to Supabase Production.

## Results
- `scripts/verify-exchange-rate-approval-boundary.py`: **17/17 PASS**.
- Existing project source checks and local LevelPlay Worker contract tests were rerun; all executed checks passed.
- Migration 029 keeps proposals in `exchange_rate_drafts`, enables RLS, revokes direct anon/authenticated table access, and exposes only guarded SECURITY DEFINER RPCs.
- Both RPCs require an authenticated `admin` or `super_admin` through `is_configuration_admin()`.
- Saving validates the enabled country/default currency pair, positive whole-number coin rate, and rationale length; it uses a transaction advisory lock and records before/after audit data.
- The database constraint keeps proposal status at `pending`; current UI/API exposes only list/save operations and does not directly write `exchange_rates` or call an activation RPC.

## Important boundary / decision still required
No approval or activation workflow has been added. A rate becoming live changes member-facing monetary estimates and potentially downstream financial calculations. Before implementing that workflow, the owner must decide:
1. Whether the proposer may also approve, or whether a second distinct admin is mandatory.
2. Whether approval immediately updates `public.exchange_rates` or requires a separate scheduled activation.
3. What effective timestamp, expiry/replacement behavior, and rollback procedure are required.
4. Whether each country/currency needs one or multiple approvers.

Until those decisions are explicit, proposals remain pending and withdrawals remain disabled as previously recorded. No exchange-rate value was invented.

## Existing admin navigation note
The existing static authorization review still reports that all 10 admin navigation labels are rendered from a shared menu rather than filtered by role. This is a UI visibility issue, not evidence of a database bypass: server-side RPC guards remain the security boundary. Support/Finance users must continue to be denied any privileged operation whose SQL guard requires configuration-admin or finance-admin privileges. A role-by-role browser test remains pending.

## Not performed
- No Production SQL or migration execution.
- No changes to `exchange_rates`, wallet balances, rewards, payouts, or withdrawal configuration.
- No Cloudflare Worker, CPX, or LevelPlay deployment/configuration changes.
- No npm install, Vite build, browser E2E, Android build, or physical-device test.
