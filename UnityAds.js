import {
  LevelPlay,
  LevelPlayInitRequest,
  LevelPlayRewardedAd,
  LevelPlayInterstitialAd,
} from 'unity-levelplay-mediation';

// These must match the App Key and Ad Unit IDs shown in your Unity LevelPlay dashboard.
const APP_KEY = '800410171';
const REWARDED_ID = 'BP_Rewarded_Android';
const INTERSTITIAL_ID = 'BP_Interstitial_Android';
export const BANNER_ID = 'BP_Banner_Android';

export const rewardedAd = new LevelPlayRewardedAd(REWARDED_ID);
export const interstitialAd = new LevelPlayInterstitialAd(INTERSTITIAL_ID);

let initStarted = false;
let sdkInitialized = false;

export const initAds = async (onReady, onFailed) => {
  if (sdkInitialized) {
    onReady?.();
    return true;
  }
  if (initStarted) return false;

  initStarted = true;
  try {
    const initRequest = LevelPlayInitRequest.builder(APP_KEY).build();
    const initListener = {
      onInitSuccess: (configuration) => {
        sdkInitialized = true;
        console.log('[LevelPlay] Initialization succeeded', configuration);
        // Ad objects may load only after successful SDK initialization.
        loadRewarded();
        loadInterstitial();
        onReady?.(configuration);
      },
      onInitFailed: (error) => {
        initStarted = false;
        console.error('[LevelPlay] Initialization failed', error);
        onFailed?.(error);
      },
    };

    await LevelPlay.init(initRequest, initListener);
    return true;
  } catch (error) {
    initStarted = false;
    console.error('[LevelPlay] Initialization exception', error);
    onFailed?.(error);
    return false;
  }
};

export const loadRewarded = async () => {
  try {
    await rewardedAd.loadAd();
  } catch (error) {
    console.error('[LevelPlay] Rewarded load exception', error);
  }
};

export const showRewarded = async () => {
  try {
    const ready = await rewardedAd.isAdReady();
    if (!ready) {
      await loadRewarded();
      return false;
    }
    await rewardedAd.showAd('Vyra_Rewarded');
    return true;
  } catch (error) {
    console.error('[LevelPlay] Rewarded show exception', error);
    return false;
  }
};

export const loadInterstitial = async () => {
  try {
    await interstitialAd.loadAd();
  } catch (error) {
    console.error('[LevelPlay] Interstitial load exception', error);
  }
};

export const showInterstitial = async () => {
  try {
    const ready = await interstitialAd.isAdReady();
    if (!ready) {
      await loadInterstitial();
      return false;
    }
    await interstitialAd.showAd('Vyra_Interstitial');
    return true;
  } catch (error) {
    console.error('[LevelPlay] Interstitial show exception', error);
    return false;
  }
};

export const isLevelPlayInitialized = () => sdkInitialized;
