# Step 18 — Unity LevelPlay: Rewarded, Interstitial and Banner

## What changed in this source package

- Extended the audited LevelPlay admin settings to configure Rewarded Video, Interstitial and Banner independently.
- Added Supabase migration `028_levelplay_interstitial_banner.sql`, additive to migrations 026 and 027.
- Added public, authenticated mobile runtime fields for each ad format. The member RPC returns SDK identifiers and enabled flags only; it does not expose coin conversion values, audit data or S2S secrets.
- Kept Rewarded Video crediting exclusively on the existing verified Cloudflare S2S callback. The mobile callback remains informational and never credits a wallet.
- Added Interstitial loading and a five-minute local display cooldown. It is only considered when the member deliberately leaves the Earn tab; it never blocks navigation if unavailable.
- Added a standard 320 × 50 Banner panel on the Earn screen. The banner is created after SDK initialization and destroyed when its panel unmounts.
- CPX callback source and configuration were not edited by this step.

## Owner-provided identifiers prefilled by migration 028

| Format | Ad Unit ID | Placement |
|---|---|---|
| Rewarded | `q18qwpr5ofs8gi84` | `BP_Rewarded_Android` |
| Interstitial | `t59334kmc1nzmzuv` | `BP_Interstitial_Android` |
| Banner | `q7hv6pyis1rd4v9x` | `BP_Banner_Android` |

The three formats remain disabled by default. Migration 028 does not populate or guess the Unity App Key. The Unity App ID `29c8c808d` is not assumed to be the App Key.

## Database migration order and production status

Apply in order only after reviewing the SQL in the Supabase SQL Editor:

1. `026_levelplay_rewarded_s2s.sql`
2. `027_levelplay_mobile_runtime_config.sql`
3. `028_levelplay_interstitial_banner.sql`

Migration 027 and 028 are local source changes in this ZIP; they have **not** been applied to Production by this work. Do not enable any ad format until the correct Unity App Key, mediation network instances/adapters and live test ads are confirmed. Rewarded additionally requires the deployed and verified LevelPlay S2S Worker and its Cloudflare secrets.

## Secrets and external systems

- Never put `LEVELPLAY_S2S_PRIVATE_KEY` in Expo, React Native, the admin dashboard, SQL client-visible runtime config or GitHub.
- Keep the S2S private key only in Cloudflare Worker secrets. Rotate the key if it was exposed in a screenshot or chat.
- The CPX Cloudflare Worker is separate and was not modified.
- No Supabase migration, Cloudflare Worker or Unity dashboard change was deployed by creating this source ZIP.

## Verification scope

Static source checks cover migration/RPC fields, admin validation, authenticated runtime config, no client wallet credit, Interstitial cooldown/placement cap, Banner initialization and CPX source preservation. A native Android build, SDK runtime test, mediation-network fill test and device test have not been run in this environment.
