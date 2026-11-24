import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const web = readFileSync(new URL('../apps/web/src/withdrawals/WithdrawalHistory.tsx', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../apps/admin/src/main.tsx', import.meta.url), 'utf8');
const checks = [
  ['US recipient uses isolated Worker', web.includes('/v1/paypal-recipient')],
  ['US request uses dedicated database RPC', web.includes('create_us_paypal_withdrawal_request')],
  ['NG path remains bank transfer', web.includes("payout_method: 'bank_transfer'") && web.includes('create_withdrawal_request')],
  ['US form requires enabled US configuration', web.includes("availability.status === 'paypal-enabled'")],
  ['Member clears PayPal email after issue', web.includes("setPaypalEmail('')")],
  ['Admin labels recipient encrypted', admin.includes('Encrypted PayPal recipient')],
  ['Admin submits only via sandbox Worker endpoint', admin.includes('/v1/admin/paypal-payouts/${id}/submit')],
  ['Admin confirms sandbox payout before sending', admin.includes('PayPal SANDBOX?')],
  ['Admin does not reveal US recipient as bank details', admin.includes("row.country_code === 'US' && row.payout_method === 'paypal'")],
  ['Dedicated Worker URL documented', readFileSync(new URL('../apps/web/.env.example', import.meta.url), 'utf8').includes('VITE_PAYPAL_PAYOUT_WORKER_URL')],
];
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); assert.ok(ok, name); }
console.log(`Step32 UI contract checks: ${checks.length}/${checks.length} PASS`);
