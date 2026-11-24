# Secure payout member/admin integration

## Member flow
1. Member enters NG bank-transfer details and coin amount on Withdrawal History.
2. Browser sends bank details over HTTPS to `POST /v1/payout-details` using the current Supabase access token.
3. Worker validates the user and fields, encrypts the details, stores only ciphertext, and returns a short-lived one-use token.
4. Browser passes that token to `create_withdrawal_request`; SQL verifies its hash, locks and consumes it, reserves coins, creates the withdrawal row, and links the vault row to the request.
5. Plain bank details are not sent to Supabase from the browser and are not written to browser storage.

## Finance flow
1. Finance admin signs in to the separate admin app.
2. The admin explicitly confirms before requesting reveal.
3. Worker validates the Supabase session, checks `is_finance_admin()` using the caller JWT, decrypts the linked vault record, and writes `admin_audit_logs` before returning details.
4. The admin UI displays the details in the matching withdrawal row.

## Environment
Set `VITE_PAYOUT_DETAILS_WORKER_URL` in both web and admin app environments to the exact deployed Worker origin. Set Worker `ALLOWED_ORIGIN` to the exact member web origin. The current Worker has one allowed origin; if the admin app is hosted on another origin, configure a strict comma-separated allowlist in the Worker before deploying this integration. Never put the Supabase service-role key or encryption key in either Vite app.

## Important deployment caveats
- The current Worker implementation shown in this ZIP compares a single `ALLOWED_ORIGIN` value, so the admin origin must be explicitly supported before cross-origin reveal can work. Do not weaken CORS to `*`.
- Apply migration 013 only after verifying the actual Production definitions and testing on staging. It replaces `create_withdrawal_request`; review every referenced table, column, enum value, and wallet ledger field against Production first.
- The Worker currently stores the token hash and encrypted payload using service-role REST access. Restrict the service-role secret to this Worker only.
- Configure a bank-code directory/validation source before accepting live bank transfers; syntactic bank-code validation is not proof that the bank/account combination exists.
- Keep all `withdrawal_config.is_enabled` flags false until staging tests, finance approval, reconciliation, and manual payout operations are ready.
- Do not paste real bank details or secrets into support chats, source control, or Vite environment variables.


## Sensitive-data display lifecycle
- Finance UI includes an explicit Hide bank details action.
- Sensitive payout detail state is cleared when the admin signs out.
- Do not screenshot, copy into notes, export, or transmit revealed bank details outside the approved payout operation.
