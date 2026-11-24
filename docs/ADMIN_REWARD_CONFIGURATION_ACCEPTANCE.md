# Admin Reward Configuration — acceptance

## Delivered
- Admin-only `admin_get_reward_configuration()` RPC.
- Read-only listing of configured reward rules.
- Daily check-in enabled flag, coin amount, and timezone visibility.
- No browser-side writes and no reward activation.

## Security
- `SECURITY DEFINER` with an empty search path.
- Checks `public.is_active_admin()` before reading configuration.
- EXECUTE revoked from PUBLIC and anon; granted to authenticated.
- Ordinary authenticated members should receive SQLSTATE 42501 / `admin_required`.

## Required staging checks
1. Apply migration 019 after migrations 001 and 014 and after `is_active_admin()` exists.
2. Call RPC as active admin; verify rules and daily check-in config.
3. Call as ordinary member; confirm 42501.
4. Call as anon; confirm execute denied.
5. Confirm screen has no edit or activation actions.

## Deliberate limitation
Read-only overview only. It does not create/edit rules or enable daily check-in. Write operations need separately reviewed validation, approval, effective-date, audit, and rollback semantics. No live database test is claimed.
