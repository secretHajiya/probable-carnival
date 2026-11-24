const CPX_ALLOWED_IPS = new Set([
  "157.90.97.92",
  "188.40.3.73",
  "2a01:4f8:d0a:30ff::2",
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

// MD5 implementation for Cloudflare Workers.
function md5(text) {
  const input = new TextEncoder().encode(text);
  const length = input.length;
  const paddedLength = Math.ceil((length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);

  bytes.set(input);
  bytes[length] = 0x80;

  const view = new DataView(bytes.buffer);
  const bitLength = length * 8;

  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(
    paddedLength - 4,
    Math.floor(bitLength / 0x100000000),
    true
  );

  const shifts = [
    7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
    5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
    4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
    6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21
  ];

  const constants = Array.from(
    { length: 64 },
    (_, i) =>
      Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0
  );

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = [];

    for (let j = 0; j < 16; j++) {
      words[j] = view.getUint32(offset + j * 4, true);
    }

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let i = 0; i < 64; i++) {
      let f;
      let g;

      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }

      const sum = (a + f + constants[i] + words[g]) >>> 0;
      const shift = shifts[i];

      const rotated =
        ((sum << shift) | (sum >>> (32 - shift))) >>> 0;

      const nextB = (b + rotated) >>> 0;

      a = d;
      d = c;
      c = b;
      b = nextB;
    }

    a0 = (a0 + a) >>> 0;
    b0 = (b0 + b) >>> 0;
    c0 = (c0 + c) >>> 0;
    d0 = (d0 + d) >>> 0;
  }

  function littleHex(value) {
    return [0, 8, 16, 24]
      .map((shift) =>
        ((value >>> shift) & 255).toString(16).padStart(2, "0")
      )
      .join("");
  }

  return (
    littleHex(a0) +
    littleHex(b0) +
    littleHex(c0) +
    littleHex(d0)
  );
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;

  let difference = 0;

  for (let i = 0; i < a.length; i++) {
    difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return difference === 0;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function readParams(request) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    return url.searchParams;
  }

  const body = await request.text();

  const contentType = (
    request.headers.get("content-type") || ""
  ).toLowerCase();

  if (contentType.includes("application/json")) {
    const data = JSON.parse(body);

    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Invalid JSON body");
    }

    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(data)) {
      params.set(key, String(value ?? ""));
    }

    return params;
  }

  return new URLSearchParams(body);
}

// Supabase REST request.
async function supabaseRequest(env, path, options = {}) {
  const baseUrl = env.SUPABASE_URL.replace(/\/+$/, "");

  return fetch(`${baseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...(options.headers || {}),
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "POST") {
      return json({
        success: false,
        error: "Method not allowed",
      }, 405);
    }

    try {
      // Verify CPX server IP.
      const clientIp = (
        request.headers.get("CF-Connecting-IP") || ""
      ).trim();

      if (!CPX_ALLOWED_IPS.has(clientIp)) {
        return json({
          success: false,
          error: "IP not allowed",
        }, 403);
      }

      // Check Worker secrets.
      if (
        !env.CPX_APP_SECURITY_HASH ||
        !env.SUPABASE_URL ||
        !env.SUPABASE_SERVICE_ROLE_KEY
      ) {
        console.error("Required Worker secrets are missing");

        return json({
          success: false,
          error: "Server configuration missing",
        }, 500);
      }

      const params = await readParams(request);

      const transactionId = (
        params.get("trans_id") || ""
      ).trim();

      const userId = (
        params.get("user_id") || ""
      ).trim();

      const status = Number(params.get("status"));
      const amountUsd = Number(params.get("amount_usd"));

      const type = (
        params.get("type") || ""
      ).trim().toLowerCase();

      const suppliedHash = (
        params.get("hash") ||
        params.get("secure_hash") ||
        ""
      ).trim().toLowerCase();

      if (!transactionId || !userId || !suppliedHash) {
        return json({
          success: false,
          error: "Missing required callback fields",
        }, 400);
      }

      // Verify CPX MD5 signature.
      const expectedHash = md5(
        `${transactionId}-${env.CPX_APP_SECURITY_HASH.trim()}`
      );

      if (!safeEqual(expectedHash, suppliedHash)) {
        console.warn("CPX signature verification failed");

        return json({
          success: false,
          error: "Invalid signature",
        }, 401);
      }

      // Ignore outgoing transactions.
      if (type === "out") {
        return json({
          success: true,
          ignored: true,
        });
      }

      if (type !== "complete" && type !== "bonus") {
        return json({
          success: false,
          error: "Unsupported transaction type",
        }, 400);
      }

      if (status !== 1 && status !== 2) {
        return json({
          success: false,
          error: "Invalid status",
        }, 400);
      }

      if (!isUuid(userId)) {
        return json({
          success: false,
          error: "Invalid user ID",
        }, 400);
      }

      if (
        status === 1 &&
        (!Number.isFinite(amountUsd) || amountUsd <= 0)
      ) {
        return json({
          success: false,
          error: "Invalid reward amount",
        }, 400);
      }

      // Find CPX provider.
      const providerResponse = await supabaseRequest(
        env,
        "reward_providers?code=ilike.cpx&select=id,is_enabled"
      );

      if (!providerResponse.ok) {
        console.error(
          "Provider lookup failed:",
          providerResponse.status
        );

        return json({
          success: false,
          error: "Provider lookup failed",
        }, 500);
      }

      const providers = await providerResponse.json();

      if (!Array.isArray(providers) || providers.length !== 1) {
        return json({
          success: false,
          error: "CPX provider not configured uniquely",
        }, 500);
      }

      const provider = providers[0];

      if (!provider.is_enabled) {
        return json({
          success: false,
          error: "CPX provider is disabled",
        }, 403);
      }

      // Find exact CPX web application for Nigeria.
      const appQuery = new URLSearchParams({
        provider_id: `eq.${provider.id}`,
        platform: "eq.web",
        external_app_id: "eq.37222",
        country_code: "eq.NG",
        select: "id,is_enabled",
      });

      const appResponse = await supabaseRequest(
        env,
        `provider_apps?${appQuery.toString()}`
      );

      if (!appResponse.ok) {
        console.error(
          "App lookup failed:",
          appResponse.status
        );

        return json({
          success: false,
          error: "CPX app lookup failed",
        }, 500);
      }

      const apps = await appResponse.json();

      if (!Array.isArray(apps) || apps.length !== 1) {
        return json({
          success: false,
          error: "CPX app configuration not found uniquely",
        }, 500);
      }

      if (!apps[0].is_enabled) {
        return json({
          success: false,
          error: "CPX app is disabled",
        }, 403);
      }

      // 500 Vyra coins = $1 CPX commission.
      // Status 2 is a cancellation/reversal.
      const rewardCoins =
        status === 1 ? Math.round(amountUsd * 500) : 0;

      const revenueMinor =
        status === 1 ? Math.round(amountUsd * 100) : 0;

      // Call existing Production RPC.
      const rpcResponse = await supabaseRequest(
        env,
        "rpc/process_cpx_reward",
        {
          method: "POST",
          body: JSON.stringify({
            p_provider_id: provider.id,
            p_transaction_id: transactionId,
            p_external_user_id: userId,
            p_user_id: userId,
            p_status: status,
            p_reward_coins: rewardCoins,
            p_gross_revenue_minor: revenueMinor,
            p_currency: "USD",
            p_payload: {
              source: "cpx_research",
              type,
              amount_usd: status === 1 ? amountUsd : null,
              received_at: new Date().toISOString(),
            },
          }),
        }
      );

      if (!rpcResponse.ok) {
        const errorText = await rpcResponse.text();

        console.error(
          "CPX reward RPC failed:",
          rpcResponse.status,
          errorText.slice(0, 500)
        );

        return json({
          success: false,
          error: "Reward processing failed",
        }, 500);
      }

      // Read and validate the actual RPC response.
      const resultText = await rpcResponse.text();

      if (!resultText) {
        console.error("CPX RPC returned an empty response");

        return json({
          success: false,
          error: "Empty RPC response",
        }, 502);
      }

      let result;

      try {
        result = JSON.parse(resultText);
      } catch {
        console.error("CPX RPC returned invalid JSON");

        return json({
          success: false,
          error: "Invalid RPC response",
        }, 502);
      }

      if (
        !result ||
        typeof result !== "object" ||
        typeof result.success !== "boolean"
      ) {
        console.error("CPX RPC returned an unexpected result");

        return json({
          success: false,
          error: "Unexpected RPC response",
        }, 502);
      }

      console.log("CPX callback processed", {
        status,
        type,
        success: result.success,
        credited: result.credited === true,
        reversed: result.reversed === true,
        duplicate: result.duplicate === true,
        message: result.message || null,
      });

      // Preserve the actual RPC result.
      // A recorded manual-review result is acknowledged to avoid
      // repeated provider callbacks; it is NOT reported as a credit.
      if (result.success === false) {
        console.warn("CPX transaction was not completed", {
          status,
          message: result.message || "Processing unsuccessful",
        });

        return json(result, 200);
      }

      return json(result, 200);

    } catch (error) {
      console.error(
        "CPX callback error:",
        error instanceof Error ? error.message : "Unknown error"
      );

      return json({
        success: false,
        error: "Invalid callback request",
      }, 400);
    }
  },
};
