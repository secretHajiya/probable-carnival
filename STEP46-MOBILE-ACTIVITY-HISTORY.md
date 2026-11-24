# Step46 — Native Mobile Activity / Transaction History

Date: 2026-11-23  
Baseline: cumulative Step45 Master ZIP supplied by the project owner.

## Changes

- Added `apps/mobile/src/components/ActivityHistoryPanel.tsx`.
- Replaced the Activity tab placeholder in `apps/mobile/App.tsx` with the new panel.
- Reads the existing `public.wallet_ledger` table; no new table, RPC, migration, or client-side wallet mutation was introduced.
- Selects the same display fields already used by Member Web: `id, entry_type, amount_coins, description, created_at`.
- Filters by the signed-in user's ID, sorts newest first with an ID tie-breaker, and fetches bounded pages of 25.
- Provides refresh, load-more, loading, error, and empty states. It displays no fabricated/sample transactions.
- Debit/credit sign labels follow the Member Web dashboard mapping for known entry types; unknown types are displayed without an assumed sign.

## Security basis

The query is scoped to `userId` from the authenticated session. The existing base migration defines the `Users read own ledger` RLS policy on `wallet_ledger`, and migration 004 grants authenticated SELECT while revoking direct insert/update/delete from anon/authenticated. The mobile component performs only SELECT operations. Database RLS remains the authoritative access control.

## Verification

- `node tests/step46_mobile_activity_history_contract.mjs`: 10/10 static contract checks passed.
- ZIP integrity test: passed.
- Full React Native TypeScript check, Expo prebuild, Android Gradle build, live Supabase query, and physical-device test were not run in this environment because project dependencies/backend credentials are not installed/connected here.
- No SQL migration, Production change, Worker deployment, withdrawal activation, or payout was performed.

## Remaining work

Mobile still needs Notifications & Support, withdrawal UI/history (must remain disabled until payout gates and explicit approval), and profile settings. Web/Admin builds, role-matrix/browser acceptance, provider E2E tests, Android build/device testing, signing, GitHub and Codemagic remain release gates.
