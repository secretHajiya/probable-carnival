import assert from 'node:assert/strict';
import worker from '../cloudflare/paypal-payout/src/index.ts';

const ENV = {
  SUPABASE_URL: 'https://supabase.test.invalid',
  SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  PAYPAL_CLIENT_ID: 'sandbox-client',
  PAYPAL_CLIENT_SECRET: 'sandbox-secret',
  PAYPAL_WEBHOOK_ID: 'test-webhook-id',
  PAYPAL_ENV: 'sandbox',
  PAYPAL_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  PAYPAL_KEY_VERSION: 'test-v1',
  ALLOWED_ORIGIN: 'https://app.test.invalid',
};
const UUID = '123e4567-e89b-42d3-a456-426614174000';
let rpcCalls = [];
let rpcResult = 'finalized';
let signature = 'SUCCESS';

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url.endsWith('/v1/oauth2/token'))
    return new Response(JSON.stringify({ access_token: 'test-access-token' }), { status: 200 });
  if (url.endsWith('/v1/notifications/verify-webhook-signature'))
    return new Response(JSON.stringify({ verification_status: signature }), { status: 200 });
  if (url.endsWith('/rest/v1/rpc/paypal_finalize_event')) {
    rpcCalls.push(JSON.parse(init.body));
    return new Response(JSON.stringify(rpcResult), { status: 200 });
  }
  throw new Error(`Unexpected outbound request: ${url}`);
};

function event(type = 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED', amount = '12.34') {
  return {
    id: 'WH-TEST-EVENT-0001',
    event_type: type,
    resource: {
      payout_item: {
        sender_item_id: UUID,
        amount: { value: amount, currency: 'USD' },
      },
      batch_header: { payout_batch_id: 'BATCH-TEST-0001' },
    },
  };
}
function request(payload) {
  return new Request('https://worker.test.invalid/v1/webhooks/paypal', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'paypal-transmission-id': 'transmission-test',
      'paypal-transmission-time': '2026-11-23T00:00:00Z',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/v1/notifications/certs/test',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-transmission-sig': 'test-signature',
    },
    body: JSON.stringify(payload),
  });
}
async function run(payload, { rpc = 'finalized', verified = 'SUCCESS' } = {}) {
  rpcCalls = [];
  rpcResult = rpc;
  signature = verified;
  const response = await worker.fetch(request(payload), ENV);
  return { response, body: await response.json(), calls: [...rpcCalls] };
}
const checks = [];
async function test(name, fn) { await fn(); checks.push(name); console.log(`PASS ${name}`); }

await test('verified success event finalizes exact USD minor units', async () => {
  const r = await run(event());
  assert.equal(r.response.status, 200);
  assert.equal(r.body.status, 'finalized');
  assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].p_outcome, 'succeeded');
  assert.equal(r.calls[0].p_amount_minor, 1234);
  assert.equal(r.calls[0].p_currency_code, 'USD');
});

await test('verified failed event records failed outcome', async () => {
  const r = await run(event('PAYMENT.PAYOUTS-ITEM.FAILED'));
  assert.equal(r.response.status, 200);
  assert.equal(r.calls.length, 1);
  assert.equal(r.calls[0].p_outcome, 'failed');
});

await test('duplicate event result is returned without a second RPC attempt', async () => {
  const r = await run(event(), { rpc: 'duplicate_event' });
  assert.equal(r.response.status, 200);
  assert.equal(r.body.status, 'duplicate_event');
  assert.equal(r.calls.length, 1);
});

await test('database amount or currency mismatch quarantine result is surfaced', async () => {
  const r = await run(event(), { rpc: 'amount_or_currency_mismatch_quarantined' });
  assert.equal(r.response.status, 200);
  assert.equal(r.body.status, 'amount_or_currency_mismatch_quarantined');
  assert.equal(r.calls.length, 1);
});

await test('invalid webhook signature blocks settlement RPC', async () => {
  const r = await run(event(), { verified: 'FAILURE' });
  assert.equal(r.response.status, 401);
  assert.equal(r.body.error, 'webhook_signature_invalid');
  assert.equal(r.calls.length, 0);
});

await test('signed unrelated event is acknowledged without settlement', async () => {
  const r = await run(event('PAYMENT.PAYOUTS-ITEM.PROCESSING'));
  assert.equal(r.response.status, 200);
  assert.equal(r.body.status, 'ignored_event_type');
  assert.equal(r.calls.length, 0);
});

await test('malformed amount is rejected before settlement RPC', async () => {
  const r = await run(event('PAYMENT.PAYOUTS-ITEM.SUCCEEDED', '12.345'));
  assert.equal(r.response.status, 400);
  assert.equal(r.body.error, 'webhook_payload_invalid');
  assert.equal(r.calls.length, 0);
});

console.log(`\n${checks.length}/${checks.length} Step42 PayPal webhook runtime simulation checks passed`);
