/**
 * Unity Ads Classic integration (Android) for Vyra Rewards Pro.
 *
 * Uses the native bridge "VyraUnityAds" + native view "VyraUnityBanner", which are generated
 * by plugins/withUnityAdsClassic.js during `expo prebuild` / EAS Build and call the real
 * Unity Ads SDK (com.unity3d.ads:unity-ads). No LevelPlay, no AdMob, no mediation.
 *
 * Expo Go cannot load this native code. Use a development build or an EAS/Codemagic build.
 */
import React, { useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform, View, requireNativeComponent, useWindowDimensions } from 'react-native';

// ---- Unity Ads Classic dashboard values -----------------------------------------------
export const UNITY_GAME_ID = '800410171';
export const UNITY_PLACEMENTS = {
  banner: 'BP_Banner_Android',
  interstitial: 'BP_Interstitial_Android',
  rewarded: 'BP_Rewarded_Android',
};
export const BANNER_ID = UNITY_PLACEMENTS.banner;

// Set to true ONLY while testing (Unity then serves test ads). Must be false for release.
export const UNITY_TEST_MODE = false;

// Minimum gap between two full-screen ads (interstitial / after rewarded), in milliseconds.
const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;
const MAX_LOAD_RETRIES = 5;
// ----------------------------------------------------------------------------------------

const Native = Platform.OS === 'android' ? NativeModules.VyraUnityAds : null;
export const isUnityAdsAvailable = !!Native;

let NativeBanner = null;
if (Native) {
  try {
    NativeBanner = requireNativeComponent('VyraUnityBanner');
  } catch (e) {
    NativeBanner = null;
  }
}

let sdkInitialized = false;
let initPromise = null;
let fullscreenBusy = false;
let lastFullscreenAt = 0;
const retryCounts = {};
const retryTimers = {};
const subscribers = new Set();
let emitterSub = null;

const log = (...args) => console.log('[UnityAds]', ...args);

// ---- Events ---------------------------------------------------------------------------
const dispatch = (event) => {
  subscribers.forEach((cb) => {
    try { cb(event); } catch (e) { console.warn('[UnityAds] subscriber error', e); }
  });
};

const scheduleReload = (placementId) => {
  if (placementId !== UNITY_PLACEMENTS.rewarded && placementId !== UNITY_PLACEMENTS.interstitial) return;
  const tries = (retryCounts[placementId] || 0) + 1;
  retryCounts[placementId] = tries;
  if (tries > MAX_LOAD_RETRIES) return; // stop hammering when there is no fill
  clearTimeout(retryTimers[placementId]);
  const delay = Math.min(60000, 5000 * 2 ** (tries - 1));
  retryTimers[placementId] = setTimeout(() => {
    if (placementId === UNITY_PLACEMENTS.rewarded) loadRewarded();
    else loadInterstitial();
  }, delay);
};

const ensureEmitter = () => {
  if (!Native || emitterSub) return;
  const emitter = new NativeEventEmitter(Native);
  emitterSub = emitter.addListener('VyraUnityAdsEvent', (event) => {
    log('event', event);
    if (event.type === 'loaded') retryCounts[event.placementId] = 0;
    if (event.type === 'loadFailed') scheduleReload(event.placementId);
    dispatch(event);
  });
};

/** Subscribe to native events. Returns an unsubscribe function. */
export const subscribeUnityAds = (callback) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

// ---- Initialization -------------------------------------------------------------------
export const initAds = async (onReady, onFailed) => {
  if (!Native) {
    const err = new Error('Unity Ads native module not found. Use an EAS/Codemagic or dev build (not Expo Go).');
    console.warn('[UnityAds]', err.message);
    onFailed?.(err);
    return false;
  }
  ensureEmitter();
  if (!initPromise) {
    initPromise = Native.initialize(UNITY_GAME_ID, UNITY_TEST_MODE)
      .then(() => {
        sdkInitialized = true;
        log('initialized with Game ID', UNITY_GAME_ID);
        return true;
      })
      .catch((e) => {
        initPromise = null; // allow a later retry
        throw e;
      });
  }
  try {
    await initPromise;
    onReady?.();
    loadRewarded();
    loadInterstitial();
    return true;
  } catch (e) {
    console.warn('[UnityAds] initialization failed', e?.message || e);
    onFailed?.(e);
    return false;
  }
};

export const isUnityAdsInitialized = () => sdkInitialized;

// ---- Loading --------------------------------------------------------------------------
const loadPlacement = async (placementId) => {
  if (!Native || !sdkInitialized) return false;
  try {
    await Native.loadAd(placementId);
    return true;
  } catch (e) {
    // E_LOAD_IN_PROGRESS is harmless; load failures are already reported through events.
    if (e?.code !== 'E_LOAD_IN_PROGRESS') log('load failed', placementId, e?.message || e);
    return false;
  }
};

export const loadRewarded = () => loadPlacement(UNITY_PLACEMENTS.rewarded);
export const loadInterstitial = () => loadPlacement(UNITY_PLACEMENTS.interstitial);

// ---- Rewarded -------------------------------------------------------------------------
/**
 * Shows the rewarded ad.
 * Resolves { status, showId? } where status is one of:
 *   'completed'       -> Unity reported COMPLETED: the ONLY case where a reward may be granted
 *   'skipped'         -> user closed/skipped early: NO reward
 *   'not_ready' | 'not_initialized' | 'busy' | 'failed' -> NO reward
 */
export const showRewarded = async () => {
  if (!Native || !sdkInitialized) return { status: 'not_initialized' };
  if (fullscreenBusy) return { status: 'busy' };
  fullscreenBusy = true;
  try {
    const result = await Native.showAd(UNITY_PLACEMENTS.rewarded);
    const completed = result?.completionState === 'COMPLETED';
    return { status: completed ? 'completed' : 'skipped', showId: result?.showId };
  } catch (e) {
    const status = e?.code === 'E_NOT_READY' ? 'not_ready' : e?.code === 'E_SHOW_IN_PROGRESS' ? 'busy' : 'failed';
    return { status, error: e };
  } finally {
    fullscreenBusy = false;
    lastFullscreenAt = Date.now();
    loadRewarded(); // a placement can be shown once per load
  }
};

// ---- Interstitial ---------------------------------------------------------------------
export const showInterstitial = async () => {
  if (!Native || !sdkInitialized || fullscreenBusy) return false;
  fullscreenBusy = true;
  try {
    await Native.showAd(UNITY_PLACEMENTS.interstitial);
    return true;
  } catch (e) {
    log('interstitial not shown', e?.code, e?.message);
    return false;
  } finally {
    fullscreenBusy = false;
    lastFullscreenAt = Date.now();
    loadInterstitial();
  }
};

/** Shows an interstitial only at natural breaks and only if the cooldown has passed. Never blocks the UI. */
export const maybeShowInterstitial = async (reason = 'unspecified') => {
  if (!Native || !sdkInitialized || fullscreenBusy) return false;
  if (Date.now() - lastFullscreenAt < INTERSTITIAL_COOLDOWN_MS) return false;
  log('interstitial requested:', reason);
  const shown = await showInterstitial();
  if (!shown) loadInterstitial();
  return shown;
};

// ---- Banner ---------------------------------------------------------------------------
/**
 * Bottom banner. Standard Unity banner sizes: 320x50 on phones, 728x90 on wide screens (tablets).
 * Collapses (renders nothing) when the banner fails to load, and retries a few times with backoff.
 */
export function UnityBanner({ style }) {
  const { width } = useWindowDimensions();
  const size = width >= 760 ? { w: 728, h: 90 } : { w: 320, h: 50 };
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retryRef = useRef(null);

  useEffect(() => {
    const unsubscribe = subscribeUnityAds((event) => {
      if (event.placementId !== UNITY_PLACEMENTS.banner) return;
      if (event.type === 'bannerLoaded') setFailed(false);
      if (event.type === 'bannerFailed') {
        setFailed(true);
        clearTimeout(retryRef.current);
        setAttempt((current) => {
          if (current >= MAX_LOAD_RETRIES) return current;
          retryRef.current = setTimeout(() => {
            setFailed(false);
            setAttempt((n) => n + 1);
          }, Math.min(60000, 15000 * 2 ** current));
          return current;
        });
      }
    });
    return () => {
      unsubscribe();
      clearTimeout(retryRef.current);
    };
  }, []);

  if (!NativeBanner || !sdkInitialized || failed) return null;

  return (
    <View style={[{ width: '100%', alignItems: 'center', justifyContent: 'center' }, style]}>
      <NativeBanner
        key={`banner-${attempt}-${size.w}`}
        placementId={UNITY_PLACEMENTS.banner}
        bannerWidth={size.w}
        bannerHeight={size.h}
        style={{ width: size.w, height: size.h }}
      />
    </View>
  );
}
