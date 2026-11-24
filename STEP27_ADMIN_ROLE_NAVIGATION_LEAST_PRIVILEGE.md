# Step27 — Admin Role-Aware Navigation (Least Privilege)

## Delivered
- Admin UI now calls the existing authenticated database helpers `is_finance_admin()` and `is_configuration_admin()` after the active-admin gate.
- Capability loading fails closed: an RPC error or non-true result does not expose the corresponding UI area.
- Finance dashboard and withdrawal/payout data are not rendered for users without finance-admin capability.
- Country/currency, exchange-rate proposal, provider-management, and LevelPlay configuration screens are guarded by configuration-admin capability.
- Non-finance active admins receive a restricted workspace entry point rather than the finance dashboard.
- The older authorization matrix verifier was updated so it no longer reports the pre-Step27 shared-menu issue as current.

## Role mapping grounded in existing SQL helpers
| Role | Active Admin workspace | Finance dashboard | Configuration screens |
|---|---:|---:|---:|
| support | Yes | No | No |
| finance_reviewer | Yes | Yes | No |
| admin | Yes | Yes | Yes |
| super_admin | Yes | Yes | Yes |

`admin_roles` may be extended in future; these capability flags intentionally derive permissions from database helper functions rather than trusting a role label stored in the browser. The Security Center's role inventory remains super-admin-only through its server-side RPC.

## Verification
- `scripts/verify-admin-role-navigation.py`: **14/14 PASS**.
- `scripts/verify-admin-authorization-matrix.py`: **19 source authorization checks PASS**; the old shared-navigation warning is removed and replaced with the current capability-based behavior.
- All other existing Python source verifiers were rerun and passed.
- `scripts/test-levelplay-worker.mjs`: all local callback contract tests passed (mocked dependencies only).
- TypeScript `transpileModule` syntax check for `apps/admin/src/main.tsx`: PASS.

## Important limitations
- This is UI least-privilege visibility, not a replacement for server authorization. Existing Supabase RPC guards remain authoritative.
- No role-by-role browser E2E test was run because npm dependencies are not installed in this environment.
- No npm install, Vite production build, Supabase Production query/migration, Cloudflare deployment, payout test, Android build, or physical-device test was performed.
- No database migration was added or executed. Existing `is_finance_admin()` and `is_configuration_admin()` helpers are reused.
- CPX and LevelPlay Worker source/configuration were not changed.
