VYRA REWARDS.EARN — UPDATED SOURCE PACKAGE

Included:
- App.js: updated React Native app source
- app.json: Expo and Android / AdMob settings
- package.json: dependency versions pinned, including react-native-google-mobile-ads 14.7.1
- babel.config.js: Expo Babel preset
- eas.json: EAS preview APK and production AAB profiles
- codemagic.yaml: Codemagic Android APK build workflow

Important findings from the previously supplied build log:
The previous build failed while compiling react-native-google-mobile-ads. The log shows the installed package was 14.11.0 even though package.json used ^14.7.1. The caret allowed npm to install a newer version. This package now pins 14.7.1 exactly to prevent that automatic version jump. This is a targeted compatibility fix, not proof that the build will succeed.

Before building:
1. Run npm install --legacy-peer-deps.
2. Run npx expo prebuild --platform android --non-interactive.
3. Build with ./gradlew --no-daemon assembleRelease from the android directory, or use the included Codemagic workflow.
4. If your project has an app icon or other assets, add them back and configure their paths in app.json; this package intentionally omits a missing icon path so prebuild is not blocked by a file that was not supplied.

Prototype limitations:
- OTP is demo-only and does not send SMS or email.
- Tasks, referrals, and surveys are placeholders and do not verify completion.
- Withdrawals and cash payouts are not enabled.
- Do not enable real payouts until a trusted backend/provider verifies tasks and transactions.
- Confirm AdMob policy compliance before publishing. Use test ads during development.

The source/configuration package has not been built or tested in this environment. Build success is not guaranteed until Codemagic or a local Android build completes successfully.
