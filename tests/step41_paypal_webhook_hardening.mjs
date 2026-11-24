import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const worker = readFileSync(new URL('../cloudflare/paypal-payout/src/index.ts', import.meta.url), 'utf8');
const start = worker.indexOf("if (request.method === 'POST' && url.pathname === '/v1/webhooks/paypal')");
const end = worker.indexOf("return json({ error: 'not_found' }, 404, origin);", start);
assert.ok(start >= 0 && end > start, 'webhook route must exist');
const route = worker.slice(start, end);
const checks = [
  ['signature verification precedes event processing', route.indexOf('verifyWebhook') < route.indexOf('const outcome')],
  ['unrelated signed event types are acknowledged before payout parsing', route.indexOf("ignored_event_type") < route.indexOf('const item = e.resource')],
  ['only payout item success/failure event types can settle', /PAYMENT\.PAYOUTS-ITEM\.SUCCEEDED/.test(route) && /PAYMENT\.PAYOUTS-ITEM\.RETURNED/.test(route)],
  ['event ID is required and length-bounded', /typeof e\.id !== 'string'/.test(route) && /e\.id\.length > 255/.test(route)],
  ['sender item must be a UUID', /senderItem !== 'string'/.test(route) && /\[0-9a-f\]\{8\}/.test(route)],
  ['batch reference is length-bounded', /batch\.length > 128/.test(route)],
  ['currency is restricted to USD', /currency !== 'USD'/.test(route)],
  ['amount is exact two-decimal text', /\\d\+\\\.\\d\{2\}/.test(route)],
  ['amount must be a positive safe integer in minor units', /Number\.isSafeInteger\(minor\)/.test(route) && /minor <= 0/.test(route)],
  ['settlement RPC is called only after validation', route.indexOf('paypal_finalize_event') > route.indexOf('Number.isSafeInteger(minor)')],
];
for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
assert.ok(checks.every(([, pass]) => pass), 'Step41 webhook hardening checks failed');
console.log(`\\n${checks.length}/${checks.length} Step41 webhook hardening checks passed`);
