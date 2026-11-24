import { requireSupabase } from '../lib/supabase';
import {
  LevelPlay, LevelPlayInitRequest, LevelPlayRewardedAd, LevelPlayInterstitialAd,
  type LevelPlayInitListener, type LevelPlayRewardedAdListener, type LevelPlayInterstitialAdListener,
} from 'unity-levelplay-mediation';

type RewardedCallbacks={onStatus?:(status:string)=>void;onRewardedClientEvent?:()=>void;onClosed?:()=>void};
export type LevelPlayRuntimeConfig={
  app_key:string|null; rewarded_enabled:boolean; rewarded_ad_unit_id:string|null; rewarded_placement_name:string|null;
  interstitial_enabled:boolean; interstitial_ad_unit_id:string|null; interstitial_placement_name:string|null;
  banner_enabled:boolean; banner_ad_unit_id:string|null; banner_placement_name:string|null;
};
const disabledConfig:LevelPlayRuntimeConfig={app_key:null,rewarded_enabled:false,rewarded_ad_unit_id:null,rewarded_placement_name:null,interstitial_enabled:false,interstitial_ad_unit_id:null,interstitial_placement_name:null,banner_enabled:false,banner_ad_unit_id:null,banner_placement_name:null};
let runtimeConfig:LevelPlayRuntimeConfig=disabledConfig;let configLoadedAt=0;const CONFIG_TTL_MS=60_000;
let rewardedAd:LevelPlayRewardedAd|null=null;let interstitialAd:LevelPlayInterstitialAd|null=null;
let initializedFor:string|null=null;let initializing:Promise<void>|null=null;let callbacks:RewardedCallbacks={};
let lastInterstitialShownAt=0;const INTERSTITIAL_COOLDOWN_MS=5*60*1000;
function dynamicUserIdFromUuid(userId:string):string{const compact=userId.replace(/-/g,'').toLowerCase();if(!/^[a-f0-9]{32}$/.test(compact))throw new Error('The signed-in account ID is not a valid UUID for LevelPlay S2S verification.');return compact;}
function hasAnyEnabledFormat(){return Boolean(runtimeConfig.app_key&&(runtimeConfig.rewarded_enabled||runtimeConfig.interstitial_enabled||runtimeConfig.banner_enabled));}
function rewardedReadyToServe(){return Boolean(runtimeConfig.rewarded_enabled&&runtimeConfig.app_key&&runtimeConfig.rewarded_ad_unit_id&&runtimeConfig.rewarded_placement_name);}
async function refreshConfig(force=false):Promise<LevelPlayRuntimeConfig>{if(!force&&configLoadedAt&&Date.now()-configLoadedAt<CONFIG_TTL_MS)return runtimeConfig;const {data,error}=await requireSupabase().rpc('get_levelplay_mobile_config');if(error)throw error;const value=data as Partial<LevelPlayRuntimeConfig>|null;runtimeConfig={...disabledConfig,...value,app_key:typeof value?.app_key==='string'?value.app_key:null};configLoadedAt=Date.now();return runtimeConfig;}
function rewardedListener():LevelPlayRewardedAdListener{return{
 onAdLoaded:()=>callbacks.onStatus?.('Rewarded ad is ready.'),onAdLoadFailed:()=>callbacks.onStatus?.('Rewarded ad could not load.'),
 onAdDisplayed:()=>callbacks.onStatus?.('Rewarded ad is playing.'),onAdDisplayFailed:()=>callbacks.onStatus?.('Rewarded ad could not be displayed.'),
 onAdClicked:()=>undefined,onAdInfoChanged:()=>undefined,onAdClosed:()=>{callbacks.onClosed?.();callbacks.onStatus?.('Ad closed. Waiting for secure server verification if completed.');},
 onAdRewarded:()=>{callbacks.onRewardedClientEvent?.();callbacks.onStatus?.('Ad completed. The server must verify it before coins appear.');},
};}
function interstitialListener():LevelPlayInterstitialAdListener{return{
 onAdLoaded:()=>undefined,onAdLoadFailed:()=>undefined,onAdDisplayed:()=>undefined,onAdDisplayFailed:()=>undefined,
 onAdClicked:()=>undefined,onAdClosed:()=>{try{interstitialAd?.loadAd();}catch{}},onAdInfoChanged:()=>undefined,
};}
async function initialize(userId:string):Promise<void>{
 await refreshConfig();if(!hasAnyEnabledFormat())throw new Error('LevelPlay ads are disabled or not fully configured by the administrator.');
 const dynamicUserId=dynamicUserIdFromUuid(userId);
 if(initializedFor===userId){LevelPlay.setDynamicUserId(dynamicUserId);return;}
 if(initializing){await initializing;if(initializedFor===userId)return;}
 initializing=new Promise<void>((resolve,reject)=>{
  const listener:LevelPlayInitListener={onInitSuccess:()=>{try{
   LevelPlay.setDynamicUserId(dynamicUserId);
   if(rewardedReadyToServe()){rewardedAd=new LevelPlayRewardedAd(runtimeConfig.rewarded_ad_unit_id!);rewardedAd.setListener(rewardedListener());rewardedAd.loadAd();}
   if(runtimeConfig.interstitial_enabled&&runtimeConfig.interstitial_ad_unit_id){if(interstitialAd){void interstitialAd.remove();interstitialAd=null;}interstitialAd=new LevelPlayInterstitialAd(runtimeConfig.interstitial_ad_unit_id);interstitialAd.setListener(interstitialListener());interstitialAd.loadAd();}
   initializedFor=userId;resolve();
  }catch(e){reject(e);}},onInitFailed:()=>reject(new Error('LevelPlay initialization failed.'))};
  try{LevelPlay.init(LevelPlayInitRequest.builder(runtimeConfig.app_key!).withUserId(dynamicUserId).build(),listener);}catch(e){reject(e);}
 }).finally(()=>{initializing=null;});await initializing;
}
export const levelPlayRewardedService={
 get enabled(){return rewardedReadyToServe();},
 async refreshConfig():Promise<boolean>{try{await refreshConfig(true);return rewardedReadyToServe();}catch{runtimeConfig=disabledConfig;configLoadedAt=0;return false;}},
 async getRuntimeConfig(force=false){return refreshConfig(force);},
 async ensureInitialized(userId:string){await initialize(userId);},
 setCallbacks(next:RewardedCallbacks){callbacks=next;},
 async load(userId:string){await initialize(userId);if(!rewardedAd)throw new Error('Rewarded ad object is unavailable.');if(!(await rewardedAd.isAdReady()))rewardedAd.loadAd();},
 async show(userId:string){await initialize(userId);if(!rewardedAd)throw new Error('Rewarded ad object is unavailable.');LevelPlay.setDynamicUserId(dynamicUserIdFromUuid(userId));if(!(await rewardedAd.isAdReady())){rewardedAd.loadAd();throw new Error('The rewarded ad is not ready yet. Please wait a moment and try again.');}if(await LevelPlayRewardedAd.isPlacementCapped(runtimeConfig.rewarded_placement_name!))throw new Error('This rewarded-ad placement has reached its limit.');await rewardedAd.showAd(runtimeConfig.rewarded_placement_name!);},
 async maybeShowInterstitial(userId:string){
  try{await initialize(userId);if(!runtimeConfig.interstitial_enabled||!interstitialAd)return;
   if(Date.now()-lastInterstitialShownAt<INTERSTITIAL_COOLDOWN_MS)return;
   if(!(await interstitialAd.isAdReady())){interstitialAd.loadAd();return;}
   const placement=runtimeConfig.interstitial_placement_name!;
   if(await LevelPlayInterstitialAd.isPlacementCapped(placement))return;
   lastInterstitialShownAt=Date.now();await interstitialAd.showAd(placement);
  }catch{/* Interstitial is optional: never block navigation or core app flows. */}
 },
};
