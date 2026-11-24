# US PayPal payout acceptance matrix

This is a required test plan, not evidence that tests have passed. Use a dedicated staging Supabase project and PayPal sandbox only. Use synthetic accounts and recipients. Keep Production withdrawals disabled.

| ID | Scenario | Expected result |
|---|---|---|
| PP-01 | Member in NG submits PayPal details | Rejected; no US vault row or withdrawal |
| PP-02 | Member in US submits bank-transfer details | Rejected; never routed to NG flow |
| PP-03 | Unauthenticated request to capture PayPal recipient | 401; no data stored |
| PP-04 | Invalid or oversized recipient email/body | 400/413; no data stored |
| PP-05 | Valid US PayPal recipient | Encrypted at rest; one-use opaque token returned once |
| PP-06 | Inspect PayPal vault and logs | No plaintext email, token, OAuth token, or secret |
| PP-07 | Reuse, expired, or cross-user token | Rejected; wallet unchanged |
| PP-08 | US withdrawal config disabled | Request rejected; no wallet reservation |
| PP-09 | NG country attempts PayPal RPC | Rejected; wallet unchanged |
| PP-10 | Missing/invalid active USD exchange rate | Request rejected; no reservation |
| PP-11 | Non-finance user initiates payout | 403; no provider call |
| PP-12 | Withdrawal not approved | Provider call not made |
| PP-13 | Two admins submit same approved withdrawal concurrently | Exactly one claim; one deterministic batch ID |
| PP-14 | PayPal sandbox OAuth failure | Fail closed; no payout marked paid |
| PP-15 | PayPal API returns validation error | Recorded failure; no automatic coin release |
| PP-16 | PayPal API times out after request submission | Reconciliation using same idempotency key; no second batch |
| PP-17 | Retry after successful batch creation | Same sender batch ID; no duplicate payout |
| PP-18 | Invalid webhook signature | 401/403; no database state change |
| PP-19 | Valid success webhook repeated | One settlement only; one wallet-ledger paid entry |
| PP-20 | Valid failed webhook repeated | One failure transition; no automatic double release |
| PP-21 | Webhook references unknown batch/item | Quarantined/rejected; no withdrawal mutation |
| PP-22 | Event arrives after terminal state | Idempotent no-op or audited conflict; no duplicate ledger entry |
| PP-23 | Currency/amount/recipient mismatch | Rejected and flagged; no paid status |
| PP-24 | Finance reconciliation | Provider batch/item, withdrawal, payout record and ledger reconcile exactly |
| PP-25 | Production config review | US and NG withdrawal configs remain false until separately approved |

For every case retain environment, timestamp, sanitized request/response, database assertions, and pass/fail. Never store real PayPal credentials, bearer tokens, recipient email addresses, or complete webhook secrets in the evidence bundle.
