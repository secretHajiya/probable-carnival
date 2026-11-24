import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import md5 from "npm:md5@2.3.0";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left.charCodeAt(i) ^ right.charCodeAt(i);
  return mismatch === 0;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  try {
    const params = new URL(request.url).searchParams;
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const body = await request.json();
        if (!body || typeof body !== "object" || Array.isArray(body)) {
          return json({ ok: false, error: "invalid_body" }, 400);
        }
        for (const [key, value] of Object.entries(body)) {
          if (value !== undefined && value !== null) params.set(key, String(value));
        }
      } else {
        const body = await request.formData();
        for (const [key, value] of body.entries()) if (typeof value === "string") params.set(key, value);
      }
    }

    const statusRaw = (params.get("status") ?? "").trim();
    const transactionId = (params.get("trans_id") ?? "").trim();
    const externalUserId = (params.get("user_id") ?? "").trim();
    const eventType = (params.get("type") ?? "complete").trim().toLowerCase();
    const amountUsdRaw = (params.get("amount_usd") ?? "").trim();
    const receivedHash = (params.get("hash") ?? params.get("secure_hash") ?? "").trim().toLowerCase();

    if (!transactionId || transactionId.length > 180 || !isUuid(externalUserId)) {
      return json({ ok: false, error: "invalid_transaction_or_user" }, 400);
    }
    if (!(statusRaw === "1" || statusRaw === "2") || !["complete", "bonus", "out"].includes(eventType)) {
      return json({ ok: false, error: "invalid_status_or_type" }, 400);
    }
    if (!/^\d+(?:\.\d{1,6})?$/.test(amountUsdRaw)) {
      return json({ ok: false, error: "invalid_amount" }, 400);
    }
    const amountUsd = Number(amountUsdRaw);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 10000) {
      return json({ ok: false, error: "amount_out_of_range" }, 400);
    }

    const appSecret = Deno.env.get("CPX_APP_SECURITY_HASH");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const coinsPerUsdRaw = Deno.env.get("CPX_REWARD_COINS_PER_USD");
    if (!appSecret || !supabaseUrl || !serviceRoleKey || !coinsPerUsdRaw) {
      return json({ ok: false, error: "server_configuration_missing" }, 503);
    }
    if (!/^\d+(?:\.\d{1,6})?$/.test(coinsPerUsdRaw)) {
      return json({ ok: false, error: "invalid_reward_rate_configuration" }, 503);
    }
    const coinsPerUsd = Number(coinsPerUsdRaw);
    if (!Number.isFinite(coinsPerUsd) || coinsPerUsd <= 0 || coinsPerUsd > 1000000000) {
      return json({ ok: false, error: "invalid_reward_rate_configuration" }, 503);
    }

    // CPX postback signature: MD5(trans_id + "-" + App Security Hash).
    const expectedHash = md5(`${transactionId}-${appSecret}`);
    if (!/^[a-f0-9]{32}$/.test(receivedHash) || !constantTimeEqual(receivedHash, expectedHash)) {
      return json({ ok: false, error: "invalid_signature" }, 401);
    }

    // CPX "out" events are informational. Acknowledge only after signature
    // validation so unsigned requests cannot masquerade as accepted callbacks.
    if (eventType === "out") return json({ ok: true, ignored: true, reason: "non_reward_event" });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles").select("id,country_code,status").eq("id", externalUserId).maybeSingle();
    if (profileError) return json({ ok: false, error: "member_lookup_failed" }, 500);
    if (!profile || profile.status !== "active" || !profile.country_code) {
      return json({ ok: false, error: "member_not_eligible" }, 409);
    }

    const { data: provider, error: providerError } = await admin
      .from("reward_providers").select("id,is_enabled").eq("code", "cpx").maybeSingle();
    if (providerError) return json({ ok: false, error: "provider_lookup_failed" }, 500);
    if (!provider?.id || !provider.is_enabled) return json({ ok: false, error: "provider_disabled" }, 409);

    const { data: app, error: appError } = await admin
      .from("provider_apps")
      .select("id,external_app_id,is_enabled")
      .eq("provider_id", provider.id)
      .eq("platform", "web")
      .eq("country_code", profile.country_code)
      .maybeSingle();
    if (appError) return json({ ok: false, error: "provider_app_lookup_failed" }, 500);
    if (!app?.id || !app.is_enabled) return json({ ok: false, error: "provider_app_disabled" }, 409);
    const callbackAppId = (params.get("app_id") ?? "").trim();
    if (callbackAppId && callbackAppId !== app.external_app_id) {
      return json({ ok: false, error: "app_mapping_mismatch" }, 409);
    }

    // The production RPC contract reported by the project owner is:
    // process_cpx_reward(uuid,text,text,uuid,integer,bigint,bigint,text,jsonb).
    // The conversion rate is an explicit server setting; never trust reward_coins from CPX.
    const grossRevenueMinor = Math.round(amountUsd * 100);
    const rewardCoins = Math.floor(amountUsd * coinsPerUsd);
    if (!Number.isSafeInteger(grossRevenueMinor) || !Number.isSafeInteger(rewardCoins) || rewardCoins <= 0) {
      return json({ ok: false, error: "calculated_reward_out_of_range" }, 400);
    }

    const { data, error } = await admin.rpc("process_cpx_reward", {
      p_provider_id: provider.id,
      p_transaction_id: transactionId,
      p_external_user_id: externalUserId,
      p_user_id: profile.id,
      p_status: Number(statusRaw),
      p_reward_coins: rewardCoins,
      p_gross_revenue_minor: grossRevenueMinor,
      p_currency: "USD",
      p_payload: Object.fromEntries(params.entries()),
    });
    if (error) {
      // Do not expose database internals or secrets to the provider response.
      console.error("CPX reward RPC failed", error.message);
      return json({ ok: false, error: "reward_processing_failed" }, 500);
    }
    return json({ ok: true, result: data ?? null });
  } catch (error) {
    console.error("CPX callback request failed", error);
    return json({ ok: false, error: "invalid_request" }, 400);
  }
});
