import dns from 'node:dns/promises';
import { pathToFileURL } from 'node:url';

export async function inspectRegistry({ lookup = dns.lookup, request = fetch, timeoutMs = 8000 } = {}) {
  const host = 'registry.npmjs.org';
  let addresses;
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch (error) {
    return { status: 'blocked', stage: 'dns', host, code: error?.code ?? 'DNS_ERROR', message: error?.message ?? 'DNS lookup failed' };
  }
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return { status: 'blocked', stage: 'dns', host, code: 'NO_ADDRESSES', message: 'DNS returned no addresses' };
  }
  try {
    const response = await request('https://registry.npmjs.org/-/ping', {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { status: 'blocked', stage: 'https', host, code: `HTTP_${response.status}`, message: `npm registry returned HTTP ${response.status}`, addressCount: addresses.length };
    return { status: 'ready', stage: 'complete', host, addressCount: addresses.length, httpStatus: response.status };
  } catch (error) {
    return { status: 'blocked', stage: 'https', host, code: error?.cause?.code ?? error?.name ?? 'REQUEST_ERROR', message: error?.message ?? 'Registry request failed', addressCount: addresses.length };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await inspectRegistry();
  if (result.status === 'ready') {
    console.log(`NPM_REGISTRY_READY: ${result.host} resolved to ${result.addressCount} address(es); HTTP ${result.httpStatus}.`);
  } else {
    console.error(`NPM_REGISTRY_BLOCKED at ${result.stage}: ${result.code} — ${result.message}`);
    console.error('This diagnostic does not create a lockfile. Retry from a network with DNS and HTTPS access to registry.npmjs.org.');
    process.exitCode = 2;
  }
}
