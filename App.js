import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, Switch, Linking, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

let CpxOfferwall;
try { CpxOfferwall = require('./CpxOfferwall').default; } catch(e) { CpxOfferwall = () => null; }
import mobileAds, { AdEventType, BannerAd, BannerAdSize, RewardedAd, InterstitialAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, getDoc, updateDoc } from 'firebase/firestore';

const VERSION = '1.0.7'; const BUILD = 13;
const BANNER_ID = 'ca-app-pub-567288772229131/5819855709';
const REWARDED_ID = 'ca-app-pub-567288772229131/8254487351';
const INTERSTITIAL_ID = 'ca-app-pub-567288772229131/2783677985';
const bannerUnitId = __DEV__ ? TestIds.BANNER : BANNER_ID;
const rewardedUnitId = __DEV__ ? TestIds.REWARDED : REWARDED_ID;
const interstitialUnitId = __DEV__ ? TestIds.INTERSTITIAL : INTERSTITIAL_ID;

const firebaseConfig = {
  apiKey: "AIzaSyCku3iG2yg5MigEU0vpDr4MEwEncW5Tn6w",
  authDomain: "vyra-rewards-pro.firebaseapp.com",
  projectId: "vyra-rewards-pro",
  storageBucket: "vyra-rewards-pro.firebasestorage.app",
  messagingSenderId: "250039191069",
  appId: "1:250039191069:web:7383d18279c8395438a8f4",
  measurementId: "G-2YT4YDL9FT"
};
let firebaseApp;
try { firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp(); } catch(e) { firebaseApp = initializeApp(firebaseConfig); }
const firebaseAuth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const EMAILJS_SERVICE_ID = 'service_eo4mafe';
const EMAILJS_TEMPLATE_ID = 'template_vla0zff';
const EMAILJS_PUBLIC_KEY = 'Ee45lolv3ZCjOSWUy';

const REAL_OFFERS = [
  { id: '1', name: 'PalmPay', reward: 800, code: 'NSFM3287', link: 'https://app.palmpay.com/invite/NSFM3287', color: '#6a00f4' },
  { id: '2', name: 'Opay', reward: 1000, code: 'OPAYVYRA', link: 'https://opay.com/join/OPAYVYRA', color: '#00c853' },
  { id: '3', name: 'Moniepoint', reward: 1200, code: 'MONIEVYRA', link: 'https://moniepoint.com/refer/MONIEVYRA', color: '#0d47a1' },
  { id: '4', name: 'FairMoney', reward: 900, code: 'FAIRVYRA', link: 'https://fairmoney.io/r/FAIRVYRA', color: '#ff6f00' },
  { id: '5', name: 'Carbon', reward: 850, code: 'CARBONVYRA', link: 'https://getcarbon.co/invite/CARBONVYRA', color: '#212121' },
  { id: '6', name: 'Branch', reward: 700, code: 'BRANCHVYRA', link: 'https://branch.com.ng/a/BRANCHVYRA', color: '#1e88e5' },
  { id: '7', name: 'Kuda', reward: 1100, code: 'KUDAVYRA', link: 'https://kuda.com/join/KUDAVYRA', color: '#4a148c' },
];
const WITHDRAW_METHODS = ['Bank Transfer', 'Opay', 'Palmpay', 'Moniepoint', 'Kuda', 'Airtime', 'USDT'];
const APP_THEMES = [
  { name: 'Default Purple', primary: '#6a00f4', secondary: '#ffd700' },
  { name: 'Ocean Blue', primary: '#0d47a1', secondary: '#00e5ff' },
  { name: 'Forest Green', primary: '#1b5e20', secondary: '#a5d6a7' },
  { name: 'Sunset Orange', primary: '#e65100', secondary: '#ffcc80' },
  { name: 'Dark Mode', primary: '#212121', secondary: '#424242' },
];
const TERMS_TEXT = `Terms of Service - Vyra Rewards Pro - v1.0.7 - Contact: vyraprosupport@gmail.com - Earn via CPX`;
const PRIVACY_TEXT = `Privacy Policy - Vyra Rewards Pro - Contact: vyraprosupport@gmail.com`;
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [bonusPoints, setBonusPoints] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [emailOtp, setEmailOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [themeIndex, setThemeIndex] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState('');
  const [proofs, setProofs] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [proofText, setProofText] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Bank Transfer');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const currentTheme = APP_THEMES[themeIndex];
  const rewardedAdRef = useRef(null);
  const interstitialAdRef = useRef(null);

  useEffect(() => {
    let unsubNet;
    let unsubRewardedLoaded, unsubRewardedEarned, unsubInterLoaded;
    try { unsubNet = NetInfo.addEventListener(s => setIsConnected(!!s.isConnected)); } catch {}
    try {
      mobileAds().initialize().then(() => {
        try {
          const rAd = RewardedAd.createForAdRequest(rewardedUnitId, { requestNonPersonalizedAdsOnly: true });
          unsubRewardedLoaded = rAd.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
          unsubRewardedEarned = rAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { setBonusPoints(b => b+50); setTotalTaps(t => t+1); });
          rAd.load(); rewardedAdRef.current = rAd;
          const iAd = InterstitialAd.createForAdRequest(interstitialUnitId, { requestNonPersonalizedAdsOnly: true });
          unsubInterLoaded = iAd.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
          iAd.load(); interstitialAdRef.current = iAd;
        } catch(e) {}
      });
    } catch(e) {}
    loadInitialData();
    return () => { try { if(unsubNet) unsubNet(); } catch{} try { if(unsubRewardedLoaded) unsubRewardedLoaded(); } catch{} try { if(unsubRewardedEarned) unsubRewardedEarned(); } catch{} try { if(unsubInterLoaded) unsubInterLoaded(); } catch{} };
  }, []);

  const loadInitialData = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themeIndex');
      if (savedTheme) setThemeIndex(parseInt(savedTheme));
      const savedEmail = await AsyncStorage.getItem('lastUserEmail');
      if (savedEmail) { setLoginEmail(savedEmail); setScreen('login'); } else { setScreen('register'); }
    } catch { setScreen('register'); }
  };
  const loadUserDataFromFirebase = async (uid, email) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setBonusPoints(data.balance || 0); setTotalTaps(data.totalEarned || 0);
        setMyReferralCode(data.myReferralCode || ''); setUser({ name: data.name, phone: data.phone, email: data.email });
      }
    } catch(e) {}
  };
  const saveBalanceToFirebase = async () => { try { const uid = firebaseAuth.currentUser?.uid; if (uid) await updateDoc(doc(db, 'users', uid), { balance: bonusPoints, totalEarned: totalTaps }); } catch(e) {} };
  useEffect(()=>{ saveBalanceToFirebase(); }, [bonusPoints, totalTaps]);
  const checkInternet = async () => { const net = await NetInfo.fetch(); if (!net.isConnected) { Alert.alert('Internet Required', 'Please turn on Wi-Fi'); return false; } return true; };
  const sendEmailJsOtp = async (emailAddr, name, code) => {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY, template_params: { to_email: emailAddr, otp: code, to_name: name } }) });
    if (!res.ok) throw new Error(await res.text());
  };
  const handleRegister = async () => {
    if (!(await checkInternet())) return;
    if (!user.name || !user.phone || !user.email) { Alert.alert('Missing Fields', 'Please fill all fields'); return; }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try { await sendEmailJsOtp(user.email, user.name, code); } catch(e) {}
    setEmailOtp(code); setOtpExpiresAt(Date.now() + 10*60*1000); setScreen('otp');
    Alert.alert('Verification Code Sent', 'Code: ' + code);
  };
  const verifyOtpAndSave = async () => {
    if (Date.now() > otpExpiresAt) { Alert.alert('Expired', 'Code expired'); return; }
    if (otp !== emailOtp) { Alert.alert('Invalid Code', 'Incorrect code'); return; }
    try {
      const pwd = 'Vyra@123' + otp;
      try { const cred = await createUserWithEmailAndPassword(firebaseAuth, user.email, pwd); const myCode = 'VYRA' + Math.random().toString(36).substring(2,8).toUpperCase(); await setDoc(doc(db, 'users', cred.user.uid), { uid: cred.user.uid, email: user.email, name: user.name, phone: user.phone, myReferralCode: myCode, balance: 100, totalEarned: 100, createdAt: serverTimestamp() }); } catch {}
      await AsyncStorage.setItem('lastUserEmail', user.email); setScreen('login'); Alert.alert('Account Created', 'Please login');
    } catch { Alert.alert('Error', 'Could not save'); }
  };
  const handleLogin = async () => {
    if (!(await checkInternet())) return;
    if (!loginEmail || !loginPassword) { Alert.alert('Missing Fields', 'Enter email and password'); return; }
    try { const cred = await signInWithEmailAndPassword(firebaseAuth, loginEmail, loginPassword); await AsyncStorage.setItem('lastUserEmail', loginEmail); await loadUserDataFromFirebase(cred.user.uid, loginEmail); setScreen('home'); }
    catch (e) { try { const q = query(collection(db, 'users'), where('email', '==', loginEmail)); const snap = await getDocs(q); if (!snap.empty) { const data = snap.docs[0].data(); await loadUserDataFromFirebase(data.uid, loginEmail); setUser({ name: data.name, phone: data.phone, email: data.email }); setScreen('home'); return; } } catch {} Alert.alert('Login Failed', e.message); }
  };
  const watchAd = async () => { 
    try {
      if (rewardedAdRef.current && rewardedLoaded) { await rewardedAdRef.current.show(); setRewardedLoaded(false); rewardedAdRef.current.load(); } 
      else { if(rewardedAdRef.current) rewardedAdRef.current.load(); Alert.alert('Ad', 'Ad loading... +50 bonus'); setBonusPoints(b=>b+50); }
    } catch { setBonusPoints(b=>b+50); } 
  };
  const tapForProgress = async () => { 
    const next = tapCount + 1; setTapCount(next); setTotalTaps(t=>t+1); 
    if (next >= 50) { setBonusPoints(b=>b+100); setTapCount(0); Alert.alert('Complete!', '+100 Points!'); try { if (interstitialAdRef.current && interstitialLoaded) { await interstitialAdRef.current.show(); interstitialAdRef.current.load(); } } catch {} } 
  };
  const handleJoinOffer = async (offer) => {
    setSelectedOffer(offer);
    Alert.alert(
      'Watch Ad to Continue',
      `You need to watch an ad to unlock ${offer.name} link`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Watch Ad', 
          onPress: async () => {
            try {
              if (rewardedAdRef.current && rewardedLoaded) {
                await rewardedAdRef.current.show();
                setRewardedLoaded(false);
                rewardedAdRef.current.load();
              } else {
                setBonusPoints(b => b + 50);
              }
            } catch(e) { setBonusPoints(b => b + 50); }
            setTimeout(() => {
              Linking.openURL(offer.link).catch(()=>{});
              Alert.alert('Link Opened', `Use code ${offer.code} and submit proof`);
            }, 800);
          } 
        }
      ]
    );
  };

  const handleProofSubmit = async () => {
    if (!proofText || !selectedOffer) { Alert.alert('Missing', 'Enter proof'); return; }
    try {
      await addDoc(collection(db, 'proofs'), {
        userId: firebaseAuth.currentUser?.uid || user.email,
        offerId: selectedOffer.id,
        offerName: selectedOffer.name,
        proof: proofText,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setBonusPoints(b => b + selectedOffer.reward);
      Alert.alert('Success', `Proof submitted! +${selectedOffer.reward} points pending verification`);
      setProofText('');
      setSelectedOffer(null);
    } catch(e) { Alert.alert('Error', 'Could not submit'); }
  };

  const handleWithdraw = async () => {
    const amt = parseInt(withdrawAmount);
    if (!amt || amt < 200000) { Alert.alert('Minimum', 'Min withdrawal 200,000 points = 5,000 Naira'); return; }
    if (amt > bonusPoints) { Alert.alert('Low Balance', 'Not enough points'); return; }
    if (!bankName || !accountNumber || !accountName) { Alert.alert('Missing', 'Fill all account details'); return; }
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: firebaseAuth.currentUser?.uid || user.email,
        userEmail: user.email,
        amount: amt,
        method: withdrawMethod,
        bankName: bankName,
        accountNumber: accountNumber,
        accountName: accountName,
        nairaValue: (amt / 200000) * 5000,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setBonusPoints(b => b - amt);
      Alert.alert('Request Sent', `${withdrawMethod} withdrawal of ${amt} points = ${(amt/200000*5000).toFixed(0)} Naira submitted`);
      setWithdrawAmount(''); setBankName(''); setAccountNumber(''); setAccountName('');
    } catch(e) { Alert.alert('Error', 'Withdraw failed'); }
  };

  // SCREENS
  if (screen === 'loading') {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6a00f4" /><Text>Vyra Loading v{VERSION}...</Text></View>;
  }
  if (screen === 'register') {
    return (
      <ScrollView contentContainerStyle={styles.auth}>
        <Text style={styles.authTitle}>Create Account - Vyra {VERSION}</Text>
        <TextInput style={styles.input} placeholder="Full Name" value={user.name} onChangeText={t => setUser({...user, name: t})} />
        <TextInput style={styles.input} placeholder="Phone (for CPX)" value={user.phone} onChangeText={t => setUser({...user, phone: t})} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="Email" value={user.email} onChangeText={t => setUser({...user, email: t})} keyboardType="email-address" autoCapitalize="none" />
        <TouchableOpacity style={[styles.yBtn, {backgroundColor: currentTheme.primary}]} onPress={handleRegister}><Text style={styles.yTxt}>REGISTER & GET CODE</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('login')}><Text style={{textAlign:'center', color: currentTheme.primary, marginTop:10}}>Already have account? LOGIN</Text></TouchableOpacity>
      </ScrollView>
    );
  }
  if (screen === 'otp') {
    return (
      <ScrollView contentContainerStyle={styles.auth}>
        <Text style={styles.authTitle}>Enter OTP - Code: {emailOtp}</Text>
        <TextInput style={styles.input} placeholder="6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="numeric" />
        <TouchableOpacity style={[styles.yBtn, {backgroundColor: currentTheme.primary}]} onPress={verifyOtpAndSave}><Text style={styles.yTxt}>VERIFY OTP</Text></TouchableOpacity>
      </ScrollView>
    );
  }
  if (screen === 'login') {
    return (
      <ScrollView contentContainerStyle={styles.auth}>
        <Text style={styles.authTitle}>Login - Vyra {VERSION}</Text>
        <TextInput style={styles.input} placeholder="Email" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password (Vyra@123+OTP)" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
        <TouchableOpacity style={[styles.yBtn, {backgroundColor: currentTheme.primary}]} onPress={handleLogin}><Text style={styles.yTxt}>LOGIN</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setScreen('register')}><Text style={{textAlign:'center', color: currentTheme.primary, marginTop:10}}>No account? REGISTER</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  // HOME SCREEN
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={{paddingBottom: 100}}>
        <View style={[styles.header, {backgroundColor: currentTheme.primary}]}>
          <Text style={styles.logo}>VYRA REWARDS PRO v{VERSION} - BUILD {BUILD}</Text>
          <Text style={styles.subLogo}>Balance: {bonusPoints} pts | {myReferralCode}</Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}><Text style={styles.statLabel}>BONUS</Text><Text style={[styles.mv, {color: currentTheme.primary}]}>{bonusPoints}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>TOTAL TAPS</Text><Text style={[styles.mv, {color: currentTheme.primary}]}>{totalTaps}</Text></View>
          <View style={styles.statCard}><Text style={styles.statLabel}>TAP PROGRESS</Text><Text style={[styles.mv, {color: currentTheme.primary}]}>{tapCount}/50</Text></View>
        </View>

        <TouchableOpacity style={styles.secondaryBtn} onPress={tapForProgress}><Text style={styles.secondaryTxt}>TAP TO EARN - {tapCount}/50 (Complete = +100 + Interstitial)</Text></TouchableOpacity>

        <Text style={styles.sec}>7 REAL OFFERS - Watch Ad Before Join (CPX + 7 Banks)</Text>
        {REAL_OFFERS.map(o => (
          <View key={o.id} style={[styles.shop, {borderLeftColor: o.color, borderLeftWidth: 5}]}>
            <View style={{flex:1}}><Text style={styles.itemTitle}>{o.name} - Reward {o.reward}</Text><Text style={styles.itemCode}>Code: {o.code}</Text></View>
            <TouchableOpacity style={[styles.joinBtn, {backgroundColor: o.color}]} onPress={() => handleJoinOffer(o)}><Text style={styles.joinTxt}>JOIN + AD</Text></TouchableOpacity>
          </View>
        ))}

        {selectedOffer && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Submit Proof for {selectedOffer.name}</Text>
            <TextInput style={styles.input} placeholder="Paste screenshot link or write proof" value={proofText} onChangeText={setProofText} multiline />
            <TouchableOpacity style={[styles.yBtn, {backgroundColor: currentTheme.primary}]} onPress={handleProofSubmit}><Text style={styles.yTxt}>SUBMIT PROOF +{selectedOffer.reward}</Text></TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.secondaryBtn} onPress={watchAd}><Text style={styles.secondaryTxt}>WATCH REWARDED AD +50 Points {rewardedLoaded ? '(Ready)' : '(Loading...)'}</Text></TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>CPX Research Surveys - Earn Extra</Text>
          {CpxOfferwall ? <CpxOfferwall user={user} /> : null}
        </View>

        <View style={{alignItems: 'center', marginVertical: 10}}>
          {isConnected ? <BannerAd unitId={bannerUnitId} size={BannerAdSize.BANNER} /> : null}
        </View>

        <Text style={styles.sec}>WALLET - 7 Withdraw Methods - Min 200k = 5k Naira</Text>
        <View style={styles.card}>
          <Text style={{marginBottom:8}}>Balance: {bonusPoints} pts = {(bonusPoints/200000*5000).toFixed(0)} Naira</Text>
          <View style={{flexDirection:'row', flexWrap:'wrap', marginBottom:10}}>
            {WITHDRAW_METHODS.map(m => (
              <TouchableOpacity key={m} onPress={() => setWithdrawMethod(m)} style={[styles.methodBtn, {backgroundColor: withdrawMethod === m ? currentTheme.primary : '#eee'}]}>
                <Text style={{color: withdrawMethod === m ? '#fff' : '#333', fontSize:11}}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Amount Min 200000" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder={withdrawMethod === 'Airtime' ? 'Phone Number' : withdrawMethod === 'USDT' ? 'USDT TRC20 Address' : 'Bank/Wallet Name'} value={bankName} onChangeText={setBankName} />
          <TextInput style={styles.input} placeholder={withdrawMethod === 'Airtime' ? 'Network (MTN/GLO...)' : withdrawMethod === 'USDT' ? 'Network TRC20' : 'Account Number'} value={accountNumber} onChangeText={setAccountNumber} />
          <TextInput style={styles.input} placeholder="Account Name" value={accountName} onChangeText={setAccountName} />
          <TouchableOpacity style={[styles.yBtn, {backgroundColor: currentTheme.primary}]} onPress={handleWithdraw}><Text style={styles.yTxt}>WITHDRAW {withdrawMethod.toUpperCase()}</Text></TouchableOpacity>
        </View>

        <Text style={styles.sec}>SETTINGS - Theme Changer (5 Themes)</Text>
        <View style={styles.card}>
          <View style={{flexDirection:'row', flexWrap:'wrap'}}>
            {APP_THEMES.map((th, i) => (
              <TouchableOpacity key={th.name} onPress={async () => { setThemeIndex(i); await AsyncStorage.setItem('themeIndex', String(i)); }} style={[styles.themeDot, {backgroundColor: th.primary, borderWidth: themeIndex === i ? 3 : 0, borderColor: '#000'}]}>
                <Text style={{color:'#fff', fontSize:7, textAlign:'center'}}>{th.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={{marginTop:10}}>Current: {APP_THEMES[themeIndex].name} - {currentTheme.primary}</Text>
          <Text style={{fontSize:10, color:'#666'}}>Slug: vyra-rewards | Owner: secretmadabos-team | Package: com.vyrarewards.earn | AdMob: 567288772229131</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page:{flex:1, backgroundColor:'#f5f5f5'},
  center:{flex:1, justifyContent:'center', alignItems:'center'},
  header:{padding:15, paddingTop:45, paddingBottom:15},
  logo:{color:'#fff', fontWeight:'bold', fontSize:14},
  subLogo:{color:'#fff', fontSize:11, marginTop:4},
  statRow:{flexDirection:'row', padding:10},
  statCard:{backgroundColor:'#fff', padding:12, borderRadius:10, flex:1, margin:4, alignItems:'center', elevation:2},
  statLabel:{fontSize:10, color:'#666'},
  mv:{fontSize:18, fontWeight:'bold', marginTop:4},
  sec:{fontSize:14, fontWeight:'bold', margin:15, marginBottom:5},
  card:{backgroundColor:'#fff', padding:15, margin:10, borderRadius:10, elevation:2},
  cardTitle:{fontWeight:'bold', marginBottom:10},
  shop:{backgroundColor:'#fff', flexDirection:'row', padding:12, marginHorizontal:10, marginVertical:6, borderRadius:8, alignItems:'center', elevation:1},
  itemTitle:{fontWeight:'bold', fontSize:13},
  itemCode:{fontSize:11, color:'#666'},
  joinBtn:{paddingHorizontal:12, paddingVertical:8, borderRadius:6},
  joinTxt:{color:'#fff', fontWeight:'bold', fontSize:11},
  input:{backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8, marginBottom:10},
  yBtn:{padding:14, borderRadius:8, alignItems:'center', marginVertical:5},
  yTxt:{color:'#fff', fontWeight:'bold'},
  secondaryBtn:{backgroundColor:'#fff', borderWidth:1, borderColor:'#6a00f4', padding:14, borderRadius:8, alignItems:'center', margin:10},
  secondaryTxt:{color:'#6a00f4', fontWeight:'bold', fontSize:12},
  methodBtn:{padding:8, margin:4, borderRadius:6},
  themeDot:{width:70, height:40, margin:5, borderRadius:6, justifyContent:'center', alignItems:'center'},
  auth:{padding:20, paddingTop:80},
  authTitle:{fontSize:18, fontWeight:'bold', textAlign:'center', marginBottom:20},
});
