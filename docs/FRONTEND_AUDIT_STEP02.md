# Vyra Rewards Global — Frontend audit (Step 02)

Source inspected: AppDeploy snapshot `1795081246085`, `src/App.tsx` and `src/index.css`.

## Result
The existing UI is a useful visual prototype, but it is not yet a complete member/admin frontend. It must be migrated into the standalone project before production use. No live AppDeploy files or database records were changed in this step.

## Confirmed issues to fix

1. **Translation is incomplete and fragile.** The current implementation translates DOM text nodes using `MutationObserver` and exact English-string matching. Text assembled dynamically, labels not in the dictionary, errors, table headings, page descriptions and future UI can remain English. Replace with typed dictionary-based i18n (`t('key')`) and locale-aware number/date formatting. Support exactly EN, AR, FR, ES, PT, DE, TR, HI, ZH for members; RTL for Arabic. Admin remains EN/HA.
2. **Auth is incomplete.** Email/password sign-in and sign-up exist, but there is no password-reset flow, no explicit email-confirmation/resend UX, no profile completion flow, and no clear loading/error state for session restoration.
3. **Referral code is not a real referral system.** The UI derives a code from the first eight characters of the auth UUID. It does not read a dedicated referral code, validate attribution, or display referred-member/reward status. Replace with server-generated unique referral codes.
4. **Earn page is intentionally disabled.** CPX is shown as pending and there is no offerwall launch. Keep it disabled until provider callback, hash verification, reversal handling and end-to-end credit tests pass.
5. **Withdrawals are history-only.** No request form or payout-method flow exists. Keep payout submission disabled until server-side balance reservation, limits, admin review and reconciliation are implemented.
6. **Admin is read-only.** The current page only shows module names. Build separate guarded admin routes and server-authorized operations; never trust a client-side admin flag for privileged actions.
7. **Wallet is read-only.** This is appropriate for member UI; all balance mutations must remain server-side through ledger/RPC operations.
8. **Error handling is incomplete.** `loadData` runs parallel queries but only reports a generic message; it does not distinguish missing rows, permission errors, network failures or partial data. Add typed error handling and retry states.
9. **Mobile navigation needs accessibility polish.** Add focus handling, Escape-to-close, `aria-expanded`, and prevent the hidden sidebar from remaining keyboard reachable.
10. **Hard-coded configuration.** Supabase URL and public key are embedded in the source. Move them to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; validate missing configuration at startup. Public key is not a secret, but environment-based configuration is required for portable builds.
11. **Member-facing promotional copy remains.** Remove campaign-style claims/phrases from authentication and navigation; use concise functional labels and accurate availability states.
12. **No frontend test coverage was found in the inspected source inventory.** Add tests for locale switching, auth states, responsive navigation, wallet empty/loading/error states, referral display and disabled provider/payout states.

## Frontend migration order

- Extract reusable app shell, sidebar, topbar, auth forms, status/notice components and data tables.
- Add typed route/page components: Overview, Earn, Wallet, Withdrawals, Referrals, Settings, Admin.
- Add centralized i18n dictionaries and persist member locale in `profiles.preferred_language`.
- Replace hard-coded Supabase config with environment variables.
- Add password reset and email confirmation UX.
- Replace placeholder referral display with the backend referral API contract.
- Keep CPX offers and withdrawals visibly unavailable until their backend acceptance tests pass.
- Add accessibility, responsive and component tests.

## Acceptance criteria

- Every visible string on every member page changes when the member changes locale; Arabic layout is RTL.
- Admin language toggle is English/Hausa and does not alter member locale.
- No privileged operation is authorized only by frontend state.
- No fake referral code, fake offer, fake payout or marketing claim is displayed.
- Loading, empty, error and success states are distinct and tested.
- `npm run build` and frontend tests pass in the standalone repository.
