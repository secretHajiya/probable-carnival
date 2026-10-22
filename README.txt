VYRA REWARDS PRO — FINAL README

Version: 1.0.9
Android versionCode: 25
Build: 27 (UI build label; confirm separately from Android versionCode)

1. Project Information

- App name: Vyra Rewards Pro
- Slug: "vyra-rewards"
- Package name: "com.vyrarewards.earn"
- Expo owner: "secretmadabos-team"
- EAS Project ID: "1e622ff8-fa4d-40d5-9606-20f79ddfcc6f"
- Firebase project: "vyra-rewards-pro"

2. Technology Stack

- Expo SDK: "~51.0.0"
- React: "18.2.0"
- React Native: "0.74.5"
- React Native Google Mobile Ads: "14.7.1"
- Firebase: "10.12.0"
- React Native WebView: "13.8.6"
- Expo Build Properties: "~0.12.1"
- Babel preset Expo: "~11.0.0"

3. Android Configuration

- Minimum SDK: 23
- Compile SDK: 34
- Target SDK: 34
- Internet permission: enabled
- Network state permission: enabled
- Advertising ID permission: enabled
- Google Services file: "./google-services.json"

4. AdMob Configuration

App ID configured in "app.json":

"ca-app-pub-4487679675698542~6782759052"

Ad unit IDs reported for "App.js":

- Rewarded: "ca-app-pub-4487679675698542/4561195480"
- Interstitial: "ca-app-pub-4487679675698542/2617558428"

Confirm these IDs against the intended AdMob account before production release. Test ads should be used during development and testing.

5. Backend and Surveys

- Cloudflare Worker URL: "https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev"
- CPX Research App ID: "37222"
- CPX Research hash: configured in the existing project; keep it private.
- Firebase project: "vyra-rewards-pro"

Keep backend secrets and verification logic on the server where possible. Do not expose private API secrets in a public repository or client application.

6. Important Project Files

- "App.js" — React Native application interface and app logic
- "app.json" — Expo and Android configuration
- "package.json" — dependencies and scripts
- "eas.json" — EAS build profiles
- "codemagic.yaml" — Codemagic CI configuration, if present
- "firebase.json" — Firebase deployment configuration, if present
- "firestore.rules" — Firestore security rules, if present
- "wrangler.jsonc" — Cloudflare Worker configuration, if present
- "babel.config.js" — Babel configuration
- "google-services.json" — Firebase Android configuration

7. Install Dependencies

npm install

The project specifies "react-native-google-mobile-ads" as the exact version "14.7.1", without a version range prefix.

8. Build APK with EAS

npx eas-cli build --platform android --profile preview

Ensure the "preview" profile in "eas.json" specifies Android APK output.

For a production Android App Bundle:

npx eas-cli build --platform android --profile production

Ensure the "production" profile specifies Android App Bundle output.

9. Deployment

Deploy Firestore rules, if the project is configured for them:

firebase deploy --only firestore:rules

Deploy the Cloudflare Worker from the directory containing its configuration:

npx wrangler deploy

10. Release Checklist

- Confirm the app package and EAS project ID.
- Verify the Firebase configuration file belongs to the intended project.
- Verify the AdMob App ID and ad unit IDs.
- Check EmailJS OTP template variables and verify that the actual code appears in the email.
- Test registration, OTP verification, ads, surveys, wallet, and withdrawal flows.
- Confirm backend validation and Firestore security rules.
- Increment Android "versionCode" for each new Android release uploaded to a store.
- Run a clean build and test the resulting APK/AAB before release.

11. Verification Notes

This README reflects the supplied "app.json" and "package.json", plus the backend and ad-unit details provided for this project. It does not by itself confirm that the current source compiles, that EmailJS displays the OTP correctly, or that the live ad units are approved and serving ads.