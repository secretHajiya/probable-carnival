import React,{useEffect,useRef,useState} from 'react';
import {View} from 'react-native';
import { DirectionalText as Text } from './DirectionProvider';
import {LevelPlayAdSize,LevelPlayBannerAdView, type LevelPlayBannerAdViewMethods, type LevelPlayBannerAdViewListener} from 'unity-levelplay-mediation';
import {levelPlayRewardedService} from '../services/levelplay-rewarded.service';
import {sqa} from '../services/spin-quiz-ads-i18n';
import type {MemberLanguage} from '../services/profile-settings.service';

export function LevelPlayBannerPanel({userId,language}:{userId:string;language:MemberLanguage}){
 const bannerRef=useRef<LevelPlayBannerAdViewMethods>(null);
 const [config,setConfig]=useState<{adUnitId:string;placementName:string}|null>(null);
 useEffect(()=>{let active=true;void (async()=>{try{const runtime=await levelPlayRewardedService.getRuntimeConfig(true);if(!runtime.banner_enabled||!runtime.banner_ad_unit_id||!runtime.banner_placement_name)return;await levelPlayRewardedService.ensureInitialized(userId);if(active)setConfig({adUnitId:runtime.banner_ad_unit_id,placementName:runtime.banner_placement_name});}catch{/* Ads are optional and must not interrupt the Earn screen. */}})();return()=>{active=false;bannerRef.current?.destroy();};},[userId]);
 const listener=useRef<LevelPlayBannerAdViewListener>({onAdLoaded:()=>undefined,onAdLoadFailed:()=>undefined,onAdDisplayed:()=>undefined,onAdDisplayFailed:()=>undefined,onAdClicked:()=>undefined,onAdExpanded:()=>undefined,onAdCollapsed:()=>undefined,onAdLeftApplication:()=>undefined});
 if(!config)return null;
 return <View style={{alignItems:'center',minHeight:50,justifyContent:'center'}}>
  <LevelPlayBannerAdView ref={bannerRef} adUnitId={config.adUnitId} adSize={LevelPlayAdSize.BANNER} placementName={config.placementName} listener={listener.current} onLayout={()=>bannerRef.current?.loadAd()} style={{width:LevelPlayAdSize.BANNER.width,height:LevelPlayAdSize.BANNER.height}} />
  <Text style={{fontSize:9,color:'#9298AC',marginTop:3}}>{sqa(language,'advertisement')}</Text>
 </View>;
}
