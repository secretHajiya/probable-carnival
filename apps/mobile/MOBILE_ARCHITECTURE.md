# Vyra Rewards Global — Mobile architecture (Step 03)

## Scope
The Android member application is the only surface being migrated to React Native. The Admin Dashboard remains the existing React/Vite web application. The legacy member web app is retained as a fallback during parity work.

## Current layers

- `App.tsx`: presentation and screen-level state only.
- `src/lib/supabase.ts`: Supabase client configuration and SecureStore-backed auth persistence.
- `src/services/auth.service.ts`: signup, signup OTP verification, password sign-in and sign-out.
- `src/services/member.service.ts`: profile/wallet reads and the `set_member_country` RPC.
- `src/types/domain.ts`: shared mobile domain contracts.

Screens must call services rather than embedding Supabase table/RPC operations. Service methods throw Supabase errors to the screen; screens display safe user-facing errors. Do not add service-role keys, payout credentials, CPX secrets, or LevelPlay S2S secrets to the app.

## Verified database contracts from repository migrations

- `profiles`: `id`, `display_name`, `country_code`, `status`, `preferred_language` are selected by the mobile client. The base table is defined in migration 001.
- `wallet_accounts`: `user_id`, `available_coins`, `pending_coins`, `lifetime_earned_coins` are read-only in this mobile foundation. The base table is defined in migration 001.
- `set_member_country(p_country_code text)`: used for one-time NG/US onboarding; defined in migration 023. Country selection is not treated as a wallet action.
- Auth uses Supabase email/password signup and `verifyOtp` with `type: 'signup'`; session persistence uses Expo SecureStore.

## Security invariants

1. The client never writes wallet balances or ledger entries directly.
2. Reward credits must be issued by verified server-side RPC/callback flows only.
3. Withdrawals remain disabled in Production; this mobile foundation does not expose a withdrawal submission action.
4. Spin and Quiz remain server-controlled and disabled by their existing configuration until explicitly enabled by an authorized admin.
5. Missing wallet data is displayed as unavailable, not silently presented as a genuine zero balance.

## Not yet implemented

Feature parity for CPX, daily check-in, referrals, Spin & Win, Quiz, Unity LevelPlay S2S reward verification, notifications, and withdrawal history. These must be added one feature at a time after their existing database/API contracts are reviewed. No new Production SQL migration is part of Step 03.
