# CPX postback — staging integration

Deploy as Supabase Edge Function `cpx-postback`. This is a **staging candidate**, not permission to enable CPX in production.

## Required Edge Function secrets

- `CPX_APP_SECURITY_HASH` — CPX App Security Hash; never commit or share it.
- `CPX_REWARD_COINS_PER_USD` — approved integer/decimal reward conversion rate. Set only after the product owner approves the economy and confirms it matches the intended reward configuration.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — supplied/configured securely by Supabase; service role must never be exposed to the browser.

## CPX callback URL template

```text
https://<PROJECT_REF>.supabase.co/functions/v1/cpx-postback?status={status}&trans_id={trans_id}&user_id={user_id}&amount_usd={amount_usd}&type={type}&hash={secure_hash}
```

The signature is checked as `MD5(trans_id + "-" + CPX_APP_SECURITY_HASH)` using the `md5` npm package. Web Crypto does not standardize MD5, so do not replace this with `crypto.subtle.digest("MD5", ...)`. Only UUID member IDs belonging to active profiles are accepted. The provider and country-specific web app mapping must both be enabled. The function does not trust a reward amount supplied by the callback; it calculates coins from `amount_usd * CPX_REWARD_COINS_PER_USD`.

## Database RPC contract dependency

This adapter calls the owner-reported Production signature:

```sql
process_cpx_reward(
  p_provider_id uuid,
  p_transaction_id text,
  p_external_user_id text,
  p_user_id uuid,
  p_status integer,
  p_reward_coins bigint,
  p_gross_revenue_minor bigint,
  p_currency text,
  p_payload jsonb
)
```

Before deployment, compare the live `pg_get_functiondef` and `pg_proc.proargnames` output against this exact call. The owner's prior report states the RPC uses transaction/advisory locks, callback/completion unique constraints and ledger idempotency; these claims still require staging tests from the checklist. If the live argument names differ, do not deploy this adapter until the call is reconciled.

## Required staging tests

1. Invalid signature returns 401 and creates no wallet entry.
2. Unknown/inactive user returns 409 and creates no wallet entry.
3. Disabled provider or country app mapping returns 409.
4. Valid status `1` callback creates exactly one completion and one reward credit.
5. Repeating the same callback returns an idempotent result and does not credit twice.
6. Status `2` reverses the original transaction once; repeat reversal does not reverse twice.
7. `type=out` is acknowledged but never credits or reverses.
8. Verify a callback for a different country cannot use the NG app mapping.

Keep provider and app mapping disabled until every test passes and CPX Support confirms the configured callback for app ID `37222`. Do not use a real member balance for destructive tests.
