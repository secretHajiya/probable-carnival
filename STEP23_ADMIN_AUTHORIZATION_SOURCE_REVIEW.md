# Step23 — Admin authorization source review

## Scope and method

This step reviews the Member Web authentication flow and the Admin Dashboard's client gate and SQL authorization guards. It is a static source review of the cumulative Step22 archive. It did **not** connect to Supabase Production, create test users, execute SQL, exercise RLS over HTTP, or run browser tests.

## Checks

The new `scripts/verify-admin-authorization-matrix.py` checks:

- Admin Dashboard requires an authenticated session **and** `is_active_admin()`; RPC errors and non-true results fail closed.
- `is_active_admin()` requires an active role assignment and accepts `support`, `finance_reviewer`, `admin`, or `super_admin`.
- Finance read/list/review SQL functions each require `is_finance_admin()`; support-only users are excluded by that helper.
- Member directory, fraud review, Spin configuration, and Quiz configuration use `is_active_admin()` guards.
- Country/currency configuration uses the narrower `admin` / `super_admin` role helper.
- Admin role inventory is restricted to `super_admin`.
- Client source does not contain a service-role key variable or service-role credential literal.

## Important least-privilege observation

The Admin Dashboard currently renders a shared navigation menu rather than filtering features by the signed-in user's exact role. More importantly, several SQL functions authorize using the broad `is_active_admin()` helper. Therefore `support` and `finance_reviewer` roles may reach some member-directory, fraud-review, audit, and reward-configuration operations if those functions only check `is_active_admin()`.

This is **not** evidence that a member or anonymous user can bypass the database. The reviewed SQL guards are the actual security boundary. It is a role-scope / least-privilege decision that needs explicit owner approval: should Support and Finance Reviewer have all those active-admin capabilities, or should the project introduce narrower helpers and role-filtered navigation? No permission was changed in this step.

## Current role matrix from source

| Role | Admin shell gate | Finance RPCs | Admin-only features guarded by `is_active_admin()` | Country/currency settings | Role inventory |
|---|---:|---:|---:|---:|---:|
| support | Yes | No | Yes | No | No |
| finance_reviewer | Yes | Yes | Yes | No | No |
| admin | Yes | Yes | Yes | Yes | No |
| super_admin | Yes | Yes | Yes | Yes | Yes |
| ordinary member / anonymous | No | No | No | No | No |

“Admin-only features” above means the SQL functions reviewed that check `is_active_admin()`; it does not claim every Admin screen has identical data permissions. Each RPC's guard remains authoritative.

## Result

- Static source authorization checks: PASS (16 checks; see script output when run locally).
- Live role matrix: NOT TESTED.
- Browser smoke tests: NOT TESTED.
- Production schema / role grants: NOT queried or changed.
- Withdrawals remain disabled as previously instructed; no payout or callback code was changed.

## Next decision needed

Before tightening the role model, confirm whether Support and Finance Reviewer should be limited to their own work areas. Any SQL permission change would require a new, separately reviewed migration and an explicit Production application step; this ZIP step does not apply migrations.

## Dependency/build blocker retained

The environment has no npm lockfile and cannot resolve `registry.npmjs.org` (`EAI_AGAIN`). Dependency installation and Member Web/Admin production builds remain blocked. No build success is claimed.
