interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PAYOUT_ENCRYPTION_KEY: string;
  PAYOUT_KEY_VERSION: string;
  ALLOWED_ORIGIN: string;
}

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const TOKEN_TTL_SECONDS = 600;
const MAX_BODY_BYTES = 8192;

function response(data: unknown, status: number, origin?: string) {
  const headers = new Headers(JSON_HEADERS);
  if (origin) {
    headers.set('access-control-allow-origin', origin);
    headers.set('vary', 'Origin');
    headers.set('access-control-allow-headers', 'authorization, content-type');
    headers.set('access-control-allow-methods', 'POST, GET, OPTIONS');
  }
  return new Response(JSON.stringify(data), { status, headers });
}
function b64url(bytes: Uint8Array): string {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function fromB64(value: string): Uint8Array {
  const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(value: string) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
function requiredEnv(env: Env) {
  for (const key of ['SUPABASE_URL','SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','PAYOUT_ENCRYPTION_KEY','PAYOUT_KEY_VERSION','ALLOWED_ORIGIN'] as const) {
    if (!env[key] || env[key].includes('YOUR_')) throw new Error('service_not_configured');
  }
  const key = fromB64(env.PAYOUT_ENCRYPTION_KEY);
  if (key.length !== 32) throw new Error('invalid_encryption_key');
  return key;
}
async function authUser(request: Request, env: Env) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, authorization: auth }
  });
  if (!r.ok) return null;
  const user = await r.json() as { id?: string };
  return user.id ? { id: user.id, bearer: auth } : null;
}
async function serviceRequest(env: Env, path: string, init: RequestInit = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': 'application/json',
      ...(init.headers || {})
    }
  });
}
async function encryptPayload(payload: unknown, rawKey: Uint8Array) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
  return { ciphertext: b64url(new Uint8Array(ciphertext)), nonce: b64url(iv) };
}
async function decryptPayload(ciphertext: string, nonce: string, rawKey: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(nonce) }, key, fromB64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plain));
}
function validNigeriaBankDetails(v: any) {
  return v && v.country_code === 'NG' && v.payout_method === 'bank_transfer' &&
    typeof v.account_number === 'string' && /^\d{10}$/.test(v.account_number) &&
    typeof v.bank_code === 'string' && /^[A-Za-z0-9]{3,10}$/.test(v.bank_code) &&
    typeof v.account_name === 'string' && v.account_name.trim().length >= 2 && v.account_name.trim().length <= 100;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin') || '';
    const allowedOrigins = (env.ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
    if (!origin || !allowedOrigins.includes(origin)) return response({ error: 'origin_not_allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, GET, OPTIONS', 'access-control-max-age': '600', 'vary': 'Origin' } });
    try { requiredEnv(env); } catch { return response({ error: 'service_not_configured' }, 503, origin); }
    const url = new URL(request.url);
    if (url.pathname === '/v1/payout-details' && request.method === 'POST') {
      const user = await authUser(request, env);
      if (!user) return response({ error: 'authentication_required' }, 401, origin);
      const len = Number(request.headers.get('content-length') || '0');
      if (len > MAX_BODY_BYTES) return response({ error: 'request_too_large' }, 413, origin);
      let body: any;
      try {
        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return response({ error: 'request_too_large' }, 413, origin);
        body = JSON.parse(rawBody);
      } catch { return response({ error: 'invalid_json' }, 400, origin); }
      if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return response({ error: 'content_type_must_be_json' }, 415, origin);
      if (!validNigeriaBankDetails(body)) return response({ error: 'unsupported_or_invalid_payout_details' }, 400, origin);
      // Opportunistic cleanup: remove only expired, unconsumed tokens. Consumed rows
      // remain linked to withdrawals so Finance can retrieve their encrypted details.
      await serviceRequest(env, `payout_details_vault?expires_at=lt.${encodeURIComponent(new Date().toISOString())}&consumed_at=is.null`, { method: 'DELETE' });
      const rawToken = b64url(crypto.getRandomValues(new Uint8Array(32)));
      const tokenHash = await sha256(rawToken);
      const encrypted = await encryptPayload({ account_number: body.account_number, bank_code: body.bank_code, account_name: body.account_name.trim() }, fromB64(env.PAYOUT_ENCRYPTION_KEY));
      const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
      const insert = await serviceRequest(env, 'payout_details_vault', {
        method: 'POST', headers: { prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: user.id, country_code: 'NG', payout_method: 'bank_transfer', token_hash: tokenHash,
          encrypted_payload: encrypted.ciphertext, nonce: encrypted.nonce, key_version: env.PAYOUT_KEY_VERSION, expires_at: expiresAt })
      });
      if (!insert.ok) return response({ error: 'payout_details_storage_failed' }, 503, origin);
      return response({ token: rawToken, expires_at: expiresAt }, 201, origin);
    }
    const adminMatch = url.pathname.match(/^\/v1\/admin\/payout-details\/([0-9a-f-]{36})$/i);
    if (adminMatch && request.method === 'GET') {
      const user = await authUser(request, env);
      if (!user) return response({ error: 'authentication_required' }, 401, origin);
      const authCheck = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/is_finance_admin`, {
        method: 'POST', headers: { apikey: env.SUPABASE_ANON_KEY, authorization: user.bearer, 'content-type': 'application/json' }, body: '{}'
      });
      if (!authCheck.ok || await authCheck.json() !== true) return response({ error: 'finance_admin_required' }, 403, origin);
      const withdrawalId = adminMatch[1];
      // One authenticated SECURITY DEFINER RPC locks the withdrawal and vault row,
      // verifies its live status, and writes the audit event in the same transaction.
      // This removes the previous read/audit time-of-check-to-time-of-use race.
      const envelopeRes = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/admin_reveal_payout_details_envelope`, {
        method: 'POST',
        headers: { apikey: env.SUPABASE_ANON_KEY, authorization: user.bearer, 'content-type': 'application/json' },
        body: JSON.stringify({ p_withdrawal_id: withdrawalId })
      });
      if (!envelopeRes.ok) {
        if (envelopeRes.status === 404) return response({ error: 'payout_details_unavailable' }, 404, origin);
        if (envelopeRes.status === 409) return response({ error: 'payout_details_not_available_for_this_status' }, 409, origin);
        if (envelopeRes.status === 401 || envelopeRes.status === 403) return response({ error: 'finance_admin_required' }, 403, origin);
        return response({ error: 'payout_details_unavailable' }, 503, origin);
      }
      const envelope = await envelopeRes.json() as {
        country_code?: string; payout_method?: string; encrypted_payload?: string;
        nonce?: string; key_version?: string;
      };
      if (!envelope?.encrypted_payload || !envelope.nonce || !envelope.country_code || !envelope.payout_method) {
        return response({ error: 'payout_details_unavailable' }, 404, origin);
      }
      if (envelope.key_version !== env.PAYOUT_KEY_VERSION) return response({ error: 'payout_key_version_unavailable' }, 503, origin);
      const details = await decryptPayload(envelope.encrypted_payload, envelope.nonce, fromB64(env.PAYOUT_ENCRYPTION_KEY));
      return response({ country_code: envelope.country_code, payout_method: envelope.payout_method, ...details }, 200, origin);
    }
    return response({ error: 'not_found' }, 404, origin);
  }
};
