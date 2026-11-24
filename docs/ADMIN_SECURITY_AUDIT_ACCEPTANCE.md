# Admin Account Security & Audit History — Acceptance

## Scope
- Read-only audit history using `admin_list_audit_logs`.
- Administrator role inventory using `admin_list_role_assignments`.
- No UI action grants, revokes, or edits administrator roles.
- Audit JSON is redacted client-side for common sensitive field names; server-side access control remains authoritative.

## Database contract
Migration `017_admin_security_audit.sql` ports the existing Step 13 RPC definitions. `admin_list_audit_logs` requires `public.is_active_admin()`. `admin_list_role_assignments` requires an active `super_admin`. Both RPCs cap page size at 100 and are executable by `authenticated`, not `anon` or `public`. The migration depends on `admin_roles`, `admin_audit_logs`, and `is_active_admin()` created by `001_initial_schema.sql`.

## Acceptance checks
1. Signed-out user cannot access the admin application.
2. Ordinary member calling either RPC is denied.
3. Active support/finance/admin role can read audit events only.
4. Active `super_admin` can read role assignments.
5. Non-super-admin cannot enumerate role assignments.
6. Filters for target type and action prefix work.
7. Pagination returns no more than 100 rows per RPC call.
8. UI never exposes role mutation controls.
9. Common sensitive keys in before/after JSON render as `[REDACTED]`.
10. No service-role key is shipped to the browser.

## Verification status
Source-level syntax and archive integrity checks only. No Supabase staging/production execution or full dependency-backed Vite build has been performed. Deploy migration only after reviewing it against the target database schema and testing with separate member, support, finance, admin, and super-admin accounts.
