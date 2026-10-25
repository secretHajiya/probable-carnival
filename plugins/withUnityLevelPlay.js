const { withAppBuildGradle } = require('@expo/config-plugins');

const LEVELPLAY_ANDROID_DEPENDENCIES = [
  "implementation 'com.google.android.gms:play-services-appset:16.0.2'",
  "implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'",
  "implementation 'com.google.android.gms:play-services-basement:18.3.0'",
];

module.exports = function withUnityLevelPlay(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;
    const missing = LEVELPLAY_ANDROID_DEPENDENCIES.filter((dependency) => {
      const coordinate = dependency.match(/com\.google\.android\.gms:([^:]+):/);
      return coordinate && !contents.includes(coordinate[1]);
    });

    if (missing.length) {
      if (/dependencies\s*\{/.test(contents)) {
        contents = contents.replace(
          /dependencies\s*\{/,
          (match) => `${match}\n${missing.map((item) => `    ${item}`).join('\n')}`
        );
      } else {
        contents += `\ndependencies {\n${missing.map((item) => `    ${item}`).join('\n')}\n}\n`;
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};