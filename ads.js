import { useEffect, useRef, useState } from 'react';
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

// These are ad UNIT IDs. The App Open ID is kept consistent with App.js.
export const AD_IDS = {
  appOpen: 'ca-app-pub-4487679675698542/6005848843',
  banner: 'ca-app-pub-4487679675698542/9735385137',
  interstitial: 'ca-app-pub-4487679675698542/2617558428',
  rewarded: 'ca-app-pub-4487679675698542/4561195480',
  rewardedInterstitial: 'ca-app-pub-4487679675698542/2234415047',
};

export function Banner() {
  return <BannerAd unitId={AD_IDS.banner} size={BannerAdSize.BANNER} />;
}

export function useInterstitial() {
  const [loaded, setLoaded] = useState(false);
  const adRef = useRef(null);
  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(AD_IDS.interstitial);
    adRef.current = ad;
    const unsubs = [
      ad.addAdEventListener(AdEventType.LOADED, () => setLoaded(true)),
      ad.addAdEventListener(AdEventType.CLOSED, () => { setLoaded(false); ad.load(); }),
      ad.addAdEventListener(AdEventType.ERROR, () => setLoaded(false)),
    ];
    ad.load();
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, []);
  return { loaded, show: () => { if (loaded && adRef.current) return adRef.current.show(); return Promise.resolve(false); } };
}

export function useRewarded(onReward) {
  const [loaded, setLoaded] = useState(false);
  const adRef = useRef(null);
  useEffect(() => {
    const ad = RewardedAd.createForAdRequest(AD_IDS.rewarded);
    adRef.current = ad;
    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true)),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => { if (onReward) onReward(reward); }),
      ad.addAdEventListener(AdEventType.CLOSED, () => { setLoaded(false); ad.load(); }),
      ad.addAdEventListener(AdEventType.ERROR, () => setLoaded(false)),
    ];
    ad.load();
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, [onReward]);
  return { loaded, show: () => { if (loaded && adRef.current) return adRef.current.show(); return Promise.resolve(false); } };
}

export function useRewardedInterstitial(onReward) {
  const [loaded, setLoaded] = useState(false);
  const adRef = useRef(null);
  useEffect(() => {
    const ad = RewardedInterstitialAd.createForAdRequest(AD_IDS.rewardedInterstitial);
    adRef.current = ad;
    const unsubs = [
      ad.addAdEventListener(RewardedAdEventType.LOADED, () => setLoaded(true)),
      ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => { if (onReward) onReward(reward); }),
      ad.addAdEventListener(AdEventType.CLOSED, () => { setLoaded(false); ad.load(); }),
      ad.addAdEventListener(AdEventType.ERROR, () => setLoaded(false)),
    ];
    ad.load();
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, [onReward]);
  return { loaded, show: () => { if (loaded && adRef.current) return adRef.current.show(); return Promise.resolve(false); } };
}

export function useAppOpen() {
  useEffect(() => {
    const ad = AppOpenAd.createForAdRequest(AD_IDS.appOpen);
    const unsubs = [
      ad.addAdEventListener(AdEventType.LOADED, () => ad.show().catch(() => {})),
      ad.addAdEventListener(AdEventType.CLOSED, () => ad.load()),
      ad.addAdEventListener(AdEventType.ERROR, () => {}),
    ];
    ad.load();
    return () => unsubs.forEach(unsub => unsub && unsub());
  }, []);
}
