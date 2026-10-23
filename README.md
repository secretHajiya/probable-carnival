# Vyra Rewards Pro

Vyra Rewards Pro is an Expo / React Native Android rewards app. The
current `App.js` connects Firebase Authentication and Cloud Firestore,
includes a points wallet, tap-based activity, offers, CPX Research
survey access, referral features, withdrawal requests, app themes, and
Terms of Service / Privacy Policy screens.

> **Important:** This README documents the current app source. A feature
> shown in the interface does not by itself guarantee that an external
> service is configured, that a reward has been verified, or that a
> withdrawal will be paid.

## Project details

-   **App name:** Vyra Rewards Pro
-   **Android application ID:** `com.vyrarewards.earn`
-   **App version in source:** `1.0.9`
-   **Build label in source:** `27 NO ADMOB`
-   **Minimum withdrawal threshold:** `200,000 points`
-   **Displayed equivalent:** `₦5,000.00 / $5.00`
-   **Support email:** `vyraprosupport@gmail.com`

## Main features

-   Email/password registration and sign-in using Firebase
    Authentication.
-   Points and bonus balance display, with Naira and US-dollar display
    conversions.
-   Tap progress and activity tracking.
-   Offers list and proof-submission flow.
-   CPX Research survey offerwall displayed in an in-app WebView.
-   Referral code and referral statistics.
-   Withdrawal method selection, withdrawal amount and account details.
-   Four main navigation tabs: Home, Offers, Wallet, and Settings.
-   Multiple color themes.
-   Terms of Service and Privacy Policy screens.
-   Network connectivity handling and local persistence where
    implemented.

## Withdrawal values

The current source sets the following display conversion:

  Item                               Value
  --------------------------- ------------
  Minimum withdrawal points        200,000
  Minimum Naira equivalent       ₦5,000.00
  Minimum USD equivalent            \$5.00
  Naira per point                   ₦0.025
  USD per point                 \$0.000025

These are app display calculations, not a promise of payment or a live
exchange rate. Withdrawal requests may require backend review,
verification, and payment-provider setup.

## Withdrawal methods

The app's withdrawal-method selector lists:

1.  Bank Account (Bank Transfer)
2.  Opay
3.  PalmPay
4.  Moniepoint
5.  Kuda
6.  PayPal (USD)
7.  USDT (BEP20)
8.  Bitcoin (BTC)
9.  Ethereum (ETH)
10. Payoneer (USD)
11. Wise (USD)
12. Chipper Cash
13. Paga
14. Gift Card (USA)

Listing a method in the app does **not** mean that automatic payout
integration is complete. Confirm that the backend validates each method,
stores the required recipient details securely, reviews requests, and
completes payment before describing any method as live.

## Technology used

The current `App.js` imports these main libraries:

-   React and React Native
-   Expo-compatible React Native runtime
-   `@react-native-async-storage/async-storage`
-   `@react-native-community/netinfo`
-   `@react-navigation/native`
-   `@react-navigation/bottom-tabs`
-   `@react-navigation/stack`
-   Firebase (`firebase/app`, `firebase/auth`, `firebase/firestore`)
-   `react-native-webview`

Use the exact dependency versions already specified in your project's
`package.json`. Do not install arbitrary latest versions without
checking compatibility with the project's Expo SDK and React Native
version.

## Requirements

Before building, make sure the repository contains the complete project
files, including:

-   `App.js`
-   `package.json`
-   `app.json`
-   `eas.json` if using EAS Build
-   `babel.config.js`
-   `assets/icon.png` if referenced by `app.json`
-   Any other assets and configuration files referenced by the project

The app source alone is **not** a complete Expo project. Keep the
existing project configuration and lockfile, if present, unless you
intentionally update them.

## Install and run locally

1.  Install a compatible Node.js version for your Expo SDK.

2.  Open a terminal in the project root.

3.  Install dependencies using the package manager and lockfile used by
    the project. If the project uses npm and has a `package-lock.json`,
    run:

    ``` bash
    npm ci
    ```

    If there is no npm lockfile, use:

    ``` bash
    npm install
    ```

4.  Start Expo:

    ``` bash
    npx expo start
    ```

5.  Test registration, login, balance loading, offers, referrals,
    withdrawal validation, Terms, Privacy, and app navigation before
    making a release build.

## Build an Android APK

### Option A: Expo / EAS Build

If `eas.json` is configured for an APK build:

``` bash
npx expo install
npx eas-cli build --platform android --profile preview
```

Check that the selected EAS profile produces an **APK** rather than an
Android App Bundle (`.aab`). Build profile names and output formats
depend on the project's `eas.json`.

### Option B: Codemagic

Use the Codemagic workflow already configured in the repository. Verify
that it:

1.  Uses a Node.js version compatible with the project's Expo SDK.
2.  Installs dependencies successfully.
3.  Runs Expo prebuild only when the project is configured for that
    workflow.
4.  Runs the intended Gradle task (`assembleDebug` or
    `assembleRelease`).
5.  Saves the generated APK using the correct artifact path.

Do not replace the existing `codemagic.yaml` blindly. Review the current
project configuration and build logs if the workflow fails.

## Firebase configuration

The source initializes Firebase Authentication and Cloud Firestore.
Confirm that:

-   The Firebase project is the intended production project.
-   Email/password sign-in is enabled in Firebase Authentication.
-   Firestore security rules restrict users to their own records and
    allow only trusted server-side logic to grant or adjust points.
-   The Android package name matches `com.vyrarewards.earn` in Firebase
    and the app configuration.
-   Any Firebase Android configuration file required by your build is
    present and correctly referenced.

Firebase client configuration values are not substitutes for Firestore
security rules. Never trust a client-only balance update for real-money
rewards.

## Backend and rewards integrity

The app source references this backend endpoint:

`https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev`

Confirm that the backend is deployed, maintained, and validates
authenticated requests. In particular:

-   Award points on a trusted backend after verifying eligible activity.
-   Do not rely on client-side values as proof that a survey or offer
    has completed.
-   Verify offer proof before approving rewards.
-   Validate withdrawal amounts and account details on the server.
-   Add rate limiting, abuse prevention, and audit logging as
    appropriate.
-   Keep private API secrets on the server; do not embed them in
    `App.js` or an APK.

## CPX Research

The app opens CPX Research in a WebView using the configured app
identifier and user information. Survey completion and point crediting
depend on the CPX account setup and a correctly configured, secure
postback/backend integration. Opening the survey wall alone does not
verify completion or automatically guarantee points.

Before production use, confirm CPX's current integration requirements,
user identification, callback/postback security, and testing procedure
in your CPX Research account.

## Privacy and security

The app includes Terms of Service and Privacy Policy text. Before
publishing, ensure those statements match the services actually used and
the data actually collected.

-   Never commit passwords, private API tokens, signing keys, or
    service-account credentials to GitHub.
-   Review Firestore rules and backend authorization.
-   Request only necessary permissions.
-   Provide a working support contact at `vyraprosupport@gmail.com`.
-   Test account deletion and data-deletion requests end to end.
-   Follow applicable privacy, consumer, tax, and payment rules in the
    markets where the app is offered.

## Troubleshooting

### Metro / JavaScript bundle failure

-   Read the first JavaScript error above
    `Task :app:createBundleReleaseJsAndAssets FAILED`.
-   Confirm all imports in `App.js` exist in `package.json`.
-   Run `npx expo-doctor` and resolve compatibility issues before
    rebuilding.
-   Avoid mixing dependency versions from different Expo SDK releases.

### Android Gradle or Kotlin failure

-   Check the first actual compiler error in the build log.
-   Use the Gradle, Android Gradle Plugin, Java, Kotlin, Expo, and React
    Native versions supported by the project's SDK.
-   Do not upgrade Kotlin or Gradle in isolation unless the full
    dependency set supports the change.

### Login or balance problems

-   Confirm Firebase Authentication and Firestore are enabled.
-   Check Firestore rules, network access, and the user's authenticated
    UID.
-   Review backend logs for rejected requests.
-   Do not manually edit a production user's balance to work around a
    client error.

### Withdrawal request not completed

-   Confirm the request reached the backend and was accepted.
-   Check server-side minimum balance validation, method validation,
    recipient details, review status, and payment-provider integration.
-   A successful in-app request submission is not proof that money has
    been transferred.

## Support

For app support, contact: **vyraprosupport@gmail.com**

## License

No open-source license is specified in this README. Unless the project
owner adds a license, do not assume the code is licensed for reuse or
redistribution.
