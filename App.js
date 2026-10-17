import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, Switch, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import CpxOfferwall from './CpxOfferwall';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, RewardedAd, InterstitialAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';

const VERSION = '1.0.5';
const BUILD = 9;
const BANNER_ID = 'ca-app-pub-4487679675698542/5498846987';
const REWARDED_ID = 'ca-app-pub-4487679675698542/9277117923';
const INTERSTITIAL_ID = 'ca-app-pub-4487679675698542/7002308379';
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

const QUIZ_QUESTIONS = [
  { category: 'General Knowledge', question: 'What is the capital city of Nigeria?', options: ['Kano', 'Abuja', 'Lagos', 'Kaduna'], correctIndex: 1 },
  { category: 'Science', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Mercury'], correctIndex: 2 },
  { category: 'Mathematics', question: 'What is 12 × 8?', options: ['88', '96', '108', '86'], correctIndex: 1 },
  { category: 'Technology', question: 'Which device is mainly used to type text into a computer?', options: ['Monitor', 'Speaker', 'Keyboard', 'Printer'], correctIndex: 2 },
  { category: 'History', question: "Who was Nigeria's first President?", options: ['Nnamdi Azikiwe', 'Olusegun Obasanjo', 'Yakubu Gowon', 'Murtala Mohammed'], correctIndex: 0 },
];

const Header = () => <View style={s.header}><Text style={s.logo}>VYRA REWARDS PRO v{VERSION}</Text></View>;
const Banner = () => <View style={{alignItems:'center', marginVertical:10}}><BannerAd unitId={bannerUnitId} size={BannerAdSize.BANNER} /></View>;
const VersionTag = () => <Text style={{textAlign:'center', fontSize:10, color:'#888', marginTop:20}}>v{VERSION} Build {BUILD} - Firebase REAL + EmailJS OTP</Text>;

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [bonusPoints, setBonusPoints] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [quizBalance, setQuizBalance] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [otp, setOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState('');
  const [proofs, setProofs] = useState([]);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [proofText, setProofText] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  ser)); setScreen('home'); loadProofs(JSON.parse(savedUser).email); }
      else setScreen('register');
      if (savedBonus) setBonusPoints(parseInt(savedBonus));
      if (savedTaps) setTotalTaps(parseInt(savedTaps));
      if (savedTapCount) setTapCount(parseInt(savedTapCount));
      if (savedQuizBal) setQuizBalance(parseInt(savedQuizBal));
      if (savedRefCode) setMyReferralCode(savedRefCode);
    } catch (e) { setScreen('register'); }
  };

  const loadProofs = async (email) => {
    try {
      const q = query(collection(db, 'referral_proofs'), where('email', '==', email), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = []; snap.forEach(d => list.push({id:d.id, ...d.data()})); setProofs(list);
    } catch(e) {}
  };

  const saveStorage = async () => {
    await AsyncStorage.setItem('bonusPoints', String(bonusPoints));
    await AsyncStorage.setItem('totalTaps', String(totalTaps));
    await AsyncStorage.setItem('tapCount', String(tapCount));
    await AsyncStorage.setItem('quizBalance', String(quizBalance));
  };
  useEffect(()=>{ saveStorage(); }, [bonusPoints, totalTaps, tapCount, quizBalance]);

  const checkInternet = async () => {
    try { const net = await NetInfo.fetch(); if (!net.isConnected) { Alert.alert('Internet required', 'Please turn on Wi-Fi or mobile data.'); return false; } return true; } catch { return false; }
  };

  const sendEmailJsOtp = async (emailAddr, name, code) => {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: { to_email: emailAddr, otp: code, to_name: name }
      })
    });
    const text = await response.text();
    if (!response.ok) throw new Error(text);
    return true;
  };

  const handleRegister = async () => {
    if (!(await checkInternet())) return;
    if (!user.name || !user.phone || !user.email) { Alert.alert('Fill all fields'); return; }
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await sendEmailJsOtp(user.email, user.name, code);
      setEmailOtp(code);
      setOtpExpiresAt(Date.now() + 10*60*1000);
      setScreen('otp');
      Alert.alert('Code Sent!', 'Mun tura code zuwa ' + user.email + ' via ' + EMAILJS_SERVICE_ID);
    } catch (e) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setEmailOtp(code); setOtpExpiresAt(Date.now() + 10*60*1000); setScreen('otp');
      Alert.alert('EmailJS Test Mode', 'Code: ' + code + ' Error: ' + e.message);
    }
  };

  const verifyOtpAndSave = async () => {
    if (Date.now() > otpExpiresAt) { Alert.alert('Expired', 'Code ya kare'); return; }
    if (otp !== emailOtp) { Alert.alert('Wrong OTP', 'Code ba daidai bane'); return; }
    try {
      try {
        const cred = await createUserWithEmailAndPassword(firebaseAuth, user.email, 'Vyra@123' + otp);
        const myCode = 'VYRA' + Math.random().toString(36).substring(2,8).toUpperCase();
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid, email: user.email, name: user.name, phone: user.phone,
          myReferralCode: myCode, balance: 100, totalEarned: 100, referrals:0, createdAt: serverTimestamp()
        });
        setMyReferralCode(myCode);
        await AsyncStorage.setItem('myReferralCode', myCode);
      } catch (fbErr) { console.log('Firebase user may exist:', fbErr.message); }
      await AsyncStorage.setItem('user', JSON.stringify(user));
      setEmailOtp(''); setScreen('home');
      Alert.alert('Verified!', 'Barka da zuwa Vyra - Firebase REAL + CPX + 7 Offers!');
    } catch { Alert.alert('Save error', 'Could not save'); }
  };

  const watchAd = async () => {
    if (!(await checkInternet())) return;
    if (!rewardedLoaded) { rewardedAd.load(); Alert.alert('Ad not ready', 'Wait a moment'); return; }
    try { await rewardedAd.show(); setRewardedLoaded(false); } catch { setRewardedLoaded(false); }
  };

  const tapForProgress = async () => {
    const next = tapCount + 1;
    setTapCount(next); setTotalTaps(t=>t+1);
    if (next >= 50) {
      setBonusPoints(b=>b+100); setTapCount(0);
      Alert.alert('Progress Complete!', '+100 Bonus Points!');
      try { interstitialAd.show(); } catch {}
      interstitialAd.load();
    }
  };

  const handleQuizAnswer = (index) => {
    if (quizAnswered) return;
    setQuizAnswered(true);
    if (index === QUIZ_QUESTIONS[quizIndex].correctIndex) { setQuizScore(s=>s+1); setQuizBalance(b=>b+10); setBonusPoints(b=>b+10); }
    setTimeout(()=> {
      if (quizIndex+1 >= QUIZ_QUESTIONS.length) { setQuizFinished(true); }
      else { setQuizIndex(i=>i+1); setQuizAnswered(false); }
    }, 1000);
  };

  const handleJoinOffer = async (offer) => {
    setSelectedOffer(offer);
    try { await Linking.openURL(offer.link); } catch {}
    setTimeout(()=>{ Alert.alert('Proof?', 'Ka yi register da code '+offer.code+'? Submit proof a Tasks!'); }, 1000);
  };

  const submitProof = async () => {
    if (!proofText || !selectedOffer) { Alert.alert('Fill proof'); return; }
    try {
      await addDoc(collection(db, 'referral_proofs'), {
        userId: firebaseAuth.currentUser?.uid || user.email,
        name: user.name, email: user.email, phone: user.phone,
        offerName: selectedOffer.name, offerCode: selectedOffer.code, reward: selectedOffer.reward,
        proof: proofText, myReferralCode: myReferralCode, status: 'pending', createdAt: serverTimestamp()
      });
      setBonusPoints(b=>b+50);
      Alert.alert('Success', 'Proof submitted! +50 Bonus! Will review 24h');
      setProofText(''); loadProofs(user.email);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !bankName || !accountNumber) { Alert.alert('Fill all'); return; }
    const amt = parseInt(withdrawAmount);
    if (amt < 1000) { Alert.alert('Min 1000'); return; }
    if (amt > bonusPoints) { Alert.alert('Insufficient'); return; }
    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId: firebaseAuth.currentUser?.uid || user.email,
        name: user.name, email: user.email, amount: amt, bankName, accountNumber, status:'pending', createdAt: serverTimestamp()
      });
      setBonusPoints(b=>b-amt);
      Alert.alert('Withdraw', 'Request sent! 24h');
      setWithdrawAmount(''); setBankName(''); setAccountNumber('');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  if (screen === 'loading') return <View style={s.center}><ActivityIndicator size="large" color="#6a00f4" /><Text>Loading Vyra...</Text></View>;

  if (screen === 'register') return (
    <ScrollView contentContainerStyle={s.auth}><Text style={s.authTitle}>Vyra Rewards Pro - Register</Text><Text style={{textAlign:'center', marginBottom:10}}>Firebase REAL + EmailJS OTP + CPX</Text>
      <TextInput style={s.input} placeholder="Full Name" value={user.name} onChangeText={t=>setUser({...user, name:t})} />
      <TextInput style={s.input} placeholder="Phone" value={user.phone} onChangeText={t=>setUser({...user, phone:t})} keyboardType="phone-pad" />
      <TextInput style={s.input} placeholder="Email" value={user.email} onChangeText={t=>setUser({...user, email:t})} keyboardType="email-address" autoCapitalize="none" />
      <TouchableOpacity style={s.yBtn} onPress={handleRegister}><Text style={s.yTxt}>REGISTER + SEND OTP (service_eo4mafe)</Text></TouchableOpacity><VersionTag /></ScrollView>
  );

  if (screen === 'otp') return (
    <ScrollView contentContainerStyle={s.auth}><Text style={s.authTitle}>Tabbatar da Email - OTP</Text><Text style={{textAlign:'center'}}>Code zuwa {user.email}</Text><Text style={{textAlign:'center', fontSize:12, color:'#888', marginVertical:10}}>Test OTP: {emailOtp} - {EMAILJS_SERVICE_ID}</Text>
      <TextInput style={s.input} placeholder="6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} />
      <TouchableOpacity style={s.yBtn} onPress={verifyOtpAndSave}><Text style={s.yTxt}>VERIFY + CREATE FIREBASE REAL USER</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={()=>{ setEmailOtp(''); setOtp(''); setScreen('register'); }}><Text style={s.secondaryText}>BACK</Text></TouchableOpacity><VersionTag /></ScrollView>
  );

  return (
    <View style={s.page}>
      <ScrollView style={s.main} contentContainerStyle={{ paddingBottom: 24 }}>
        <Header />
        {screen === 'home' && <>
          <View style={s.statRow}><View style={s.statCard}><Text style={s.ml}>BONUS POINTS</Text><Text style={s.mv}>{bonusPoints}</Text></View><View style={s.statCard}><Text style={s.ml}>TOTAL TAPS</Text><Text style={s.mv}>{totalTaps}</Text></View></View>
          <View style={s.tot}><Text style={s.ml}>IN-APP BONUS + REF CODE: {myReferralCode}</Text><Text style={s.balance}>{bonusPoints}</Text></View>
          <View style={s.prog}><Text style={s.progressText}>{tapCount}/50 taps</Text><View style={[s.progressBar, {width: `${(tapCount/50)*100}%`}]} /></View>
          <TouchableOpacity style={s.yBtn} onPress={tapForProgress}><Text style={s.yTxt}>TAP FOR PROGRESS</Text></TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={watchAd}><Text style={s.secondaryText}>WATCH AD +50 {rewardedLoaded ? '(Ready)' : '(Loading)'}</Text></TouchableOpacity>

          <Text style={s.sec}>7 REAL OFFERS - EARN 800-1200 Each - Firebase REAL</Text>
          {REAL_OFFERS.map(offer => (
            <View key={offer.id} style={[s.shop, {borderLeftWidth:4, borderLeftColor: offer.color}]}>
              <View style={{flex:1}}><Text style={s.itemTitle}>{offer.name} - N{offer.reward}</Text><Text style={s.demoLabel}>Code: {offer.code} - {offer.desc}</Text><Text style={{fontSize:10, color:'#888'}}>{offer.link}</Text></View>
              <TouchableOpacity style={[s.secondaryBtn, {marginTop:0, backgroundColor: offer.color}]} onPress={()=>handleJoinOffer(offer)}><Text style={{color:'#fff', fontWeight:'bold'}}>JOIN {offer.code}</Text></TouchableOpacity>
            </View>
          ))}

          {selectedOffer && <View style={s.card}><Text style={s.sec}>Submit Proof for {selectedOffer.name} - {selectedOffer.code}</Text><TextInput style={[s.input, {height:80}]} placeholder="Example: I registered with PalmPay NSFM3287, username @xyz, funded 500" value={proofText} onChangeText={setProofText} multiline /><TouchableOpacity style={s.yBtn} onPress={submitProof}><Text style={s.yTxt}>SUBMIT PROOF - GET {selectedOffer.reward}</Text></TouchableOpacity></View>}

          <Text style={s.sec}>MY PROOFS - {proofs.length} - Firebase REAL</Text>
          {proofs.map(p => <View key={p.id} style={s.shop}><Text style={s.itemTitle}>{p.offerName} - {p.offerCode}</Text><Text style={s.demoLabel}>{p.status} - N{p.reward}</Text></View>)}

          <View style={s.card}><Text style={s.sec}>WITHDRAW - Min 1000 - Firebase</Text><TextInput style={s.input} placeholder="Amount" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="numeric" /><TextInput style={s.input} placeholder="Bank Name e.g PalmPay" value={bankName} onChangeText={setBankName} /><TextInput style={s.input} placeholder="Account Number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" /><TouchableOpacity style={s.yBtn} onPress={handleWithdraw}><Text style={s.yTxt}>WITHDRAW NOW</Text></TouchableOpacity></View>

          <TouchableOpacity style={s.abf} onPress={()=>setScreen('cpx')}><Text style={s.abt}>CPX RESEARCH - REAL SURVEYS (Not Destroyed!)</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={()=>setScreen('quiz')}><Text style={s.abt}>VYRA QUIZ - Earn 10 per Q</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={()=>setScreen('tasks')}><Text style={s.abt}>ALL OFFERS + TASKS</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={()=>setScreen('wallet')}><Text style={s.abt}>REWARDS STATUS - Balance {bonusPoints}</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={()=>setScreen('settings')}><Text style={s.abt}>SETTINGS - v{VERSION}</Text></TouchableOpacity>
          <Banner />
        </>}

        {screen === 'cpx' && <>
          <Text style={s.sec}>CPX RESEARCH - REAL SURVEYS - Not Destroyed!</Text>
          <View style={{flex:1, height:700, backgroundColor:'#fff', borderRadius:12, overflow:'hidden'}}><CpxOfferwall user={user} /></View>
          <TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK TO HOME</Text></TouchableOpacity>
        </>}

        {screen === 'quiz' && <><Text style={s.sec}>🧠 VYRA QUIZ</Text>{!quizFinished ? <View style={s.card}><Text style={s.progressText}>Question {quizIndex+1}/{QUIZ_QUESTIONS.length}</Text><Text style={s.question}>{QUIZ_QUESTIONS[quizIndex].question}</Text>{QUIZ_QUESTIONS[quizIndex].options.map((option, index) => <TouchableOpacity key={option} disabled={quizAnswered} style={[s.option, quizAnswered && index===QUIZ_QUESTIONS[quizIndex].correctIndex && s.correct, quizAnswered && index!==QUIZ_QUESTIONS[quizIndex].correctIndex && s.wrong]} onPress={()=>handleQuizAnswer(index)}><Text>{option}</Text></TouchableOpacity>)}<Text style={{marginTop:10}}>Score: {quizScore} Balance: {quizBalance}</Text></View> : <View style={s.card}><Text style={s.question}>Finished! Score {quizScore}/{QUIZ_QUESTIONS.length}</Text><TouchableOpacity style={s.yBtn} onPress={()=>{ setQuizIndex(0); setQuizScore(0); setQuizFinished(false); setQuizAnswered(false); setScreen('home'); }}><Text style={s.yTxt}>BACK TO HOME</Text></TouchableOpacity></View>}</>}

        {screen === 'tasks' && <><Text style={s.sec}>REFERRALS & OFFERS - 7 REAL + Tasks</Text>{REAL_OFFERS.map(offer => <View key={offer.id} style={s.shop}><View style={{flex:1}}><Text style={s.itemTitle}>{offer.name} - {offer.code}</Text><Text style={s.demoLabel}>Reward N{offer.reward} - REAL LINK</Text></View><TouchableOpacity style={[s.secondaryBtn, {marginTop:0}]} onPress={()=>handleJoinOffer(offer)}><Text style={s.secondaryText}>JOIN</Text></TouchableOpacity></View>)}<TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK TO HOME</Text></TouchableOpacity></>}

        {screen === 'wallet' && <><Text style={s.sec}>REWARDS STATUS - Firebase REAL</Text><View style={s.card}><Text style={s.question}>Bonus Points: {bonusPoints} - Total Taps: {totalTaps} - Quiz Balance: {quizBalance}</Text><Text style={s.question}>Referral Code: {myReferralCode} - Share to earn 300</Text><Text style={s.question}>Email: {user.email} - Name: {user.name}</Text><TextInput style={s.input} placeholder="Amount Min 1000" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="numeric" /><TextInput style={s.input} placeholder="Bank Name" value={bankName} onChangeText={setBankName} /><TextInput style={s.input} placeholder="Account Number" value={accountNumber} onChangeText={setAccountNumber} keyboardType="numeric" /><TouchableOpacity style={s.yBtn} onPress={handleWithdraw}><Text style={s.yTxt}>WITHDRAW {withdrawAmount || ''}</Text></TouchableOpacity></View><TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK TO HOME</Text></TouchableOpacity></>}

        {screen === 'settings' && <>
          <Text style={s.sec}>⚙️ SETTINGS - B da Setting - Not Destroyed!</Text>
          <View style={s.card}>
            <View style={s.settingItem}><Text style={s.settingText}>🔔 Notifications</Text><Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} /></View>
            <View style={s.settingItem}><Text style={s.settingText}>🔊 Sound</Text><Switch value={soundEnabled} onValueChange={setSoundEnabled} /></View>
            <Text style={s.settingText}>📧 EmailJS: {EMAILJS_SERVICE_ID} - {EMAILJS_TEMPLATE_ID}</Text>
            <Text style={s.settingText}>🔥 Firebase: vyra-rewards-pro - REAL Config</Text>
                     <Text style={s.settingText}>📶 Connection: {isConnected ? 'Online' : 'Offline'}</Text>
            <Text style={s.settingText}>👤 User: {user.name} - {user.email}</Text>
            <Text style={s.settingText}>🎫 My Referral: {myReferralCode}</Text>
            <TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('Terms', 'Vyra Rewards Pro - Earn via offers')}><Text style={s.settingText}>📄 Terms of Service</Text></TouchableOpacity>
            <TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('About', `Vyra Rewards v${VERSION} Build ${BUILD} - CPX + 7 Offers + Firebase REAL + EmailJS ${EMAILJS_SERVICE_ID} + Settings`)}><Text style={s.settingText}>ℹ️ About App - v{VERSION} Build {BUILD}</Text></TouchableOpacity>
            <TouchableOpacity style={s.yBtn} onPress={async()=>{ await AsyncStorage.clear(); setScreen('register'); Alert.alert('Reset', 'Data cleared'); }}><Text style={s.yTxt}>RESET DATA</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK TO HOME</Text></TouchableOpacity>
          <VersionTag />
        </>}

      </ScrollView>
      <View style={s.bottomNav}>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('home')}><Text style={s.navText}>HOME</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('cpx')}><Text style={s.navText}>CPX</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('tasks')}><Text style={s.navText}>OFFERS</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('wallet')}><Text style={s.navText}>WALLET</Text></TouchableOpacity>
        <TouchableOpacity style={s.navItem} onPress={()=>setScreen('settings')}><Text style={s.navText}>SETTING</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex:1, backgroundColor:'#f5f5f5' },
  main: { flex:1 },
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  header: { backgroundColor:'#6a00f4', padding:15, paddingTop:40 },
  logo: { color:'#fff', fontWeight:'bold', fontSize:16 },
  statRow: { flexDirection:'row', justifyContent:'space-between', padding:10 },
  statCard: { backgroundColor:'#fff', padding:15, borderRadius:10, flex:1, margin:5, elevation:2 },
  ml: { fontSize:12, color:'#888' },
  mv: { fontSize:20, fontWeight:'bold', color:'#6a00f4' },
  tot: { backgroundColor:'#ffd700', padding:15, margin:10, borderRadius:10 },
  balance: { fontSize:24, fontWeight:'bold' },
  prog: { backgroundColor:'#eee', height:10, borderRadius:5, margin:10, overflow:'hidden' },
  progressBar: { backgroundColor:'#6a00f4', height:10 },
  progressText: { fontSize:12, color:'#888', marginBottom:5 },
  sec: { fontSize:16, fontWeight:'bold', margin:15, color:'#333' },
  card: { backgroundColor:'#fff', padding:15, margin:10, borderRadius:10, elevation:2 },
  shop: { backgroundColor:'#fff', flexDirection:'row', padding:12, marginHorizontal:10, marginBottom:8, borderRadius:8, elevation:1, alignItems:'center' },
  itemTitle: { fontWeight:'bold', fontSize:14 },
  demoLabel: { fontSize:12, color:'#888' },
  input: { backgroundColor:'#fff', borderWidth:1, borderColor:'#ddd', padding:12, borderRadius:8, marginBottom:10 },
  yBtn: { backgroundColor:'#6a00f4', padding:14, borderRadius:8, alignItems:'center', marginVertical:5 },
  yTxt: { color:'#fff', fontWeight:'bold' },
  secondaryBtn: { backgroundColor:'#fff', borderWidth:1, borderColor:'#6a00f4', padding:14, borderRadius:8, alignItems:'center', marginVertical:5 },
  secondaryText: { color:'#6a00f4', fontWeight:'bold' },
  abf: { backgroundColor:'#fff', padding:15, marginHorizontal:10, marginBottom:8, borderRadius:8, borderLeftWidth:3, borderLeftColor:'#6a00f4' },
  abt: { fontWeight:'bold', color:'#6a00f4' },
  bottomNav: { flexDirection:'row', backgroundColor:'#fff', padding:10, justifyContent:'space-around', borderTopWidth:1, borderTopColor:'#eee' },
  navItem: { padding:8 },
  navText: { fontWeight:'bold', color:'#6a00f4', fontSize:12 },
  auth: { padding:20, paddingTop:60 },
  authTitle: { fontSize:22, fontWeight:'bold', marginBottom:15, textAlign:'center', color:'#6a00f4' },
  question: { fontSize:16, fontWeight:'bold', marginBottom:10 },
  option: { backgroundColor:'#f0f0f0', padding:12, borderRadius:8, marginBottom:8 },
  correct: { backgroundColor:'#c8e6c9' },
  wrong: { backgroundColor:'#ffcdd2' },
  settingItem: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:12, borderBottomWidth:1, borderBottomColor:'#eee' },
  settingText: { fontSize:14, paddingVertical:4 }
});
