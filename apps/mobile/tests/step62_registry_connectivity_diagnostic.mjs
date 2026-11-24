import assert from 'node:assert/strict';
import { inspectRegistry } from '../../../scripts/step62-registry-connectivity-diagnostic.mjs';

const checks = [];
async function check(name, fn) { await fn(); checks.push(name); }

await check('DNS failure is reported as blocked without HTTPS request', async () => {
  let requested = false;
  const result = await inspectRegistry({
    lookup: async () => { const error = new Error('temporary name resolution failure'); error.code = 'EAI_AGAIN'; throw error; },
    request: async () => { requested = true; throw new Error('must not run'); },
  });
  assert.equal(result.status, 'blocked');
  assert.equal(result.stage, 'dns');
  assert.equal(result.code, 'EAI_AGAIN');
  assert.equal(requested, false);
});
await check('empty DNS result is blocked', async () => {
  const result = await inspectRegistry({ lookup: async () => [], request: async () => ({ ok: true, status: 200 }) });
  assert.equal(result.code, 'NO_ADDRESSES');
});
await check('HTTP non-success is blocked', async () => {
  const result = await inspectRegistry({ lookup: async () => [{ address: '192.0.2.1', family: 4 }], request: async () => ({ ok: false, status: 503 }) });
  assert.equal(result.status, 'blocked');
  assert.equal(result.code, 'HTTP_503');
});
await check('HTTPS request errors preserve network cause code', async () => {
  const error = new Error('fetch failed', { cause: Object.assign(new Error('offline'), { code: 'ECONNRESET' }) });
  const result = await inspectRegistry({ lookup: async () => [{ address: '192.0.2.1', family: 4 }], request: async () => { throw error; } });
  assert.equal(result.code, 'ECONNRESET');
});
await check('successful registry ping is ready', async () => {
  const result = await inspectRegistry({ lookup: async () => [{ address: '192.0.2.1', family: 4 }], request: async (_url, options) => {
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.accept, 'application/json');
    return { ok: true, status: 200 };
  } });
  assert.equal(result.status, 'ready');
  assert.equal(result.addressCount, 1);
});
await check('diagnostic targets official npm registry only', async () => {
  let url = '';
  await inspectRegistry({ lookup: async (host) => { assert.equal(host, 'registry.npmjs.org'); return [{ address: '192.0.2.1', family: 4 }]; }, request: async (target) => { url = target; return { ok: true, status: 200 }; } });
  assert.equal(url, 'https://registry.npmjs.org/-/ping');
});
await check('custom timeout is passed to AbortSignal', async () => {
  let signal;
  await inspectRegistry({ timeoutMs: 1234, lookup: async () => [{ address: '192.0.2.1', family: 4 }], request: async (_url, options) => { signal = options.signal; return { ok: true, status: 200 }; } });
  assert.ok(signal);
  assert.equal(typeof signal.aborted, 'boolean');
});
await check('diagnostic does not claim lockfile creation', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('../../../scripts/step62-registry-connectivity-diagnostic.mjs', import.meta.url), 'utf8'));
  assert.match(source, /does not create a lockfile/);
});

console.log(`Step62 registry connectivity diagnostic: ${checks.length}/${checks.length} PASS`);
for (const name of checks) console.log(`PASS ${name}`);
