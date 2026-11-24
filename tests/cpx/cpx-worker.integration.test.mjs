import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import worker from '../../cloudflare/cpx-callback/src/index.js';

const USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const PROVIDER_ID = '223e4567-e89b-42d3-a456-426614174000';
const APP_ID = '323e4567-e89b-42d3-a456-426614174000';
const SECRET = 'local-test-secret-never-for-production';
const IP = '157.90.97.92';

function signedParams(overrides = {}) {
  const transactionId = overrides.trans_id ?? 'cpx-test-transaction-001';
  const hash = createHash('md5').update(`${transactionId}-${SECRET}`).digest('hex');
  return new URLSearchParams({
    trans_id: transactionId,
    user_id: USER_ID,
    status: '1',
    type: 'complete',
    amount_usd: '2.50',
    hash,
    ...overrides,
  });
}

function env() {
  return {
    CPX_APP_SECURITY_HASH: SECRET,
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'local-mock-key',
  };
}

async function invoke({ params = signedParams(), providerEnabled = true, appEnabled = true, rpcResult = { success: true, credited: true }, ip = IP, method = 'GET', missingEnv = false } = {}) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    calls.push({ url, options });
    if (url.pathname.endsWith('/reward_providers')) {
      return Response.json([{ id: PROVIDER_ID, is_enabled: providerEnabled }]);
    }
    if (url.pathname.endsWith('/provider_apps')) {
      return Response.json([{ id: APP_ID, is_enabled: appEnabled }]);
    }
    if (url.pathname.endsWith('/rpc/process_cpx_reward')) {
      return Response.json(rpcResult);
    }
    throw new Error(`Unexpected mocked Supabase request: ${url.pathname}`);
  };
  try {
    const url = `https://worker.test/${method === 'GET' ? `?${params.toString()}` : ''}`;
    const request = new Request(url, {
      method,
      headers: {
        'CF-Connecting-IP': ip,
        ...(method === 'POST' ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      ...(method === 'POST' ? { body: params.toString() } : {}),
    });
    const response = await worker.fetch(request, missingEnv ? {} : env());
    return { response, body: await response.json(), calls };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test('rejects requests from IPs outside the CPX allowlist before database access', async () => {
  const result = await invoke({ ip: '203.0.113.99' });
  assert.equal(result.response.status, 403);
  assert.equal(result.calls.length, 0);
});

test('rejects invalid signature before database access', async () => {
  const params = signedParams(); params.set('hash', '0'.repeat(32));
  const result = await invoke({ params });
  assert.equal(result.response.status, 401);
  assert.equal(result.calls.length, 0);
});

test('rejects missing Worker secrets without database access', async () => {
  const result = await invoke({ missingEnv: true });
  assert.equal(result.response.status, 500);
  assert.equal(result.calls.length, 0);
});

test('acknowledges a correctly signed outgoing event without reward writes', async () => {
  const params = signedParams({ type: 'out' });
  const result = await invoke({ params });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.ignored, true);
  assert.equal(result.calls.length, 0);
});

test('credits a valid Nigeria completion through the existing nine-argument RPC', async () => {
  const result = await invoke();
  assert.equal(result.response.status, 200);
  assert.equal(result.body.credited, true);
  const appLookup = result.calls.find((call) => call.url.pathname.endsWith('/provider_apps'));
  assert.ok(appLookup, 'expected the country-specific CPX app mapping lookup');
  assert.equal(appLookup.url.searchParams.get('country_code'), 'eq.NG');
  assert.equal(appLookup.url.searchParams.get('external_app_id'), 'eq.37222');
  assert.equal(appLookup.url.searchParams.get('platform'), 'eq.web');
  const rpc = result.calls.find((call) => call.url.pathname.endsWith('/rpc/process_cpx_reward'));
  assert.ok(rpc, 'expected the existing reward RPC to be called');
  const payload = JSON.parse(rpc.options.body);
  assert.deepEqual(Object.keys(payload).sort(), [
    'p_provider_id', 'p_transaction_id', 'p_external_user_id', 'p_user_id',
    'p_status', 'p_reward_coins', 'p_gross_revenue_minor', 'p_currency', 'p_payload',
  ].sort());
  assert.equal(payload.p_status, 1);
  assert.equal(payload.p_reward_coins, 1250);
  assert.equal(payload.p_gross_revenue_minor, 250);
  assert.equal(payload.p_currency, 'USD');
});

test('returns the RPC duplicate result without attempting a second credit', async () => {
  const result = await invoke({ rpcResult: { success: true, duplicate: true, credited: false } });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.duplicate, true);
  assert.equal(result.calls.filter((call) => call.url.pathname.endsWith('/rpc/process_cpx_reward')).length, 1);
});

test('sends status 2 to the RPC as a reversal with zero new reward coins', async () => {
  const params = signedParams({ status: '2' });
  const result = await invoke({ params, rpcResult: { success: true, reversed: true } });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.reversed, true);
  const rpc = result.calls.find((call) => call.url.pathname.endsWith('/rpc/process_cpx_reward'));
  const payload = JSON.parse(rpc.options.body);
  assert.equal(payload.p_status, 2);
  assert.equal(payload.p_reward_coins, 0);
  assert.equal(payload.p_gross_revenue_minor, 0);
});

test('does not call the reward RPC when the CPX provider is disabled', async () => {
  const result = await invoke({ providerEnabled: false });
  assert.equal(result.response.status, 403);
  assert.equal(result.calls.some((call) => call.url.pathname.endsWith('/rpc/process_cpx_reward')), false);
});

test('does not call the reward RPC when the Nigeria web app mapping is disabled', async () => {
  const result = await invoke({ appEnabled: false });
  assert.equal(result.response.status, 403);
  assert.equal(result.calls.some((call) => call.url.pathname.endsWith('/rpc/process_cpx_reward')), false);
});

test('rejects unsupported HTTP methods', async () => {
  const result = await invoke({ method: 'PUT' });
  assert.equal(result.response.status, 405);
  assert.equal(result.calls.length, 0);
});
