import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { mobileAds, BannerAd, BannerAdSize, TestIds, RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType, AppOpenAd, RewardedInterstitialAd } from 'react-native-google-mobile-ads';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, getIdToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

let CpxOfferwall;
try { CpxOfferwall = require('./CpxOfferwall').default; } catch(e) { CpxOfferwall = () => null; }

const VERSION = '1.0.9';
const BUILD = '27';
const USE_TEST_ADS = true;
const AD_IDS = {
  BANNER: 'ca-app-pub-4487679675698542/9735385137',
  REWARDED: 'ca-app-pub-4487679675698542/4561195480',
  INTERSTITIAL: 'ca-app-pub-4487679675698542/2617558428',
  REWARDED_INTER: 'ca-app-pub-4487679675698542/2234415047',
  APP_OPEN: 'ca-app-pub-4487679675698542/6005848843',
};
const BANNER_ID = USE_TEST_ADS ? TestIds.BANNER : AD_IDS.BANNER;
const REWARDED_ID = USE_TEST_ADS ? TestIds.REWARDED : AD_IDS.REWARDED;
const INTERSTITIAL_ID = USE_TEST_ADS ? TestIds.INTERSTITIAL : AD_IDS.INTERSTITIAL;
const APP_OPEN_ID = USE_TEST_ADS ? TestIds.APP_OPEN : AD_IDS.APP_OPEN;
const REWARDED_INTER_ID = USE_TEST_ADS ? TestIds.REWARDED_INTERSTITIAL : AD_IDS.REWARDED_INTER;

const HIDDEN_GLOBAL = 'VYRAGJVOP1';
const HIDDEN_APP = '37222';
const CPX_HASH = 'zq6KgHGIgOujXyncpghe4Nb1sIdDf0ph';
const BACKEND_URL = 'https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev';

const firebaseConfig = {
  apiKey: "AIzaSyCku3iG2yg5MigEU0vpDr4MEwEncW5Tn6w",
  authDomain: "vyra-rewards-pro.firebaseapp.com",
  projectId: "vyra-rewards-pro",
  storageBucket: "vyra-rewards-pro.appspot.com",
  messagingSenderId: "250039191069",
  appId: "1:250039191069:web:7383d18279c8395438a8f4"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
let auth;
try { auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); } catch(e) { auth = getAuth(app); }
const db = getFirestore(app);

const EMAILJS_SERVICE = 'service_eo4mafe';
const EMAILJS_TEMPLATE = 'template_vla0zff';
const EMAILJS_TEMPLATE_NOTIFY = 'template_8u8r9r9';
const EMAILJS_PUBLIC = 'Ee45lolv3ZCjOSWUy';

const REAL_OFFERS = [
  { id: 'palm', name: 'PalmPay', reward: 800, code: 'NSFM3287', link: 'https://palm.pay.link', color: '#6a00f4', desc: 'Open account' },
  { id: 'opay', name: 'Opay', reward: 1000, code: 'OPAY123', link: 'https://opay.com', color: '#00c853', desc: 'Register' },
  { id: 'monie', name: 'Moniepoint', reward: 1200, code: 'MONIE', link: 'https://moniepoint.com', color: '#2962ff', desc: 'Create business account' },
  { id: 'fair', name: 'FairMoney', reward: 900, code: 'FAIR', link: 'https://fairmoney.io', color: '#ff6d00', desc: 'Loan app' },
  { id: 'carbon', name: 'Carbon', reward: 850, code: 'CARBON', link: 'https://getcarbon.co', color: '#6200ea', desc: 'Get credit' },
  { id: 'branch', name: 'Branch', reward: 700, code: 'BRANCH', link: 'https://branch.co', color: '#0091ea', desc: 'Quick loan' },
  { id: 'kuda', name: 'Kuda', reward: 1100, code: 'KUDA', link: 'https://kuda.com', color: '#5e35b1', desc: 'Open bank' },
];

const WITHDRAW_METHODS = ['Bank Transfer', 'Opay', 'PalmPay', 'Moniepoint', 'Kuda', 'Airtime', 'PayPal (USD)', 'USDT (BEP20)'];
const WITHDRAW_NETWORKS = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
const APP_THEMES = [
  { name: 'Gold Pro', primary: '#D4AF37', background: '#0A0A0A', card: '#1A1A1A', border: '#D4AF37', text: '#FFFFFF', muted: '#AAAAAA', input: '#2A2A2A', tab: '#1A1A1A' },
  { name: 'Default', primary: '#6a00f4', background: '#f5f5f5', card: '#ffffff', border: '#ddd', text: '#000000', muted: '#666', input: '#ffffff', tab: '#ffffff' },
  { name: 'Ocean', primary: '#0d47a1', background: '#E3F2FD', card: '#ffffff', border: '#90CAF9', text: '#000000', muted: '#666', input: '#ffffff', tab: '#ffffff' },
  { name: 'Forest', primary: '#1b5e20', background: '#E8F5E9', card: '#ffffff', border: '#A5D6A7', text: '#000000', muted: '#666', input: '#ffffff', tab: '#ffffff' },
  { name: 'Sunset', primary: '#e65100', background: '#FFF3E0', card: '#ffffff', border: '#FFCC80', text: '#000000', muted: '#666', input: '#ffffff', tab: '#ffffff' },
  { name: 'Dark', primary: '#212121', background: '#121212', card: '#1E1E1E', border: '#444', text: '#FFFFFF', muted: '#888', input: '#2A2A2A', tab: '#1E1E1E' },
];

const TERMS_TEXT = `
TERMS OF SERVICE - VYRA REWARDS PRO v1.0.9 BUILD 27

1. ACCEPTANCE OF TERMS
By downloading, installing, or using Vyra Rewards Pro, you agree to be bound by these Terms of Service. If you do not agree, please uninstall the app.

2. ELIGIBILITY
You must be at least 13 years old to use this app. Users under 18 require parental consent. You must provide accurate registration information.

3. EARNING SYSTEM
a) Points are earned by: Tapping (50 taps = 100 pts), Watching Rewarded Ads (+50 pts), Completing Offers, CPX Research Surveys.
b) 50 taps = 100 points. 150 taps requires watching a rewarded ad to continue.
c) Points have no monetary value until redeemed. Conversion: 200,000 pts = ₦5,000 Naira, 300,000 pts = $5 USD.
d) We reserve the right to adjust point values, conversion rates, and earning methods at any time.

4. OFFERS AND PROOFS
a) Offers from PalmPay, Opay, Moniepoint, FairMoney, Carbon, Branch, Kuda etc are third-party.
b) You must submit valid proof. Fake proofs will lead to account suspension.
c) Points for offers are marked as pending until admin review (24-72 hours).
d) Interstitial ads will be shown when you click COMPLETE - this is to support the app.

5. WITHDRAWALS
a) Minimum withdrawal: 200,000 pts for Naira (Bank, Opay, PalmPay, Moniepoint, Kuda, Airtime), 300,000 pts for USD (PayPal, USDT BEP20).
b) Withdrawal requests are pending admin review. Points are reserved upon request.
c) Provide accurate bank/wallet details. We are not responsible for losses due to incorrect details.
d) Processing time: 1-7 business days. We reserve right to request KYC verification.
e) Any fraudulent activity, self-referrals, VPN abuse will result in forfeiture and ban.

6. REFERRAL SYSTEM
a) Share your referral code (VYRAxxxx). You earn bonus when your referral reaches 10,000 points.
b) Self-referral, fake accounts, spamming is prohibited.
c) Referral rewards may be adjusted.

7. ADS
a) App contains 5 AdMob units: Banner (9735385137), Rewarded (4561195480), Interstitial (2617558428), App Open (6005848843), Rewarded Interstitial (2234415047) - All under 4487679675698542.
b) You agree to view ads as part of earning. Ad blocking or modification is prohibited.
c) Rewarded ads are required at 150 taps.

8. PROHIBITED CONDUCT
- Creating multiple accounts, using emulators, bots, VPN to cheat.
- Submitting fake proofs or screenshots.
- Abusing referral system.
- Attempting to hack backend (https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev).
- Any activity violating Google Play policies.

9. ACCOUNT TERMINATION
We reserve the right to suspend or terminate accounts violating terms, with forfeiture of points.

10. DISCLAIMER
App is provided "as is". We do not guarantee earnings. Third-party offers are not our responsibility. Use at your own risk.

11. CHANGES
Terms may be updated. Continued use after update constitutes acceptance. Version 1.0.9 BUILD 27 - Contact: vyraprosupport@gmail.com
`;

const PRIVACY_TEXT = `
PRIVACY POLICY - VYRA REWARDS PRO v1.0.9 BUILD 27

Last Updated: October 2026

1. INFORMATION WE COLLECT
a) Personal: Full Name, Phone Number, Email, Password (hashed), Referral Code.
b) Usage: Bonus Points, Total Taps, Tap Count, Offers Completed, Proofs Submitted, Withdrawal History.
c) Device: Device ID, Advertising ID, IP Address, Device Model, OS Version.
d) AdMob: Google Mobile Ads SDK collects data for ad personalization (under Google's policy).
e) Firebase: Authentication and Firestore data stored securely.

2. HOW WE USE INFORMATION
- To create and manage your account.
- To track points, taps, referrals, and withdrawals.
- To send OTP via EmailJS (service_eo4mafe, template_vla0zff).
- To serve personalized ads via AdMob (4487679675698542) - 5 units including Banner, Rewarded, Interstitial, App Open, Rewarded Interstitial.
- To process withdrawals (Bank Name, Account Number, Account Name, Network for Airtime, PayPal Email, USDT BEP20 address).
- To prevent fraud via hidden verification (VYRAGJVOP1, 37222) and backend validation.
- To improve app experience and fix crashes (keeps stopping fix BUILD 27).

3. EMAILJS
We use EmailJS to send OTP codes. Your email is sent to EmailJS service (Ee45lolv3ZCjOSWUy) solely for verification. EmailJS Privacy: https://www.emailjs.com/legal/privacy-policy/

4. ADMOB AND THIRD PARTIES
a) AdMob by Google: Collects Advertising ID, location (approx), app interactions for ads. See https://policies.google.com/privacy
b) Firebase: Authentication and Firestore by Google. See https://firebase.google.com/support/privacy
c) CPX Research: Offerwall surveys - their privacy applies when you use CPX.
d) Cloudflare Workers Backend: vyra-rewards-backend - processes taps, rewards, withdrawals securely.

5. DATA STORAGE AND SECURITY
- Data stored in Firebase (users, proofs, withdrawals collections) and Cloudflare Workers.
- Passwords are never stored in plain text - Firebase Auth handles hashing.
- Hidden tokens (hidden_global, hidden_app) are used to secure backend calls.
- We implement reasonable security but cannot guarantee 100% security.

6. DATA SHARING
We do NOT sell your personal data. We share only:
- With Google (AdMob, Firebase) for ads and backend.
- With EmailJS for OTP delivery.
- With payment processors/banks only when you request withdrawal.
- When required by law.

7. YOUR RIGHTS
- Access: Request your data via vyraprosupport@gmail.com
- Deletion: Request account deletion - points forfeited.
- Correction: Update name, phone in profile or contact support.
- Opt-out of personalized ads: Via device Settings > Google > Ads > Opt out.

8. CHILDREN'S PRIVACY
App not intended for children under 13. We do not knowingly collect data from children. If discovered, we delete immediately.

9. RETENTION
We retain data while account is active and up to 2 years after deletion for fraud prevention and legal compliance.

10. WITHDRAWAL DATA
Bank/Wallet details (Bank Name, Account Number, Account Name, USDT address, PayPal email) are stored only to process pending withdrawals and are retained for audit purposes. Provide accurate info - we are not liable for errors.

11. CHANGES TO POLICY
We may update this policy. Users will be notified via app update. Version BUILD 27 - EmailJS OK - Ads New 448...

12. CONTACT
For privacy questions, data requests, or complaints: vyraprosupport@gmail.com - Vyra Rewards Pro v1.0.9 BUILD 27

Secure IDs Hidden. No IDs visible in UI. Backend: Secure Worker.
`;

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [userDataLoaded, setUserDataLoaded] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedInterstitialLoaded, setRewardedInterstitialLoaded] = useState(false);
  const [appOpenLoaded, setAppOpenLoaded] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ count: 0, earned: 0 });
  const [usedReferralCode, setUsedReferralCode] = useState('');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [proofText, setProofText] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Bank Transfer');
  const [withdrawNetwork, setWithdrawNetwork] = useState('MTN');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [themeIndex, setThemeIndex] = useState(0);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const rewardedRef = useRef(null);
  const interstitialRef = useRef(null);
  const rewardedInterstitialRef = useRef(null);
  const appOpenRef = useRef(null);
  const appOpenShownRef = useRef(false);
  const pendingOfferRef = useRef(null);
  const currentTheme = APP_THEMES[themeIndex];

  const callBackend = async (path, method = 'GET', body = null) => {
    try {
      const token = auth.currentUser ? await getIdToken(auth.currentUser) : null;
      const res = await fetch(`${BACKEND_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify({ ...body, hidden_global: HIDDEN_GLOBAL, hidden_app: HIDDEN_APP }) : null
      });
      return await res.json();
    } catch(e) { return { success: false, error: e.message }; }
  };

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener(() => {});
    const authTimeout = setTimeout(() => {
      if (screen === 'loading') setScreen('login');
    }, 5000);
    mobileAds().initialize().then(() => {
      const rewarded = RewardedAd.createForAdRequest(REWARDED_ID);
      rewardedRef.current = rewarded;
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        setBonusPoints(p => p + 50);
        const result = await callBackend('/reward', 'POST', { type: 'ad_reward', amount: 50 });
        if (result && result.success === false) console.log('Reward sync issue:', result.error || result.message);
      });
      rewarded.addAdEventListener(AdEventType.CLOSED, () => { setRewardedLoaded(false); rewarded.load(); });
      rewarded.addAdEventListener(AdEventType.ERROR, e => { setRewardedLoaded(false); console.log('Rewarded ad error:', e); });
      rewarded.load();
      const inter = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);
      interstitialRef.current = inter;
      inter.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
      inter.addAdEventListener(AdEventType.CLOSED, () => {
        if (pendingOfferRef.current) { Linking.openURL(pendingOfferRef.current.link); pendingOfferRef.current = null; }
        inter.load();
      });
      inter.addAdEventListener(AdEventType.ERROR, e => { setInterstitialLoaded(false); console.log('Interstitial error:', e); });
      inter.load();

      const rewardedInter = RewardedInterstitialAd.createForAdRequest(REWARDED_INTER_ID);
      rewardedInterstitialRef.current = rewardedInter;
      rewardedInter.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedInterstitialLoaded(true));
      rewardedInter.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        setBonusPoints(p => p + 50);
        const result = await callBackend('/reward', 'POST', { type: 'rewarded_interstitial', amount: 50 });
        if (result && result.success === false) console.log('Rewarded interstitial sync issue:', result.error || result.message);
      });
      rewardedInter.addAdEventListener(AdEventType.CLOSED, () => { setRewardedInterstitialLoaded(false); rewardedInter.load(); });
      rewardedInter.addAdEventListener(AdEventType.ERROR, e => { setRewardedInterstitialLoaded(false); console.log('Rewarded interstitial error:', e); });
      rewardedInter.load();

      const appOpen = AppOpenAd.createForAdRequest(APP_OPEN_ID);
      appOpenRef.current = appOpen;
      appOpen.addAdEventListener(AdEventType.LOADED, () => {
        // Load only; do not auto-show during app startup.
        setAppOpenLoaded(true);
      });
      appOpen.addAdEventListener(AdEventType.CLOSED, () => { setAppOpenLoaded(false); appOpen.load(); });
      appOpen.addAdEventListener(AdEventType.ERROR, e => { setAppOpenLoaded(false); console.log('App-open error:', e); });
      appOpen.load();
    }).catch(e => console.log('Ads init error', e));
    loadInitialData();
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await loadUserDataFromFirebase(fbUser.uid, fbUser.email);
        setScreen('home');
      } else {
        const lastEmail = await AsyncStorage.getItem('lastUserEmail');
        if (lastEmail) { setLoginEmail(lastEmail); setScreen('login'); } else { setScreen('register'); }
      }
    });
    return () => { unsubNet(); unsubAuth(); clearTimeout(authTimeout); };
  }, []);

  // Persist points and tap progress locally first, then sync to Firestore/backend.
  useEffect(() => {
    if (!userDataLoaded || !user?.uid) return;
    const progress = { bonusPoints, totalTaps, tapCount, updatedAt: Date.now() };
    AsyncStorage.setItem(`vyra_progress_${user.uid}`, JSON.stringify(progress))
      .catch(e => console.log('Local progress save error:', e));
    saveBalanceToFirebase(progress).catch(e => console.log('Cloud progress save error:', e));
  }, [bonusPoints, totalTaps, tapCount, userDataLoaded, user?.uid]);

  const loadInitialData = async () => {
    try {
      const th = await AsyncStorage.getItem('themeIndex');
      if (th !== null) {
        const parsed = parseInt(th, 10);
        setThemeIndex(Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), APP_THEMES.length - 1) : 0);
      }
    } catch (e) { console.log('Initial settings load error:', e); }
  };

  const loadUserDataFromFirebase = async (uid, email) => {
    setUserDataLoaded(false);
    let localProgress = null;
    try {
      const cached = await AsyncStorage.getItem(`vyra_progress_${uid}`);
      if (cached) localProgress = JSON.parse(cached);
    } catch (e) { console.log('Local progress restore error:', e); }

    let cloudProgress = null;
    let profile = {};
    try {
      const backendData = await callBackend(`/user?uid=${encodeURIComponent(uid)}`, 'GET');
      // Accept both backend response formats used by earlier builds: {points,taps} and {bonusPoints,totalTaps}.
      const d = backendData?.data && typeof backendData.data === 'object' ? backendData.data : backendData;
      const hasPoints = d && (d.bonusPoints !== undefined || d.points !== undefined);
      const hasTaps = d && (d.totalTaps !== undefined || d.taps !== undefined);
      if (backendData?.success && (hasPoints || hasTaps)) {
        cloudProgress = {
          bonusPoints: Number(d.bonusPoints ?? d.points ?? 0) || 0,
          totalTaps: Number(d.totalTaps ?? d.taps ?? 0) || 0,
          tapCount: Number(d.tapCount ?? 0) || 0,
        };
        profile = d;
      }
    } catch (e) { console.log('Backend progress load error:', e); }

    if (!cloudProgress) {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) {
          const d = snap.data();
          const hasPoints = d.bonusPoints !== undefined || d.points !== undefined;
          const hasTaps = d.totalTaps !== undefined || d.taps !== undefined;
          if (hasPoints || hasTaps) {
            cloudProgress = {
              bonusPoints: Number(d.bonusPoints ?? d.points ?? 0) || 0,
              totalTaps: Number(d.totalTaps ?? d.taps ?? 0) || 0,
              tapCount: Number(d.tapCount ?? 0) || 0,
            };
          }
          profile = d;
        }
      } catch (e) { console.log('Firestore progress load error:', e); }
    }

    // Prefer cloud data when it contains real saved fields; use this phone's backup if cloud data is absent.
    const chosen = cloudProgress || (localProgress && {
      bonusPoints: Number(localProgress.bonusPoints) || 0,
      totalTaps: Number(localProgress.totalTaps) || 0,
      tapCount: Number(localProgress.tapCount) || 0,
    }) || { bonusPoints: 0, totalTaps: 0, tapCount: 0 };

    setBonusPoints(chosen.bonusPoints);
    setTotalTaps(chosen.totalTaps);
    setTapCount(chosen.tapCount);
    setMyReferralCode(profile.myReferralCode || profile.referralCode || '');
    setReferralStats(profile.referralStats || { count: 0, earned: 0 });
    setUser({ uid, email, name: profile.name || '', phone: profile.phone || '' });
    setUserDataLoaded(true);

    // If cloud had no balance fields, seed it from the restored local backup.
    if (!cloudProgress && localProgress) {
      const restored = {
        bonusPoints: Number(localProgress.bonusPoints) || 0,
        totalTaps: Number(localProgress.totalTaps) || 0,
        tapCount: Number(localProgress.tapCount) || 0,
      };
      try { await saveBalanceToFirebase(restored, uid); } catch (e) { console.log('Progress seed error:', e); }
    }
  };

  const saveBalanceToFirebase = async (progress = { bonusPoints, totalTaps, tapCount }, uidOverride = null) => {
    const uid = uidOverride || auth?.currentUser?.uid || user?.uid;
    if (!uid) return;
    const data = {
      // Keep both field names so this build and older backend/client versions agree.
      bonusPoints: Number(progress.bonusPoints) || 0,
      points: Number(progress.bonusPoints) || 0,
      totalTaps: Number(progress.totalTaps) || 0,
      taps: Number(progress.totalTaps) || 0,
      tapCount: Number(progress.tapCount) || 0,
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, 'users', uid), data, { merge: true });
    } catch (e) { console.log('Firestore progress save error:', e); }
    try {
      await callBackend('/user/update', 'POST', { uid, ...data, updatedAt: Date.now() });
    } catch (e) { console.log('Backend progress save error:', e); }
  };

  const checkInternet = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) { Alert.alert('No Internet'); return false; }
    return true;
  };

  const sendEmailJsOtp = async (toEmail, code) => {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE,
          template_id: EMAILJS_TEMPLATE,
          user_id: EMAILJS_PUBLIC,
          template_params: { to_email: toEmail, to_name: registerName || 'Vyra Rewards user', otp: code, otp_code: code, code, verification_code: code, app_name: 'Vyra Rewards Pro' }
        })
      });
      return res.ok;
    } catch(e) { return false; }
  };

  const handleRegister = async () => {
    if (!(await checkInternet())) return;
    if (!registerName || !registerPhone || !registerEmail || !registerPassword) { Alert.alert('Fill all fields'); return; }
    if (registerPassword.length < 8) { Alert.alert('Password min 8'); return; }
    if (registerPassword !== registerPasswordConfirm) { Alert.alert('Passwords not match'); return; }
    const code = Math.floor(100000 + Math.random()*900000).toString();
    setEmailOtp(code);
    setOtpExpiresAt(Date.now() + 10*60*1000);
    const sent = await sendEmailJsOtp(registerEmail, code);
    if (!sent) { Alert.alert('Email not sent', 'EmailJS did not accept the message. Check your EmailJS service, template ID, and public key, then try again.'); return; }
    setScreen('otp');
  };

  const verifyOtpAndSave = async () => {
    if (Date.now() > otpExpiresAt) { Alert.alert('OTP expired'); return; }
    if (otp !== emailOtp) { Alert.alert('Invalid OTP'); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      const myCode = 'VYRA' + Math.floor(1000 + Math.random()*9000);
      const userDoc = {
        name: registerName, phone: registerPhone, email: registerEmail,
        bonusPoints: 100, totalTaps: 0, tapCount: 0, myReferralCode: myCode,
        usedReferralCode: usedReferralCode || null, createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', cred.user.uid), userDoc);
      await callBackend('/register', 'POST', { name: registerName, phone: registerPhone, email: registerEmail, myReferralCode: myCode, usedReferralCode });
      await AsyncStorage.setItem('lastUserEmail', registerEmail);
      setBonusPoints(100);
      setUser({ uid: cred.user.uid, email: registerEmail, name: registerName, phone: registerPhone });
      setMyReferralCode(myCode);
      setUserDataLoaded(true);
      setScreen('home');
    } catch(e) { Alert.alert(e.message); }
  };

  const handleLogin = async () => {
    if (!(await checkInternet())) return;
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      await AsyncStorage.setItem('lastUserEmail', loginEmail);
      await loadUserDataFromFirebase(cred.user.uid, loginEmail);
      setScreen('home');
    } catch(e) { Alert.alert(e.message); }
  };

  const handleForgotPassword = async () => {
    if (!loginEmail) { Alert.alert('Enter email'); return; }
    try { await sendPasswordResetEmail(auth, loginEmail); Alert.alert('Reset email sent'); } catch(e) { Alert.alert(e.message); }
  };

  const handleLogout = async () => { await signOut(auth); setScreen('login'); };

  const watchAd = () => {
    if (rewardedLoaded && rewardedRef.current) {
      setRewardedLoaded(false);
      rewardedRef.current.show().catch(e => { Alert.alert('Ad unavailable', 'The rewarded ad could not open. Please try again shortly.'); console.log('Rewarded show error:', e); });
    } else {
      if (rewardedRef.current) rewardedRef.current.load();
      Alert.alert('Ad loading', 'No rewarded ad is ready right now. Wait a few seconds and try again.');
    }
  };

  const watchRewardedInterstitial = () => {
    if (rewardedInterstitialLoaded && rewardedInterstitialRef.current) {
      setRewardedInterstitialLoaded(false);
      rewardedInterstitialRef.current.show().catch(e => { Alert.alert('Ad unavailable', 'Please try again shortly.'); console.log('Rewarded interstitial show error:', e); });
    } else {
      if (rewardedInterstitialRef.current) rewardedInterstitialRef.current.load();
      Alert.alert('Ad loading', 'No rewarded interstitial ad is ready right now. Wait a few seconds and try again.');
    }
  };

  const tapForProgress = async () => {
    const nt = tapCount + 1; const tot = totalTaps + 1;
    setTapCount(nt); setTotalTaps(tot);
    const uid = auth?.currentUser?.uid || user?.uid;
    if (uid) {
      const progress = { bonusPoints, totalTaps: tot, tapCount: nt };
      AsyncStorage.setItem(`vyra_progress_${uid}`, JSON.stringify(progress)).catch(e => console.log('Tap backup error:', e));
    }
    const res = await callBackend('/tap', 'POST', { uid, tapCount: nt, totalTaps: tot, taps: tot });
    if (res && res.requireAd) {
      Alert.alert('Watch Ad Required', 'An kai 150 taps. Kalli talla don ci gaba.', [{ text: 'Watch Ad', onPress: () => watchAd() }]);
      return;
    }
    if (nt >= 150) {
      Alert.alert('Reward Ad Required', 'Kalli tallan don samun bonus', [
        { text: 'Watch Ad', onPress: () => {
          if (rewardedLoaded && rewardedRef.current) { rewardedRef.current.show(); rewardedRef.current.load(); setRewardedLoaded(false); setTapCount(0); } else { watchAd(); }
        }}
      ]);
    } else if (nt >= 50) {
      setBonusPoints(p => p + 100);
      setTapCount(0);
      if (interstitialLoaded && interstitialRef.current) { interstitialRef.current.show(); setInterstitialLoaded(false); }
    }
  };

  const handleJoinOffer = (offer) => {
    setSelectedOffer(offer);
    if (interstitialLoaded && interstitialRef.current) {
      pendingOfferRef.current = offer;
      interstitialRef.current.show();
    } else {
      Linking.openURL(offer.link);
    }
  };

  const handleProofSubmit = async () => {
    if (!proofText) { Alert.alert('Enter proof'); return; }
    try {
      await addDoc(collection(db, 'proofs'), {
        userId: auth.currentUser.uid, offerId: selectedOffer.id, offerName: selectedOffer.name,
        proof: proofText, status: 'pending', createdAt: serverTimestamp()
      });
      await callBackend('/proof', 'POST', { offerId: selectedOffer.id, offerName: selectedOffer.name, proof: proofText });
      Alert.alert('Proof submitted', 'Points have been reserved. Pending admin review');
      setProofText(''); setSelectedOffer(null);
    } catch(e) { Alert.alert(e.message); }
  };

  const handleWithdraw = async () => {
    const amt = parseInt(withdrawAmount);
    const isUSD = withdrawMethod.includes('USD') || withdrawMethod.includes('USDT');
    const minAmt = isUSD ? 300000 : 200000;
    const minLabel = isUSD ? '$5 (300k pts)' : '₦5k (200k pts)';
    if (!amt || amt < minAmt) { Alert.alert(`Min ${minLabel}`); return; }
    if (bonusPoints < amt) { Alert.alert('Insufficient balance'); return; }
    if (!bankName || !accountNumber || !accountName) { Alert.alert('Fill bank details'); return; }
    try {
      const payload = {
        amount: amt, method: withdrawMethod, network: withdrawNetwork,
        bankName, accountNumber, accountName,
        nairaValue: isUSD ? 0 : (amt/200000*5000).toFixed(0),
        usdValue: isUSD ? (amt/300000*5).toFixed(2) : 0
      };
      const res = await callBackend('/withdraw', 'POST', payload);
      if (res && res.success === false) { Alert.alert(res.error || 'Withdraw failed'); return; }
      await addDoc(collection(db, 'withdrawals'), { userId: auth.currentUser.uid, ...payload, status: 'pending', createdAt: serverTimestamp() });
      setBonusPoints(p => p - amt);
      Alert.alert('Withdrawal request submitted', 'Points have been reserved. Pending admin review');
      setWithdrawAmount(''); setBankName(''); setAccountNumber(''); setAccountName('');
    } catch(e) { Alert.alert(e.message); }
  };

  if (screen === 'loading') return <View style={styles.center}><ActivityIndicator size="large" color="#6a00f4" /><Text>Vyra Loading v{VERSION} - EmailJS OK</Text></View>;

  if (screen === 'register') {
    return (
      <ScrollView contentContainerStyle={styles.auth}>
        <Text style={styles.authTitle}>Create Account</Text>
        <TextInput style={styles.input} placeholder="Full Name" value={registerName} onChangeText={setRegisterName} />
        <TextInput style={styles.input} placeholder="Phone" value={registerPhone} onChangeText={setRegisterPhone} />
        <TextInput style={styles.input} placeholder="Email" value={registerEmail} onChangeText={setRegisterEmail} />
        <TextInput style={styles.input} placeholder="Referral Code (Optional)" value={usedReferralCode} onChangeText={setUsedReferralCode} />
        <TextInput style={styles.input} placeholder="Password min 8" secureTextEntry value={registerPassword} onChangeText={setRegisterPassword} />
        <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={registerPasswordConfirm} onChangeText={setRegisterPasswordConfirm} />
        <TouchableOpacity style={styles.yBtn} onPress={handleRegister}><Text style={styles.yTxt}>REGISTER & GET CODE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('login')}><Text>Already have account? LOGIN</Text></TouchableOpacity>
      </ScrollView>
    );
  }
  if (screen === 'otp') {
    return (
      <View style={styles.auth}>
        <Text style={styles.authTitle}>Verify Your Email</Text>
        <TextInput style={styles.input} placeholder="Enter 6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" />
        <TouchableOpacity style={styles.yBtn} onPress={verifyOtpAndSave}><Text style={styles.yTxt}>VERIFY OTP</Text></TouchableOpacity>
      </View>
    );
  }
  if (screen === 'login') {
    return (
      <View style={styles.auth}>
        <Text style={styles.authTitle}>Login</Text>
        <TextInput style={styles.input} placeholder="Email" value={loginEmail} onChangeText={setLoginEmail} />
        <TextInput style={styles.input} placeholder="Password" secureTextEntry value={loginPassword} onChangeText={setLoginPassword} />
        <TouchableOpacity style={styles.yBtn} onPress={handleLogin}><Text style={styles.yTxt}>LOGIN</Text></TouchableOpacity>
        <TouchableOpacity onPress={handleForgotPassword}><Text>Forgot Password?</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('register')}><Text>No account? REGISTER</Text></TouchableOpacity>
      </View>
    );
  }

  function HomeTab() {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <View style={[styles.header, { backgroundColor: currentTheme.primary }]}>
          <Text style={styles.logo}>VYRA v{VERSION} BUILD {BUILD}</Text>
          <Text style={styles.subLogo}>Balance: {bonusPoints} pts = {(bonusPoints/200000*5000).toFixed(0)} N | Code: {myReferralCode} | Ref: {referralStats.count}</Text>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCard}><Text style={styles.statLabel}>BONUS</Text><Text>{bonusPoints}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>TAPS</Text><Text>{totalTaps}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>PROGRESS</Text><Text>{tapCount}/50 (150 for ad)</Text></View>
        </View>
        <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={tapForProgress}><Text style={styles.yTxt}>TAP TO EARN {tapCount}/50</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.yBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: currentTheme.primary }]} onPress={watchAd}><Text style={{ color: currentTheme.primary, textAlign: 'center', fontWeight: 'bold' }}>WATCH REWARDED AD +50 {rewardedLoaded ? '(Ready)' : '(Loading)'}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.yBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: currentTheme.primary }]} onPress={watchRewardedInterstitial}><Text style={{ color: currentTheme.primary, textAlign: 'center', fontWeight: 'bold' }}>WATCH REWARDED INTERSTITIAL +50 {rewardedInterstitialLoaded ? '(Ready)' : '(Loading)'}</Text></TouchableOpacity>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CPX Research Surveys - Earn Extra</Text>
          <CpxOfferwall user={{ ...user, uid: auth.currentUser?.uid, email: user?.email || loginEmail }} />
          <Text style={{ fontSize: 10, color: '#666', marginTop: 8 }}>Secure IDs hidden. No IDs visible.</Text>
        </View>
        {/* BUILD 27 - Cike kasan */}
        <View style={[styles.card, { borderWidth: 1, borderColor: currentTheme.border || '#D4AF37' }]}>
          <Text style={styles.cardTitle}>🔥 Daily Streak - 3 days - Keep it going! +20 pts tomorrow</Text>
          <View style={{ backgroundColor: '#333', height: 6, borderRadius: 3, marginTop: 8 }}><View style={{ width: '60%', height: '100%', backgroundColor: currentTheme.primary, borderRadius: 3 }} /></View>
        </View>
        <View style={[styles.card, { borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View><Text style={styles.cardTitle}>Refer & Earn</Text><Text style={{ fontSize: 12, color: currentTheme.muted || '#666' }}>50 pts per friend</Text></View>
          <TouchableOpacity style={{ backgroundColor: currentTheme.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>Share</Text></TouchableOpacity>
        </View>
        <View style={[styles.card, { borderWidth: 1 }]}>
          <Text style={styles.cardTitle}>🏆 Top Earners Today - Alex 1240 pts, Mia 980 pts, Jordan 750 pts</Text>
        </View>
        <View style={[styles.card, { backgroundColor: currentTheme.primary }]}>
          <Text style={{ fontWeight: 'bold', color: '#000' }}>Earn More with Surveys - Up to 200 pts daily</Text>
          <Text style={{ fontSize: 12, color: '#222', marginTop: 2 }}>Complete surveys for up to 200 pts</Text>
        </View>
        <View style={{ alignItems: 'center', marginVertical: 10 }}><BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} /></View>
      </ScrollView>
    );
  }

  function OffersTab({ navigation }) {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <Text style={styles.sec}>OFFERS - 7 REAL + INTERSTITIAL</Text>
        {REAL_OFFERS.map(o => (
          <View key={o.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: o.color }]}>
            <Text style={styles.itemTitle}>{o.name} - {o.reward} pts</Text><Text style={styles.itemCode}>Code: {o.code} | {o.desc}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[styles.joinBtn, { backgroundColor: o.color }]} onPress={() => handleJoinOffer(o)}><Text style={styles.joinTxt}>COMPLETE</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.joinBtn, { backgroundColor: '#333' }]} onPress={watchAd}><Text style={styles.joinTxt}>AD</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.joinBtn, { backgroundColor: currentTheme.primary }]} onPress={() => navigation.navigate('Proof', { offer: o })}><Text style={styles.joinTxt}>PROOF</Text></TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ alignItems: 'center', marginVertical: 10 }}><BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} /></View>
      </ScrollView>
    );
  }
  function ProofScreen({ route }) {
    const offer = route.params.offer;
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ padding: 15 }}>
        <Text style={styles.sec}>Submit Proof for {offer.name}</Text>
        <View style={styles.card}>
          <TextInput style={styles.input} placeholder="Paste screenshot link or write proof" value={proofText} onChangeText={setProofText} multiline />
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={handleProofSubmit}><Text style={styles.yTxt}>SUBMIT PROOF +{offer.reward}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
  function OffersStack() {
    return (
      <Stack.Navigator>
        <Stack.Screen name="OffersList" options={{ headerShown: false }}>{props => <OffersTab {...props} />}</Stack.Screen>
        <Stack.Screen name="Proof" component={ProofScreen} options={{ title: 'Submit Proof' }} />
      </Stack.Navigator>
    );
  }

  function WalletTab() {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <Text style={styles.sec}>WALLET - Naira 200k=5k | USD 300k=$5</Text>
        <View style={styles.card}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Balance: {bonusPoints} pts = {(bonusPoints/200000*5000).toFixed(0)} N / {(bonusPoints/300000*5).toFixed(2)} USD</Text>
          <Text style={{ fontSize: 11, marginBottom: 5 }}>Method:</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
            {WITHDRAW_METHODS.map(m => (
              <TouchableOpacity key={m} onPress={() => setWithdrawMethod(m)} style={[styles.methodBtn, { backgroundColor: withdrawMethod === m ? currentTheme.primary : '#eee' }]}>
                <Text style={{ color: withdrawMethod === m ? '#fff' : '#333', fontSize: 11 }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {withdrawMethod === 'Airtime' && (
            <>
              <Text style={{ fontSize: 11, marginBottom: 5 }}>Network:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                {WITHDRAW_NETWORKS.map(n => (
                  <TouchableOpacity key={n} onPress={() => setWithdrawNetwork(n)} style={[styles.methodBtn, { backgroundColor: withdrawNetwork === n ? currentTheme.primary : '#eee' }]}>
                    <Text style={{ color: withdrawNetwork === n ? '#fff' : '#333', fontSize: 11 }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          <TextInput style={styles.input} placeholder="Amount Min 200k / 300k USD" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Bank/Wallet Name / PayPal Email" value={bankName} onChangeText={setBankName} />
          <TextInput style={styles.input} placeholder="Account Number / USDT BEP20 / Phone" value={accountNumber} onChangeText={setAccountNumber} />
          <TextInput style={styles.input} placeholder="Account Name" value={accountName} onChangeText={setAccountName} />
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={handleWithdraw}><Text style={styles.yTxt}>WITHDRAW {withdrawMethod.toUpperCase()} {withdrawMethod==='Airtime'? withdrawNetwork : ''}</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }
  function SettingsTab() {
    return (
      <ScrollView style={styles.page} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <Text style={styles.sec}>SETTINGS - EmailJS OK - Ads New 448... - BUILD 27</Text>
        <View style={styles.card}>
          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Theme: {currentTheme.name} | Referrals: {referralStats.count}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {APP_THEMES.map((th, i) => (
              <TouchableOpacity key={th.name} onPress={async () => { setThemeIndex(i); await AsyncStorage.setItem('themeIndex', String(i)); }} style={[styles.themeDot, { backgroundColor: th.primary, borderWidth: themeIndex === i ? 3 : 0, borderColor: '#000' }]}>
                <Text style={{ color: '#fff', fontSize: 7, textAlign: 'center' }}>{th.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => setShowTerms(true)}><Text style={styles.yTxt}>TERMS</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => setShowPrivacy(true)}><Text style={styles.yTxt}>PRIVACY</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => setShowAbout(true)}><Text style={styles.yTxt}>ABOUT</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: '#b00020' }]} onPress={handleLogout}><Text style={styles.yTxt}>LOG OUT</Text></TouchableOpacity>
        </View>
        <Modal visible={showTerms} animationType="slide" onRequestClose={() => setShowTerms(false)}><ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50 }}><Text style={styles.authTitle}>Terms</Text><Text>{TERMS_TEXT}</Text><TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => setShowTerms(false)}><Text style={styles.yTxt}>CLOSE</Text></TouchableOpacity></ScrollView></Modal>
        <Modal visible={showPrivacy} animationType="slide" onRequestClose={() => setShowPrivacy(false)}><ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50 }}><Text style={styles.authTitle}>Privacy</Text><Text>{PRIVACY_TEXT}</Text><TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => setShowPrivacy(false)}><Text style={styles.yTxt}>CLOSE</Text></TouchableOpacity></ScrollView></Modal>
        <Modal visible={showAbout} animationType="slide" onRequestClose={() => setShowAbout(false)}><ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50 }}><Text style={styles.authTitle}>About v{VERSION} BUILD {BUILD}</Text><Text>EmailJS: OK {EMAILJS_SERVICE}{'\n'}Ads: 4487679675698542 - 5 Units (New){'\n'}Backend: Secure{'\n'}Contact: vyraprosupport@gmail.com</Text><TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => setShowAbout(false)}><Text style={styles.yTxt}>CLOSE</Text></TouchableOpacity></ScrollView></Modal>
      </ScrollView>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: currentTheme.primary,
        tabBarInactiveTintColor: '#888888',
        tabBarStyle: { backgroundColor: '#ffffff', borderTopColor: '#dddddd' },
        tabBarIcon: ({ color, size }) => {
          const icons = { Home: '🏠', Offers: '🎁', Wallet: '👛', Settings: '⚙️' };
          return <Text style={{ color, fontSize: Math.min(size, 23) }}>{icons[route.name] || '•'}</Text>;
        }
      })}>
        <Tab.Screen name="Home" component={HomeTab} />
        <Tab.Screen name="Offers" component={OffersStack} />
        <Tab.Screen name="Wallet" component={WalletTab} />
        <Tab.Screen name="Settings" component={SettingsTab} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = {
  page: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 15, borderRadius: 10, marginBottom: 10 },
  logo: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  subLogo: { color: '#fff', fontSize: 10, marginTop: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statCard: { backgroundColor: '#fff', padding: 10, borderRadius: 8, flex: 1, marginHorizontal: 3, alignItems: 'center' },
  statLabel: { fontSize: 10, color: '#666' },
  sec: { fontWeight: 'bold', marginBottom: 8 },
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10 },
  cardTitle: { fontWeight: 'bold', marginBottom: 8 },
  itemTitle: { fontWeight: 'bold' },
  itemCode: { fontSize: 11, color: '#666' },
  joinBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 5 },
  joinTxt: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  yBtn: { backgroundColor: '#6a00f4', padding: 12, borderRadius: 8, marginVertical: 5 },
  yTxt: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  methodBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, margin: 3 },
  themeDot: { width: 50, height: 50, borderRadius: 25, margin: 5, justifyContent: 'center', alignItems: 'center' },
  auth: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  authTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }
};
