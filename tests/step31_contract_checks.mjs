import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const migration = readFileSync(new URL('../supabase/migrations/031_us_paypal_sandbox_payout.sql', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../cloudflare/paypal-payout/src/index.ts', import.meta.url), 'utf8');
const checks = [
  ['US-only recipient vault', /country_code char\(2\) not null default 'US' check \(country_code = 'US'\)/.test(migration)],
  ['PayPal method isolated from bank transfer', /check \(payout_method in \('bank_transfer','paypal'\)\)/.test(migration)],
  ['one-use recipient token hash', /token_hash text not null unique/.test(migration) && /expires_at <= now\(\)/.test(migration)],
  ['finance authorization before submission', /financeAllowed\(auth, env\)/.test(worker)],
  ['approved status required by payout claim', /v_w.status not in \('approved','processing'\)/.test(migration)],
  ['deterministic sender batch ID', /'VYRA' \|\| upper\(replace\(v_w.id::text,'-',''\)\)/.test(migration)],
  ['PayPal request id reused', /PayPal-Request-Id': claim.sender_batch_id/.test(worker)],
  ['PayPal webhook verification', /verify-webhook-signature/.test(worker)],
  ['duplicate event protection', /provider_event_id text not null unique/.test(migration)],
  ['amount and currency checked', /p_amount_minor bigint,p_currency_code text/.test(migration) && /p_amount_minor is distinct from v_a.amount_minor/.test(migration)],
  ['single paid ledger key', /'withdrawal-paid:'\|\|v_w.id::text/.test(migration)],
  ['single failed release ledger key', /'withdrawal-release:'\|\|v_w.id::text/.test(migration)],
  ['NG and US withdrawals remain disabled', /set is_enabled=false where country_code in \('NG','US'\)/.test(migration)],
  ['sandbox endpoint fixed', /https:\/\/api-m\.sandbox\.paypal\.com/.test(worker)],
  ['Production mode refused', /env\.PAYPAL_ENV !== 'sandbox'/.test(worker)],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
assert.ok(checks.every(([, pass]) => pass), 'Step31 source contract check failed');
console.log(`\n${checks.length}/${checks.length} Step31 contract checks passed`);
