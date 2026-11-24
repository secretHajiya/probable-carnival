# CPX Research Android integration — Step 05

## What changed
- The native app requests a short-lived offerwall URL from the authenticated `cpx-wall-config` Supabase Edge Function.
- The request explicitly asks for `platform: android`; the function reads the country from the authenticated member profile and only selects the matching `provider_apps` row.
- The app validates HTTPS and the exact `offers.cpx-research.com` host before opening the offerwall.
- On return to the app, the wallet snapshot is refreshed. The app never credits coins from the client-side return event.
- The existing Cloudflare CPX callback Worker remains the reward authority and was not modified.

## Required backend configuration
1. Deploy the updated `supabase/functions/cpx-wall-config` function.
2. Confirm the `CPX_SECURE_HASH` secret is configured for that function. Never put it in the mobile app.
3. In Admin > Reward Providers, configure an `android` `provider_apps` mapping for CPX for the applicable country, and enable it only after confirming the CPX Android app ID and testing the callback. Do not assume the existing web mapping automatically applies to Android.
4. Keep unsupported countries unavailable. The existing Nigeria app ID `37222` must only be used for Android if CPX confirms that this same app ID is valid for the Android distribution. No US app ID is assumed.
5. Keep the existing Cloudflare Worker URL, CPX secrets, IP allowlist, signature verification, duplicate protection, and reversal behavior unchanged.

## Important
- The offerwall opens in the device's external browser for this first native integration pass. An embedded native WebView is a separate UX enhancement and is not claimed here.
- Returning from the browser triggers a wallet refresh only; it does not prove a reward was earned.
- CPX provider and platform mapping remain controlled by Admin. No SQL migration is introduced in this step.
- Withdrawals remain disabled; Spin & Win and Quiz remain disabled by default; Unity LevelPlay remains pending its own server-to-server reward flow.

## Validation status
Source and ZIP structure checks only. No Edge Function deployment, Supabase live call, CPX test offer, Android build, or physical-device test was run in this environment.
