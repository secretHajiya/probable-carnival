# Step25 — Admin Coin Conversion Rate Proposals

## Delivered
- Added an Admin Dashboard page to prepare proposed coin conversion values per enabled country/default currency.
- Added Supabase migration `029_exchange_rate_proposals.sql` with a separate `exchange_rate_drafts` table.
- Added admin-only list/save RPCs using `is_configuration_admin()` and an audit log record for every proposal create/update.
- Direct client access to the draft table is revoked; UI uses RPCs only.
- Draft status is constrained to `pending`. This step intentionally contains no approval or activation action.

## Critical safety boundary
These are **proposals**, not live exchange rates. The migration does not insert, update, or read from `public.exchange_rates`; payout, wallet, reward, and member calculation functions remain unchanged. Saving a proposal cannot change balances or enable withdrawals. A separate owner-approved activation design and controlled migration are required before any value can affect live calculations.

## Validation
- `scripts/verify-exchange-rate-proposals.py`: 14 local source-contract checks.
- No Production Supabase connection was used.
- Migration 029 was added to the ZIP only; it was NOT executed.
- No exchange-rate value was invented or populated.
- No withdrawals, payouts, CPX callback, or LevelPlay Worker settings were changed.
- Dependency installation / Vite build not performed because npm registry access previously timed out.
