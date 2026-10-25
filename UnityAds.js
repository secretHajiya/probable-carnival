import { LevelPlay, LevelPlayInitRequest, LevelPlayRewardedAd, LevelPlayInterstitialAd } from 'unity-levelplay-mediation';

const APP_KEY = "800410171";
const REWARDED_ID = "BP_Rewarded_Android";
const INTERSTITIAL_ID = "BP_Interstitial_Android";
export const BANNER_ID = "BP_Banner_Android";

export const initAds = async () => {
  const initListener = {
    onInitSuccess: (config) => {
      console.log("LevelPlay Init Success", config);
      loadRewarded();
      loadInterstitial();
    },
    onInitFailed: (error) => {
      console.log("Init Failed", error);
    }
  };

  const initRequest = LevelPlayInitRequest.builder(APP_KEY)
    .withUserId("user_vyra")
    .build();

  LevelPlay.init(initRequest, initListener);
};

// REWARDED
export const rewardedAd = new LevelPlayRewardedAd(REWARDED_ID);
rewardedAd.setListener({
  onAdLoaded: (info) => console.log("Rewarded Ready", info),
  onAdLoadFailed: (err) => console.log("Rewarded Failed", err),
  onAdRewarded: (reward, info) => console.log("User Earned Reward", reward),
  onAdClosed: () => loadRewarded()
});

export const loadRewarded = () => rewardedAd.loadAd();
export const showRewarded = () => {
  if (rewardedAd.isAdReady()) {
    rewardedAd.showAd();
  } else {
    console.log("Rewarded not ready, loading...");
    loadRewarded();
  }
};

// INTERSTITIAL
export const interstitialAd = new LevelPlayInterstitialAd(INTERSTITIAL_ID);
interstitialAd.setListener({
  onAdLoaded: () => console.log("Interstitial Ready"),
  onAdClosed: () => loadInterstitial()
});

export const loadInterstitial = () => interstitialAd.loadAd();
export const showInterstitial = () => {
  if (interstitialAd.isAdReady()) {
    interstitialAd.showAd();
  } else {
    loadInterstitial();
  }
};