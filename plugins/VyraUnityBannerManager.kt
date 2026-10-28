package __PACKAGE__.unityads

import android.view.Gravity
import android.view.View
import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.unity3d.ads.UnityAds
import com.unity3d.services.banners.BannerView
import com.unity3d.services.banners.UnityBannerSize
import java.lang.reflect.Proxy

/**
 * Hosts one Unity Ads Classic BannerView. React Native does not re-measure native children
 * on its own, so requestLayout() is overridden to lay the child out manually.
 */
class UnityBannerContainer(private val rc: ThemedReactContext) : FrameLayout(rc) {

    var placementId: String? = null
    var bannerWidth: Int = 320
    var bannerHeight: Int = 50

    private var banner: BannerView? = null
    private var loadedKey: String? = null

    private val relayout = Runnable {
        measure(
            View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }

    override fun requestLayout() {
        super.requestLayout()
        post(relayout)
    }

    fun loadIfNeeded() {
        val pid = placementId ?: return
        val key = "$pid:$bannerWidth:$bannerHeight"
        if (key == loadedKey) return

        val activity = rc.currentActivity
        if (activity == null || !UnityAds.isInitialized()) {
            VyraUnityEvents.emit(rc, "bannerFailed", pid) {
                putString("message", "Activity unavailable or Unity Ads not initialized")
            }
            return
        }

        destroyBanner()
        loadedKey = key
        try {
            val view = BannerView(activity, pid, UnityBannerSize(bannerWidth, bannerHeight))
            // BannerView.IListener is implemented with a dynamic proxy so this file does not depend on
            // which optional callbacks (e.g. onBannerShown) a particular 4.x release declares.
            val listener = Proxy.newProxyInstance(
                BannerView.IListener::class.java.classLoader,
                arrayOf<Class<*>>(BannerView.IListener::class.java)
            ) { proxy, method, args ->
                when (method.name) {
                    "onBannerLoaded" -> VyraUnityEvents.emit(rc, "bannerLoaded", pid)
                    "onBannerShown" -> VyraUnityEvents.emit(rc, "bannerShown", pid)
                    "onBannerClick" -> VyraUnityEvents.emit(rc, "bannerClick", pid)
                    "onBannerLeftApplication" -> VyraUnityEvents.emit(rc, "bannerLeftApplication", pid)
                    "onBannerFailedToLoad" -> {
                        val info = describe(args?.getOrNull(1))
                        VyraUnityEvents.emit(rc, "bannerFailed", pid) { putString("message", info) }
                    }
                    "hashCode" -> return@newProxyInstance System.identityHashCode(proxy)
                    "equals" -> return@newProxyInstance proxy === args?.getOrNull(0)
                    "toString" -> return@newProxyInstance "VyraUnityBannerListener"
                }
                null
            } as BannerView.IListener
            view.setListener(listener)
            banner = view
            addView(view, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER))
            view.load()
        } catch (t: Throwable) {
            loadedKey = null
            VyraUnityEvents.emit(rc, "bannerFailed", pid) { putString("message", t.message ?: t.javaClass.simpleName) }
        }
    }

    private fun describe(info: Any?): String {
        if (info == null) return "unknown"
        return try {
            val msg = info.javaClass.getField("errorMessage").get(info)
            val code = info.javaClass.getField("errorCode").get(info)
            "$code: $msg"
        } catch (_: Throwable) {
            info.toString()
        }
    }

    fun destroyBanner() {
        try {
            banner?.destroy()
        } catch (_: Throwable) {
        }
        banner?.let { removeView(it) }
        banner = null
        loadedKey = null
    }
}

class VyraUnityBannerManager : SimpleViewManager<UnityBannerContainer>() {
    override fun getName(): String = "VyraUnityBanner"

    override fun createViewInstance(reactContext: ThemedReactContext): UnityBannerContainer =
        UnityBannerContainer(reactContext)

    @ReactProp(name = "placementId")
    fun setPlacementId(view: UnityBannerContainer, placementId: String?) {
        view.placementId = placementId
    }

    @ReactProp(name = "bannerWidth", defaultInt = 320)
    fun setBannerWidth(view: UnityBannerContainer, width: Int) {
        view.bannerWidth = width
    }

    @ReactProp(name = "bannerHeight", defaultInt = 50)
    fun setBannerHeight(view: UnityBannerContainer, height: Int) {
        view.bannerHeight = height
    }

    override fun onAfterUpdateViewProperties(view: UnityBannerContainer) {
        super.onAfterUpdateViewProperties(view)
        view.loadIfNeeded()
    }

    override fun onDropViewInstance(view: UnityBannerContainer) {
        view.destroyBanner()
        super.onDropViewInstance(view)
    }
}
