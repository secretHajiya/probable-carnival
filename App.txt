import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Share, Linking, ActivityIndicator, Modal, AppState, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, getIdToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import mobileAds, { BannerAd, BannerAdSize, RewardedAd, InterstitialAd, RewardedInterstitialAd, AppOpenAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';

const VERSION = '1.0.9';
const BUILD = '27 FIXED OPEN SAFE';

const firebaseConfig = {
  apiKey: "AIzaSyB7r7F7Q7Q7Q7Q7Q",
  authDomain: "vyra-rewards-pro.firebaseapp.com",
  projectId: "vyra-rewards-pro",
  storageBucket: "vyra-rewards-pro.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:android:abcdef"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BACKEND_URL = 'https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev';
const HIDDEN_GLOBAL = 'VYRAGJVOP1';
const HIDDEN_APP = '37222';
const CPX_HASH = 'zq6KgHGIgOujXyncpghe4Nb1sIdDf0ph';

const BANNER_ID = 'ca-app-pub-4487679675698542/1234567890';
const REWARDED_ID = 'ca-app-pub-4487679675698542/2345678901';
const INTERSTITIAL_ID = 'ca-app-pub-4487679675698542/3456789012';
const REWARDED_INTER_ID = 'ca-app-pub-4487679675698542/4567890123';
const APP_OPEN_ID = 'ca-app-pub-4487679675698542/5678901234';

const APP_THEMES = [
  { name: 'Gold Pro', primary: '#D4AF37', background: '#0A0A0A', card: '#1A1A1A', text: '#FFFFFF', muted: '#888888', border: '#333333', input: '#222222', tab: '#111111' },
  { name: 'Default', primary: '#6200EE', background: '#F5F5F5', card: '#FFFFFF', text: '#000000', muted: '#666666', border: '#E0E0E0', input: '#FFFFFF', tab: '#FFFFFF' },
  { name: 'Ocean', primary: '#2196F3', background: '#E3F2FD', card: '#FFFFFF', text: '#0D47A1', muted: '#64B5F6', border: '#BBDEFB', input: '#FFFFFF', tab: '#FFFFFF' },
  { name: 'Forest', primary: '#4CAF50', background: '#E8F5E9', card: '#FFFFFF', text: '#1B5E20', muted: '#81C784', border: '#C8E6C9', input: '#FFFFFF', tab: '#FFFFFF' },
  { name: 'Sunset', primary: '#FF5722', background: '#FBE9E7', card: '#FFFFFF', text: '#BF360C', muted: '#FF8A65', border: '#FFCCBC', input: '#FFFFFF', tab: '#FFFFFF' },
  { name: 'Dark', primary: '#BB86FC', background: '#121212', card: '#1E1E1E', text: '#FFFFFF', muted: '#9E9E9E', border: '#2C2C2C', input: '#2C2C2C', tab: '#121212' },
];

const REAL_OFFERS = [
  { id: 1, name: 'PalmPay', desc: 'Open PalmPay account and fund', reward: 5000, code: 'PALM001', link: 'https://palmpay.com', color: '#7B2CBF' },
  { id: 2, name: 'Opay', desc: 'Register Opay and do KYC', reward: 5000, code: 'OPAY001', link: 'https://opay.com', color: '#00C853' },
  { id: 3, name: 'Moniepoint', desc: 'Moniepoint personal account', reward: 6000, code: 'MONIE001', link: 'https://moniepoint.com', color: '#2962FF' },
  { id: 4, name: 'FairMoney', desc: 'FairMoney loan account', reward: 4500, code: 'FAIR001', link: 'https://fairmoney.io', color: '#FF6D00' },
  { id: 5, name: 'Carbon', desc: 'Carbon account opening', reward: 4000, code: 'CARB001', link: 'https://getcarbon.co', color: '#AA00FF' },
  { id: 6, name: 'Branch', desc: 'Branch loan app install', reward: 4000, code: 'BRANCH01', link: 'https://branch.com', color: '#00B8D4' },
  { id: 7, name: 'Kuda', desc: 'Kuda bank account', reward: 5500, code: 'KUDA001', link: 'https://kuda.com', color: '#6A1B9A' },
  { id: 8, name: 'PiggyVest', desc: 'PiggyVest savings', reward: 3500, code: 'PIGGY01', link: 'https://piggyvest.com', color: '#0D47A1' },
];

const WITHDRAW_METHODS = ['Bank Transfer', 'Opay', 'PalmPay', 'Moniepoint', 'Kuda', 'PayPal', 'USDT BEP20', 'Airtime'];
const WITHDRAW_NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];

const CpxOfferwall = ({ user }) => {
  return (
    <View style={{ padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8, marginTop: 10 }}>
      <Text>CPX Surveys for {user?.email || 'user'}</Text>
      <Text style={{ fontSize: 10, color: '#888' }}>Hash secured: {CPX_HASH.substring(0,8)}...</Text>
    </View>
  );
};

const TERMS_TEXT = `
Vyra Rewards Terms and Conditions
Last updated: 2026

1. By using Vyra Rewards, you agree to complete offers honestly.
2. Fake proof will lead to account suspension.
3. Rewards are processed within 24-72 hours after verification.
4. Minimum withdrawal is 10,000 points = $10.
5. We reserve right to verify any submission.
6. Multiple accounts are not allowed.
7. By completing offers you agree to third party terms.
8. Vyra is not responsible for third party app issues.
`;

const PRIVACY_TEXT = `
Vyra Rewards Privacy Policy
We collect email, UID, tap progress, offer submissions.
We use Firebase and AdMob for authentication and ads.
We do not sell your data.
You can request data deletion via support email.
`;

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [usedReferralCode, setUsedReferralCode] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [themeIndex, setThemeIndex] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [proofUrl, setProofUrl] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Bank Transfer');
  const [withdrawNetwork, setWithdrawNetwork] = useState('MTN');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedInterstitialLoaded, setRewardedInterstitialLoaded] = useState(false);
  const [appOpenLoaded, setAppOpenLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  const rewardedRef = useRef(null);
  const interstitialRef = useRef(null);
  const rewardedInterRef = useRef(null);
  const appOpenRef = useRef(null);
  const appOpenLoadedRef = useRef(false);
  const appOpenShownRef = useRef(false);
  const appOpenRetryRef = useRef(0);
  const tapRef = useRef(null);
  const lastSaveRef = useRef(0);
  const canTapRef = useRef(true);

  const getSafeUid = () => {
    try { return auth?.currentUser?.uid || user?.uid || 'unknown'; }
    catch { return 'unknown'; }
  };

  // FIXED - Anti crash fallback
  const currentTheme = (APP_THEMES && APP_THEMES[themeIndex]) ? APP_THEMES[themeIndex] : APP_THEMES[0];

  const callBackend = async (path, method = 'GET', body = null) => {
    try {
      const token = auth?.currentUser ? await getIdToken(auth.currentUser) : null; // FIXED safe
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const options = { method, headers };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(`${BACKEND_URL}${path}`, options);
      const json = await res.json();
      return json;
    } catch (e) {
      console.log('Backend error', e);
      return { success: false, error: e.message };
    }
  };

  const loadInitialData = async () => {
    try {
      const th = await AsyncStorage.getItem('themeIndex');
      if (th !== null) {
        const parsed = parseInt(th, 10) || 0;
        // FIXED - Clamp within bounds
        setThemeIndex(Math.min(Math.max(parsed, 0), APP_THEMES.length - 1));
      }
      const savedStreak = await AsyncStorage.getItem('streakDays');
      if (savedStreak !== null) setStreakDays(parseInt(savedStreak, 10) || 0);
      const savedTaps = await AsyncStorage.getItem('tapCount');
      if (savedTaps !== null) setTapCount(parseInt(savedTaps, 10) || 0);
    } catch(e) {
      console.log('loadInitial error', e);
    }
  };

  const loadUserDataFromFirebase = async (uid, email) => {
    try {
      const backendData = await callBackend(`/user?uid=${uid}`, 'GET');
      if (backendData && backendData.points !== undefined) {
        setTotalPoints(backendData.points || 0);
        setBonusPoints(backendData.bonus || 0);
        setTapCount(backendData.taps || 0);
        setStreakDays(backendData.streak || 0);
      }
    } catch(e) {
      console.log('loadUserData error', e);
    }
  };

  // FIXED OPEN AD SAFE - SLOW SHOW - BA ZAI YI KEEP STOPPING BA
  const initAdsSafe = () => {
    try {
      mobileAds().initialize().then(() => {
        console.log('Ads initialized');

        // Rewarded
        const rewarded = RewardedAd.createForAdRequest(REWARDED_ID);
        rewardedRef.current = rewarded;
        rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
        rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
          setBonusPoints(p => p + 50);
          await callBackend('/reward', 'POST', { type: 'ad_reward', amount: 50 });
        });
        rewarded.addAdEventListener(AdEventType.CLOSED, () => { setRewardedLoaded(false); rewarded.load(); });
        rewarded.addAdEventListener(AdEventType.ERROR, e => { setRewardedLoaded(false); console.log('Rewarded error', e); });
        rewarded.load();

        // Interstitial
        const inter = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);
        interstitialRef.current = inter;
        inter.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
        inter.addAdEventListener(AdEventType.CLOSED, () => { setInterstitialLoaded(false); inter.load(); });
        inter.addAdEventListener(AdEventType.ERROR, e => { setInterstitialLoaded(false); console.log('Inter error', e); });
        inter.load();

        // Rewarded Interstitial
        const rewardedInter = RewardedInterstitialAd.createForAdRequest(REWARDED_INTER_ID);
        rewardedInterRef.current = rewardedInter;
        rewardedInter.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedInterstitialLoaded(true));
        rewardedInter.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
          setBonusPoints(p => p + 100);
          await callBackend('/reward', 'POST', { type: 'inter_reward', amount: 100 });
        });
        rewardedInter.addAdEventListener(AdEventType.CLOSED, () => { setRewardedInterstitialLoaded(false); rewardedInter.load(); });
        rewardedInter.addAdEventListener(AdEventType.ERROR, e => { setRewardedInterstitialLoaded(false); console.log('Rewarded inter error', e); });
        rewardedInter.load();

        // APP OPEN - FIXED SLOW SAFE - NO AUTO SHOW IN LOADED
        const loadAppOpenSafe = () => {
          try {
            const appOpen = AppOpenAd.createForAdRequest(APP_OPEN_ID);
            appOpenRef.current = appOpen;
            appOpen.addAdEventListener(AdEventType.LOADED, () => {
              console.log('AppOpen loaded - ready');
              appOpenLoadedRef.current = true;
              setAppOpenLoaded(true);
              appOpenRetryRef.current = 0;
              // KADA KA YI SHOW ANAN - WANNAN NE DALILIN KEEP STOPPING
            });
            appOpen.addAdEventListener(AdEventType.CLOSED, () => {
              appOpenLoadedRef.current = false;
              setAppOpenLoaded(false);
              setTimeout(() => loadAppOpenSafe(), 3000);
            });
            appOpen.addAdEventListener(AdEventType.ERROR, e => {
              console.log('AppOpen error', e);
              appOpenLoadedRef.current = false;
              setAppOpenLoaded(false);
              appOpenRetryRef.current++;
              if (appOpenRetryRef.current < 3) {
                setTimeout(() => loadAppOpenSafe(), 5000 * appOpenRetryRef.current);
              }
            });
            appOpen.load();
          } catch(e) {
            console.log('AppOpen create error', e);
          }
        };
        loadAppOpenSafe();

      }).catch(e => console.log('Ads init error', e));
    } catch(e) {
      console.log('initAdsSafe error', e);
    }
  };

  useEffect(() => {
    loadInitialData();
    initAdsSafe();

    const netSub = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    // FIXED - Auth timeout 6 seconds - hana tsayawa a loading
    const authTimeout = setTimeout(() => {
      if (screen === 'loading') {
        console.log('Auth timeout - moving to login');
        setScreen('login');
      }
    }, 6000);

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(authTimeout);
      if (fbUser) {
        const u = { uid: fbUser.uid, email: fbUser.email };
        setUser(u);
        await loadUserDataFromFirebase(fbUser.uid, fbUser.email);
        setScreen('main');
      } else {
        setUser(null);
        setScreen('login');
      }
    });

    return () => {
      clearTimeout(authTimeout);
      unsubAuth();
      netSub();
    };
  }, []);

  // FIXED - SAFE OPEN AD SHOW - SLOW 7 SECONDS - BA ZAI KASHE APP BA
  useEffect(() => {
    // 1. First open - jira 7 seconds bayan main screen ya shirya
    const firstShowTimer = setTimeout(() => {
      if (appOpenLoadedRef.current && appOpenRef.current && !appOpenShownRef.current && screen === 'main' && isConnected) {
        try {
          console.log('Showing first AppOpen after 7s safe delay');
          appOpenRef.current.show();
          appOpenShownRef.current = true;
        } catch (e) {
          console.log('First AppOpen show prevented safely', e);
        }
      }
    }, 7000); // 7000ms = 7 seconds - SLOW, ba 1.2s ba

    // 2. Show on resume - idan ya dawo daga background
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        if (appOpenLoadedRef.current && appOpenRef.current && !appOpenShownRef.current && screen === 'main') {
          setTimeout(() => {
            try {
              if (appOpenRef.current && appOpenLoadedRef.current) {
                console.log('Showing AppOpen on resume');
                appOpenRef.current.show();
                appOpenShownRef.current = true;
              }
            } catch (e) {
              console.log('Resume AppOpen prevented', e);
            }
          }, 1000); // jira 1 sec bayan resume
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        setTimeout(() => {
          appOpenShownRef.current = false;
        }, 500);
      }
    });

    return () => {
      clearTimeout(firstShowTimer);
      appStateSub.remove();
    };
  }, [screen, isConnected]);

  const watchRewarded = () => {
    try {
      if (rewardedRef.current && rewardedLoaded) {
        rewardedRef.current.show();
      } else {
        console.log('Rewarded not loaded');
        rewardedRef.current?.load();
      }
    } catch (e) {
      console.log('Rewarded show error', e);
    }
  };

  const watchInterstitial = () => {
    try {
      if (interstitialRef.current && interstitialLoaded) {
        interstitialRef.current.show();
      } else {
        interstitialRef.current?.load();
      }
    } catch (e) {
      console.log('Inter show error', e);
    }
  };

  // FIXED - Tap logic da slow saving - hana fast tap crash
  const tapForProgress = async () => {
    if (!canTapRef.current) return; // hana fast tapping
    canTapRef.current = false;

    try {
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);
      await AsyncStorage.setItem('tapCount', newTapCount.toString());

      // Kowane 10 taps = 1 point
      if (newTapCount % 10 === 0) {
        setBonusPoints(prev => prev + 10);
      }

      // Kowane 50 taps - save zuwa backend - amma da slow (2 sec debounce)
      if (newTapCount % 50 === 0) {
        const now = Date.now();
        if (now - lastSaveRef.current < 2000) {
          console.log('Save debounced');
        } else {
          lastSaveRef.current = now;
          const result = await callBackend('/tap', 'POST', {
            taps: newTapCount,
            uid: getSafeUid(), // FIXED safe UID helper
            email: user?.email || loginEmail || 'unknown'
          });
          console.log('Tap save', result);
        }
      }

      // 150 taps = show interstitial
      if (newTapCount % 150 === 0) {
        watchInterstitial();
      }
    } catch (e) {
      console.log('tap error', e);
    } finally {
      setTimeout(() => { canTapRef.current = true; }, 1000); // 1000ms cooldown
    }
  };

  const EMAILJS_SERVICE = 'service_eo4mafe';
  const EMAILJS_TEMPLATE = 'template_vla0zff';
  const EMAILJS_PUBLIC = 'Ee45lolv3ZCjOSWUy';

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
    } catch (e) { console.log('EmailJS OTP error', e); return false; }
  };

  const handleRegister = async () => {
    if (!isConnected) { Alert.alert('No Internet', 'Please connect to the internet and try again.'); return; }
    if (!registerName.trim() || !registerPhone.trim() || !registerEmail.trim() || !registerPassword || !registerPasswordConfirm) {
      Alert.alert('Fill all fields', 'Please complete the required registration fields.'); return;
    }
    if (registerPassword.length < 8) { Alert.alert('Password min 8', 'Use at least 8 characters.'); return; }
    if (registerPassword !== registerPasswordConfirm) { Alert.alert('Passwords do not match'); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setEmailOtp(code);
    setOtpInput('');
    setOtpExpiresAt(Date.now() + 10 * 60 * 1000);
    const sent = await sendEmailJsOtp(registerEmail.trim(), code);
    if (!sent) { Alert.alert('Email not sent', 'EmailJS could not send the verification code. Please check the EmailJS service/template settings and try again.'); return; }
    setScreen('otp');
  };

  const verifyOtpAndSave = async () => {
    if (Date.now() > otpExpiresAt) { Alert.alert('OTP expired', 'Please register again to request a new code.'); setScreen('register'); return; }
    if (otpInput.trim() !== emailOtp) { Alert.alert('Invalid OTP', 'Please enter the code sent to your email.'); return; }
    try {
      const cred = await createUserWithEmailAndPassword(auth, registerEmail.trim(), registerPassword);
      const myCode = 'VYRA' + Math.floor(1000 + Math.random() * 9000);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: registerName.trim(), phone: registerPhone.trim(), email: registerEmail.trim(),
        points: 0, bonus: 0, taps: 0, bonusPoints: 100, totalTaps: 0, tapCount: 0,
        myReferralCode: myCode, usedReferralCode: usedReferralCode.trim() || null,
        createdAt: serverTimestamp()
      });
      await callBackend('/register', 'POST', { name: registerName.trim(), phone: registerPhone.trim(), email: registerEmail.trim(), myReferralCode: myCode, usedReferralCode: usedReferralCode.trim() });
      await AsyncStorage.setItem('lastUserEmail', registerEmail.trim());
      setUser({ uid: cred.user.uid, email: registerEmail.trim(), name: registerName.trim(), phone: registerPhone.trim() });
      setBonusPoints(100);
      setScreen('main');
    } catch (e) { Alert.alert('Registration failed', e?.message || 'Please try again.'); }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return alert('Fill email and password');
    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setUser({ uid: cred.user.uid, email: cred.user.email });
      setScreen('main');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSignup = async () => {
    if (!loginEmail || !loginPassword) return alert('Fill email and password');
    try {
      const cred = await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: loginEmail,
        points: 0,
        bonus: 0,
        taps: 0,
        createdAt: serverTimestamp()
      });
      setUser({ uid: cred.user.uid, email: cred.user.email });
      setScreen('main');
    } catch (e) {
      alert(e.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setScreen('login');
    } catch (e) {
      console.log('logout error', e);
    }
  };

  const handleThemeChange = async (idx) => {
    try {
      setThemeIndex(idx);
      await AsyncStorage.setItem('themeIndex', idx.toString());
    } catch(e) {
      console.log('theme save error', e);
    }
  };

  const submitOfferProof = async (offerId, offerName) => {
    if (!proofUrl) return alert('Add proof link or screenshot url');
    try {
      const payload = {
        userId: auth?.currentUser?.uid || user?.uid || 'unknown', // FIXED safe
        email: user?.email || loginEmail,
        offerId: offerId,
        offerName: offerName,
        proof: proofUrl,
        hiddenGlobal: HIDDEN_GLOBAL,
        hiddenApp: HIDDEN_APP,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const result = await callBackend('/offer-proof', 'POST', payload);
      if (result && result.success !== false) {
        alert('Proof submitted! We will verify in 24h');
        setProofUrl('');
        watchInterstitial();
      } else {
        alert(result.error || 'Submit failed, try again');
      }
    } catch (e) {
      alert('Submit error: ' + e.message);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseInt(withdrawAmount, 10);
    if (!amt || amt < 10000) return alert('Minimum 10,000 points ($10)');
    if (totalPoints + bonusPoints < amt) return alert('Not enough points');
    if (!withdrawNumber) return alert('Add account number');
    try {
      const payload = {
        userId: auth?.currentUser?.uid || user?.uid || 'unknown', // FIXED safe
        email: user?.email || loginEmail,
        method: withdrawMethod,
        network: withdrawMethod === 'Airtime' ? withdrawNetwork : null,
        number: withdrawNumber,
        amount: amt,
        status: 'pending'
      };
      const result = await callBackend('/withdraw', 'POST', payload);
      if (result && result.success !== false) {
        alert('Withdrawal requested! 24-72h');
        setWithdrawAmount('');
        setWithdrawNumber('');
      } else {
        alert(result.error || 'Withdraw failed');
      }
    } catch (e) {
      alert('Withdraw error: ' + e.message);
    }
  };

  const Tab = createBottomTabNavigator();
  const Stack = createStackNavigator();

  function HomeTab() {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15 }}>
        <View style={[styles.header, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.logo, { color: currentTheme.primary }]}>VYRA REWARDS PRO BUILD {BUILD}</Text>
          <Text style={[styles.subLogo, { color: currentTheme.muted }]}>Tap to Earn - Watch Ads - Complete Offers - {streakDays} Day Streak</Text>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
            <Text style={[styles.statLabel, { color: currentTheme.muted }]}>TAPS</Text>
            <Text style={{ color: currentTheme.text, fontWeight: 'bold', fontSize: 16 }}>{tapCount}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
            <Text style={[styles.statLabel, { color: currentTheme.muted }]}>BONUS</Text>
            <Text style={{ color: currentTheme.primary, fontWeight: 'bold', fontSize: 16 }}>{bonusPoints}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
            <Text style={[styles.statLabel, { color: currentTheme.muted }]}>TOTAL</Text>
            <Text style={{ color: currentTheme.text, fontWeight: 'bold', fontSize: 16 }}>{totalPoints + bonusPoints}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={tapForProgress}>
          <Text style={styles.yTxt}>TAP TO EARN ({tapCount} / 150)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.yBtn, { backgroundColor: '#4CAF50' }]} onPress={watchRewarded}>
          <Text style={styles.yTxt}>WATCH REWARDED AD +50 POINTS {rewardedLoaded ? '(READY)' : '(LOADING)'}</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} />
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1, marginTop: 15 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>How to Earn</Text>
          <Text style={[styles.cardDesc, { color: currentTheme.muted }]}>1. Tap 10 times = 10 points</Text>
          <Text style={[styles.cardDesc, { color: currentTheme.muted }]}>2. Watch ads for bonus</Text>
          <Text style={[styles.cardDesc, { color: currentTheme.muted }]}>3. Complete real offers like PalmPay, Opay etc and submit proof</Text>
          <Text style={[styles.cardDesc, { color: currentTheme.muted }]}>4. Withdraw minimum 10k points</Text>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>CPX Research Surveys</Text>
          <CpxOfferwall user={{ ...(user||{}), uid: auth?.currentUser?.uid || user?.uid || 'test', email: user?.email || loginEmail || 'test@test.com' }} />
        </View>
      </ScrollView>
    );
  }

  function OffersTab({ navigation }) {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Real Offers - Complete & Earn</Text>
        {REAL_OFFERS.map(offer => (
          <View key={offer.id} style={[styles.offerCard, { borderColor: currentTheme.border, backgroundColor: currentTheme.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[styles.offerName, { color: currentTheme.text }]}>{offer.name}</Text>
              <Text style={{ color: offer.color, fontWeight: 'bold' }}>{offer.reward} pts</Text>
            </View>
            <Text style={[styles.offerDesc, { color: currentTheme.muted }]}>{offer.desc}</Text>
            <Text style={{ color: currentTheme.muted, fontSize: 10, marginTop: 2 }}>Code: {offer.code} | {HIDDEN_GLOBAL}-{offer.code}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: offer.color }]} onPress={() => { Linking.openURL(offer.link); watchInterstitial(); }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>OPEN LINK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: currentTheme.primary }]} onPress={() => navigation.navigate('Proof', { offer: offer })}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>SUBMIT PROOF</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        <View style={{ marginTop: 10, alignItems: 'center' }}>
          <BannerAd unitId={BANNER_ID} size={BannerAdSize.MEDIUM_RECTANGLE} />
        </View>
      </ScrollView>
    );
  }

  function ProofTab({ route }) {
    const offer = route?.params?.offer;
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Submit Proof for {offer?.name || 'Offer'}</Text>
        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.label, { color: currentTheme.muted }]}>Offer</Text>
          <Text style={{ color: currentTheme.text, marginBottom: 10 }}>{offer?.name} - {offer?.reward} pts</Text>
          <Text style={[styles.label, { color: currentTheme.muted }]}>Proof Link / Screenshot URL</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="https://..." placeholderTextColor={currentTheme.muted} value={proofUrl} onChangeText={setProofUrl} />
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => submitOfferProof(offer?.id, offer?.name)}>
            <Text style={styles.yTxt}>SUBMIT PROOF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: '#4CAF50', marginTop: 10 }]} onPress={() => { Share.share({ message: `I am earning with Vyra Rewards Pro! Use code ${offer?.code} - ${HIDDEN_APP}` }); }}>
            <Text style={styles.yTxt}>SHARE OFFER</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function WalletTab() {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Wallet - {totalPoints + bonusPoints} Points</Text>
        
        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Balance</Text>
          <Text style={{ color: currentTheme.primary, fontSize: 28, fontWeight: 'bold' }}>${((totalPoints + bonusPoints)/1000).toFixed(2)}</Text>
          <Text style={{ color: currentTheme.muted, fontSize: 12 }}>{totalPoints} base + {bonusPoints} bonus = {totalPoints+bonusPoints} total</Text>
          <Text style={{ color: currentTheme.muted, fontSize: 10, marginTop: 4 }}>AppOpen Loaded: {appOpenLoaded ? 'YES READY (7s safe)' : 'Loading...'} | Connected: {isConnected ? 'YES' : 'NO'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Withdraw</Text>
          
          <Text style={[styles.label, { color: currentTheme.muted }]}>Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
            {WITHDRAW_METHODS.map(m => (
              <TouchableOpacity key={m} style={[styles.chip, { backgroundColor: withdrawMethod===m ? currentTheme.primary : currentTheme.input, borderColor: currentTheme.border }]} onPress={() => setWithdrawMethod(m)}>
                <Text style={{ color: withdrawMethod===m ? '#fff' : currentTheme.text, fontSize: 12 }}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {withdrawMethod === 'Airtime' && (
            <>
              <Text style={[styles.label, { color: currentTheme.muted }]}>Network</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {WITHDRAW_NETWORKS.map(n => (
                  <TouchableOpacity key={n} style={[styles.chip, { backgroundColor: withdrawNetwork===n ? currentTheme.primary : currentTheme.input, borderColor: currentTheme.border }]} onPress={() => setWithdrawNetwork(n)}>
                    <Text style={{ color: withdrawNetwork===n ? '#fff' : currentTheme.text, fontSize: 12 }}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={[styles.label, { color: currentTheme.muted }]}>Account Number / PayPal Email / USDT Address</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Enter number" placeholderTextColor={currentTheme.muted} value={withdrawNumber} onChangeText={setWithdrawNumber} />

          <Text style={[styles.label, { color: currentTheme.muted }]}>Amount (min 10000)</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="10000" placeholderTextColor={currentTheme.muted} keyboardType="numeric" value={withdrawAmount} onChangeText={setWithdrawAmount} />

          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={handleWithdraw}>
            <Text style={styles.yTxt}>REQUEST WITHDRAW</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} />
        </View>
      </ScrollView>
    );
  }

  function SettingsTab() {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Settings</Text>
        
        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>User</Text>
          <Text style={{ color: currentTheme.muted }}>{user?.email || 'No user'} - UID: {(auth?.currentUser?.uid || user?.uid || '').substring(0,10)}...</Text>
          <Text style={{ color: currentTheme.muted, fontSize: 10, marginTop: 4 }}>BUILD {BUILD} - Open Ad Safe 7s</Text>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Theme</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
            {APP_THEMES.map((th, idx) => (
              <TouchableOpacity key={th.name} style={{ width: '48%', padding: 12, borderRadius: 8, marginBottom: 8, marginRight: idx%2===0 ? '4%' : 0, backgroundColor: themeIndex===idx ? th.primary : currentTheme.input, borderWidth: 1, borderColor: currentTheme.border }} onPress={() => handleThemeChange(idx)}>
                <Text style={{ color: themeIndex===idx ? '#fff' : currentTheme.text, fontWeight: 'bold', fontSize: 12 }}>{th.name}</Text>
                <View style={{ height: 10, backgroundColor: th.primary, borderRadius: 5, marginTop: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.input, borderWidth: 1, borderColor: currentTheme.border }]} onPress={() => setShowTerms(true)}>
            <Text style={{ color: currentTheme.text, textAlign: 'center', fontWeight: 'bold' }}>TERMS & CONDITIONS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.input, borderWidth: 1, borderColor: currentTheme.border }]} onPress={() => setShowPrivacy(true)}>
            <Text style={{ color: currentTheme.text, textAlign: 'center', fontWeight: 'bold' }}>PRIVACY POLICY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.input, borderWidth: 1, borderColor: currentTheme.border }]} onPress={() => setShowAbout(true)}>
            <Text style={{ color: currentTheme.text, textAlign: 'center', fontWeight: 'bold' }}>ABOUT BUILD {BUILD}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: '#E53935', marginTop: 10 }]} onPress={handleLogout}>
            <Text style={styles.yTxt}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function LoginScreen() {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: currentTheme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 20, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1, alignItems: 'center' }]}>
          <Text style={[styles.logo, { color: currentTheme.primary, fontSize: 28 }]}>VYRA PRO</Text>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1, marginTop: 20 }]}>
          <Text style={[styles.label, { color: currentTheme.muted }]}>Email</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="email@example.com" placeholderTextColor={currentTheme.muted} value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" />
          
          <Text style={[styles.label, { color: currentTheme.muted }]}>Password</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Password" placeholderTextColor={currentTheme.muted} value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />

          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={handleLogin}>
            <Text style={styles.yTxt}>LOGIN</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.card, borderWidth: 1, borderColor: currentTheme.primary }]} onPress={() => setScreen('register')}>
            <Text style={{ color: currentTheme.primary, textAlign: 'center', fontWeight: 'bold' }}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={async () => { if(!loginEmail) return alert('Enter email first'); try { await sendPasswordResetEmail(auth, loginEmail); alert('Reset email sent'); } catch(e) { alert(e.message); } }}>
            <Text style={{ color: currentTheme.primary, textAlign: 'center', marginTop: 10 }}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <BannerAd unitId={BANNER_ID} size={BannerAdSize.BANNER} />
        </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  const OffersStack = () => {
    return (
      <Stack.Navigator>
        <Stack.Screen name="OffersList" component={OffersTab} options={{ headerShown: false }} />
        <Stack.Screen name="Proof" component={ProofTab} options={{ title: 'Submit Proof', headerStyle: { backgroundColor: currentTheme.card }, headerTintColor: currentTheme.text }} />
      </Stack.Navigator>
    );
  };

  function MainTabs() {
    return (
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: currentTheme.tab, borderTopColor: currentTheme.border },
          tabBarActiveTintColor: currentTheme.primary,
          tabBarInactiveTintColor: currentTheme.muted,
          headerShown: false
        }}
      >
        <Tab.Screen name="Home" component={HomeTab} />
        <Tab.Screen name="Offers" component={OffersStack} />
        <Tab.Screen name="Wallet" component={WalletTab} />
        <Tab.Screen name="Settings" component={SettingsTab} />
      </Tab.Navigator>
    );
  }

  if (screen === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={{ color: currentTheme.muted, marginTop: 10 }}>Loading Vyra Pro {BUILD}...</Text>
        <Text style={{ color: currentTheme.muted, fontSize: 10, marginTop: 4 }}>Open Ad Safe 7s - Anti Keep Stopping</Text>
      </View>
    );
  }

  if (screen === 'register') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: currentTheme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={[styles.auth, { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: currentTheme.background }]} keyboardShouldPersistTaps="handled">
            <Text style={[styles.authTitle, { color: currentTheme.primary }]}>Create Account</Text>
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Full Name" placeholderTextColor={currentTheme.muted} value={registerName} onChangeText={setRegisterName} autoCapitalize="words" />
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Phone" placeholderTextColor={currentTheme.muted} value={registerPhone} onChangeText={setRegisterPhone} keyboardType="phone-pad" />
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Email" placeholderTextColor={currentTheme.muted} value={registerEmail} onChangeText={setRegisterEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Referral Code (Optional)" placeholderTextColor={currentTheme.muted} value={usedReferralCode} onChangeText={setUsedReferralCode} autoCapitalize="characters" />
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Password min 8" placeholderTextColor={currentTheme.muted} secureTextEntry value={registerPassword} onChangeText={setRegisterPassword} />
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Confirm Password" placeholderTextColor={currentTheme.muted} secureTextEntry value={registerPasswordConfirm} onChangeText={setRegisterPasswordConfirm} />
            <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={handleRegister}><Text style={styles.yTxt}>REGISTER & GET CODE</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setScreen('login')} style={{ padding: 12 }}><Text style={{ color: currentTheme.text, textAlign: 'center' }}>Already have account? LOGIN</Text></TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  if (screen === 'otp') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: currentTheme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={[styles.auth, { flexGrow: 1, padding: 20, justifyContent: 'center', backgroundColor: currentTheme.background }]} keyboardShouldPersistTaps="handled">
            <Text style={[styles.authTitle, { color: currentTheme.primary }]}>Verify Your Email</Text>
            <Text style={{ color: currentTheme.muted, marginBottom: 12 }}>Enter the 6-digit code sent to {registerEmail}.</Text>
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Enter 6-digit OTP" placeholderTextColor={currentTheme.muted} value={otpInput} onChangeText={setOtpInput} keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={verifyOtpAndSave}><Text style={styles.yTxt}>VERIFY OTP</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setScreen('register')} style={{ padding: 12 }}><Text style={{ color: currentTheme.text, textAlign: 'center' }}>Back to registration</Text></TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  return (
    <NavigationContainer>
      {screen === 'login' ? <LoginScreen /> : <MainTabs />}

      <Modal visible={showTerms} animationType="slide" onRequestClose={() => setShowTerms(false)}>
        <View style={[styles.page, { backgroundColor: currentTheme.background, padding: 15 }]}>
          <ScrollView>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Terms & Conditions</Text>
            <Text style={{ color: currentTheme.text }}>{TERMS_TEXT}</Text>
            <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary, marginTop: 20 }]} onPress={() => setShowTerms(false)}>
              <Text style={styles.yTxt}>CLOSE</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPrivacy} animationType="slide" onRequestClose={() => setShowPrivacy(false)}>
        <View style={[styles.page, { backgroundColor: currentTheme.background, padding: 15 }]}>
          <ScrollView>
            <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Privacy Policy</Text>
            <Text style={{ color: currentTheme.text }}>{PRIVACY_TEXT}</Text>
            <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary, marginTop: 20 }]} onPress={() => setShowPrivacy(false)}>
              <Text style={styles.yTxt}>CLOSE</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showAbout} animationType="slide" onRequestClose={() => setShowAbout(false)}>
        <View style={[styles.page, { backgroundColor: currentTheme.background, padding: 15, justifyContent: 'center' }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>About Vyra Pro</Text>
          <Text style={{ color: currentTheme.muted, marginTop: 10 }}>Version {VERSION} Build {BUILD}</Text>
          <Text style={{ color: currentTheme.muted, marginTop: 5 }}>Fixed Open Ad - 7 seconds slow show - Anti Keep Stopping</Text>
          <Text style={{ color: currentTheme.muted, marginTop: 5 }}>Themes: 6 | Tap Safe: 1000ms cooldown | Backend Safe</Text>
          <Text style={{ color: currentTheme.muted, marginTop: 5 }}>User: {user?.email || loginEmail || 'none'}</Text>
          <Text style={{ color: currentTheme.muted, marginTop: 5 }}>Ads: Banner, Rewarded, Interstitial, AppOpen Safe</Text>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary, marginTop: 20 }]} onPress={() => setShowAbout(false)}>
            <Text style={styles.yTxt}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </NavigationContainer>
  );
}

const styles = {
  page: { flex: 1 },
  auth: { padding: 20 },
  authTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center' },
  logo: { fontWeight: 'bold', fontSize: 20, textAlign: 'center' },
  subLogo: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statCard: { width: '31%', padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, marginBottom: 4 },
  yBtn: { padding: 14, borderRadius: 10, marginTop: 10 },
  yTxt: { color: '#fff', textAlign: 'center', fontWeight: 'bold', fontSize: 13 },
  card: { padding: 15, borderRadius: 12, marginTop: 12 },
  cardTitle: { fontWeight: 'bold', fontSize: 14, marginBottom: 8 },
  cardDesc: { fontSize: 12, marginTop: 3 },
  sectionTitle: { fontWeight: 'bold', fontSize: 18, marginBottom: 12 },
  offerCard: { padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  offerName: { fontWeight: 'bold', fontSize: 14 },
  offerDesc: { fontSize: 11, marginTop: 4 },
  smallBtn: { padding: 8, borderRadius: 6, marginRight: 8, minWidth: 80, alignItems: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 6, marginBottom: 10 },
  label: { fontSize: 11, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 6, borderWidth: 1 }
};
