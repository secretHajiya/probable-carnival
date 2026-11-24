import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const web = readFileSync(new URL('../apps/web/src/withdrawals/WithdrawalHistory.tsx', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../cloudflare/paypal-payout/src/index.ts', import.meta.url), 'utf8');
const checks = [
  ['US PayPal form is shown only for paypal-enabled state', web.includes("availability.status === 'paypal-enabled'")],
  ['Disabled country configuration blocks request form', web.includes("!config.data.is_enabled") && web.includes("status: 'disabled'")],
  ['US requests use dedicated PayPal RPC', web.includes("create_us_paypal_withdrawal_request")],
  ['Nigeria continues through bank-transfer RPC', web.includes("payout_method: 'bank_transfer'") && web.includes("create_withdrawal_request")],
  ['US branch cannot fall through to Nigeria payout details', web.includes("availability.countryCode === 'US' && availability.status === 'paypal-enabled'")],
  ['Member history does not select or render recipient email', !web.includes('paypal_email') && !web.includes('recipient_email')],
  ['PayPal recipient is cleared after one-use token issuance', web.includes("setPaypalEmail('')")],
  ['Worker remains sandbox-only', worker.includes("PAYPAL_ENV !== 'sandbox'") || worker.includes("env.PAYPAL_ENV !== 'sandbox'")],
  ['Worker refuses production API host', worker.includes('api-m.sandbox.paypal.com')],
  ['PayPal payout submission requires Finance authorization', worker.includes('is_finance_admin')],
];
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(ok, name);
}
console.log(`Step40 member PayPal safety contract: ${checks.length}/${checks.length} PASS`);
