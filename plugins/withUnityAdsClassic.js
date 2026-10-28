/**
 * Expo config plugin: Unity Ads Classic (com.unity3d.ads:unity-ads) native integration.
 *
 * It (1) adds the Unity Ads Gradle dependency, (2) makes sure mavenCentral() is present,
 * (3) copies the Kotlin bridge in ./unity-ads-native into the generated android project, and
 * (4) registers VyraUnityAdsPackage in MainApplication.
 * It replaces the old LevelPlay plugin. No LevelPlay / mediation code is used.
 */
const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');

// Unity Ads Classic SDK version (Maven Central). Change here if you want to bump it.
const UNITY_ADS_VERSION = '4.12.2';
const UNITY_ADS_DEPENDENCY = `implementation("com.unity3d.ads:unity-ads:${UNITY_ADS_VERSION}")`;
const NATIVE_SUBPACKAGE = 'unityads';
const NATIVE_FILES = [
  'VyraUnityAdsModule.kt',
  'VyraUnityAdsPackage.kt',
  'VyraUnityBannerManager.kt',
];

function getPackageName(config) {
  const pkg = config.android && config.android.package;
  if (!pkg) throw new Error('[withUnityAdsClassic] android.package is missing in app.json');
  return pkg;
}

function withUnityAdsGradle(config) {
  config = withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!contents.includes('com.unity3d.ads:unity-ads')) {
      if (/^dependencies\s*\{/m.test(contents)) {
        contents = contents.replace(/^dependencies\s*\{/m, (m) => `${m}\n    ${UNITY_ADS_DEPENDENCY}`);
      } else {
        contents += `\ndependencies {\n    ${UNITY_ADS_DEPENDENCY}\n}\n`;
      }
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  // The default Expo/RN template already has mavenCentral(); make sure of it.
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!/mavenCentral\(\)/.test(contents)) {
      const re = /(allprojects\s*\{\s*repositories\s*\{)/;
      if (re.test(contents)) {
        contents = contents.replace(re, '$1\n        mavenCentral()');
      } else {
        console.warn('[withUnityAdsClassic] Could not find allprojects.repositories; verify mavenCentral() is present.');
      }
    }
    cfg.modResults.contents = contents;
    return cfg;
  });

  return config;
}

function withUnityAdsNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const pkg = getPackageName(cfg);
      const srcDir = path.join(__dirname, 'unity-ads-native');
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java',
        ...pkg.split('.'),
        NATIVE_SUBPACKAGE
      );
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of NATIVE_FILES) {
        const template = fs.readFileSync(path.join(srcDir, file), 'utf8');
        fs.writeFileSync(path.join(destDir, file), template.replace(/__PACKAGE__/g, pkg));
      }
      return cfg;
    },
  ]);
}

function withUnityAdsMainApplication(config) {
  return withMainApplication(config, (cfg) => {
    const pkg = getPackageName(cfg);
    const importLine = `${pkg}.${NATIVE_SUBPACKAGE}.VyraUnityAdsPackage`;
    let contents = cfg.modResults.contents;
    const isKotlin = cfg.modResults.language === 'kt';

    if (contents.includes('VyraUnityAdsPackage')) return cfg; // already patched

    // import
    contents = contents.replace(/^(package .+\n)/m, `$1\nimport ${importLine}${isKotlin ? '' : ';'}\n`);

    // registration
    if (isKotlin) {
      const applyRe = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      const returnRe = /return\s+PackageList\(this\)\.packages(?![\w.])/;
      if (applyRe.test(contents)) {
        // RN template style: PackageList(this).packages.apply { ... }
        contents = contents.replace(applyRe, '$1\n              add(VyraUnityAdsPackage())');
      } else if (returnRe.test(contents)) {
        // Expo template style: return PackageList(this).packages
        contents = contents.replace(
          returnRe,
          'return PackageList(this).packages.toMutableList().apply { add(VyraUnityAdsPackage()) }'
        );
      } else {
        throw new Error('[withUnityAdsClassic] Could not find where PackageList is built in MainApplication.kt');
      }
    } else {
      const re = /(List<ReactPackage>\s+packages\s*=\s*new PackageList\(this\)\.getPackages\(\);)/;
      if (!re.test(contents)) {
        throw new Error('[withUnityAdsClassic] Could not find PackageList in MainApplication.java');
      }
      contents = contents.replace(re, '$1\n      packages.add(new VyraUnityAdsPackage());');
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = function withUnityAdsClassic(config) {
  config = withUnityAdsGradle(config);
  config = withUnityAdsNativeFiles(config);
  config = withUnityAdsMainApplication(config);
  return config;
};
