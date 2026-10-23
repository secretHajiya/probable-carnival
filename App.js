import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Share, Linking, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, getIdToken } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
import { WebView } from 'react-native-webview';

const VERSION = '1.0.9';


const firebaseConfig = {
  apiKey: "AIzaSyCku3iG2yg5MigEU0vpDr4MEwEncW5Tn6w",
  authDomain: "vyra-rewards-pro.firebaseapp.com",
  projectId: "vyra-rewards-pro",
  storageBucket: "vyra-rewards-pro.firebasestorage.app",
  messagingSenderId: "250039191069",
  appId: "1:250039191069:web:7383d18279c8395438a8f4",
  measurementId: "G-2YT4YDL9FT"
};
const FIREBASE_ANDROID_APP_ID = "1:250039191069:android:08fd57956ad6890838a8f4";
const ANDROID_PACKAGE_NAME = "com.vyrarewards.earn";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const BACKEND_URL = 'https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev';
const HIDDEN_GLOBAL = 'VYRAGJVOP1';
const HIDDEN_APP = '37222';


const APP_THEMES = [
  { name: 'Royal Blue & Gold', primary: '#FFC700', background: '#070C3D', card: '#101A7A', text: '#FFFFFF', muted: '#A0A8D0', border: '#FFC700', input: '#1E2BB8', tab: '#070C3D' },
];

const REAL_OFFERS = [
  { id: 1, name: 'PalmPay', desc: 'Open PalmPay account and fund', reward: 5000, code: 'PALM001', link: 'https://palmpay.com', color: '#FFC700' },
  { id: 2, name: 'Opay', desc: 'Register Opay and do KYC', reward: 5000, code: 'OPAY001', link: 'https://opay.com', color: '#FFC700' },
  { id: 3, name: 'Moniepoint', desc: 'Moniepoint personal account', reward: 6000, code: 'MONIE001', link: 'https://moniepoint.com', color: '#FFC700' },
  { id: 4, name: 'FairMoney', desc: 'FairMoney loan account', reward: 4500, code: 'FAIR001', link: 'https://fairmoney.io', color: '#FFC700' },
  { id: 5, name: 'Carbon', desc: 'Carbon account opening', reward: 4000, code: 'CARB001', link: 'https://getcarbon.co', color: '#FFC700' },
  { id: 6, name: 'Branch', desc: 'Branch loan app install', reward: 4000, code: 'BRANCH01', link: 'https://branch.com', color: '#FFC700' },
  { id: 7, name: 'Kuda', desc: 'Kuda bank account', reward: 5500, code: 'KUDA001', link: 'https://kuda.com', color: '#FFC700' },
  { id: 8, name: 'PiggyVest', desc: 'PiggyVest savings', reward: 3500, code: 'PIGGY01', link: 'https://piggyvest.com', color: '#FFC700' },
];

const MIN_WITHDRAW_POINTS = 200000;
const MIN_WITHDRAW_NAIRA = 5000;
const MIN_WITHDRAW_USD = 5;
const POINTS_TO_NAIRA = MIN_WITHDRAW_NAIRA / MIN_WITHDRAW_POINTS;
const POINTS_TO_USD = MIN_WITHDRAW_USD / MIN_WITHDRAW_POINTS;
const convertPointsToNaira = (points) => (Number(points || 0) * POINTS_TO_NAIRA).toFixed(2);
const convertPointsToUSD = (points) => (Number(points || 0) * POINTS_TO_USD).toFixed(2);
const convertPointsToDisplay = (points) => `₦${convertPointsToNaira(points)} / $${convertPointsToUSD(points)}`;
const WITHDRAW_METHODS = [
  'Bank Account (Bank Transfer)', 'Opay', 'PalmPay', 'Moniepoint', 'Kuda',
  'PayPal (USD)', 'USDT (BEP20)', 'Bitcoin (BTC)', 'Ethereum (ETH)',
  'Payoneer (USD)', 'Wise (USD)', 'Chipper Cash', 'Paga', 'Gift Card (USA)'
];

const CpxOfferwall = ({ user }) => {
  const [cpxVisible, setCpxVisible] = useState(false);
  const [cpxUrl, setCpxUrl] = useState('');
  const [cpxLoading, setCpxLoading] = useState(true);

  const openCpxSurveys = () => {
    const uid = user?.uid || auth.currentUser?.uid;
    const email = user?.email || auth.currentUser?.email;
    const username = user?.name || user?.displayName || 'Vyra User';

    if (!uid || !email) {
      Alert.alert('Sign in required', 'Please sign in to your account before opening CPX Research.');
      return;
    }

    // Keep CPX's secret out of the APK. If CPX requires secure_hash,
    // generate it on the backend rather than shipping a secret in this app.
    const params = new URLSearchParams({
      app_id: HIDDEN_APP,
      ext_user_id: uid,
      username,
      email,
    });
    setCpxLoading(true);
    setCpxUrl(`https://offers.cpx-research.com/index.php?${params.toString()}`);
    setCpxVisible(true);
  };

  return (
    <View style={{ padding: 10, backgroundColor: '#101A7A', borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#FFC700' }}>
      <Text style={{ color: '#FFFFFF', marginBottom: 8 }}>CPX Research surveys help you earn extra points.</Text>
      <TouchableOpacity onPress={openCpxSurveys} style={{ backgroundColor: '#FFC700', padding: 12, borderRadius: 8, alignItems: 'center' }}>
        <Text style={{ color: '#111', fontWeight: 'bold' }}>OPEN CPX SURVEYS</Text>
      </TouchableOpacity>

      <Modal
        visible={cpxVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setCpxVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
          <View style={{ minHeight: 54, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A' }}>
            <Text style={{ color: '#FFC700', fontSize: 16, fontWeight: 'bold' }}>CPX Research</Text>
            <TouchableOpacity onPress={() => setCpxVisible(false)} style={{ paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>CLOSE ✕</Text>
            </TouchableOpacity>
          </View>
          {cpxLoading && (
            <View style={{ padding: 12, alignItems: 'center' }}>
              <ActivityIndicator color="#FFC700" />
              <Text style={{ color: '#FFFFFF', marginTop: 6 }}>Loading surveys…</Text>
            </View>
          )}
          {!!cpxUrl && (
            <WebView
              source={{ uri: cpxUrl }}
              style={{ flex: 1, backgroundColor: '#FFFFFF' }}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              onLoadStart={() => setCpxLoading(true)}
              onLoadEnd={() => setCpxLoading(false)}
              onError={() => {
                setCpxLoading(false);
                Alert.alert('CPX Research', 'CPX Research could not load. Check your internet connection and try again.');
              }}
              onHttpError={(event) => {
                if (event.nativeEvent.statusCode >= 400) {
                  setCpxLoading(false);
                }
              }}
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

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
  const [myReferralCode, setMyReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [proofUrl, setProofUrl] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Bank Account (Bank Transfer)');
  const [withdrawNetwork, setWithdrawNetwork] = useState('MTN');
  const [withdrawNumber, setWithdrawNumber] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showWithdrawMethods, setShowWithdrawMethods] = useState(false);

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
      const raw = await res.text();
      let json;
      try { json = raw ? JSON.parse(raw) : {}; }
      catch { json = { success: false, error: `Backend returned a non-JSON response (${res.status}).` }; }
      if (!res.ok && json.success !== false) return { success: false, error: json.error || `Request failed (${res.status}).` };
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
      const [backendData, localTapsRaw, localBonusRaw, legacyTapsRaw, legacyOwnerUid, userSnapshot] = await Promise.all([
        callBackend(`/user?uid=${encodeURIComponent(uid)}`, 'GET'),
        AsyncStorage.getItem(`tapCount_${uid}`),
        AsyncStorage.getItem(`bonusPoints_${uid}`),
        AsyncStorage.getItem('tapCount'),
        AsyncStorage.getItem('tapOwnerUid'),
        getDoc(doc(db, 'users', uid)).catch(() => null),
      ]);
      const firestoreData = userSnapshot?.exists() ? userSnapshot.data() : {};
      const allowedLegacyTaps = !legacyOwnerUid || legacyOwnerUid === uid ? legacyTapsRaw : null;
      const localTaps = Number(localTapsRaw ?? allowedLegacyTaps ?? 0) || 0;
      const serverTaps = Math.max(Number(backendData?.taps || backendData?.tapCount || 0), Number(firestoreData?.taps || firestoreData?.tapCount || 0));
      const savedTaps = Math.max(localTaps, serverTaps);
      const localBonus = Number(localBonusRaw ?? 0) || 0;
      const serverBonus = Math.max(Number(backendData?.bonus || backendData?.bonusPoints || 0), Number(firestoreData?.bonus || firestoreData?.bonusPoints || 0));
      const savedBonus = Math.max(localBonus, serverBonus);
      const savedPoints = Math.max(Number(backendData?.points || 0), Number(firestoreData?.points || 0));
      setTapCount(savedTaps);
      setBonusPoints(savedBonus);
      setTotalPoints(savedPoints);
      setStreakDays(Math.max(Number(backendData?.streak || 0), Number(firestoreData?.streak || 0)));
      setMyReferralCode(firestoreData?.myReferralCode || backendData?.myReferralCode || '');
      setReferralCount(Number(firestoreData?.referralCount || backendData?.referralCount || 0));
      await Promise.all([
        AsyncStorage.setItem(`tapCount_${uid}`, String(savedTaps)),
        AsyncStorage.setItem(`bonusPoints_${uid}`, String(savedBonus)),
        AsyncStorage.setItem('tapCount', String(savedTaps)),
        AsyncStorage.setItem('tapOwnerUid', uid),
      ]);
    } catch (e) {
      console.log('loadUserData error', e);
    }
  };

  useEffect(() => {
    loadInitialData();

    const applyNetworkState = (state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(online);
    };
    NetInfo.fetch().then(applyNetworkState).catch(() => setIsConnected(false));
    const netSub = NetInfo.addEventListener(applyNetworkState);

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
        try {
          const rawDraft = await AsyncStorage.getItem('registrationDraft');
          const draft = rawDraft ? JSON.parse(rawDraft) : null;
          if (draft && draft.expiresAt > Date.now()) {
            setRegisterName(draft.name || '');
            setRegisterPhone(draft.phone || '');
            setRegisterEmail(draft.email || '');
            setUsedReferralCode(draft.referralCode || '');
            setRegisterPassword(draft.password || '');
            setRegisterPasswordConfirm(draft.passwordConfirm || '');
            setEmailOtp(draft.code || '');
            setOtpExpiresAt(draft.expiresAt || 0);
            setOtpInput(draft.otpInput || '');
            setScreen('otp');
          } else {
            if (rawDraft) await AsyncStorage.removeItem('registrationDraft');
            setScreen('login');
          }
        } catch (draftError) {
          console.log('Registration draft restore error', draftError);
          setScreen('login');
        }
      }
    });

    return () => {
      clearTimeout(authTimeout);
      unsubAuth();
      netSub();
    };
  }, []);

  // Online-only tap action. Save locally immediately and sync progress to Firebase.
  const tapForProgress = async () => {
    if (!isConnected) {
      Alert.alert('Internet required', 'Connect to the internet before using Vyra Rewards Pro.');
      return;
    }
    if (!auth.currentUser?.uid) {
      Alert.alert('Sign in required', 'Please sign in to save your progress.');
      return;
    }
    if (!canTapRef.current) return;
    canTapRef.current = false;
    const uid = auth.currentUser.uid;
    try {
      const newTapCount = tapCount + 1;
      const newBonusPoints = bonusPoints + (newTapCount % 10 === 0 ? 10 : 0);
      setTapCount(newTapCount);
      setBonusPoints(newBonusPoints);
      await Promise.all([
        AsyncStorage.setItem(`tapCount_${uid}`, String(newTapCount)),
        AsyncStorage.setItem(`bonusPoints_${uid}`, String(newBonusPoints)),
        AsyncStorage.setItem('tapCount', String(newTapCount)),
        AsyncStorage.setItem('tapOwnerUid', uid),
      ]);

      if (newTapCount % 10 === 0) {
        await setDoc(doc(db, 'users', uid), {
          taps: newTapCount,
          tapCount: newTapCount,
          bonus: newBonusPoints,
          bonusPoints: newBonusPoints,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      if (newTapCount % 50 === 0) {
        const now = Date.now();
        if (now - lastSaveRef.current >= 2000) {
          lastSaveRef.current = now;
          const result = await callBackend('/tap', 'POST', {
            taps: newTapCount,
            uid,
            email: user?.email || loginEmail || 'unknown',
          });
          if (!result?.success) console.log('Tap backend sync failed', result?.error || 'Unknown error');
        }
      }
    } catch (e) {
      console.log('tap save error', e);
      Alert.alert('Progress save issue', 'Your tap was counted on this device, but cloud sync failed. Keep internet connected and try again later.');
    } finally {
      setTimeout(() => { canTapRef.current = true; }, 1000);
    }
  };

  const EMAILJS_SERVICE = 'service_eo4mafe';
  const EMAILJS_TEMPLATE = 'template_vla0zff';
  // Admin notification template from the previous Vyra Rewards Pro setup.
  const EMAILJS_TEMPLATE_NOTIFY = 'template_8u8r9r9';
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

  const sendEmailJsAdminNotification = async ({ name, phone, email, referralCode, uid }) => {
    try {
      const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE,
          template_id: EMAILJS_TEMPLATE_NOTIFY,
          user_id: EMAILJS_PUBLIC,
          template_params: {
            app_name: 'Vyra Rewards Pro',
            user_name: name,
            name,
            user_phone: phone,
            phone,
            user_email: email,
            email,
            referral_code: referralCode || 'None',
            uid,
            created_at: new Date().toISOString()
          }
        })
      });
      if (!res.ok) console.log('EmailJS admin notification failed:', await res.text());
      return res.ok;
    } catch (e) {
      console.log('EmailJS admin notification error:', e);
      return false;
    }
  };

  const handleRegister = async () => {
    if (!isConnected) { Alert.alert('No Internet', 'Please connect to the internet and try again.'); return; }
    if (!registerName.trim() || !registerPhone.trim() || !registerEmail.trim() || !registerPassword || !registerPasswordConfirm) {
      Alert.alert('Fill all fields', 'Please complete the required registration fields.'); return;
    }
    if (registerPassword.length < 8) { Alert.alert('Password min 8', 'Use at least 8 characters.'); return; }
    if (registerPassword !== registerPasswordConfirm) { Alert.alert('Passwords do not match'); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    setEmailOtp(code);
    setOtpInput('');
    setOtpExpiresAt(expiresAt);
    const draft = {
      name: registerName.trim(), phone: registerPhone.trim(), email: registerEmail.trim(),
      referralCode: usedReferralCode.trim(), password: registerPassword,
      passwordConfirm: registerPasswordConfirm, code, expiresAt, otpInput: ''
    };
    await AsyncStorage.setItem('registrationDraft', JSON.stringify(draft));
    const sent = await sendEmailJsOtp(registerEmail.trim(), code);
    if (!sent) {
      await AsyncStorage.removeItem('registrationDraft');
      Alert.alert('Email not sent', 'EmailJS could not send the verification code. Please check the EmailJS service/template settings and try again.');
      return;
    }
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
        points: 0, bonus: 100, taps: 0, bonusPoints: 100, totalTaps: 0, tapCount: 0,
        myReferralCode: myCode, usedReferralCode: usedReferralCode.trim() || null,
        createdAt: serverTimestamp()
      });
      await callBackend('/register', 'POST', { name: registerName.trim(), phone: registerPhone.trim(), email: registerEmail.trim(), myReferralCode: myCode, usedReferralCode: usedReferralCode.trim() });
      // Admin email is best-effort: a notification failure must not undo a successful registration.
      await sendEmailJsAdminNotification({
        name: registerName.trim(),
        phone: registerPhone.trim(),
        email: registerEmail.trim(),
        referralCode: usedReferralCode.trim(),
        uid: cred.user.uid
      });
      await AsyncStorage.setItem('lastUserEmail', registerEmail.trim());
      await AsyncStorage.removeItem('registrationDraft');
      await AsyncStorage.setItem(`tapCount_${cred.user.uid}`, '0');
      await AsyncStorage.setItem('tapOwnerUid', cred.user.uid);
      await AsyncStorage.setItem(`bonusPoints_${cred.user.uid}`, '100');
      setUser({ uid: cred.user.uid, email: registerEmail.trim(), name: registerName.trim(), phone: registerPhone.trim() });
      setMyReferralCode(myCode);
      setTapCount(0);
      setTotalPoints(0);
      setBonusPoints(100);
      setScreen('main');
    } catch (e) { Alert.alert('Registration failed', e?.message || 'Please try again.'); }
  };

  const handleLogin = async () => {
    if (!isConnected) return Alert.alert('Internet required', 'Connect to the internet to sign in.');
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
    if (!isConnected) return Alert.alert('Internet required', 'Connect to the internet to create an account.');
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

  const openOfferLink = async (url, offerName) => {
    if (!isConnected) return Alert.alert('Internet required', 'Connect to the internet to open offers.');
    if (!url || !/^https?:\/\//i.test(url)) {
      Alert.alert('Offer link unavailable', `The link for ${offerName || 'this offer'} is not valid yet.`);
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Cannot open offer', 'Check your internet connection and try again.');
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Offer link error:', error?.message || error);
      Alert.alert('Cannot open offer', 'The offer link could not be opened. Please try again later.');
    }
  };

  const submitOfferProof = async (offerId, offerName) => {
    if (!isConnected) return Alert.alert('Internet required', 'Connect to the internet to submit proof.');
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
      if (result && result.success === true) {
        alert('Proof submitted! We will verify in 24h');
        setProofUrl('');
      } else {
        alert(result.error || 'Submit failed, try again');
      }
    } catch (e) {
      alert('Submit error: ' + e.message);
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected) return Alert.alert('Internet required', 'Connect to the internet to request a withdrawal.');
    const amt = parseInt(withdrawAmount, 10);
    if (!amt || amt < MIN_WITHDRAW_POINTS) return Alert.alert('Minimum withdrawal', 'Minimum withdrawal is 200,000 points (₦5,000 / $5).');
    if (totalPoints + bonusPoints < amt) return Alert.alert('Insufficient balance', 'You do not have enough points for this withdrawal.');
    if (!withdrawNumber.trim()) return Alert.alert('Payment details required', 'Enter the account or wallet details for your selected method.');
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
      if (result && result.success === true) {
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
    const shareReferral = async () => {
      if (!isConnected) return Alert.alert('Internet required', 'Connect to the internet to share your referral code.');
      if (!myReferralCode) return Alert.alert('Referral code unavailable', 'Your referral code is still loading. Please try again.');
      try { await Share.share({ message: `Join Vyra Rewards Pro with my referral code: ${myReferralCode}` }); }
      catch (e) { Alert.alert('Share failed', 'Unable to open the share menu.'); }
    };
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15, paddingBottom: 110 }}>
        <View style={[styles.header, { backgroundColor: currentTheme.primary, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={{ color: '#070C3D', fontWeight: 'bold', fontSize: 22, textAlign: 'center' }}>VYRA REWARDS PRO</Text>
          <Text style={{ color: '#070C3D', fontSize: 11, marginTop: 4, textAlign: 'center' }}>VERSION {VERSION} • BUILD {BUILD}</Text>
          <Text style={{ color: '#070C3D', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            Balance: {(totalPoints + bonusPoints).toLocaleString()} pts = ₦{convertPointsToNaira(totalPoints + bonusPoints)} / ${convertPointsToUSD(totalPoints + bonusPoints)}
          </Text>
          <Text style={{ color: '#070C3D', fontSize: 11, marginTop: 4, textAlign: 'center' }}>Referral Code: {myReferralCode || 'Loading...'} | Referrals: {referralCount}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={[styles.statCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}><Text style={[styles.statLabel, { color: currentTheme.muted }]}>BONUS</Text><Text style={{ color: currentTheme.primary, fontWeight: 'bold' }}>{bonusPoints.toLocaleString()}</Text></View>
          <View style={[styles.statCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}><Text style={[styles.statLabel, { color: currentTheme.muted }]}>TAPS</Text><Text style={{ color: currentTheme.text, fontWeight: 'bold' }}>{tapCount.toLocaleString()}</Text></View>
          <View style={[styles.statCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}><Text style={[styles.statLabel, { color: currentTheme.muted }]}>PROGRESS</Text><Text style={{ color: currentTheme.text, fontWeight: 'bold' }}>{tapCount % 50}/50</Text></View>
        </View>

        <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary, paddingVertical: 17 }]} onPress={tapForProgress}>
          <Text style={{ color: '#070C3D', textAlign: 'center', fontWeight: 'bold', fontSize: 14 }}>TAP TO EARN {tapCount % 50}/50 — {convertPointsToDisplay(bonusPoints)}</Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>CPX Research Surveys — Earn Extra</Text>
          <CpxOfferwall user={{ ...(user || {}), uid: auth.currentUser?.uid || user?.uid, email: user?.email || auth.currentUser?.email || loginEmail }} />
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderWidth: 1, borderColor: currentTheme.primary }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>🔥 Daily Streak — {streakDays} Days</Text>
          <Text style={{ color: currentTheme.muted, fontSize: 12 }}>Keep using the app daily to maintain your streak.</Text>
          <View style={{ backgroundColor: '#070C3D', height: 6, borderRadius: 3, marginTop: 10 }}><View style={{ width: `${Math.min(streakDays, 7) / 7 * 100}%`, height: '100%', backgroundColor: currentTheme.primary, borderRadius: 3 }} /></View>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderWidth: 1, borderColor: currentTheme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View style={{ flex: 1, paddingRight: 8 }}><Text style={[styles.cardTitle, { color: currentTheme.text }]}>Refer & Earn</Text><Text style={{ fontSize: 12, color: currentTheme.muted }}>Invite friends to Vyra Rewards Pro.</Text><Text style={{ fontSize: 12, color: currentTheme.primary, marginTop: 4 }}>Your code: {myReferralCode || 'Loading...'}</Text></View>
          <TouchableOpacity style={{ backgroundColor: currentTheme.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }} onPress={shareReferral}><Text style={{ color: '#070C3D', fontWeight: 'bold', fontSize: 12 }}>SHARE CODE</Text></TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderWidth: 1, borderColor: currentTheme.border }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>🏆 Top Earners Today</Text>
          <Text style={{ color: currentTheme.muted }}>Leaderboard data will appear here when connected to the rewards backend.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.primary }]}>
          <Text style={{ fontWeight: 'bold', color: '#070C3D' }}>Earn More with Surveys</Text>
          <Text style={{ fontSize: 12, color: '#070C3D', marginTop: 4 }}>Minimum withdrawal: 200,000 points = ₦5,000 = $5 — 14 Methods</Text>
        </View>
      </ScrollView>
    );
  }

  function OffersTab({ navigation }) {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
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
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: offer.color }]} onPress={() => openOfferLink(offer.link, offer.name)}>
                <Text style={{ color: '#070C3D', fontWeight: 'bold', fontSize: 12 }}>OPEN LINK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: currentTheme.primary }]} onPress={() => navigation.navigate('Proof', { offer: offer })}>
                <Text style={{ color: '#070C3D', fontWeight: 'bold', fontSize: 12 }}>SUBMIT PROOF</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  function TasksTab({ navigation }) {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Tasks & Offers</Text>
        <Text style={{ color: currentTheme.muted, marginBottom: 12 }}>
          Open a task using its official link, complete it, and submit proof. Points are added only after the proof is verified.
        </Text>
        {REAL_OFFERS.map(offer => (
          <View key={`task-${offer.id}`} style={[styles.offerCard, { borderColor: currentTheme.border, backgroundColor: currentTheme.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.offerName, { color: currentTheme.text }]}>{offer.name}</Text>
              <Text style={{ color: offer.color, fontWeight: 'bold' }}>{offer.reward} pts</Text>
            </View>
            <Text style={[styles.offerDesc, { color: currentTheme.muted }]}>{offer.desc}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: offer.color }]} onPress={() => openOfferLink(offer.link, offer.name)}>
                <Text style={{ color: '#070C3D', fontWeight: 'bold', fontSize: 12 }}>START TASK</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: currentTheme.primary }]} onPress={() => navigation.navigate('Proof', { offer })}>
                <Text style={{ color: '#070C3D', fontWeight: 'bold', fontSize: 12 }}>SUBMIT PROOF</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  function ProofTab({ route }) {
    const offer = route?.params?.offer;
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Submit Proof for {offer?.name || 'Offer'}</Text>
        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.label, { color: currentTheme.muted }]}>Offer</Text>
          <Text style={{ color: currentTheme.text, marginBottom: 10 }}>{offer?.name} - {offer?.reward} pts</Text>
          <Text style={[styles.label, { color: currentTheme.muted }]}>Proof Link / Screenshot URL</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="https://..." placeholderTextColor={currentTheme.muted} value={proofUrl} onChangeText={setProofUrl} />
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={() => submitOfferProof(offer?.id, offer?.name)}>
            <Text style={styles.yTxt}>SUBMIT PROOF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary, marginTop: 10 }]} onPress={() => { Share.share({ message: `I am earning with Vyra Rewards Pro! Use code ${offer?.code} - ${HIDDEN_APP}` }); }}>
            <Text style={styles.yTxt}>SHARE OFFER</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function WalletTab() {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Wallet</Text>
        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Balance</Text>
          <Text style={{ color: currentTheme.text, fontSize: 24, fontWeight: 'bold' }}>{(totalPoints + bonusPoints).toLocaleString()} Points</Text>
          <Text style={{ color: currentTheme.primary, fontSize: 22, fontWeight: 'bold', marginTop: 4 }}>₦{convertPointsToNaira(totalPoints + bonusPoints)}</Text>
          <Text style={{ color: currentTheme.primary, fontSize: 22, fontWeight: 'bold' }}>${convertPointsToUSD(totalPoints + bonusPoints)}</Text>
          <Text style={{ color: currentTheme.muted, fontSize: 12, marginTop: 8 }}>Minimum withdrawal: 200,000 points = ₦5,000 = $5</Text>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>Withdraw</Text>
          
          <Text style={[styles.label, { color: currentTheme.muted }]}>Withdrawal Method</Text>
          <TouchableOpacity style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]} onPress={() => setShowWithdrawMethods(true)}>
            <Text style={{ color: currentTheme.text, flex: 1 }}>{withdrawMethod}</Text>
            <Text style={{ color: currentTheme.primary, fontWeight: 'bold' }}>▼</Text>
          </TouchableOpacity>

          <Modal visible={showWithdrawMethods} transparent animationType="fade" onRequestClose={() => setShowWithdrawMethods(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }}>
              <View style={{ maxHeight: '80%', backgroundColor: currentTheme.card, borderColor: currentTheme.primary, borderWidth: 1, borderRadius: 14, padding: 14 }}>
                <Text style={{ color: currentTheme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Select Withdrawal Method</Text>
                <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled>
                  {WITHDRAW_METHODS.map(method => (
                    <TouchableOpacity key={method} onPress={() => { setWithdrawMethod(method); setShowWithdrawMethods(false); }} style={{ paddingVertical: 13, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: currentTheme.border, backgroundColor: withdrawMethod === method ? '#0A168C' : 'transparent' }}>
                      <Text style={{ color: currentTheme.text, fontWeight: withdrawMethod === method ? 'bold' : 'normal' }}>{method}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowWithdrawMethods(false)} style={[styles.yBtn, { backgroundColor: currentTheme.primary }]}><Text style={{ color: '#070C3D', textAlign: 'center', fontWeight: 'bold' }}>CLOSE</Text></TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={[styles.label, { color: currentTheme.muted }]}>Account Number / Payment Email / Wallet Address</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Enter payment details" placeholderTextColor={currentTheme.muted} value={withdrawNumber} onChangeText={setWithdrawNumber} />

          <Text style={[styles.label, { color: currentTheme.muted }]}>Amount in points (minimum 200,000)</Text>
          <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="200000" placeholderTextColor={currentTheme.muted} keyboardType="numeric" value={withdrawAmount} onChangeText={setWithdrawAmount} />

          <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={handleWithdraw}>
            <Text style={styles.yTxt}>REQUEST WITHDRAW</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    );
  }

  function SettingsTab() {
    return (
      <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 15, paddingBottom: 100 }}>
        <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>Settings</Text>
        
        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}>
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>User</Text>
          <Text style={{ color: currentTheme.muted }}>{user?.email || 'No user'} - UID: {(auth?.currentUser?.uid || user?.uid || '').substring(0,10)}...</Text>
          <Text style={{ color: currentTheme.muted, fontSize: 10, marginTop: 4 }}>BUILD {BUILD}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, borderWidth: 1 }]}> 
          <Text style={[styles.cardTitle, { color: currentTheme.text }]}>App Theme</Text>
          <Text style={{ color: currentTheme.muted }}>Royal Blue and Gold</Text>
          <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
            <View style={{ width: 32, height: 22, borderRadius: 5, backgroundColor: '#0A168C', borderWidth: 1, borderColor: '#FFC700' }} />
            <View style={{ width: 32, height: 22, borderRadius: 5, backgroundColor: '#FFC700' }} />
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
          <TouchableOpacity style={[styles.yBtn, { backgroundColor: '#0A168C', borderWidth: 1, borderColor: '#FFC700', marginTop: 10 }]} onPress={handleLogout}>
            <Text style={styles.yTxt}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  function LoginScreen() {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: currentTheme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView style={[styles.page, { backgroundColor: currentTheme.background }]} contentContainerStyle={{ padding: 20, paddingBottom: 80, flexGrow: 1, justifyContent: 'flex-start' }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled>
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

  const TasksStack = () => (
    <Stack.Navigator>
      <Stack.Screen name="TasksList" component={TasksTab} options={{ headerShown: false }} />
      <Stack.Screen name="Proof" component={ProofTab} options={{ title: 'Submit Proof', headerStyle: { backgroundColor: currentTheme.card }, headerTintColor: currentTheme.text }} />
    </Stack.Navigator>
  );

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
        <Tab.Screen name="Tasks" component={TasksStack} />
        <Tab.Screen name="Wallet" component={WalletTab} />
        <Tab.Screen name="Settings" component={SettingsTab} />
      </Tab.Navigator>
    );
  }

  if (!isConnected) {
    return (
      <View style={[styles.center, { backgroundColor: '#070C3D', padding: 28 }]}>
        <Text style={{ color: '#FFC700', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>VYRA REWARDS PRO</Text>
        <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 24, textAlign: 'center' }}>Internet Connection Required</Text>
        <Text style={{ color: '#A0A8D0', textAlign: 'center', marginTop: 10, lineHeight: 22 }}>Connect mobile data or Wi-Fi to use the app. Taps, offers, wallet, registration, and withdrawals require an active internet connection.</Text>
        <TouchableOpacity style={{ backgroundColor: '#FFC700', paddingVertical: 13, paddingHorizontal: 24, borderRadius: 10, marginTop: 22 }} onPress={async () => { try { const state = await NetInfo.fetch(); setIsConnected(state.isConnected === true && state.isInternetReachable !== false); } catch { setIsConnected(false); } }}>
          <Text style={{ color: '#070C3D', fontWeight: 'bold' }}>RETRY CONNECTION</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'loading') {
    return (
      <View style={[styles.center, { backgroundColor: currentTheme.background }]}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={{ color: currentTheme.muted, marginTop: 10 }}>Loading Vyra Pro {BUILD}...</Text>
      </View>
    );
  }

  if (screen === 'register') {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: currentTheme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={[styles.auth, { flexGrow: 1, padding: 20, justifyContent: 'flex-start', paddingBottom: 80, backgroundColor: currentTheme.background }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled>
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
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: currentTheme.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={[styles.auth, { flexGrow: 1, padding: 20, justifyContent: 'flex-start', paddingBottom: 80, backgroundColor: currentTheme.background }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" nestedScrollEnabled>
            <Text style={[styles.authTitle, { color: currentTheme.primary }]}>Verify Your Email</Text>
            <Text style={{ color: currentTheme.muted, marginBottom: 12 }}>Enter the 6-digit code sent to {registerEmail}.</Text>
            <TextInput style={[styles.input, { backgroundColor: currentTheme.input, borderColor: currentTheme.border, color: currentTheme.text }]} placeholder="Enter 6-digit OTP" placeholderTextColor={currentTheme.muted} value={otpInput} onChangeText={async (value) => { setOtpInput(value); try { const raw = await AsyncStorage.getItem('registrationDraft'); if (raw) { const draft = JSON.parse(raw); draft.otpInput = value; await AsyncStorage.setItem('registrationDraft', JSON.stringify(draft)); } } catch (e) { console.log('OTP draft update error', e); } }} keyboardType="number-pad" maxLength={6} />
            <TouchableOpacity style={[styles.yBtn, { backgroundColor: currentTheme.primary }]} onPress={verifyOtpAndSave}><Text style={styles.yTxt}>VERIFY OTP</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setScreen('register')} style={{ padding: 12 }}><Text style={{ color: currentTheme.text, textAlign: 'center' }}>Back to registration</Text></TouchableOpacity>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    );
  }

  return (
    <NavigationContainer>
      {screen === 'login' ? LoginScreen() : <MainTabs />}

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
          <Text style={{ color: currentTheme.muted, marginTop: 5 }}>Themes: 6 | Tap Safe: 1000ms cooldown | Backend Safe</Text>
          <Text style={{ color: currentTheme.muted, marginTop: 5 }}>User: {user?.email || loginEmail || 'none'}</Text>
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
