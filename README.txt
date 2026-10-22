VYRA REWARDS PRO — README (v1.0.9 / BUILD 27)
================================================

PROJECT
-------
App name: Vyra Rewards Pro
Slug: vyra-rewards (provided project information; verify in app.json)
React Native / Expo app
App.js displayed version: 1.0.9
App.js displayed build: 27

IMPORTANT VERSION NOTE
----------------------
The supplied App.js shows VERSION = 1.0.9 and BUILD = 27.
The older notes saying versionCode 24 / Build 25 do not match this App.js.
Android versionCode is configured in app.json and is NOT included in this ZIP,
so check app.json before building. Do not assume versionCode is 27 unless
app.json actually says so.

BACKEND / SERVICES (read from App.js)
-------------------------------------
Firebase project ID: vyra-rewards-pro
Cloudflare Worker backend:
https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev

CPX Research:
App ID / hidden global value: 37222
Hash: zq6KgHGIgOujXyncpghe4Nb1sIdDf0ph

EmailJS:
Service ID: service_eo4mafe
OTP template ID: template_vla0zff
Notification template ID: template_8u8r9r9
Public key: Ee45lolv3ZCjOSWUy

OTP NOTE
--------
App.js sends these template parameters for the OTP email:
to_email, to_name, otp, otp_code, code, verification_code, app_name.
The EmailJS template must include the matching variable, for example {{otp}}.
Sending multiple possible parameter names does not guarantee that the code
appears in the email; the actual template must use one of the variables above.
The email must be tested in EmailJS and on-device before claiming OTP is fixed.

ADMOB
-----
The App.js in this Build 27 ZIP contains the following publisher / ad-unit IDs:
Banner:               ca-app-pub-4487679675698542/9735385137
Rewarded:             ca-app-pub-4487679675698542/4561195480
Interstitial:         ca-app-pub-4487679675698542/2617558428
Rewarded Interstitial:ca-app-pub-4487679675698542/2234415047
App Open:             ca-app-pub-4487679675698542/6005848843

AdMob test ads:
USE_TEST_ADS = true in App.js. The ad-unit constants above are listed in the
source, but TestIds are selected while USE_TEST_ADS is true. This is intended
for testing, not a production monetization build.

The older README listed a different publisher (5550384127909882) and different
ad-unit IDs. That older AdMob information does NOT match this App.js.
The AdMob App ID configured in app.json cannot be verified from this ZIP because
app.json is not included. Confirm it belongs to the same AdMob app/publisher
before building.

FILES INCLUDED IN THIS ZIP
--------------------------
1. App.js — React Native / Expo application source.
2. README.txt — this documentation.

Files NOT included in this ZIP
------------------------------
app.json, package.json, eas.json, codemagic.yaml, firebase.json,
firestore.rules, wrangler.jsonc, babel.config.js, and CpxOfferwall.js are not
included here. Their settings and presence cannot be confirmed from this ZIP.

PACKAGE / BUILD REQUIREMENTS
----------------------------
The older README says react-native-google-mobile-ads must be exactly 14.7.1
without a caret. This ZIP does not contain package.json, so that dependency
version cannot be verified here. Check package.json and the Expo SDK compatibility
before installing or building; do not assume the old package instruction is
correct without checking the project's actual dependency set.

Suggested EAS APK build (only after app.json/package.json are verified):
  npm install
  eas build --platform android --profile preview

For production, verify the production profile and Android application ID,
versionCode, AdMob App ID, and real ad-unit configuration before uploading.

CURRENT BUILD STATUS
--------------------
This source was statically inspected only. No EAS/Gradle build or on-device
test has been performed for this ZIP. Verify login/register, EmailJS OTP,
reward-ad reward callbacks, CPX, wallet/withdrawal, and theme persistence before
publishing.

UI UPDATE IN BUILD 27
---------------------
- Gold, Light, and Dark themes
- Daily Streak display (UI only; automatic backend rewards are not implemented
  by this UI change)
- Native Share action for Refer & Earn
- Top Earners section placeholder (not a live verified leaderboard)
- Earn More with Surveys card directing users to Offers / CPX Research