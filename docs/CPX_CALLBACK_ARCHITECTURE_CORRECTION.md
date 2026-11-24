# CPX callback architecture — important clarification

The active Production CPX reward callback is the Cloudflare Worker at `cloudflare/cpx-callback/`. It validates the CPX postback and calls the existing Supabase RPC `process_cpx_reward`. It is not a Supabase Edge Function.

The repository also contains `supabase/functions/cpx-wall-config/`. This is a separate authenticated configuration endpoint used by the member app to request the correct offerwall URL for its platform and country. It does not receive CPX reward postbacks and does not credit rewards.

`supabase/functions/cpx-postback/` is historical/staging code only. Do not deploy it as the Production callback, change the CPX postback URL, or replace the Cloudflare Worker without an explicit migration plan.

The mobile app never credits CPX coins when the user returns from the survey. Only the existing Cloudflare Worker -> `process_cpx_reward` path is authoritative for CPX reward credits, duplicates, and reversals.
