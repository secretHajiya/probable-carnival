import { LevelPlay, LevelPlayRewardedAd, LevelPlayInterstitialAd } from 'unity-levelplay-mediation';

const APP_KEY = "800410171";
const REWARDED_ID = "BP_Rewarded_Android";
const INTERSTITIAL_ID = "BP_Interstitial_Android";
export const BANNER_ID = "BP_Banner_Android";

export const initAds = async () => {
  try {
    await LevelPlay.init({
      appKey: APP_KEY,
      userId: "user_vyra"
    });
    console.log("LevelPlay Init Success");
    loadRewarded();
    loadInterstitial();
  } catch (e) {
    console.log("Init Failed", e);
  }
};

// REWARDED
export const rewardedAd = new LevelPlayRewardedAd(REWARDED_ID);

rewardedAd.setListener({
  onAdLoaded: () => console.log("Rewarded Ready"),
  onAdLoadFailed: (err) => console.log("Rewarded Failed", err),
  onAdRewarded: (info) => {
    console.log("User Earned Reward", info);
  },
  onAdClosed: () => {
    loadRewarded();
  }
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