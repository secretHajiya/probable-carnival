import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, Switch, Linking, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import CpxOfferwall from './CpxOfferwall';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, RewardedAd, InterstitialAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, getDoc, updateDoc } from 'firebase/firestore';

const VERSION = '1.0.5'; const BUILD = 10;
// NEW ADS - Daga Hotonka
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
const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const EMAILJS_SERVICE_ID = 'service_eo4mafe';
const EMAILJS_TEMPLATE_ID = 'template_vla0zff';
const EMAILJS_PUBLIC_KEY = 'Ee45lolv3ZCjOSWUy';

const REAL_OFFERS = [
  { id: '1', name: 'PalmPay', reward: 800, code: 'NSFM3287', link: 'https://app.palmpay.com/invite/NSFM3287', color: '#6a00f4', desc: 'Register + Fund 500' },
  { id: '2', name: 'Opay', reward: 1000, code: 'OPAYVYRA', link: 'https://opay.com/join/OPAYVYRA', color: '#00c853', desc: 'Register + KYC' },
  { id: '3', name: 'Moniepoint', reward: 1200, code: 'MONIEVYRA', link: 'https://moniepoint.com/refer/MONIEVYRA', color: '#0d47a1', desc: 'Business account' },
  { id: '4', name: 'FairMoney', reward: 900, code: 'FAIRVYRA', link: 'https://fairmoney.io/r/FAIRVYRA', color: '#ff6f00', desc: 'Install + Register' },
  { id: '5', name: 'Carbon', reward: 850, code: 'CARBONVYRA', link: 'https://getcarbon.co/invite/CARBONVYRA', color: '#212121', desc: 'Register + BVN' },
  { id: '6', name: 'Branch', reward: 700, code: 'BRANCHVYRA', link: 'https://branch.com.ng/a/BRANCHVYRA', color: '#1e88e5', desc: 'Install + Loan check' },
  { id: '7', name: 'Kuda', reward: 1100, code: 'KUDAVYRA', link: 'https://kuda.com/join/KUDAVYRA', color: '#4a148c', desc: 'Register + Fund 1000' },
];

const WITHDRAW_METHODS = ['Bank Transfer', 'Opay', 'Palmpay', 'Moniepoint', 'Kuda', 'Airtime', 'USDT'];
const APP_THEMES = [
  { name: 'Default Purple', primary: '#6a00f4', secondary: '#ffd700' },
  { name: 'Ocean Blue', primary: '#0d47a1', secondary: '#00e5ff' },
  { name: 'Forest Green', primary: '#1b5e20', secondary: '#a5d6a7' },
  { name: 'Sunset Orange', primary: '#e65100', secondary: '#ffcc80' },
  { name: 'Dark Mode', primary: '#212121', secondary: '#424242' },
];

const TERMS_TEXT = `Terms of Service - Vyra Rewards Pro
Last Updated: May 16, 2026
Contact: vyraprosupport@gmail.com
1. Acceptance of Terms
2. How it Works: Earn coins via CPX Research surveys, redeem for gift cards
3. No Fraud: No VPN, no fake accounts, ban if fraud
4. Rewards subject to verification`;

const PRIVACY_TEXT = `Privacy Policy - Vyra Rewards Pro
Last Updated: May 16, 2026
Contact: vyraprosupport@gmail.com
1. We collect Device ID for fraud prevention
2. Email only for support
3. We do not sell personal data
4. Request deletion via email`;
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [bonusPoints, setBonusPoints] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [quizBalance, setQuizBalance] = useState(0);
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
  const rewardedAd = useRef(RewardedAd.createForAdRequest(rewardedUnitId, { requestNonPersonalizedAdsOnly: true })).current;
  const interstitialAd = useRef(InterstitialAd.createForAdRequest(interstitialUnitId, { requestNonPersonalizedAdsOnly: true })).current;

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener(s => setIsConnected(!!s.isConnected));
    mobileAds().initialize();
    const unsubRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
    const unsubRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { setBonusPoints(b => b+50); setTotalTaps(t => t+1); Alert.alert('Reward!', 'You earned +50 Bonus Points'); });
    const unsubInterLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
    rewardedAd.load(); interstitialAd.load();
    loadInitialData();
    return () => { unsubNet(); unsubRewardedLoaded(); unsubRewardedEarned(); unsubInterLoaded(); };
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
      const q = query(collection(db, 'referral_proofs'), where('email', '==', email), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q); const list = []; snap.forEach(d => list.push({id:d.id, ...d.data()})); setProofs(list);
    } catch(e) {}
  };

  const saveBalanceToFirebase = async () => {
    try { const uid = firebaseAuth.currentUser?.uid; if (uid) await updateDoc(doc(db, 'users', uid), { balance: bonusPoints, totalEarned: totalTaps }); } catch(e) {}
  };
  useEffect(()=>{ saveBalanceToFirebase(); }, [bonusPoints, totalTaps]);

  const checkInternet = async () => {
    const net = await NetInfo.fetch(); if (!net.isConnected) { Alert.alert('Internet Required', 'Please turn on Wi-Fi'); return false; } return true;
  };

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
    Alert.alert('Verification Code Sent', 'Code sent to ' + user.email + ' Demo: ' + code);
  };

  const verifyOtpAndSave = async () => {
    if (Date.now() > otpExpiresAt) { Alert.alert('Expired', 'Code expired'); return; }
    if (otp !== emailOtp) { Alert.alert('Invalid Code', 'Incorrect code'); return; }
    try {
      const pwd = 'Vyra@123' + otp;
      try { const cred = await createUserWithEmailAndPassword(firebaseAuth, user.email, pwd); const myCode = 'VYRA' + Math.random().toString(36).substring(2,8).toUpperCase(); await setDoc(doc(db, 'users', cred.user.uid), { uid: cred.user.uid, email: user.email, name: user.name, phone: user.phone, myReferralCode: myCode, balance: 100, totalEarned: 100, referrals:0, createdAt: serverTimestamp() }); } catch {}
      await AsyncStorage.setItem('lastUserEmail', user.email); setScreen('login'); Alert.alert('Account Created', 'Please login to continue');
    } catch { Alert.alert('Error', 'Could not save'); }
  };

  const handleLogin = async () => {
    if (!(await checkInternet())) return;
    if (!loginEmail || !loginPassword) { Alert.alert('Missing Fields', 'Enter email and password'); return; }
    try { const cred = await signInWithEmailAndPassword(firebaseAuth, loginEmail, loginPassword); await AsyncStorage.setItem('lastUserEmail', loginEmail); await loadUserDataFromFirebase(cred.user.uid, loginEmail); setScreen('home'); }
    catch (e) { try { const q = query(collection(db, 'users'), where('email', '==', loginEmail)); const snap = await getDocs(q); if (!snap.empty) { const data = snap.docs[0].data(); await loadUserDataFromFirebase(data.uid, loginEmail); setUser({ name: data.name, phone: data.phone, email: data.email }); setScreen('home'); return; } } catch {} Alert.alert('Login Failed', e.message); }
  };
    const watchAd = async () => { if (!rewardedLoaded) { rewardedAd.load(); Alert.alert('Ad Not Ready', 'Wait'); return; } try { await rewardedAd.show(); setRewardedLoaded(false); rewardedAd.load(); } catch {} };
  const tapForProgress = async () => { const next = tapCount + 1; setTapCount(next); setTotalTaps(t=>t+1); if (next >= 50) { setBonusPoints(b=>b+100); setTapCount(0); Alert.alert('Progress Complete!', '+100 Bonus Points!'); try { if (interstitialLoaded) await interstitialAd.show(); } catch {} interstitialAd.load(); } };

  const handleJoinOffer = async (offer) => {
    setSelectedOffer(offer);
    Alert.alert('Advertisement Required', 'You must watch an ad before joining this offer',
      [{ text: 'Cancel' }, { text: 'Watch Ad & Continue', onPress: async () => { try { if (rewardedLoaded) { await rewardedAd.show(); setRewardedLoaded(false); } else if (interstitialLoaded) { await interstitialAd.show(); } } catch {} setTimeout(async () => { try { await Linking.openURL(offer.link); } catch {} Alert.alert('Offer Opened', 'Complete with code ' + offer.code + ' and submit proof'); }, 500); }}]
    );
  };

  const submitProof = async () => {
    if (!proofText || !selectedOffer) { Alert.alert('Missing Proof', 'Enter proof'); return; }
    await addDoc(collection(db, 'referral_proofs'), { userId: firebaseAuth.currentUser?.uid || user.email, name: user.name, email: user.email, offerName: selectedOffer.name, offerCode: selectedOffer.code, reward: selectedOffer.reward, proof: proofText, myReferralCode, status: 'pending', createdAt: serverTimestamp() });
    setBonusPoints(b=>b+50); Alert.alert('Success', 'Proof submitted +50 Coins'); setProofText('');
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !bankName || !accountNumber || !accountName) { Alert.alert('Missing Fields', 'Please fill all withdrawal details'); return; }
    const amt = parseInt(withdrawAmount);
    if (amt < 200000) { Alert.alert('Minimum Withdrawal', 'Minimum is 200,000 Coins = 5,000 Naira'); return; }
    if (amt > bonusPoints) { Alert.alert('Insufficient Balance', 'Not enough coins: ' + bonusPoints); return; }
    await addDoc(collection(db, 'withdrawals'), { userId: firebaseAuth.currentUser?.uid || user.email, name: user.name, email: user.email, amount: amt, method: withdrawMethod, bankName, accountNumber, accountName, nairaValue: (amt/200000)*5000, status:'pending', createdAt: serverTimestamp() });
    setBonusPoints(b=>b-amt); Alert.alert('Withdrawal Request Sent', amt + ' coins (' + ((amt/200000)*5000) + ' Naira) via ' + withdrawMethod + ' sent. Review 24-48h.'); setWithdrawAmount(''); setBankName(''); setAccountNumber(''); setAccountName('');
  };

  const Header = () => <View style={[s.header, {backgroundColor: currentTheme.primary}]}><Text style={s.logo}>VYRA REWARDS PRO v{VERSION}</Text></View>;
  const Banner = () => <View style={{alignItems:'center', marginVertical:10}}><BannerAd unitId={bannerUnitId} size={BannerAdSize.BANNER} /></View>;
  const VersionTag = () => <Text style={{textAlign:'center', fontSize:10, color:'#888', marginTop:20}}>v{VERSION} Build {BUILD} - Firebase + New Ads 7 Methods</Text>;

  if (screen === 'loading') return <View style={s.center}><ActivityIndicator size="large" color={currentTheme.primary} /><Text>Loading Vyra...</Text></View>;
  if (screen === 'register') return (
    <ScrollView contentContainerStyle={s.auth}><Text style={[s.authTitle, {color: currentTheme.primary}]}>Vyra Rewards Pro - Register</Text>
      <TextInput style={s.input} placeholder="Full Name" value={user.name} onChangeText={t=>setUser({...user, name:t})} />
      <TextInput style={s.input} placeholder="Phone" value={user.phone} onChangeText={t=>setUser({...user, phone:t})} keyboardType="phone-pad" />
      <TextInput style={s.input} placeholder="Email" value={user.email} onChangeText={t=>setUser({...user, email:t})} keyboardType="email-address" autoCapitalize="none" />
      <TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary}]} onPress={handleRegister}><Text style={s.yTxt}>REGISTER & SEND OTP</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('login')}><Text style={[s.secondaryText, {color: currentTheme.primary}]}>Already have account? LOGIN</Text></TouchableOpacity><VersionTag /></ScrollView>
  );
  if (screen === 'otp') return (
    <ScrollView contentContainerStyle={s.auth}><Text style={[s.authTitle, {color: currentTheme.primary}]}>Email Verification</Text><Text style={{textAlign:'center'}}>Code to {user.email} Demo: {emailOtp}</Text>
      <TextInput style={s.input} placeholder="6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
      <TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary}]} onPress={verifyOtpAndSave}><Text style={s.yTxt}>VERIFY & CREATE ACCOUNT</Text></TouchableOpacity><VersionTag /></ScrollView>
  );
  if (screen === 'login') return (
    <ScrollView contentContainerStyle={s.auth}><Text style={[s.authTitle, {color: currentTheme.primary}]}>Login</Text><Text style={{textAlign:'center', marginBottom:15}}>Welcome back! Please login</Text>
      <TextInput style={s.input} placeholder="Email" value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Password Vyra@123+OTP" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry />
      <TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary}]} onPress={handleLogin}><Text style={s.yTxt}>LOGIN NOW</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('register')}><Text style={[s.secondaryText, {color: currentTheme.primary}]}>No account? REGISTER</Text></TouchableOpacity><VersionTag /></ScrollView>
  );
  return (
    <View style={s.page}>
      <ScrollView style={s.main} contentContainerStyle={{ paddingBottom: 24 }}>
        <Header />
        {screen === 'home' && <>
          <View style={s.statRow}><View style={s.statCard}><Text style={s.ml}>BONUS POINTS</Text><Text style={[s.mv, {color: currentTheme.primary}]}>{bonusPoints}</Text></View><View style={s.statCard}><Text style={s.ml}>TOTAL EARNED</Text><Text style={[s.mv, {color: currentTheme.primary}]}>{totalTaps}</Text></View></View>
          <View style={[s.tot, {backgroundColor: currentTheme.secondary}]}><Text style={s.ml}>BALANCE + REF CODE: {myReferralCode}</Text><Text style={s.balance}>{bonusPoints} Coins = {(bonusPoints/200000*5000).toFixed(0)} Naira</Text></View>
          <View style={s.prog}><View style={[s.progressBar, {width: `${(tapCount/50)*100}%`, backgroundColor: currentTheme.primary}]} /></View>
          <TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary}]} onPress={tapForProgress}><Text style={s.yTxt}>TAP FOR PROGRESS {tapCount}/50</Text></TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={watchAd}><Text style={[s.secondaryText, {color: currentTheme.primary}]}>WATCH AD +50 {rewardedLoaded ? '(Ready)' : '(Loading)'}</Text></TouchableOpacity>
          <Text style={s.sec}>7 REAL OFFERS - Ad Required Before Join</Text>
          {REAL_OFFERS.map(offer => (
            <View key={offer.id} style={[s.shop, {borderLeftWidth:4, borderLeftColor: offer.color}]}>
              <View style={{flex:1}}><Text style={s.itemTitle}>{offer.name} - {offer.reward} Coins</Text><Text style={s.demoLabel}>Code: {offer.code} - {offer.desc}</Text></View>
              <TouchableOpacity style={[s.secondaryBtn, {marginTop:0, backgroundColor: offer.color}]} onPress={()=>handleJoinOffer(offer)}><Text style={{color:'#fff', fontWeight:'bold'}}>JOIN & WATCH AD</Text></TouchableOpacity>
            </View>
          ))}
          {selectedOffer && <View style={s.card}><Text style={s.sec}>Submit Proof for {selectedOffer.name}</Text><TextInput style={[s.input, {height:80}]} placeholder="Enter proof details" value={proofText} onChangeText={setProofText} multiline /><TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary}]} onPress={submitProof}><Text style={s.yTxt}>SUBMIT PROOF - GET {selectedOffer.reward}</Text></TouchableOpacity></View>}
          <TouchableOpacity style={s.abf} onPress={()=>setScreen('wallet')}><Text style={[s.abt, {color: currentTheme.primary}]}>WALLET - 7 Methods - Min 200k = 5k Naira</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={()=>setScreen('settings')}><Text style={[s.abt, {color: currentTheme.primary}]}>SETTINGS - Themes + Terms</Text></TouchableOpacity>
          <Banner />
        </>}

        {screen === 'wallet' && <>
          <Text style={s.sec}>WALLET - 7 Withdrawal Methods</Text>
          <View style={s.card}>
            <Text style={s.question}>Balance: {bonusPoints} Coins = {(bonusPoints/200000*5000).toFixed(0)} Naira</Text>
            <Text style={s.demoLabel}>Min: 200,000 Coins = 5,000 Naira</Text>
            <Text style={s.ml}>Choose Method:</Text>
            <View style={{flexDirection:'row', flexWrap:'wrap', marginVertical:8}}>
              {WITHDRAW_METHODS.map(m => (
                <TouchableOpacity key={m} onPress={()=>setWithdrawMethod(m)} style={{padding:8, margin:4, borderRadius:6, backgroundColor: withdrawMethod===m ? currentTheme.primary : '#eee'}}>
                  <Text style={{color: withdrawMethod===m ? '#fff' : '#333', fontSize:11}}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={s.input} placeholder="Amount Min 200000 Coins" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="numeric" />
            <TextInput style={s.input} placeholder={withdrawMethod==='Airtime' ? 'Phone Number for Airtime' : withdrawMethod==='USDT' ? 'USDT Wallet Address (TRC20)' : 'Bank/Wallet Name (Opay/Palmpay/Moniepoint/Kuda/Bank)'} value={bankName} onChangeText={setBankName} />
            <TextInput style={s.input} placeholder={withdrawMethod==='Airtime' ? 'Network MTN/Airtel/Glo/9mobile' : withdrawMethod==='USDT' ? 'Network TRC20/ERC20' : 'Account Number'} value={accountNumber} onChangeText={setAccountNumber} />
            <TextInput style={s.input} placeholder="Account Name / Full Name" value={accountName} onChangeText={setAccountName} />
            <TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary}]} onPress={handleWithdraw}><Text style={s.yTxt}>REQUEST WITHDRAWAL - {withdrawMethod}</Text></TouchableOpacity>
            <Text style={{fontSize:11, color:'#888', marginTop:10}}>All withdrawals reviewed in Firebase - pending -> approved/rejected 24-48h</Text>
          </View>
          <TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={[s.secondaryText, {color: currentTheme.primary}]}>BACK TO HOME</Text></TouchableOpacity>
        </>}

        {screen === 'settings' && <>
          <Text style={s.sec}>SETTINGS</Text>
          <View style={s.card}>
            <View style={s.settingItem}><Text>🔔 Notifications</Text><Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} /></View>
            <View style={{paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#eee'}}>
              <Text style={s.settingText}>🎨 App Theme - Change Color (Replaced Sound)</Text>
              <View style={{flexDirection:'row', flexWrap:'wrap', marginTop:8}}>
                {APP_THEMES.map((th, idx) => (
                  <TouchableOpacity key={th.name} onPress={async()=>{ setThemeIndex(idx); await AsyncStorage.setItem('themeIndex', String(idx)); }} style={{width:70, height:45, backgroundColor: th.primary, margin:5, borderRadius:8, borderWidth: themeIndex===idx ? 3 : 0, borderColor:'#000', justifyContent:'center', alignItems:'center'}}>
                    <Text style={{color:'#fff', fontSize:8, textAlign:'center'}}>{th.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Text style={s.settingText}>👤 User: {user.name} - {user.email}</Text>
            <Text style={s.settingText}>🎫 Referral: {myReferralCode}</Text>
            <Text style={s.settingText}>💰 Balance: {bonusPoints} Coins (Firebase Synced)</Text>
            <Text style={s.settingText}>📶 Connection: {isConnected ? 'Online' : 'Offline'}</Text>
            <TouchableOpacity style={s.settingItem} onPress={()=>setShowTerms(true)}><Text style={s.settingText}>📄 Terms of Service - View Real</Text></TouchableOpacity>
            <TouchableOpacity style={s.settingItem} onPress={()=>setShowPrivacy(true)}><Text style={s.settingText}>🔒 Privacy Policy - View Real</Text></TouchableOpacity>
            <TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary}]} onPress={async()=>{ await AsyncStorage.clear(); setScreen('login'); Alert.alert('Logged Out', 'Data cleared, please login again'); }}><Text style={s.yTxt}>LOGOUT & RESET</Text></TouchableOpacity>
          </View>
          <VersionTag />
        </>}
      </ScrollView>
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('home')}><Text style={[s.navText, {color: currentTheme.primary}]}>HOME</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('wallet')}><Text style={[s.navText, {color: currentTheme.primary}]}>WALLET</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('settings')}><Text style={[s.navText, {color: currentTheme.primary}]}>SETTING</Text></TouchableOpacity>
      </View>
      <Modal visible={showTerms} animationType="slide"><ScrollView style={{padding:20, paddingTop:50}}><Text style={s.question}>Terms of Service</Text><Text>{TERMS_TEXT}</Text><TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary, marginTop:20}]} onPress={()=>setShowTerms(false)}><Text style={s.yTxt}>CLOSE</Text></TouchableOpacity></ScrollView></Modal>
      <Modal visible={showPrivacy} animationType="slide"><ScrollView style={{padding:20, paddingTop:50}}><Text style={s.question}>Privacy Policy</Text><Text>{PRIVACY_TEXT}</Text><TouchableOpacity style={[s.yBtn, {backgroundColor: currentTheme.primary, marginTop:20}]} onPress={()=>setShowPrivacy(false)}><Text style={s.yTxt}>CLOSE</Text></TouchableOpacity></ScrollView></Modal>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex:1, backgroundColor:'#f5f5f5' }, main: { flex:1 }, center: { flex:1, justifyContent:'center', alignItems:'center' },
  header: { padding:15, paddingTop:40 }, logo: { color:'#fff', fontWeight:'bold', fontSize:16 },
  statRow: { flexDirection:'row', justifyContent:'space-between', padding:10 }, statCard: { backgroundColor:'#fff', padding:15, borderRadius:10, flex:1, margin:5, elevation:2 },
  ml: { fontSize:12, color:'#888' }, mv: { fontSize:20, fontWeight:'bold' }, tot: { padding:15, margin:10, borderRadius:10 }, balance: { fontSize:20, fontWeight:'bold' },
  prog: { backgroundColor:'#eee', height:10, borderRadius:5, margin:10, overflow:'hidden' }, progressBar: { height:10 },
  sec: { fontSize:16, fontWeight:'bold', margin:15, color:'#333' }, card: { backgroundColor:'#fff', padding:15, margin:10, borderRadius:10, elevation:2 },
  shop: { backgroundColor:'#fff', flexDirection:'row', padding:12, marginHorizontal:10, marginBottom:8, borderRadius:8, elevation:1, alignItems:'center' },
  itemTitle: { fontWeight:'bold', fontSize:14 }, demoLabel: { fontSize:12, color:'#888' },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8, marginBottom:10 },
  yBtn: { padding:14, borderRadius:8, alignItems:'center', marginVertical:5 }, yTxt: { color:'#fff', fontWeight:'bold' },
  secondaryBtn: { backgroundColor:'#fff', borderWidth:1, borderColor:'#6a00f4', padding:14, borderRadius:8, alignItems:'center', marginVertical:5 }, secondaryText: { fontWeight:'bold' },
  abf: { backgroundColor:'#fff', padding:15, marginHorizontal:10, marginBottom:8, borderRadius:8, borderLeftWidth:3, borderLeftColor:'#6a00f4' }, abt: { fontWeight:'bold' },
  bottomNav: { flexDirection:'row', backgroundColor:'#fff', padding:10, justifyContent:'space-around', borderTopWidth:1, borderTopColor:'#eee' }, navItem: { padding:8 }, navText: { fontWeight:'bold', fontSize:12 },
  auth: { padding:20, paddingTop:60 }, authTitle: { fontSize:22, fontWeight:'bold', marginBottom:15, textAlign:'center' },
  question: { fontSize:16, fontWeight:'bold', marginBottom:10 }, settingItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#eee' }, settingText: { fontSize:14, paddingVertical:4 }
});
