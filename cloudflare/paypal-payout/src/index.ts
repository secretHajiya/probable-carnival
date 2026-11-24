export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PAYPAL_CLIENT_ID: string;
  PAYPAL_CLIENT_SECRET: string;
  PAYPAL_WEBHOOK_ID: string;
  PAYPAL_ENV: 'sandbox';
  PAYPAL_ENCRYPTION_KEY: string;
  PAYPAL_KEY_VERSION: string;
  ALLOWED_ORIGIN: string;
}

const MAX_BODY = 8 * 1024;
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // intentionally sandbox-only
const json = (body: unknown, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) }
});
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const unb64 = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const hex = (bytes: Uint8Array) => [...bytes].map(v => v.toString(16).padStart(2, '0')).join('');
async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))); }
function keyBytes(value: string) { const raw = atob(value); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
async function encrypt(value: unknown, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes(secret), 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { encrypted_payload: b64(new Uint8Array(ciphertext)), nonce: b64(iv) };
}
async function decrypt(ciphertext: string, nonce: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', keyBytes(secret), 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(nonce) }, key, unb64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plain)) as { email: string };
}
async function bodyJson(request: Request) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY) throw new Error('request_too_large');
  return JSON.parse(raw);
}
async function supabaseUser(request: Request, env: Env) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { apikey: env.SUPABASE_ANON_KEY, authorization: auth } });
  return res.ok ? { user: await res.json() as { id: string }, bearer: auth } : null;
}
async function serviceRpc(env: Env, name: string, args: unknown) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json'
  }, body: JSON.stringify(args) });
  const text = await res.text();
  if (!res.ok) throw new Error(`database_${name}_${res.status}:${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}
async function financeAllowed(user: { bearer: string }, env: Env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/is_finance_admin`, { method: 'POST', headers: {
    apikey: env.SUPABASE_ANON_KEY, authorization: user.bearer, 'content-type': 'application/json'
  }, body: '{}' });
  return res.ok && await res.json() === true;
}
async function paypalAccessToken(env: Env) {
  const credentials = btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_CLIENT_SECRET}`);
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, { method: 'POST', headers: {
    authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded'
  }, body: 'grant_type=client_credentials' });
  if (!res.ok) throw new Error(`paypal_oauth_${res.status}`);
  return (await res.json() as { access_token: string }).access_token;
}
async function verifyWebhook(request: Request, event: unknown, env: Env, token: string) {
  const headers = ['paypal-transmission-id','paypal-transmission-time','paypal-cert-url','paypal-auth-algo','paypal-transmission-sig'];
  const values = headers.map(h => request.headers.get(h));
  if (values.some(v => !v)) return false;
  const [transmission_id, transmission_time, cert_url, auth_algo, transmission_sig] = values as string[];
  // Prevent PayPal verification from being tricked into fetching arbitrary certificate URLs.
  if (!cert_url.startsWith('https://api.paypal.com/') && !cert_url.startsWith('https://api.sandbox.paypal.com/')) return false;
  const res = await fetch(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, { method: 'POST', headers: {
    authorization: `Bearer ${token}`, 'content-type': 'application/json'
  }, body: JSON.stringify({ auth_algo, cert_url, transmission_id, transmission_sig, transmission_time,
    webhook_id: env.PAYPAL_WEBHOOK_ID, webhook_event: event }) });
  if (!res.ok) return false;
  return (await res.json() as { verification_status?: string }).verification_status === 'SUCCESS';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('origin') || '';
    const isWebhook = new URL(request.url).pathname === '/v1/webhooks/paypal';
    const allowed = (env.ALLOWED_ORIGIN || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!isWebhook && (!origin || !allowed.includes(origin))) return json({ error: 'origin_not_allowed' }, 403);
    if (!isWebhook && request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type', 'access-control-max-age': '600', vary: 'Origin'
    } });
    if (env.PAYPAL_ENV !== 'sandbox') return json({ error: 'sandbox_only_worker' }, 503, origin);
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY || !env.PAYPAL_CLIENT_ID ||
      !env.PAYPAL_CLIENT_SECRET || !env.PAYPAL_WEBHOOK_ID || !env.PAYPAL_ENCRYPTION_KEY || !env.PAYPAL_KEY_VERSION)
      return json({ error: 'service_not_configured' }, 503, origin);
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/v1/paypal-recipient') {
        const auth = await supabaseUser(request, env);
        if (!auth) return json({ error: 'authentication_required' }, 401, origin);
        if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) return json({ error: 'json_required' }, 415, origin);
        const body = await bodyJson(request);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'invalid_paypal_email' }, 400, origin);
        const profileRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(auth.user.id)}&select=country_code,status`, { headers: { apikey: env.SUPABASE_ANON_KEY, authorization: auth.bearer } });
        const profiles = profileRes.ok ? await profileRes.json() as Array<{country_code:string;status:string}> : [];
        if (profiles[0]?.country_code !== 'US' || profiles[0]?.status !== 'active') return json({ error: 'active_us_member_required' }, 403, origin);
        const token = b64(crypto.getRandomValues(new Uint8Array(32)));
        const encrypted = await encrypt({ email }, env.PAYPAL_ENCRYPTION_KEY);
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/paypal_recipient_vault`, { method: 'POST', headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          'content-type': 'application/json', prefer: 'return=minimal'
        }, body: JSON.stringify({ user_id: auth.user.id, country_code: 'US', payout_method: 'paypal',
          token_hash: await sha256(token), ...encrypted, key_version: env.PAYPAL_KEY_VERSION, expires_at: expires }) });
        if (!res.ok) return json({ error: 'recipient_storage_failed' }, 503, origin);
        return json({ token, expires_at: expires }, 201, origin);
      }

      // Finance-only, read-only reconciliation inspection. This endpoint never
      // settles a withdrawal; the verified PayPal webhook remains the sole finalizer.
      if (request.method === 'GET' && url.pathname === '/v1/admin/paypal-payouts/reconciliation') {
        const auth = await supabaseUser(request, env);
        if (!auth) return json({ error: 'authentication_required' }, 401, origin);
        if (!await financeAllowed(auth, env)) return json({ error: 'finance_admin_required' }, 403, origin);
        const rows = await serviceRpc(env, 'paypal_list_reconciliation_queue', {}) as Array<{
          withdrawal_id: string; sender_batch_id: string; provider_batch_id: string | null;
          amount_minor: number; currency_code: string; status: string; updated_at: string
        }>;
        return json({ items: rows || [] }, 200, origin);
      }

      const inspect = url.pathname.match(/^\/v1\/admin\/paypal-payouts\/([0-9a-f-]{36})\/reconciliation-detail$/i);
      if (request.method === 'GET' && inspect) {
        const auth = await supabaseUser(request, env);
        if (!auth) return json({ error: 'authentication_required' }, 401, origin);
        if (!await financeAllowed(auth, env)) return json({ error: 'finance_admin_required' }, 403, origin);
        const rows = await serviceRpc(env, 'paypal_list_reconciliation_queue', {}) as Array<{
          withdrawal_id: string; sender_batch_id: string; provider_batch_id: string | null;
          amount_minor: number; currency_code: string; status: string; updated_at: string
        }>;
        const attempt = (rows || []).find(row => row.withdrawal_id === inspect[1]);
        if (!attempt) return json({ error: 'reconciliation_item_not_found' }, 404, origin);
        if (!attempt.provider_batch_id) return json({
          status: 'manual_reconciliation_required', reason: 'provider_batch_reference_missing',
          withdrawal_id: attempt.withdrawal_id, sender_batch_id: attempt.sender_batch_id,
          amount_minor: attempt.amount_minor, currency_code: attempt.currency_code
        }, 200, origin);
        const access = await paypalAccessToken(env);
        const providerRes = await fetch(`${PAYPAL_API}/v1/payments/payouts/${encodeURIComponent(attempt.provider_batch_id)}`, {
          headers: { authorization: `Bearer ${access}` }
        });
        if (!providerRes.ok) return json({ status: 'provider_lookup_unavailable', provider_status: providerRes.status,
          withdrawal_id: attempt.withdrawal_id, provider_batch_id: attempt.provider_batch_id }, 202, origin);
        const provider = await providerRes.json() as {
          batch_header?: { payout_batch_id?: string; batch_status?: string; time_completed?: string };
          items?: Array<{ payout_item_id?: string; transaction_status?: string;
            payout_item?: { sender_item_id?: string; amount?: { value?: string; currency?: string } } }>;
        };
        const items = (provider.items || []).map(item => ({
          provider_item_id: item.payout_item_id || null,
          sender_item_id: item.payout_item?.sender_item_id || null,
          transaction_status: item.transaction_status || 'UNKNOWN',
          amount: item.payout_item?.amount?.value || null,
          currency: item.payout_item?.amount?.currency || null
        }));
        return json({
          status: 'inspection_only', automatic_settlement: false,
          withdrawal_id: attempt.withdrawal_id, sender_batch_id: attempt.sender_batch_id,
          provider_batch_id: attempt.provider_batch_id, expected_amount_minor: attempt.amount_minor,
          expected_currency: attempt.currency_code,
          provider_batch_status: provider.batch_header?.batch_status || 'UNKNOWN',
          provider_completed_at: provider.batch_header?.time_completed || null,
          items
        }, 200, origin);
      }

      const submit = url.pathname.match(/^\/v1\/admin\/paypal-payouts\/([0-9a-f-]{36})\/submit$/i);
      if (request.method === 'POST' && submit) {
        const auth = await supabaseUser(request, env);
        if (!auth) return json({ error: 'authentication_required' }, 401, origin);
        if (!await financeAllowed(auth, env)) return json({ error: 'finance_admin_required' }, 403, origin);
        const claim = await serviceRpc(env, 'paypal_claim_payout', { p_withdrawal_id: submit[1] }) as {
          withdrawal_id: string; sender_batch_id: string; provider_batch_id?: string; status: string; amount_minor: number;
          currency_code: string; encrypted_payload: string; nonce: string; key_version: string
        };
        if (claim.key_version !== env.PAYPAL_KEY_VERSION || claim.currency_code !== 'USD' || claim.amount_minor <= 0)
          return json({ error: 'payout_claim_invalid' }, 409, origin);
        // A known provider batch means PayPal already acknowledged this payout.
        // Never issue another create-payout request for an acknowledged batch.
        if (claim.provider_batch_id || claim.status === 'submitted')
          return json({ status: 'already_submitted', withdrawal_id: claim.withdrawal_id,
            provider_batch_id: claim.provider_batch_id || null }, 200, origin);
        // An ambiguous timeout or unreadable provider response must never trigger
        // another create-payout call. Reconcile the existing sender_batch_id first.
        if (claim.status === 'reconciling')
          return json({ status: 'reconciliation_required', withdrawal_id: claim.withdrawal_id,
            sender_batch_id: claim.sender_batch_id }, 202, origin);
        if (claim.status === 'quarantined' || claim.status === 'succeeded' || claim.status === 'failed')
          return json({ error: 'payout_attempt_not_resubmittable', status: claim.status,
            withdrawal_id: claim.withdrawal_id }, 409, origin);
        const recipient = await decrypt(claim.encrypted_payload, claim.nonce, env.PAYPAL_ENCRYPTION_KEY);
        const access = await paypalAccessToken(env);
        const amount = (claim.amount_minor / 100).toFixed(2);
        // sender_batch_id and PayPal-Request-Id are stable across retries; never mint a new batch on timeout.
        const res = await fetch(`${PAYPAL_API}/v1/payments/payouts`, { method: 'POST', headers: {
          authorization: `Bearer ${access}`, 'content-type': 'application/json', 'PayPal-Request-Id': claim.sender_batch_id
        }, body: JSON.stringify({ sender_batch_header: { sender_batch_id: claim.sender_batch_id,
          email_subject: 'Your Vyra Rewards payout', email_message: 'Your approved Vyra Rewards payout is being processed.' },
          items: [{ recipient_type: 'EMAIL', amount: { value: amount, currency: 'USD' }, receiver: recipient.email,
            sender_item_id: claim.withdrawal_id, note: 'Vyra Rewards withdrawal' }] }) });
        if (!res.ok) {
          // 5xx may have happened after PayPal accepted the request: reconcile it.
          // 4xx is not treated as a successful submission. Quarantine it for review;
          // do not auto-refund coins or retry with a new payout identity.
          const ambiguous = res.status >= 500;
          const rejected = res.status >= 400 && res.status < 500;
          await serviceRpc(env, 'paypal_record_submission', { p_withdrawal_id: claim.withdrawal_id,
            p_provider_batch_id: null, p_provider_item_id: null,
            p_ambiguous: ambiguous, p_rejected: rejected });
          return json({ status: ambiguous ? 'reconciling' : 'quarantined', error: `paypal_payout_${res.status}` }, 202, origin);
        }
        let result: { batch_header?: { payout_batch_id?: string } };
        try {
          result = await res.json() as { batch_header?: { payout_batch_id?: string } };
        } catch {
          await serviceRpc(env, 'paypal_record_submission', { p_withdrawal_id: claim.withdrawal_id,
            p_provider_batch_id: null, p_provider_item_id: null, p_ambiguous: true, p_rejected: false });
          return json({ status: 'reconciling', error: 'provider_response_unreadable' }, 202, origin);
        }
        const providerBatch = result.batch_header?.payout_batch_id;
        if (!providerBatch) {
          await serviceRpc(env, 'paypal_record_submission', { p_withdrawal_id: claim.withdrawal_id,
            p_provider_batch_id: null, p_provider_item_id: null, p_ambiguous: true, p_rejected: false });
          return json({ status: 'reconciling', error: 'provider_batch_reference_missing' }, 202, origin);
        }
        await serviceRpc(env, 'paypal_record_submission', { p_withdrawal_id: claim.withdrawal_id,
          p_provider_batch_id: providerBatch, p_provider_item_id: claim.withdrawal_id, p_ambiguous: false });
        return json({ status: 'submitted', withdrawal_id: claim.withdrawal_id, provider_batch_id: providerBatch }, 202, origin);
      }

      if (request.method === 'POST' && url.pathname === '/v1/webhooks/paypal') {
        const event = await bodyJson(request);
        const access = await paypalAccessToken(env);
        if (!await verifyWebhook(request, event, env, access)) return json({ error: 'webhook_signature_invalid' }, 401, origin);
        const e = event as any;
        // A configured PayPal webhook may deliver unrelated event types too.
        // Acknowledge those only after signature verification, before requiring
        // payout-item fields, so PayPal does not retry events we intentionally ignore.
        const outcome = e?.event_type === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED' ? 'succeeded' :
          ['PAYMENT.PAYOUTS-ITEM.FAILED','PAYMENT.PAYOUTS-ITEM.BLOCKED','PAYMENT.PAYOUTS-ITEM.RETURNED'].includes(e?.event_type) ? 'failed' : null;
        if (!outcome) return json({ status: 'ignored_event_type' }, 200, origin);
        const item = e.resource?.payout_item || e.resource;
        const senderItem = item?.sender_item_id;
        const batch = e.resource?.batch_header?.payout_batch_id || e.resource?.payout_batch_id;
        const amountValue = item?.amount?.value;
        const currency = item?.amount?.currency;
        if (typeof e.id !== 'string' || e.id.length < 1 || e.id.length > 255 ||
            typeof senderItem !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(senderItem) ||
            typeof batch !== 'string' || batch.length < 1 || batch.length > 128 ||
            currency !== 'USD' || typeof amountValue !== 'string' || !/^\d+\.\d{2}$/.test(amountValue))
          return json({ error: 'webhook_payload_invalid' }, 400, origin);
        const minor = Number(amountValue.replace('.', ''));
        if (!Number.isSafeInteger(minor) || minor <= 0)
          return json({ error: 'webhook_amount_invalid' }, 400, origin);
        const result = await serviceRpc(env, 'paypal_finalize_event', { p_event_id: e.id, p_event_type: e.event_type,
          p_sender_batch_id: batch, p_provider_item_id: senderItem, p_outcome: outcome,
          p_amount_minor: minor, p_currency_code: currency });
        return json({ status: result }, 200, origin);
      }
      return json({ error: 'not_found' }, 404, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'internal_error';
      return json({ error: message.startsWith('database_') ? 'database_operation_failed' : 'request_failed' }, 503, origin);
    }
  }
};
