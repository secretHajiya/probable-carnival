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


function textResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function readParams(request) {
  const url = new URL(request.url);
  if (request.method === "GET") return url.searchParams;
  const body = await request.text();
  const type = (request.headers.get("content-type") || "").toLowerCase();
  if (type.includes("application/json")) {
    const value = JSON.parse(body);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON body");
    const params = new URLSearchParams();
    for (const [key, item] of Object.entries(value)) params.set(key, String(item ?? ""));
    return params;
  }
  return new URLSearchParams(body);
}

function normalizeUserId(value) {
  const raw = String(value || "").trim().toLowerCase();
  // Accept a canonical UUID or the same UUID without hyphens.
  // Keep the original value for signature verification; normalize only for Supabase.
  const compact = raw.replace(/-/g, "");
  if (!/^[a-f0-9]{32}$/.test(compact)) {
    throw new Error("Invalid callback user ID");
  }
  return `${compact.slice(0,8)}-${compact.slice(8,12)}-${compact.slice(12,16)}-${compact.slice(16,20)}-${compact.slice(20)}`;
}

function parseTimestamp(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Missing timestamp");
  let millis;
  // LevelPlay's documented callback timestamp format is YYYYMMDDHHMM.
  // Interpret the timezone-less value as UTC for deterministic validation.
  if (/^\d{12}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6));
    const day = Number(raw.slice(6, 8));
    const hour = Number(raw.slice(8, 10));
    const minute = Number(raw.slice(10, 12));
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day || date.getUTCHours() !== hour ||
        date.getUTCMinutes() !== minute) throw new Error("Invalid timestamp");
    millis = date.getTime();
  } else if (/^\d{10,13}$/.test(raw)) {
    millis = raw.length === 13 ? Number(raw) : Number(raw) * 1000;
  } else {
    millis = Date.parse(raw);
  }
  if (!Number.isFinite(millis)) throw new Error("Invalid timestamp");
  return millis;
}

function getParam(params, ...names) {
  for (const name of names) {
    const value = params.get(name);
    if (value !== null && value !== "") return value;
  }
  return "";
}

async function processReward(env, payload) {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/process_levelplay_reward`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      p_event_id: payload.eventId,
      p_user_id: payload.userId,
      p_reward_amount: payload.rewardAmount,
      p_app_key: payload.appKey,
      p_placement_name: payload.placementName,
      p_callback_timestamp: payload.timestamp,
      p_callback_payload: {
        event_id: payload.eventId,
        user_id: payload.userId,
        rewards: payload.rewardAmount,
        app_key: payload.appKey,
        placement_name: payload.placementName,
        timestamp: payload.timestamp,
      },
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    console.error("LevelPlay reward RPC failed", response.status, body.slice(0, 500));
    throw new Error("Reward processing failed");
  }
  let result;
  try { result = JSON.parse(body); } catch { throw new Error("Invalid reward RPC response"); }
  if (!result || result.success !== true) throw new Error("Reward was not accepted");
  return result;
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "POST") return textResponse("Method Not Allowed", 405);
    const eventIdForAck = (() => { try { return new URL(request.url).searchParams.get("EVENT_ID") || ""; } catch { return ""; } })();
    try {
      if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.LEVELPLAY_S2S_PRIVATE_KEY) {
        console.error("LevelPlay Worker secrets are not configured");
        return textResponse("Server configuration error", 500);
      }
      const params = await readParams(request);
      // Accept the exact query parameter names used in Unity's S2S examples,
      // as well as the uppercase names used by earlier local test payloads.
      const eventId = getParam(params, "EVENT_ID", "eventId").trim();
      const userIdRaw = getParam(params, "USER_ID", "applicationUserId", "appUserId", "dynamicUserId").trim();
      const rewardsRaw = getParam(params, "REWARDS", "rewards").trim();
      const timestamp = getParam(params, "TIMESTAMP", "timestamp").trim();
      const signature = getParam(params, "SIGNATURE", "signature").trim().toLowerCase();
      const appKey = getParam(params, "APP_KEY", "appKey").trim();
      const placementName = getParam(params, "PLACEMENT_NAME", "placementName").trim();

      if (!/^[A-Za-z0-9_-]{1,128}$/.test(eventId)) return textResponse("Invalid event ID", 400);
      if (!/^[0-9]+$/.test(rewardsRaw)) return textResponse("Invalid reward amount", 400);
      const rewardAmount = Number(rewardsRaw);
      if (!Number.isSafeInteger(rewardAmount) || rewardAmount <= 0) return textResponse("Invalid reward amount", 400);
      if (!appKey || !placementName || !signature) return textResponse("Missing callback fields", 400);

      const expectedSignature = md5(`${timestamp}${eventId}${userIdRaw}${rewardsRaw}${env.LEVELPLAY_S2S_PRIVATE_KEY}`).toLowerCase();
      if (!/^[a-f0-9]{32}$/.test(signature) || !safeEqual(expectedSignature, signature)) {
        console.warn("LevelPlay callback signature rejected", { eventId });
        return textResponse("Invalid signature", 401);
      }

      const timestampMs = parseTimestamp(timestamp);
      const maxAgeSeconds = Number(env.LEVELPLAY_MAX_CALLBACK_AGE_SECONDS || 86400);
      if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 60 || maxAgeSeconds > 604800) {
        return textResponse("Invalid Worker timestamp policy", 500);
      }
      const ageSeconds = Math.abs(Date.now() - timestampMs) / 1000;
      if (ageSeconds > maxAgeSeconds) return textResponse("Expired callback", 401);

      const userId = normalizeUserId(userIdRaw);
      const result = await processReward(env, { eventId, userId, rewardAmount, appKey, placementName, timestamp });
      console.log("LevelPlay callback accepted", {
        eventId,
        duplicate: result.duplicate === true,
        credited: result.credited === true,
      });
      // Unity expects the event ID and OK marker in the response body.
      return textResponse(`${eventId}:OK`, 200);
    } catch (error) {
      console.error("LevelPlay callback error", error instanceof Error ? error.message : "Unknown error");
      return textResponse("Callback processing failed", 500);
    }
  },
};
