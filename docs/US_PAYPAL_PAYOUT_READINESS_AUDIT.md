# Step 30 — US PayPal payout readiness audit

Date: 2026-11-23  
Source baseline: Master Step29.

## Decision

US PayPal is **not implemented** in this source tree. This step is a source audit and implementation boundary, not a payout integration or a live payment test. No migration or Worker deployment was performed. The US withdrawal configuration must remain disabled.

## Evidence found in Step29

1. `supabase/migrations/001_initial_schema.sql` constrains `withdrawal_requests.payout_method` to `bank_transfer` only.
2. `supabase/migrations/013_secure_payout_details_vault.sql` constrains the encrypted vault to `payout_method = 'bank_transfer'` and its `create_withdrawal_request(bigint,text)` RPC requires the vault country/method to match a bank-transfer request.
3. `cloudflare/payout-details/src/index.ts` accepts only `NG` + `bank_transfer` and validates Nigerian bank account fields. It contains no PayPal OAuth, Payouts API, webhook verification, or PayPal recipient handling.
4. `apps/web/src/withdrawals/WithdrawalHistory.tsx` explicitly blocks US from falling through to Nigeria bank transfer and says PayPal is pending.
5. `apps/web/src/country/CountrySelection.tsx` labels US PayPal as planned.
6. `public.payout_records` is provider-generic, but the migration set has no PayPal-specific claim/settlement/webhook RPC that atomically finalizes wallet ledger and withdrawal status.
7. `public.withdrawal_config` for US is owner-reported as disabled.

## Why a PayPal Worker alone is insufficient

A safe payout requires a complete chain: member PayPal recipient capture and encrypted storage; a US/USD-specific withdrawal request RPC; finance approval; a single-use/idempotent payout claim; PayPal sandbox OAuth and Payouts API submission; verified PayPal webhook or reconciliation; and an atomic database settlement that marks the withdrawal paid and writes exactly one `withdrawal_paid` wallet-ledger event. A provider API success response alone must never be treated as final settlement.

## Required implementation contract for the next coding increment

- Keep PayPal credentials, webhook ID, and encryption keys in Cloudflare Worker secrets only. Never place them in Vite/mobile variables or source control.
- Use PayPal sandbox by default. Production mode must require an explicit separate deployment configuration and human approval.
- Store the recipient email encrypted with AES-GCM; store only a hash of a one-use token in the database. Never return stored recipient details to the browser after submission.
- Add a US-only `paypal` payout method and a dedicated US/USD request RPC. Do not weaken or repurpose the Nigeria bank-transfer vault/RPC.
- Require an approved US withdrawal and Finance authorization before a payout can be submitted. Claim the withdrawal under a row lock and persist a deterministic idempotency key before calling PayPal.
- Reuse the same deterministic PayPal sender batch ID on retries. An ambiguous network timeout must enter reconciliation, not create a new payout batch.
- Verify webhook signatures with PayPal's verification endpoint and reject unverified events. Match events to a previously persisted provider batch/item reference.
- Finalize paid/failed state through a database transaction that locks the withdrawal, updates `payout_records`, and writes one idempotent wallet-ledger settlement entry. A failed or ambiguous provider response must not release coins automatically.
- Keep both NG and US `withdrawal_config.is_enabled=false` until separate end-to-end acceptance and explicit owner approval.

## Not done in Step30

- No PayPal API credentials were available or requested.
- No PayPal sandbox or production API call was made.
- No database migration was applied or added to the active migration sequence.
- No Cloudflare Worker was deployed or modified.
- No withdrawal config was enabled and no real money was sent.

## Next gate

Implement the US-specific schema/RPC contract and a sandbox-only PayPal Worker together, then test the full lifecycle with synthetic accounts and PayPal sandbox recipients. Do not begin live payouts until webhook verification, idempotent settlement, reconciliation, and Finance acceptance all pass.
