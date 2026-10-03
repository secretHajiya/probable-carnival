# Vyra Rewards Pro

## Build an Android APK

1. Create a GitHub repository and upload these project files.
2. On your computer or supportked terminal, install dependencies:
   `npm install`
3. Install EAS CLI:
   `npm install -g eas-cli`
4. Sign in:
   `eas login`
5. Configure the project:
   `eas build:configure`
6. Build an internal Android APK:
   `eas build -p android --profile preview`

## Important notes

- Android package: `com.vyrarewards.earn`
- Expo SDK: `~51.0.32`
- Google Mobile Ads uses your supplied production IDs when `__DEV__` is false and Google's `TestIds` during development.
- This project intentionally does not include Firebase or `google-services.json`.
- Native Google Mobile Ads requires a development build / EAS build; it does not run as a native ad integration inside standard Expo Go.
- Withdrawal requests are stored locally as pending requests. This starter app does not connect to a payout provider or verify referrals on a server. Do not promise or execute real payouts until you implement a secure backend, fraud checks, and operational review.
- Referral rewards are not automatically credited for a real referral; this requires server-side validation.
- The leaderboard is demo/static data.
