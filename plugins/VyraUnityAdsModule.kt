package __PACKAGE__.unityads

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.unity3d.ads.IUnityAdsInitializationListener
import com.unity3d.ads.IUnityAdsLoadListener
import com.unity3d.ads.IUnityAdsShowListener
import com.unity3d.ads.UnityAds
import com.unity3d.ads.UnityAdsShowOptions
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

/** Sends events to JS. Event name is fixed: "VyraUnityAdsEvent". */
object VyraUnityEvents {
    const val EVENT_NAME = "VyraUnityAdsEvent"

    fun emit(rc: ReactContext?, type: String, placementId: String?, extra: (WritableMap.() -> Unit)? = null) {
        try {
            if (rc == null || !rc.hasActiveReactInstance()) return
            val map = Arguments.createMap()
            map.putString("type", type)
            map.putString("placementId", placementId)
            extra?.invoke(map)
            rc.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_NAME, map)
        } catch (_: Throwable) {
            // Never let an event-delivery problem crash the app.
        }
    }
}

/**
 * Real bridge to the Unity Ads Classic SDK (com.unity3d.ads:unity-ads 4.x).
 * Only documented SDK calls are used: UnityAds.initialize / isInitialized / load / show.
 */
class VyraUnityAdsModule(private val rc: ReactApplicationContext) : ReactContextBaseJavaModule(rc) {

    private val loadedPlacements = ConcurrentHashMap.newKeySet<String>()
    private val loadingPlacements = ConcurrentHashMap.newKeySet<String>()
    private val fullscreenShowing = AtomicBoolean(false)

    private val initLock = Any()
    private var initializing = false
    private val pendingInitPromises = mutableListOf<Promise>()

    override fun getName(): String = "VyraUnityAds"

    // Required so NativeEventEmitter does not warn.
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    @ReactMethod
    fun isInitialized(promise: Promise) {
        promise.resolve(UnityAds.isInitialized())
    }

    @ReactMethod
    fun initialize(gameId: String, testMode: Boolean, promise: Promise) {
        if (UnityAds.isInitialized()) {
            promise.resolve(true)
            return
        }
        synchronized(initLock) {
            pendingInitPromises.add(promise)
            if (initializing) return
            initializing = true
        }
        try {
            UnityAds.initialize(rc.applicationContext, gameId, testMode, object : IUnityAdsInitializationListener {
                override fun onInitializationComplete() {
                    settleInit(null, null)
                    VyraUnityEvents.emit(rc, "initComplete", null)
                }

                override fun onInitializationFailed(error: UnityAds.UnityAdsInitializationError?, message: String?) {
                    settleInit(error?.name ?: "UNKNOWN", message ?: "")
                    VyraUnityEvents.emit(rc, "initFailed", null) {
                        putString("error", error?.name ?: "UNKNOWN")
                        putString("message", message ?: "")
                    }
                }
            })
        } catch (t: Throwable) {
            settleInit("EXCEPTION", t.message ?: t.javaClass.simpleName)
        }
    }

    private fun settleInit(errorName: String?, message: String?) {
        val toSettle: List<Promise>
        synchronized(initLock) {
            toSettle = pendingInitPromises.toList()
            pendingInitPromises.clear()
            initializing = false
        }
        for (p in toSettle) {
            if (errorName == null) p.resolve(true)
            else p.reject("E_UNITY_INIT", "$errorName: $message")
        }
    }

    @ReactMethod
    fun loadAd(placementId: String, promise: Promise) {
        if (!UnityAds.isInitialized()) {
            promise.reject("E_NOT_INITIALIZED", "Unity Ads is not initialized yet.")
            return
        }
        if (loadedPlacements.contains(placementId)) {
            promise.resolve(true)
            return
        }
        if (!loadingPlacements.add(placementId)) {
            promise.reject("E_LOAD_IN_PROGRESS", "A load for $placementId is already in progress.")
            return
        }
        try {
            UnityAds.load(placementId, object : IUnityAdsLoadListener {
                override fun onUnityAdsAdLoaded(placement: String?) {
                    loadingPlacements.remove(placementId)
                    loadedPlacements.add(placementId)
                    VyraUnityEvents.emit(rc, "loaded", placementId)
                    promise.resolve(true)
                }

                override fun onUnityAdsFailedToLoad(
                    placement: String?,
                    error: UnityAds.UnityAdsLoadError?,
                    message: String?
                ) {
                    loadingPlacements.remove(placementId)
                    loadedPlacements.remove(placementId)
                    VyraUnityEvents.emit(rc, "loadFailed", placementId) {
                        putString("error", error?.name ?: "UNKNOWN")
                        putString("message", message ?: "")
                    }
                    promise.reject("E_LOAD_FAILED", "${error?.name ?: "UNKNOWN"}: ${message ?: ""}")
                }
            })
        } catch (t: Throwable) {
            loadingPlacements.remove(placementId)
            promise.reject("E_LOAD_EXCEPTION", t.message ?: t.javaClass.simpleName)
        }
    }

    /**
     * Shows a loaded placement. The promise settles exactly once:
     *  - resolves { showId, placementId, completionState: "COMPLETED" | "SKIPPED" }
     *  - rejects with E_NOT_READY / E_SHOW_FAILED / ...
     * JS must grant a reward ONLY when completionState === "COMPLETED".
     */
    @ReactMethod
    fun showAd(placementId: String, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("E_NO_ACTIVITY", "No foreground Activity available to show the ad.")
            return
        }
        if (!UnityAds.isInitialized()) {
            promise.reject("E_NOT_INITIALIZED", "Unity Ads is not initialized yet.")
            return
        }
        if (!loadedPlacements.contains(placementId)) {
            promise.reject("E_NOT_READY", "$placementId is not loaded.")
            return
        }
        if (!fullscreenShowing.compareAndSet(false, true)) {
            promise.reject("E_SHOW_IN_PROGRESS", "Another ad is already being shown.")
            return
        }

        // A placement can be shown once per load.
        loadedPlacements.remove(placementId)
        val showId = UUID.randomUUID().toString()
        val settled = AtomicBoolean(false)

        UiThreadUtil.runOnUiThread {
            try {
                UnityAds.show(activity, placementId, UnityAdsShowOptions(), object : IUnityAdsShowListener {
                    override fun onUnityAdsShowFailure(
                        placement: String?,
                        error: UnityAds.UnityAdsShowError?,
                        message: String?
                    ) {
                        fullscreenShowing.set(false)
                        VyraUnityEvents.emit(rc, "showFailed", placementId) {
                            putString("showId", showId)
                            putString("error", error?.name ?: "UNKNOWN")
                            putString("message", message ?: "")
                        }
                        if (settled.compareAndSet(false, true)) {
                            promise.reject("E_SHOW_FAILED", "${error?.name ?: "UNKNOWN"}: ${message ?: ""}")
                        }
                    }

                    override fun onUnityAdsShowStart(placement: String?) {
                        VyraUnityEvents.emit(rc, "showStart", placementId) { putString("showId", showId) }
                    }

                    override fun onUnityAdsShowClick(placement: String?) {
                        VyraUnityEvents.emit(rc, "showClick", placementId) { putString("showId", showId) }
                    }

                    override fun onUnityAdsShowComplete(
                        placement: String?,
                        state: UnityAds.UnityAdsShowCompletionState?
                    ) {
                        fullscreenShowing.set(false)
                        val stateName = state?.name ?: "UNKNOWN"
                        VyraUnityEvents.emit(rc, "showComplete", placementId) {
                            putString("showId", showId)
                            putString("completionState", stateName)
                        }
                        if (settled.compareAndSet(false, true)) {
                            val result = Arguments.createMap()
                            result.putString("showId", showId)
                            result.putString("placementId", placementId)
                            result.putString("completionState", stateName)
                            promise.resolve(result)
                        }
                    }
                })
            } catch (t: Throwable) {
                fullscreenShowing.set(false)
                if (settled.compareAndSet(false, true)) {
                    promise.reject("E_SHOW_EXCEPTION", t.message ?: t.javaClass.simpleName)
                }
            }
        }
    }

    override fun invalidate() {
        loadedPlacements.clear()
        loadingPlacements.clear()
        fullscreenShowing.set(false)
        super.invalidate()
    }
}
