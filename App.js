import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, Switch, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import CpxOfferwall from './CpxOfferwall';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, RewardedAd, InterstitialAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';

const VERSION = '1.0.7';
const BUILD = 12;
// SABABBIN REAL ADS - 5672 - NA CIRE TSOFAFFIN 4487
const BANNER_ID = 'ca-app-pub-567288772229131/5819855709';
const REWARDED_ID = 'ca-app-pub-567288772229131/8254487351';
const INTERSTITIAL_ID = 'ca-app-pub-567288772229131/2783677985';
const APP_ID = 'ca-app-pub-567288772229131~8278538087';
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
  { category: 'Mathematics', question: 'What is 12 x 8?', options: ['88', '96', '108', '86'], correctIndex: 1 },
  { category: 'Technology', question: 'Which device is mainly used to type text?', options: ['Monitor', 'Speaker', 'Keyboard', 'Printer'], correctIndex: 2 },
  { category: 'History', question: "Who was Nigeria's first President?", options: ['Nnamdi Azikiwe', 'Olusegun Obasanjo', 'Yakubu Gowon', 'Murtala Mohammed'], correctIndex: 0 },
];

const THEMES = [
  { name: 'Purple', color: '#6a00f4' },
  { name: 'Blue', color: '#0d47a1' },
  { name: 'Green', color: '#00c853' },
  { name: 'Orange', color: '#ff6f00' },
  { name: 'Dark', color: '#212121' },
];

const TERMS_TEXT = `Terms of Service for Vyra Rewards Pro
Last Updated: May 16, 2026 - Contact: vyraprosupport@gmail.com
1. Acceptance: By using Vyra Rewards Pro, you agree to these Terms.
2. How it Works: Users earn virtual coins by completing surveys from CPX Research and redeem them for gift cards.
3. No Fraud: No VPN, no fake accounts. Fraud leads to ban.
4. Rewards: Subject to verification and availability.
5. Third-Party: Surveys provided by CPX Research.
6. Contact: vyraprosupport@gmail.com`;

const PRIVACY_TEXT = `Privacy Policy for Vyra Rewards Pro
Last Updated: May 16, 2026 - Contact: vyraprosupport@gmail.com
We collect Device ID for fraud prevention, Email only when you contact support, Usage data. We do not sell data. Share only with CPX Research and Google services. Request deletion via vyraprosupport@gmail.com`;

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [loginEmail, setLoginEmail] = useState('');
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
  const [themeColor, setThemeColor] = useState('#6a00f4');
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
  const [withdrawPhone, setWithdrawPhone] = useState('');

  const rewardedAd = React.useRef(RewardedAd.createForAdRequest(rewardedUnitId, { requestNonPersonalizedAdsOnly: true })).current;
  const interstitialAd = React.useRef(InterstitialAd.createForAdRequest(interstitialUnitId, { requestNonPersonalizedAdsOnly: true })).current;

  const Header = () => <View style={[s.header, {backgroundColor: themeColor}]}><Text style={s.logo}>VYRA REWARDS PRO v{VERSION}</Text></View>;
  const Banner = () => {
    try {
      return <View style={{alignItems:'center', marginVertical:10}}><BannerAd unitId={bannerUnitId} size={BannerAdSize.BANNER} /></View>;
    } catch { return null; }
  };
  const VersionTag = () => <Text style={{textAlign:'center', fontSize:10, color:'#888', marginTop:20}}>v{VERSION} Build {BUILD} - {APP_ID}</Text>;

  useEffect(() => {
    try {
      const unsubNet = NetInfo.addEventListener(s => setIsConnected(!!s.isConnected));
      mobileAds().initialize().catch(()=>{});
      const unsubRewardedLoaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardedLoaded(true));
      const unsubRewardedEarned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { setBonusPoints(b=>b+50); Alert.alert('Reward!','+50 Bonus'); });
      const unsubInterLoaded = interstitialAd.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
      rewardedAd.load(); interstitialAd.load(); loadStorage();
      return () => { try { unsubNet(); unsubRewardedLoaded(); unsubRewardedEarned(); unsubInterLoaded(); } catch {} };
    } catch {}
  }, []);

  const loadStorage = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('user');
      const savedBonus = await AsyncStorage.getItem('bonusPoints');
      const savedTaps = await AsyncStorage.getItem('totalTaps');
      const savedTapCount = await AsyncStorage.getItem('tapCount');
      const savedQuizBal = await AsyncStorage.getItem('quizBalance');
      const savedRefCode = await AsyncStorage.getItem('myReferralCode');
      const savedTheme = await AsyncStorage.getItem('themeColor');
      if (savedBonus) setBonusPoints(parseInt(savedBonus)||0);
      if (savedTaps) setTotalTaps(parseInt(savedTaps)||0);
      if (savedTapCount) setTapCount(parseInt(savedTapCount)||0);
      if (savedQuizBal) setQuizBalance(parseInt(savedQuizBal)||0);
      if (savedRefCode) setMyReferralCode(savedRefCode);
      if (savedTheme) setThemeColor(savedTheme);
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setScreen('login');
        loadProofs(parsed.email);
      } else setScreen('register');
    } catch { setScreen('register'); }
  };

  const loadProofs = async (email) => {
    try {
      const q = query(collection(db, 'referral_proofs'), where('email', '==', email), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = []; snap.forEach(d => list.push({id:d.id, ...d.data()})); setProofs(list);
    } catch {}
  };

  const saveStorage = async () => {
    try {
      await AsyncStorage.setItem('bonusPoints', String(bonusPoints));
      await AsyncStorage.setItem('totalTaps', String(totalTaps));
      await AsyncStorage.setItem('tapCount', String(tapCount));
      await AsyncStorage.setItem('quizBalance', String(quizBalance));
      await AsyncStorage.setItem('myReferralCode', myReferralCode||'');
      await AsyncStorage.setItem('themeColor', themeColor);
    } catch {}
  };
  useEffect(()=>{ saveStorage(); }, [bonusPoints, totalTaps, tapCount, quizBalance, myReferralCode, themeColor]);

  const checkInternet = async () => { const net = await NetInfo.fetch(); if (!net.isConnected) { Alert.alert('Internet required','Please turn on data'); return false; } return true; };
  const sendEmailJsOtp = async (emailAddr, name, code) => {
    try {
      const r = await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:EMAILJS_SERVICE_ID,template_id:EMAILJS_TEMPLATE_ID,user_id:EMAILJS_PUBLIC_KEY,template_params:{to_email:emailAddr,otp:code,to_name:name}})});
      const t = await r.text(); if (!r.ok) throw new Error(t); return true;
    } catch { throw new Error('Email failed'); }
  };
  
  // SINGLE handleRegister - BABU DUPLICATE
  const handleRegister = async () => {
    if (!(await checkInternet())) return;
    if (!user.name||!user.phone||!user.email) { Alert.alert('Validation','Please fill all fields'); return; }
    try {
      const code = Math.floor(100000+Math.random()*900000).toString();
      await sendEmailJsOtp(user.email,user.name,code);
      setEmailOtp(code); setOtpExpiresAt(Date.now()+10*60*1000); setScreen('otp');
      Alert.alert('Code Sent!','Verification code sent to '+user.email);
    } catch(e){ const code=Math.floor(100000+Math.random()*900000).toString(); setEmailOtp(code); setOtpExpiresAt(Date.now()+10*60*1000); setScreen('otp'); Alert.alert('Test Mode','Code: '+code); }
  };
  const verifyOtpAndSave = async () => {
    if (Date.now()>otpExpiresAt){ Alert.alert('Expired','Code has expired'); return; }
    if (otp!==emailOtp){ Alert.alert('Invalid OTP','Code is incorrect'); return; }
    try{
      try{ const cred=await createUserWithEmailAndPassword(firebaseAuth,user.email,'Vyra@123'+otp); const myCode='VYRA'+Math.random().toString(36).substring(2,8).toUpperCase(); await setDoc(doc(db,'users',cred.user.uid),{uid:cred.user.uid,email:user.email,name:user.name,phone:user.phone,myReferralCode:myCode,balance:100,totalEarned:100,referrals:0,createdAt:serverTimestamp()}); setMyReferralCode(myCode);}catch{}
      await AsyncStorage.setItem('user', JSON.stringify(user)); setScreen('home'); Alert.alert('Verified!','Welcome to Vyra Rewards Pro!');
    }catch{ Alert.alert('Save error','Could not save'); }
  };
  const handleLogin = async () => {
    if (!loginEmail){ Alert.alert('Validation','Enter your email'); return; }
    const savedUserStr = await AsyncStorage.getItem('user');
    if (!savedUserStr){ Alert.alert('No account','No account found, please register'); setScreen('register'); return; }
    const saved = JSON.parse(savedUserStr);
    if (saved.email.toLowerCase()===loginEmail.toLowerCase()){ setUser(saved); setScreen('home'); Alert.alert('Welcome Back!','Logged in as '+saved.name); }
    else Alert.alert('Email not found','Email does not match registered account');
  };
  const watchAd = async () => { try { if (!(await checkInternet())) return; if (!rewardedLoaded){ rewardedAd.load(); Alert.alert('Ad not ready','Please wait'); return; } await rewardedAd.show(); setRewardedLoaded(false); rewardedAd.load(); } catch {} };
  const tapForProgress = async () => { const next=tapCount+1; setTapCount(next); setTotalTaps(t=>t+1); if(next>=50){ setBonusPoints(b=>b+100); setTapCount(0); Alert.alert('Progress Complete!','+100 Bonus Points!'); try{ if(interstitialLoaded) await interstitialAd.show(); }catch{} interstitialAd.load(); } };
  const handleQuizAnswer = (index) => {
    if (quizAnswered) return; setQuizAnswered(true);
    if (index === QUIZ_QUESTIONS[quizIndex].correctIndex){ setQuizScore(s=>s+1); setQuizBalance(b=>b+10); setBonusPoints(b=>b+10); }
    setTimeout(()=>{ if(quizIndex+1>=QUIZ_QUESTIONS.length){ setQuizFinished(true); } else{ setQuizIndex(i=>i+1); setQuizAnswered(false); } },1000);
  };
  const handleJoinOffer = async (offer) => {
    setSelectedOffer(offer); if (!(await checkInternet())) return;
    try{ if(interstitialLoaded){ await interstitialAd.show(); } else{ interstitialAd.load(); } }catch{}
    try{ await Linking.openURL(offer.link); }catch{}
    setTimeout(()=>{
      setBonusPoints(prev=>prev+offer.reward);
      Alert.alert('Reward Earned!',`You earned ${offer.reward} coins for ${offer.name}! Ad watched - Coins credited!`);
      addDoc(collection(db,'offer_clicks'),{ userId:firebaseAuth.currentUser?.uid||user.email||'guest', email:user.email||loginEmail||'guest', offerName:offer.name, offerCode:offer.code, reward:offer.reward, method:'ad_view', createdAt:serverTimestamp() }).catch(()=>{});
    },1000);
  };
  const submitProof = async () => {
    if (!proofText || !selectedOffer){ Alert.alert('Validation','Please enter proof'); return; }
    try{
      await addDoc(collection(db,'referral_proofs'),{ userId:firebaseAuth.currentUser?.uid||user.email, name:user.name, email:user.email, phone:user.phone, offerName:selectedOffer.name, offerCode:selectedOffer.code, reward:selectedOffer.reward, proof:proofText, myReferralCode:myReferralCode, status:'pending', createdAt:serverTimestamp() });
      setBonusPoints(b=>b+50); Alert.alert('Success','Proof submitted! +50 Bonus! Will review 24h'); setProofText(''); loadProofs(user.email);
    }catch(e){ Alert.alert('Error',e.message); }
  };
  const handleWithdraw = async () => {
    if (!withdrawAmount){ Alert.alert('Validation','Enter amount in coins'); return; }
    const amt=parseInt(withdrawAmount); if(isNaN(amt)||amt<200000){ Alert.alert('Minimum Withdrawal','Minimum is 200,000 coins = N5,000'); return; }
    if(amt>bonusPoints){ Alert.alert('Insufficient Balance',`You have ${bonusPoints} coins only`); return; }
    if(withdrawMethod==='Bank Transfer'&&(!bankName||!accountNumber)){ Alert.alert('Validation','Enter Bank Name and Account Number'); return; }
    if((withdrawMethod==='OPay'||withdrawMethod==='PalmPay'||withdrawMethod==='Airtime')&&!withdrawPhone){ Alert.alert('Validation','Enter phone number'); return; }
    const nairaAmount=Math.floor(amt/40);
    try{ await addDoc(collection(db,'withdrawals'),{ userId:firebaseAuth.currentUser?.uid||user.email, name:user.name, email:user.email, coins:amt, nairaAmount:nairaAmount, method:withdrawMethod, bankName:bankName||'', accountNumber:accountNumber||'', phone:withdrawPhone||user.phone, status:'pending', createdAt:serverTimestamp() }); setBonusPoints(b=>b-amt); Alert.alert('Request Sent',`Request for ${amt} coins (N${nairaAmount}) via ${withdrawMethod} sent! Pending Review`); setWithdrawAmount(''); setBankName(''); setAccountNumber(''); setWithdrawPhone(''); }catch(e){ Alert.alert('Error',e.message); }
  };

  if (screen==='loading') return <View style={s.center}><ActivityIndicator size="large" color={themeColor}/><Text>Loading Vyra...</Text></View>;
  if (screen==='login') return (<ScrollView contentContainerStyle={s.auth}><Text style={s.authTitle}>Welcome Back - Login</Text><Text style={{textAlign:'center',marginBottom:15}}>Enter your registered email to continue</Text><TextInput style={s.input} placeholder="Registered Email" value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" autoCapitalize="none"/><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={handleLogin}><Text style={s.yTxt}>LOGIN</Text></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('register')}><Text style={s.secondaryText}>Create New Account</Text></TouchableOpacity><VersionTag/></ScrollView>);
  if (screen==='register') return (<ScrollView contentContainerStyle={s.auth}><Text style={s.authTitle}>Vyra Rewards Pro - Register</Text><Text style={{textAlign:'center',marginBottom:10}}>Firebase REAL + EmailJS + CPX + AdMob REAL 5672</Text><TextInput style={s.input} placeholder="Full Name" value={user.name} onChangeText={t=>setUser({...user,name:t})}/><TextInput style={s.input} placeholder="Phone" value={user.phone} onChangeText={t=>setUser({...user,phone:t})} keyboardType="phone-pad"/><TextInput style={s.input} placeholder="Email" value={user.email} onChangeText={t=>setUser({...user,email:t})} keyboardType="email-address" autoCapitalize="none"/><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={handleRegister}><Text style={s.yTxt}>REGISTER + SEND OTP</Text></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('login')}><Text style={s.secondaryText}>Already have account? LOGIN</Text></TouchableOpacity><VersionTag/></ScrollView>);
  if (screen==='otp') return (<ScrollView contentContainerStyle={s.auth}><Text style={s.authTitle}>Verify Email - OTP</Text><Text style={{textAlign:'center'}}>Code sent to {user.email}</Text><Text style={{textAlign:'center',fontSize:12,color:'#888',marginVertical:10}}>Test OTP: {emailOtp}</Text><TextInput style={s.input} placeholder="6-digit OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}/><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={verifyOtpAndSave}><Text style={s.yTxt}>VERIFY + CREATE ACCOUNT</Text></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={()=>{ setEmailOtp(''); setOtp(''); setScreen('register'); }}><Text style={s.secondaryText}>BACK</Text></TouchableOpacity><VersionTag/></ScrollView>);
  return (
    <View style={s.page}><ScrollView style={s.main} contentContainerStyle={{paddingBottom:24}}><Header/>
      {screen==='home'&&<><View style={s.statRow}><View style={s.statCard}><Text style={s.ml}>BONUS POINTS</Text><Text style={[s.mv,{color:themeColor}]}>{bonusPoints}</Text></View><View style={s.statCard}><Text style={s.ml}>TOTAL TAPS</Text><Text style={[s.mv,{color:themeColor}]}>{totalTaps}</Text></View></View><View style={[s.tot,{backgroundColor:'#ffd700'}]}><Text style={s.ml}>IN-APP BONUS + REF CODE: {myReferralCode}</Text><Text style={s.balance}>{bonusPoints} Coins (N{Math.floor(bonusPoints/40)})</Text></View><View style={s.prog}><View style={[s.progressBar,{width:`${(tapCount/50)*100}%`,backgroundColor:themeColor}]}/></View><Text style={s.progressText}>{tapCount}/50 taps for bonus</Text><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={tapForProgress}><Text style={s.yTxt}>TAP FOR PROGRESS</Text></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={watchAd}><Text style={s.secondaryText}>WATCH REWARDED AD +50 {rewardedLoaded?'(Ready)':'(Loading)'}</Text></TouchableOpacity><Text style={s.sec}>7 REAL OFFERS - Earn 700-1200 Each - Watch Ad Required</Text>{REAL_OFFERS.map(offer=><View key={offer.id} style={[s.shop,{borderLeftWidth:4,borderLeftColor:offer.color}]}><View style={{flex:1}}><Text style={s.itemTitle}>{offer.name} - {offer.reward} Coins</Text><Text style={s.demoLabel}>Code: {offer.code} - {offer.desc}</Text></View><TouchableOpacity style={[s.secondaryBtn,{marginTop:0,backgroundColor:offer.color}]} onPress={()=>handleJoinOffer(offer)}><Text style={{color:'#fff',fontWeight:'bold'}}>JOIN</Text></TouchableOpacity></View>)}{selectedOffer&&<View style={s.card}><Text style={s.sec}>Submit Proof for {selectedOffer.name}</Text><TextInput style={[s.input,{height:80}]} placeholder="Enter proof" value={proofText} onChangeText={setProofText} multiline/><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={submitProof}><Text style={s.yTxt}>SUBMIT PROOF - GET {selectedOffer.reward}</Text></TouchableOpacity></View>}<Text style={s.sec}>MY PROOFS - {proofs.length}</Text>{proofs.map(p=><View key={p.id} style={s.shop}><Text style={s.itemTitle}>{p.offerName} - {p.offerCode}</Text><Text style={s.demoLabel}>{p.status} - {p.reward} Coins</Text></View>)}<TouchableOpacity style={s.abf} onPress={()=>setScreen('cpx')}><Text style={s.abt}>CPX RESEARCH - REAL SURVEYS</Text></TouchableOpacity><TouchableOpacity style={s.abf} onPress={()=>setScreen('quiz')}><Text style={s.abt}>VYRA QUIZ</Text></TouchableOpacity><TouchableOpacity style={s.abf} onPress={()=>setScreen('wallet')}><Text style={s.abt}>WALLET - WITHDRAW</Text></TouchableOpacity><TouchableOpacity style={s.abf} onPress={()=>setScreen('settings')}><Text style={s.abt}>SETTINGS - v{VERSION}</Text></TouchableOpacity><Banner/></>}
      {screen==='cpx'&&<><Text style={s.sec}>CPX RESEARCH</Text><View style={{flex:1,height:700,backgroundColor:'#fff',borderRadius:12,overflow:'hidden'}}><CpxOfferwall user={user}/></View><TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK TO HOME</Text></TouchableOpacity></>}
      {screen==='quiz'&&<><Text style={s.sec}>VYRA QUIZ</Text>{!quizFinished?<View style={s.card}><Text style={s.progressText}>Question {quizIndex+1}/{QUIZ_QUESTIONS.length}</Text><Text style={s.question}>{QUIZ_QUESTIONS[quizIndex].question}</Text>{QUIZ_QUESTIONS[quizIndex].options.map((option,index)=><TouchableOpacity key={option} disabled={quizAnswered} style={[s.option,quizAnswered&&index===QUIZ_QUESTIONS[quizIndex].correctIndex&&s.correct,quizAnswered&&index!==QUIZ_QUESTIONS[quizIndex].correctIndex&&s.wrong]} onPress={()=>handleQuizAnswer(index)}><Text>{option}</Text></TouchableOpacity>)}<Text style={{marginTop:10}}>Score: {quizScore}</Text></View>:<View style={s.card}><Text style={s.question}>Finished! Score {quizScore}/{QUIZ_QUESTIONS.length}</Text><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={()=>{ setQuizIndex(0); setQuizScore(0); setQuizFinished(false); setQuizAnswered(false); setScreen('home'); }}><Text style={s.yTxt}>BACK TO HOME</Text></TouchableOpacity></View>}</>}
      {screen==='wallet'&&<><Text style={s.sec}>WALLET - WITHDRAW</Text><View style={s.card}><Text style={s.question}>Bonus: {bonusPoints} Coins = N{Math.floor(bonusPoints/40)}</Text><TextInput style={s.input} placeholder="Amount Min 200000" value={withdrawAmount} onChangeText={setWithdrawAmount} keyboardType="numeric"/><Text style={{fontSize:12,color:'#666'}}>Naira: N{withdrawAmount?Math.floor(parseInt(withdrawAmount||0)/40):0}</Text><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={handleWithdraw}><Text style={s.yTxt}>REQUEST WITHDRAWAL</Text></TouchableOpacity></View><TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK</Text></TouchableOpacity><Banner/></>}
      {screen==='settings'&&<><Text style={s.sec}>SETTINGS</Text><View style={s.card}><View style={s.settingItem}><Text style={s.settingText}>Notifications</Text><Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled}/></View><Text style={[s.settingText,{fontWeight:'bold',marginTop:10}]}>App Theme</Text><View style={{flexDirection:'row',flexWrap:'wrap',marginVertical:10}}>{THEMES.map(t=><TouchableOpacity key={t.name} style={[s.themeCircle,{backgroundColor:t.color},themeColor===t.color&&s.themeSelected]} onPress={()=>setThemeColor(t.color)}><Text style={{color:'#fff',fontSize:10}}>{t.name}</Text></TouchableOpacity>)}</View><TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('Terms',TERMS_TEXT)}><Text style={s.settingText}>Terms of Service</Text></TouchableOpacity><TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('Privacy',PRIVACY_TEXT)}><Text style={s.settingText}>Privacy Policy</Text></TouchableOpacity><TouchableOpacity style={[s.yBtn,{backgroundColor:themeColor}]} onPress={async()=>{ await AsyncStorage.clear(); setScreen('register'); Alert.alert('Reset','All data cleared'); }}><Text style={s.yTxt}>RESET / LOGOUT</Text></TouchableOpacity></View><TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK TO HOME</Text></TouchableOpacity><VersionTag/></>}
    </ScrollView><View style={s.bottomNav}><TouchableOpacity style={s.navItem} onPress={()=>setScreen('home')}><Text style={s.navText}>HOME</Text></TouchableOpacity><TouchableOpacity style={s.navItem} onPress={()=>setScreen('cpx')}><Text style={s.navText}>CPX</Text></TouchableOpacity><TouchableOpacity style={s.navItem} onPress={()=>setScreen('wallet')}><Text style={s.navText}>WALLET</Text></TouchableOpacity><TouchableOpacity style={s.navItem} onPress={()=>setScreen('settings')}><Text style={s.navText}>SETTING</Text></TouchableOpacity></View></View>
  );
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:'#f5f5f5'},main:{flex:1},center:{flex:1,justifyContent:'center',alignItems:'center'},header:{padding:15,paddingTop:40},logo:{color:'#fff',fontWeight:'bold',fontSize:16},statRow:{flexDirection:'row',justifyContent:'space-between',padding:10},statCard:{backgroundColor:'#fff',padding:15,borderRadius:10,flex:1,margin:5,elevation:2},ml:{fontSize:12,color:'#888'},mv:{fontSize:20,fontWeight:'bold'},tot:{padding:15,margin:10,borderRadius:10},balance:{fontSize:18,fontWeight:'bold'},prog:{backgroundColor:'#eee',height:10,borderRadius:5,margin:10,overflow:'hidden'},progressBar:{height:10},progressText:{fontSize:12,color:'#888',marginLeft:10},sec:{fontSize:16,fontWeight:'bold',margin:15,color:'#333'},card:{backgroundColor:'#fff',padding:15,margin:10,borderRadius:10,elevation:2},shop:{backgroundColor:'#fff',flexDirection:'row',padding:12,marginHorizontal:10,marginBottom:8,borderRadius:8,elevation:1,alignItems:'center'},itemTitle:{fontWeight:'bold',fontSize:14},demoLabel:{fontSize:12,color:'#888'},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#ddd',padding:12,borderRadius:8,marginBottom:10},yBtn:{padding:14,borderRadius:8,alignItems:'center',marginVertical:5},yTxt:{color:'#fff',fontWeight:'bold'},secondaryBtn:{backgroundColor:'#fff',borderWidth:1,borderColor:'#6a00f4',padding:14,borderRadius:8,alignItems:'center',marginVertical:5},secondaryText:{color:'#6a00f4',fontWeight:'bold'},abf:{backgroundColor:'#fff',padding:15,marginHorizontal:10,marginBottom:8,borderRadius:8,borderLeftWidth:3,borderLeftColor:'#6a00f4'},abt:{fontWeight:'bold',color:'#6a00f4'},bottomNav:{flexDirection:'row',backgroundColor:'#fff',padding:10,justifyContent:'space-around',borderTopWidth:1,borderTopColor:'#eee'},navItem:{padding:8},navText:{fontWeight:'bold',color:'#6a00f4',fontSize:12},auth:{padding:20,paddingTop:60},authTitle:{fontSize:22,fontWeight:'bold',marginBottom:15,textAlign:'center',color:'#6a00f4'},question:{fontSize:16,fontWeight:'bold',marginBottom:10},option:{backgroundColor:'#f0f0f0',padding:12,borderRadius:8,marginBottom:8},correct:{backgroundColor:'#c8e6c9'},wrong:{backgroundColor:'#ffcdd2'},settingItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#eee'},settingText:{fontSize:14,paddingVertical:4},methodBtn:{backgroundColor:'#eee',padding:10,borderRadius:20,margin:5},methodText:{fontSize:12,fontWeight:'bold'},themeCircle:{width:60,height:60,borderRadius:30,justifyContent:'center',alignItems:'center',margin:5},themeSelected:{borderWidth:3,borderColor:'#ffd700'}
});
