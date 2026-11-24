# Admin Spin & Win Control — Step 25

## Included
- Admin-only Spin & Win configuration screen in the Admin Dashboard.
- Reads `spin_wheel_config` using the authenticated Supabase session and existing RLS policy.
- Saves through `admin_update_spin_wheel_config(boolean, integer, jsonb)`; the browser cannot directly update the table.
- Controls enabled/disabled state, daily free spins, segment labels, coin values, weights and active flags.
- Validates limits before saving and asks for confirmation before enabling.

## Safety
- Migration 024 seeds `is_enabled=false`; this feature does not enable it automatically.
- Do not enable until member wheel flow, wallet credit, and admin settings have been tested in a controlled environment.
- Does not change withdrawal configuration.
- Admin page remains behind the existing `is_active_admin()` gate.

## Production checks still required
1. Sign in with an account that passes `is_active_admin()`.
2. Open Admin Dashboard → Spin & Win and confirm configuration loads.
3. Edit a harmless label/weight and save; confirm the RPC succeeds and reload persists it.
4. Keep Enable unchecked; verify `spin_wheel_config.is_enabled` remains false.
5. Confirm a non-admin cannot access the Admin Dashboard.
