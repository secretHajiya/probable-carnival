import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function corsHeaders(req: Request): HeadersInit | null {
  const configured = Deno.env.get("WEB_ORIGIN") ?? "";
  const allowed = configured.split(",").map((value) => value.trim()).filter(Boolean);
  const origin = req.headers.get("Origin") ?? "";
  // Native clients generally have no browser Origin. Browser requests must match WEB_ORIGIN.
  if (origin && !allowed.includes(origin)) return null;
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

async function md5(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("MD5", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (!cors) return Response.json({ error: "Origin not allowed." }, { status: 403 });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const securityHash = Deno.env.get("CPX_SECURE_HASH");
  if (!supabaseUrl || !anonKey || !securityHash) {
    return Response.json({ error: "CPX server configuration is incomplete." }, { status: 503, headers: cors });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication required." }, { status: 401, headers: cors });
  }

  let platform = "web";
  try {
    const rawBody = await req.text();
    if (rawBody.trim()) {
      const body = JSON.parse(rawBody);
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
      if (typeof body.platform === "string") platform = body.platform;
    }
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400, headers: cors });
  }
  if (!["web", "android", "ios"].includes(platform)) {
    return Response.json({ error: "Unsupported platform." }, { status: 400, headers: cors });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: "Invalid session." }, { status: 401, headers: cors });

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("display_name,status,country_code").eq("id", user.id).single();
  if (profileError || !profile || profile.status !== "active" || !profile.country_code) {
    return Response.json({ error: "Active member profile and country required." }, { status: 403, headers: cors });
  }

  const { data: provider, error: providerError } = await supabase
    .from("reward_providers").select("id,is_enabled").eq("code", "cpx").maybeSingle();
  if (providerError || !provider?.is_enabled) {
    return Response.json({ error: "CPX Research is not enabled yet. Please check back later." }, { status: 503, headers: cors });
  }

  const { data: app, error: appError } = await supabase
    .from("provider_apps").select("external_app_id,is_enabled")
    .eq("provider_id", provider.id)
    .eq("platform", platform)
    .eq("country_code", profile.country_code)
    .maybeSingle();
  if (appError || !app?.is_enabled || !app.external_app_id) {
    return Response.json({ error: `CPX Research is not configured for ${profile.country_code} on ${platform} yet.` }, { status: 503, headers: cors });
  }

  const secureHash = await md5(`${user.id}-${securityHash}`);
  const params = new URLSearchParams({
    app_id: app.external_app_id,
    ext_user_id: user.id,
    secure_hash: secureHash,
    username: profile.display_name || user.email || "Member",
    email: user.email || "",
    subid_1: "",
    subid_2: "",
  });
  return Response.json({
    providerEnabled: true,
    platform,
    countryCode: profile.country_code,
    iframeUrl: `https://offers.cpx-research.com/index.php?${params.toString()}`,
  }, { headers: { ...cors, "Cache-Control": "no-store" } });
});
