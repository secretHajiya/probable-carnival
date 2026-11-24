# Admin Member Directory — Acceptance Checks

## Scope
Read-only directory powered by `public.admin_list_members`. It exposes member UUID, display name, country code, account status and join date only. It does not expose email, payout details, private profile fields, wallet balances, or controls to suspend/close accounts.

## Required staging checks
1. Apply `016_admin_member_directory.sql` after migrations 001–015.
2. Call the RPC as anon: execution must be denied.
3. Call as authenticated non-admin: expect `active_admin_required` / SQLSTATE 42501.
4. Call as active support/admin role: receive only the limited directory columns.
5. Verify inactive admin role is denied by `is_active_admin()`.
6. Search by partial display name and exact UUID.
7. Verify `%` and `_` are treated as literal search characters.
8. Filter by `active`, `suspended`, and `closed`; invalid filters must be rejected.
9. Filter by two-letter country code; malformed country code must be rejected.
10. Verify limit is clamped to 1–100 and negative offset becomes zero.
11. Verify pagination does not duplicate or skip rows while dataset is stable.
12. Confirm no UI action changes account status or wallet balance.

## Verification status
Source and SQL contract reviewed against standalone `001_initial_schema.sql` (`account_status` enum is `active`, `suspended`, `closed`). No live Supabase execution has been performed.
