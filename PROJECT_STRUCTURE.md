# Vyra Rewards Global — Project Structure

## Applications
- `apps/mobile`: React Native / Expo Android member app (conversion in progress; target for Codemagic Android builds).
- `apps/web`: existing React/Vite member web app retained during migration.
- `apps/admin`: existing React/Vite admin dashboard; remains web-based.

## Backend
- `supabase`: PostgreSQL schema, forward-only migrations, RLS and RPCs.
- `cloudflare`: CPX callback and payout-details Workers.

## Monorepo
The root npm workspaces include all three apps. Use Node.js 22.13.x or newer for the Expo SDK 58 mobile workspace. The web and admin apps retain their existing Vite build scripts.

## Security invariants
- No service-role key or provider private key in mobile/web bundles.
- Wallet rewards are credited server-side only.
- Provider callbacks are signed, idempotent and reversal-aware.
- Withdrawals remain disabled until separately approved and fully verified.
