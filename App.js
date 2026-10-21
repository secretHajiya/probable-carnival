import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Linking, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { mobileAds, BannerAd, BannerAdSize, TestIds, RewardedAd, RewardedAdEventType, InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, getIdToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

let CpxOfferwall;
try { CpxOfferwall = require('./CpxOfferwall').default; } catch(e) { CpxOfferwall = () => null; }

// === SABBIN ADS NA BIYU - TSOFAFFI AN CIRE ===
const VERSION = '1.0.9';
const BUILD = '24';
const BANNER_ID = __DEV__ ? TestIds.BANNER : 'ca-app-pub-5550384127909882/5498846987';
const REWARDED_ID = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-5550384127909882/9277117923';
const INTERSTITIAL_ID = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-5550384127909882/7002308379';

// === BOYE IDS - DAGA NA BIYU - BA ZA SU FITO A UI BA ===
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

// === EMAILJS CIKAKKE - DAGA KAI ===
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
  { name: 'Default', primary: '#6a00f4' },
  { name: 'Ocean', primary: '#0d47a1' },
  { name: 'Forest', primary: '#1b5e20' },
  { name: 'Sunset', primary: '#e65100' },
  { name: 'Dark', primary: '#212121' },
];

const TERMS_TEXT = `Terms of Service — Vyra Rewards Pro
Last Updated: May 16, 2026
1. Acceptance: By using Vyra Rewards Pro, you agree to these Terms.
2. How It Works: Users may earn virtual coins by completing eligible surveys from CPX Research and other activities offered in the app. Redemption is subject to verification, availability, and the app's current rules.
3. No Fraud: VPN abuse, fake accounts, false proof, automated activity, or attempts to manipulate rewards are prohibited. Violations may lead to account suspension and forfeiture of unverified rewards.
4. Rewards and Withdrawals: Rewards are virtual until approved. Requests are subject to review, verification, available payment methods, and processing times. Submitting a request does not guarantee payment.
5. Third Parties: Surveys and some offers are provided by third parties, including CPX Research. Their own terms and privacy practices may apply.
6. Contact: vyraprosupport@gmail.com`;

const PRIVACY_TEXT = `Privacy Policy — Vyra Rewards Pro
Last Updated: May 16, 2026
1. Introduction: This policy explains how Vyra Rewards Pro handles information.
2. Information Collected: Account details such as name, phone number and email; account, balance, activity and withdrawal-request records; device or advertising identifiers where available for fraud prevention; and technical usage data. Survey responses are handled by CPX Research under its own policies.
3. How We Use Information: To provide account access, manage rewards and withdrawal requests, prevent fraud, respond to support requests, and improve the app.
4. Sharing: We do not sell personal information. Data may be shared with service providers needed to operate the app, including Firebase/Google services, EmailJS, and CPX Research where relevant.
5. Security: We use reasonable safeguards, but no system can guarantee absolute security.
6. Your Choices: You may request account/data deletion by emailing vyraprosupport@gmail.com. Some records may need to be retained where required for security, legal, or transaction purposes.
7. Contact: vyraprosupport@gmail.com`;

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
    mobileAds().initialize().then(() => {
      const rewarded = RewardedAd.createForAdRequest(REWARDED_ID);
      rewardedRef.current = rewarded;
      rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
        setBonusPoints(p => p + 50);
        await callBackend('/reward', 'POST', { type: 'ad_reward', amount: 50 });
      });
      rewarded.load();
      const inter = InterstitialAd.createForAdRequest(INTERSTITIAL_ID);
      interstitialRef.current = inter;
      inter.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
      inter.addAdEventListener(AdEventType.CLOSED, () => {
        if (pendingOfferRef.current) { Linking.openURL(pendingOfferRef.current.link); pendingOfferRef.current = null; }
        inter.load();
      });
      inter.load();
    });
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
    return () => { unsubNet(); unsubAuth(); };
  }, []);

  useEffect(() => { if (userDataLoaded && user) saveBalanceToFirebase(); }, [bonusPoints]);

  const loadInitialData = async () => {
    const th = await AsyncStorage.getItem('themeIndex');
    if (th) setThemeIndex(parseInt(th));
  };

  const loadUserDataFromFirebase = async (uid, email) => {
    try {
      const backendData = await callBackend(`/user?uid=${uid}`, 'GET');
      if (backendData && backendData.success) {
        setBonusPoints(backendData.bonusPoints || 0);
        setTotalTaps(backendData.totalTaps || 0);
        setTapCount(backendData.tapCount || 0);
        setMyReferralCode(backendData.myReferralCode || '');
        setReferralStats(backendData.referralStats || { count: 0, earned: 0 });
        setUser({ uid, email, name: backendData.name, phone: backendData.phone });
        setUserDataLoaded(true);
        return;
      }
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        setBonusPoints(d.bonusPoints || 0);
        setTotalTaps(d.totalTaps || 0);
        setTapCount(d.tapCount || 0);
        setMyReferralCode(d.myReferralCode || '');
        setUser({ uid, email, name: d.name, phone: d.phone });
      }
      setUserDataLoaded(true);
    } catch(e) { setUserDataLoaded(true); }
  };

  const saveBalanceToFirebase = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { bonusPoints, totalTaps, tapCount });
      await callBackend('/user/update', 'POST', { bonusPoints, totalTaps, tapCount });
    } catch(e) {}
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
          template_params: { to_email: toEmail, otp_code: code, app_name: 'Vyra Rewards Pro' }
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
    if (!sent) Alert.alert('OTP send failed, but code:', code);
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
    if (rewardedLoaded && rewardedRef.current) { rewardedRef.current.show(); rewardedRef.current.load(); setRewardedLoaded(false); }
    else { Alert.alert('Ad not ready, try again'); }
  };

  const tapForProgress = async () => {
    const nt = tapCount + 1; const tot = totalTaps + 1;
    setTapCount(nt); setTotalTaps(tot);
    const res = await callBackend('/tap', 'POST', { tapCount: nt, totalTaps: tot });
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>CPX Research Surveys - Earn Extra</Text>
          <CpxOfferwall user={{ ...user, uid: auth.currentUser?.uid, email: user?.email || loginEmail }} />
          <Text style={{ fontSize: 10, color: '#666', marginTop: 8 }}>Secure IDs hidden. No IDs visible.</Text>
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
        <Text style={styles.sec}>SETTINGS - EmailJS OK - Ads New</Text>
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
        <Modal visible={showAbout} animationType="slide" onRequestClose={() => setShowAbout(false)}><ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50 }}><Text style={styles.authTitle}>About v{VERSION}</Text><Text>EmailJS: OK {EMAILJS_SERVICE} | Public: {EMAILJS_PUBLIC}{'\n'}Ads New: 5550384127909882 (Old 369... Removed){'\n'}Backend: Secure Worker{'\n'}Secure IDs Hidden{'\n'}Contact: vyraprosupport@gmail.com</Text><TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => setShowAbout(false)}><Text style={styles.yTxt}>CLOSE</Text></TouchableOpacity></ScrollView></Modal>
      </ScrollView>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
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
