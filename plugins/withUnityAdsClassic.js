/**
 * Expo config plugin: Unity Ads Classic (com.unity3d.ads:unity-ads) native integration.
 * FIXED - No external folder needed - Banner fix for 4.12.2
 */
const fs = require('fs');
const path = require('path');
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withMainApplication,
  withDangerousMod,
} = require('@expo/config-plugins');

const UNITY_ADS_VERSION = '4.12.2';
const UNITY_ADS_DEPENDENCY = `implementation("com.unity3d.ads:unity-ads:${UNITY_ADS_VERSION}")`;
const NATIVE_SUBPACKAGE = 'unityads';
const NATIVE_FILES = {
  'VyraUnityAdsModule.kt': `
package __PACKAGE__.unityads
import com.facebook.react.bridge.*
import com.unity3d.ads.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class VyraUnityAdsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "VyraUnityAds"
    private fun sendEvent(type: String, placementId: String) {
        val map = Arguments.createMap()
        map.putString("type", type)
        map.putString("placementId", placementId)
        reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit("VyraUnityAdsEvent", map)
    }
    @ReactMethod
    fun initialize(gameId: String, testMode: Boolean, promise: Promise) {
        if (UnityAds.isInitialized) { promise.resolve(true); return }
        UnityAds.initialize(reactApplicationContext, gameId, testMode, object : IUnityAdsInitializationListener {
            override fun onInitializationComplete() { promise.resolve(true) }
            override fun onInitializationFailed(error: UnityAds.UnityAdsInitializationError, msg: String) { promise.reject(error.toString(), msg) }
        })
    }
    @ReactMethod
    fun loadAd(placementId: String, promise: Promise) {
        UnityAds.load(placementId, object : IUnityAdsLoadListener {
            override fun onUnityAdsAdLoaded(p: String) { sendEvent("loaded", p); promise.resolve(true) }
            override fun onUnityAdsFailedToLoad(p: String, error: UnityAds.UnityAdsLoadError, msg: String) { sendEvent("loadFailed", p); promise.reject("LOAD_FAILED", msg) }
        })
    }
    @ReactMethod
    fun showAd(placementId: String, promise: Promise) {
        UnityAds.show(currentActivity, placementId, object : IUnityAdsShowListener {
            override fun onUnityAdsShowComplete(p: String, state: UnityAds.UnityAdsShowCompletionState) {
                val map = Arguments.createMap()
                map.putString("completionState", state.name)
                promise.resolve(map)
            }
            override fun onUnityAdsShowFailure(p: String, error: UnityAds.UnityAdsShowError, msg: String) { promise.reject("SHOW_FAILED", msg) }
            override fun onUnityAdsShowStart(p: String) {}
            override fun onUnityAdsShowClick(p: String) {}
        })
    }
}
`,
  'VyraUnityAdsPackage.kt': `
package __PACKAGE__.unityads
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
class VyraUnityAdsPackage : ReactPackage {
    override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> = listOf(VyraUnityAdsModule(ctx))
    override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> = listOf(VyraUnityBannerManager())
}
`,
  'VyraUnityBannerManager.kt': `
package __PACKAGE__.unityads
import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize

class VyraUnityBannerManager : SimpleViewManager<FrameLayout>() {
    override fun getName() = "VyraUnityBanner"
    override fun createViewInstance(ctx: ThemedReactContext): FrameLayout {
        return FrameLayout(ctx)
    }
    @ReactProp(name = "placementId")
    fun setPlacementId(view: FrameLayout, id: String) {
        view.removeAllViews()
        try {
            val activity = view.context as? android.app.Activity ?: return
            val bannerView = BannerView(activity, id, UnityBannerSize(320, 50))
            view.addView(bannerView)
            bannerView.load()
        } catch (e: Exception) {}
    }
    @ReactProp(name = "bannerWidth") fun setW(view: FrameLayout, w: Int) {}
    @ReactProp(name = "bannerHeight") fun setH(view: FrameLayout, h: Int) {}
}
`
};

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
  config = withProjectBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;
    if (!/mavenCentral\(\)/.test(contents)) {
      const re = /(allprojects\s*\{\s*repositories\s*\{)/;
      if (re.test(contents)) {
        contents = contents.replace(re, '$1\n        mavenCentral()');
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
      const destDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java',
        ...pkg.split('.'),
        NATIVE_SUBPACKAGE
      );
      fs.mkdirSync(destDir, { recursive: true });
      for (const file of Object.keys(NATIVE_FILES)) {
        const template = NATIVE_FILES[file];
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
    if (contents.includes('VyraUnityAdsPackage')) return cfg;
    contents = contents.replace(/^(package .+\n)/m, `$1\nimport ${importLine}${isKotlin ? '' : ';'}\n`);
    if (isKotlin) {
      const applyRe = /(PackageList\(this\)\.packages\.apply\s*\{)/;
      const returnRe = /return\s+PackageList\(this\)\.packages(?![\w.])/;
      if (applyRe.test(contents)) {
        contents = contents.replace(applyRe, '$1\n              add(VyraUnityAdsPackage())');
      } else if (returnRe.test(contents)) {
        contents = contents.replace(returnRe, 'return PackageList(this).packages.toMutableList().apply { add(VyraUnityAdsPackage()) }');
      }
    } else {
      const re = /(List<ReactPackage>\s+packages\s*=\s*new PackageList\(this\)\.getPackages\(\);)/;
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