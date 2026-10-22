VYRA REWARDS PRO - FINAL README (v1.0.9 / 25)

PROJECT:
- Name: Vyra Rewards Pro
- Slug: vyra-rewards
- Package: com.vyrarewards.earn
- Version: 1.0.9 / versionCode: 24
- Owner: secretmadabos-team
- ProjectId: 1e622ff8-fa4d-40d5-9606-20f79ddfcc6f
- Firebase: vyra-rewards-pro

ADMOB - ALL SAME PUBLISHER 555038...:
- App ID: ca-app-pub-5550384127909882~7224847840 (in app.json plugins)
- Rewarded: ca-app-pub-5550384127909882/2946866491 (in App.js)
- Interstitial: ca-app-pub-5550384127909882/8282953653 (in App.js)
- Same publisher - ~ is App ID, / is Ad Unit ID - this is correct!

FILES:

1. app.json - FINAL version you sent. 1.0.9/24, package com.vyrarewards.earn, AdMob only in plugins, duplicate removed, projectId fa4d-40d5-9606-20f79ddfcc6f, minSdk 23, compileSdk 34, targetSdk 34, AD_ID permission
2. App.js - REWARDED 2946866491 + INTERSTITIAL 8282953653 + TestIds for dev anti-ban + BACKEND_URL https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev + CPX APP_ID 37222 HASH zq6KgHGIgOujXyncpghe4Nb1sIdDf0ph
3. package.json - MUST be "14.7.1" exact, NO ^ - fix for build fail (was installing 14.11.0)
4. eas.json - preview APK, production AAB, cache key vyra-1.0.9-24-fa4d
5. codemagic.yaml - KEEP mac_mini_m2 - it's FREE! linux_x2 also FREE and faster (10min vs 30min). Must have rm -rf android + expo prebuild --clean to delete duplicate
6. firebase.json - KEEP IT - for firebase deploy --only firestore
7. firestore.rules - anti-fraud, users cannot update balance, only Cloud Functions/Worker
8. wrangler.jsonc - Cloudflare FREE backend, D1 vyra-rewards-db 9ffa9187-3d77-4082-890d-d4648012e739
9. babel.config.js - babel-preset-expo

BUILD APK:

EAS (Recommended):
npm install
eas build --platform android --profile preview

Codemagic FREE:
Push to GitHub -> codemagic.yaml will run with mac_mini_m2 FREE -> APK at android/app/build/outputs/apk/release/app-release.apk

DEPLOY:
firebase deploy --only firestore
npx wrangler deploy

NOTES:
- All versions aligned 1.0.9/24 to prevent Version code already used error
- AdMob same publisher 555038... - ~7224 is App ID, /2946 and /8282 are Ad Units - correct structure
- No duplicate AdMob - build will succeed
