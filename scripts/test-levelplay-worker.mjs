/**
 * Local contract tests for the LevelPlay Cloudflare Worker.
 * Uses a mocked Supabase RPC; it does not contact production services.
 * Run from the repository root:
 *   node scripts/test-levelplay-worker.mjs
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workerUrl = pathToFileURL(path.join(root, 'cloudflare/levelplay-rewarded-callback/src/index.js'));
const { default: worker } = await import(workerUrl.href);

const privateKey = 'local-test-private-key-only';
const userId = '12345678123412341234123456789abc';
const now = String(Math.floor(Date.now() / 1000));
let rpcCalls = 0;
let rpcResult = { success: true, credited: true, duplicate: false };
let rpcStatus = 200;

globalThis.fetch = async (_url, _options) => {
  rpcCalls += 1;
  return new Response(JSON.stringify(rpcResult), {
    status: rpcStatus,
    headers: { 'Content-Type': 'application/json' },
  });
};

const env = {
  SUPABASE_URL: 'https://unit-test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'local-placeholder-service-role-key',
  LEVELPLAY_S2S_PRIVATE_KEY: privateKey,
  LEVELPLAY_MAX_CALLBACK_AGE_SECONDS: '86400',
};

function payload(overrides = {}) {
  const values = {
    EVENT_ID: 'local_evt_001',
    USER_ID: userId,
    REWARDS: '5',
    TIMESTAMP: now,
    APP_KEY: 'local-app-key',
    PLACEMENT_NAME: 'local-rewarded-placement',
    ...overrides,
  };
  values.SIGNATURE = overrides.SIGNATURE ?? crypto
    .createHash('md5')
    .update(values.TIMESTAMP + values.EVENT_ID + values.USER_ID + values.REWARDS + privateKey)
    .digest('hex');
  return values;
}


function unityPayload(overrides = {}) {
  const timestamp = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const unityTimestamp = `${timestamp.getUTCFullYear()}${pad(timestamp.getUTCMonth() + 1)}${pad(timestamp.getUTCDate())}${pad(timestamp.getUTCHours())}${pad(timestamp.getUTCMinutes())}`;
  const values = {
    applicationUserId: userId,
    rewards: '5',
    eventId: 'unity_evt_001',
    timestamp: unityTimestamp,
    appKey: 'local-app-key',
    placementName: 'local-rewarded-placement',
    ...overrides,
  };
  values.signature = overrides.signature ?? crypto
    .createHash('md5')
    .update(values.timestamp + values.eventId + values.applicationUserId + values.rewards + privateKey)
    .digest('hex');
  return values;
}

function request(values, method = 'GET', bodyType = 'form') {
  const url = new URL('https://worker.test/callback');
  if (method === 'GET') {
    for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
    return new Request(url);
  }
  if (bodyType === 'json') {
    return new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });
  }
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(values),
  });
}

async function check(label, req, expectedStatus, expectedBody, expectedRpcCalls) {
  const response = await worker.fetch(req, env);
  const body = await response.text();
  assert.equal(response.status, expectedStatus, `${label}: status`);
  assert.equal(body, expectedBody, `${label}: body`);
  assert.equal(rpcCalls, expectedRpcCalls, `${label}: RPC call count`);
  console.log(`PASS ${label}`);
}

await check('valid GET callback', request(payload()), 200, 'local_evt_001:OK', 1);
await check('Unity canonical parameter names and YYYYMMDDHHMM timestamp', request(unityPayload()), 200, 'unity_evt_001:OK', 2);
await check('Unity callback accepts canonical hyphenated UUID', request(unityPayload({ applicationUserId: '12345678-1234-1234-1234-123456789abc', eventId: 'unity_evt_uuid' })), 200, 'unity_evt_uuid:OK', 3);
await check('valid form POST callback', request(payload({ EVENT_ID: 'local_evt_form' }), 'POST'), 200, 'local_evt_form:OK', 4);
await check('valid JSON POST callback', request(payload({ EVENT_ID: 'local_evt_json' }), 'POST', 'json'), 200, 'local_evt_json:OK', 5);

const invalidSignature = payload({ EVENT_ID: 'local_evt_bad_sig', SIGNATURE: '0'.repeat(32) });
await check('invalid signature rejected before RPC', request(invalidSignature), 401, 'Invalid signature', 5);

const staleTimestamp = String(Math.floor(Date.now() / 1000) - 90000);
await check('stale timestamp rejected before RPC', request(payload({ EVENT_ID: 'local_evt_stale', TIMESTAMP: staleTimestamp })), 401, 'Expired callback', 5);

rpcResult = { success: true, credited: false, duplicate: true };
await check('duplicate event acknowledged', request(payload({ EVENT_ID: 'local_evt_duplicate' })), 200, 'local_evt_duplicate:OK', 6);

rpcStatus = 500;
await check('database failure is not acknowledged', request(payload({ EVENT_ID: 'local_evt_db_error' })), 500, 'Callback processing failed', 7);
rpcStatus = 200;

const missingSecrets = { ...env, LEVELPLAY_S2S_PRIVATE_KEY: '' };
const missingResponse = await worker.fetch(request(payload({ EVENT_ID: 'local_evt_no_secret' })), missingSecrets);
assert.equal(missingResponse.status, 500);
assert.equal(await missingResponse.text(), 'Server configuration error');
assert.equal(rpcCalls, 7);
console.log('PASS missing secret fails closed');

console.log('\nAll local LevelPlay Worker contract tests passed. No production endpoint was contacted.');
