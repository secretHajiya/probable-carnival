# Step32 — US PayPal Member and Finance UI Integration

## Implemented
- Member Withdrawal History now routes US requests only through the dedicated PayPal Worker and `create_us_paypal_withdrawal_request`; NG bank transfer continues through its existing Worker/RPC.
- US PayPal recipient email is sent to the isolated Worker for encryption; the browser receives only a short-lived one-use token. The member UI clears the email after issuance.
- Admin Finance shows US PayPal recipient as encrypted and never attempts to reveal it as bank details.
- Finance Admin can explicitly submit an approved/processing US PayPal request to the sandbox Worker after a confirmation prompt. Worker role checks and database claim/idempotency remain authoritative.
- Added `VITE_PAYPAL_PAYOUT_WORKER_URL` to both app environment examples.

## Safety
- Migration 031 must be applied to staging before these screens can work.
- `withdrawal_config.is_enabled` for NG and US remains false. The US form is therefore hidden/disabled under current settings.
- Worker remains sandbox-only. No real PayPal credentials, deployment, migration, payout, or production configuration was changed.

## Acceptance still required
1. Apply migration 031 to a disposable staging Supabase project.
2. Configure sandbox Worker secrets and exact member/admin origins.
3. Test US member recipient-token expiry, ownership, reuse rejection, invalid email, and insufficient balance.
4. Enable US withdrawals only in isolated staging, submit a synthetic withdrawal, approve as Finance Admin, and submit to PayPal sandbox.
5. Deliver success/failure webhooks; verify duplicate event handling, wallet ledger settlement/release, and audit records.
6. Confirm NG bank-transfer flow remains unchanged and US cannot call the NG Worker.
