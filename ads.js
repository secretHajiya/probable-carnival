import { useEffect, useState } from 'react';
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
  RewardedInterstitialAd,
  AppOpenAd,
} from 'react-native-google-mobile-ads';

export const AD_IDS = {
  appOpen: 'ca-app-pub-4487679675698542/605484843',
  banner: 'ca-app-pub-4487679675698542/9735385137',
  interstitial: 'ca-app-pub-4487679675698542/2617558428',
  rewarded: 'ca-app-pub-4487679675698542/4561195480',
  rewardedInterstitial: 'ca-app-pub-4487679675698542/2234415047',
};

export function Banner() {
  return <BannerAd unitId={AD_IDS.banner} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />;
}

const interstitialAd = InterstitialAd.createForAdRequest(AD_IDS.interstitial);
export function useInterstitial() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const l = interstitialAd.addAdEventListener(AdEventType.LOADED, () => setLoaded(true));
    const c = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => { setLoaded(false); interstitialAd.load(); });
    interstitialAd.load();
    return () => { l(); c(); };
  }, []);
  return { loaded, show: () => loaded && interstitialAd.show() };
}

const rewardedAd = RewardedAd.createForAdRequest(AD_IDS.rewarded);
export function useRewarded(onReward) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const l = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true));
    const e = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, onReward);
    const c = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => { setLoaded(false); rewardedAd.load(); });
    rewardedAd.load();
    return () => { l(); e(); c(); };
  }, []);
  return { loaded, show: () => loaded && rewardedAd.show() };
}

const rewardedInterstitialAd = RewardedInterstitialAd.createForAdRequest(AD_IDS.rewardedInterstitial);
export function useRewardedInterstitial(onReward) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const l = rewardedInterstitialAd.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true));
    const e = rewardedInterstitialAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, onReward);
    const c = rewardedInterstitialAd.addAdEventListener(AdEventType.CLOSED, () => { setLoaded(false); rewardedInterstitialAd.load(); });
    rewardedInterstitialAd.load();
    return () => { l(); e(); c(); };
  }, []);
  return { loaded, show: () => loaded && rewardedInterstitialAd.show() };
}

const appOpenAd = AppOpenAd.createForAdRequest(AD_IDS.appOpen);
export function useAppOpen() {
  useEffect(() => {
    const l = appOpenAd.addAdEventListener(AdEventType.LOADED, () => appOpenAd.show());
    const c = appOpenAd.addAdEventListener(AdEventType.CLOSED, () => appOpenAd.load());
    appOpenAd.load();
    return () => { l(); c(); };
  }, []);
}