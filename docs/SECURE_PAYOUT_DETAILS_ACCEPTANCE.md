# Secure payout-details acceptance tests

These are required tests for the future payout-details Worker and vault. They have **not** been run; they are release criteria.

| ID | Scenario | Expected result |
|---|---|---|
| PD-01 | No Authorization header | 401; no vault row |
| PD-02 | Invalid/expired Supabase JWT | 401; no vault row |
| PD-03 | Body contains another user's `user_id` | Ignore/reject it; owner comes from verified JWT |
| PD-04 | Unsupported country or payout method | 400; no vault row |
| PD-05 | Missing/malformed bank fields or oversized body | 400/413; no sensitive values in logs |
| PD-06 | Valid member details | Opaque high-entropy token returned once; ciphertext stored; plaintext absent from DB/logs |
| PD-07 | Token belongs to another member | Withdrawal RPC rejects; wallet unchanged |
| PD-08 | Token expired | Withdrawal RPC rejects; wallet unchanged |
| PD-09 | Token already consumed | Second withdrawal attempt rejects; no second coin reservation |
| PD-10 | Token country/method differs from withdrawal | RPC rejects; wallet unchanged |
| PD-11 | Concurrent requests reuse one token | Exactly one transaction succeeds |
| PD-12 | Insufficient wallet balance | RPC rolls back; no withdrawal/ledger reservation; token-consumption behavior follows atomic rollback |
| PD-13 | Non-admin calls admin retrieval endpoint | 403; no plaintext returned |
| PD-14 | Finance admin reads payout details | Only minimum required fields returned; atomic reveal RPC writes audit before ciphertext leaves DB |
| PD-15 | Browser attempts direct vault query | Denied by RLS/privileges |
| PD-16 | Missing/invalid encryption key | Worker fails closed; no plaintext fallback |
| PD-17 | Wrong CORS origin | No permissive CORS headers; request not authorized |
| PD-18 | Repeated token-creation requests | Rate limited; no account enumeration |
| PD-19 | Key rotation | Existing records decrypt only with the matching key version; new records use current key |
| PD-20 | Logs and error monitoring inspected | No account numbers, tokens, JWTs, ciphertext, or secrets |
| PD-21 | Non-finance user calls `admin_reveal_payout_details_envelope` directly | Permission denied; no ciphertext and no audit row |
| PD-22 | Finance admin reveals a paid/rejected/cancelled/failed request | RPC rejects under withdrawal row lock; no ciphertext returned |
| PD-23 | Concurrent payout status transition and details reveal | Both serialize on the withdrawal row; reveal succeeds only if the locked status is eligible |
| PD-24 | Audit insert fails during reveal | Entire RPC rolls back; no ciphertext returned to Worker |
| PD-25 | Verify Migration 022 ACL and function settings | SECURITY DEFINER + empty search_path; authenticated execute only; anon/public denied |

## Required evidence

For each test retain the test ID, environment, timestamp, sanitized request/response, relevant database assertion, and pass/fail. Never include real bank details, bearer tokens, encryption keys, or full opaque payout tokens in the evidence bundle.

## Member/admin integration checks (source wiring)
- [ ] Member form rejects a non-integer or non-positive coin amount.
- [ ] Member form sends payout details only to the configured Worker over HTTPS.
- [ ] Member browser calls the request RPC only after receiving a Worker token.
- [ ] Member UI clears account fields after a successful request.
- [ ] Member cannot read another user's withdrawal history (verify RLS in staging).
- [ ] Ordinary authenticated user cannot call the admin Worker route.
- [ ] Finance admin can reveal only a vault row linked to the requested withdrawal.
- [ ] Every successful reveal uses Migration 022: status check, withdrawal/vault row locks, and audit insert are one transaction before the Worker decrypts ciphertext.
- [ ] Worker rejects origins not explicitly listed in `ALLOWED_ORIGIN`.
- [ ] Member and admin production origins are both listed exactly; no wildcard CORS.
- [ ] Browser apps contain no service-role or encryption key.
- [ ] Confirm the decrypted data is not written to console, local storage, or analytics.


## Additional UI/security checks
- [ ] Finance admin can hide revealed bank details immediately.
- [ ] Signing out clears all revealed payout details from the current UI state.
- [ ] Very large valid withdrawal amounts cannot overflow the fee calculation; boundary values are tested in staging.
