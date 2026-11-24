# Step 06 — Earn Center and CPX Research

## Implemented in source
- Member-facing Earn Center route and dashboard navigation.
- Supabase Edge Function `cpx-wall-config`.
- The function requires a valid Supabase access token, checks the member profile is active, and checks both `reward_providers.is_enabled` and the matching web `provider_apps.is_enabled` row for the member's country.
- CPX wall MD5 hash is generated server-side; the app security hash is never exposed to browser code.
- Iframe is not rendered when configuration is unavailable.
- The UI explains that opening a survey is not itself proof of a credited reward.

## Configuration still required
Set these Supabase Edge Function secrets: `CPX_SECURE_HASH` (the regenerated CPX app security hash) and `WEB_ORIGIN` (the exact standalone website origin; comma-separated exact origins are accepted for multiple approved frontends). Supabase provides `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions in the normal hosted environment. The function no longer reads a separate `CPX_APP_ID` secret: it obtains the app ID from the Admin-managed `provider_apps` row matching platform `web` and the signed-in member's country.

In Admin > Reward Providers, configure the CPX provider and its web/country app mapping. Keep both disabled until callback processing has been deployed and tested. The provider mapping writes to the existing `provider_apps` table used by this Edge Function.

## Critical status
The CPX provider and app should remain disabled. This step does NOT implement or validate the signed CPX postback, reward ledger credit, duplicate callback handling, or 15–60 day reversal handling. Therefore real survey rewards must not be advertised as operational and the CPX database flags must not be enabled yet.

## CORS and configuration security
The function rejects missing/unlisted browser origins; `WEB_ORIGIN` must contain exact origins and must not be `*`. Provider app IDs are selected by country to avoid cross-country app configuration leakage.

## Verification
Source files were added and integrated. No live Supabase deployment or provider callback test was performed. Build/browser checks remain pending because dependency installation was not completed in the prior execution environment.
