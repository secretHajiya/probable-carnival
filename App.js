import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, Switch, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import CpxOfferwall from './CpxOfferwall';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, RewardedAd, InterstitialAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCku3iG2yg5MigEU0vpDr4MEwEncW5Tn6w",
  authDomain: "vyra-rewards-pro.firebaseapp.com",
  projectId: "vyra-rewards-pro",
  storageBucket: "vyra-rewards-pro.firebasestorage.app",
  messagingSenderId: "250039191069",
  appId: "1:250039191069:web:7383d18279c8395438a8f4"
};
const db = getFirestore(initializeApp(firebaseConfig));

export const REFERRAL_LINKS = [
  { id: 'PALM', name: 'PalmPay', code: 'NSFM3287', link: 'https://info.palmpay.com/v7PfAVco', bonus: '₦5,550', reward: 500 },
  { id: 'MONIE', name: 'Moniepoint', code: 'TLEG561', link: 'https://join.moniepoint.com?adj_t=15ha060e&rC=TLEG561', reward: 500 },
  { id: 'FAIR', name: 'FairMoney', code: 'UAPM5BZ', link: 'https://fairmoney.io/referral?referral_code=UAPM5BZ', reward: 400 },
  { id: 'PIGGY', name: 'PiggyVest', code: 'secrethajiya004', link: 'https://join.piggyvest.com/secrethajiya004', bonus: '₦1,000', reward: 400 },
  { id: 'GTB', name: 'GTBank', code: 'GTWORLD', link: 'https://l.ead.me/gtworld', reward: 300 },
  { id: 'BIN', name: 'Binance', code: '1205609224', link: 'https://account.binance.com/register?ref=1205609224', reward: 1000 },
  { id: 'FLUT', name: 'Flutterwave', code: 'OAIH4CJTJI94', link: 'https://send.flutterwave.com/ref/?code=OAIH4CJTJI94', reward: 500 },
];

const VERSION = '1.0.6'; const BUILD = 11;
const BANNER_ID = 'ca-app-pub-4487679675698542/5498846987';
const REWARDED_ID = 'ca-app-pub-4487679675698542/9277117923';
const INTERSTITIAL_ID = 'ca-app-pub-4487679675698542/7002308379';
const bannerUnitId = __DEV__ ? TestIds.BANNER : BANNER_ID;
const rewardedUnitId = __DEV__ ? TestIds.REWARDED : REWARDED_ID;
const interstitialUnitId = __DEV__ ? TestIds.INTERSTITIAL : INTERSTITIAL_ID;

const QUIZ_QUESTIONS = [
  { question: 'What is the capital city of Nigeria?', options: ['Kano', 'Abuja', 'Lagos', 'Kaduna'], correctIndex: 1 },
  { question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Mercury'], correctIndex: 2 },
  { question: 'What is 12 × 8?', options: ['88', '96', '108', '86'], correctIndex: 1 },
];
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState(''); const [emailOtp, setEmailOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0); const [sendingOtp, setSendingOtp] = useState(false);
  const [bonusPoints, setBonusPoints] = useState(0); const [quizBalance, setQuizBalance] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0); const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false); const [quizFinished, setQuizFinished] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [tapCount, setTapCount] = useState(0); const [totalTaps, setTotalTaps] = useState(0);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [adMessage, setAdMessage] = useState('Loading...'); const [proofBank, setProofBank] = useState('');
  const [proofPhone, setProofPhone] = useState('');

  const EMAILJS_SERVICE_ID = 'service_eo4mafe';
  const EMAILJS_TEMPLATE_ID = 'template_vla0zff';
  const EMAILJS_PUBLIC_KEY = 'Ee45lolv3ZCjOSWUy';
  const rewardedAd = React.useRef(RewardedAd.createForAdRequest(rewardedUnitId, { requestNonPersonalizedAdsOnly: true })).current;
  const interstitialAd = React.useRef(InterstitialAd.createForAdRequest(interstitialUnitId, { requestNonPersonalizedAdsOnly: true })).current;

  useEffect(() => {
    const unsubNet = NetInfo.addEventListener(s => setIsConnected(!!s.isConnected));
    mobileAds().initialize();
    const a1 = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => { setRewardedLoaded(true); setAdMessage('Watch Ad'); });
    const a2 = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async () => {
      const np = bonusPoints + 10; setBonusPoints(np);
      await AsyncStorage.setItem('vyra_bonus', String(np));
      try{ await setDoc(doc(db,"users",user.email.toLowerCase()),{bonusPoints:np, updatedAt:serverTimestamp()},{merge:true}); }catch{}
      Alert.alert('Reward!','+10 Points REAL');
    });
    const a3 = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => { setRewardedLoaded(false); rewardedAd.load(); });
    const b1 = interstitialAd.addAdEventListener(AdEventType.LOADED, () => setInterstitialLoaded(true));
    const b2 = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => { setInterstitialLoaded(false); interstitialAd.load(); });
    rewardedAd.load(); interstitialAd.load(); loadData();
    return () => { unsubNet(); a1(); a2(); a3(); b1(); b2(); };
  }, [bonusPoints, user.email]);

  const [isConnected, setIsConnected] = useState(true);
  const saveUserToFirestore = async (u, bonus, quiz) => {
    try{ if(!u.email) return;
      await setDoc(doc(db,"users",u.email.toLowerCase()),{name:u.name,phone:u.phone,email:u.email,bonusPoints:bonus,quizBalance:quiz,updatedAt:serverTimestamp()},{merge:true});
    }catch(e){ console.log(e.message); }
  };
  const loadData = async () => {
    try{
      const su = await AsyncStorage.getItem('vyra_user'); const sb = await AsyncStorage.getItem('vyra_bonus');
      const st = await AsyncStorage.getItem('vyra_total_taps'); const stc = await AsyncStorage.getItem('vyra_tap_count');
      const sq = await AsyncStorage.getItem('vyra_quiz_balance');
      if(su){ setUser(JSON.parse(su)); setScreen('home'); } else setScreen('register');
      if(sb) setBonusPoints(parseInt(sb)); if(st) setTotalTaps(parseInt(st));
      if(stc) setTapCount(parseInt(stc)); if(sq) setQuizBalance(parseInt(sq));
    }catch{ setScreen('register'); }
  };
  const checkInternet = async () => { const net = await NetInfo.fetch(); if(!net.isConnected){ Alert.alert('Internet required','Bude data'); return false; } return true; };

  const createAccount = async () => {
    if(!(await checkInternet())) return;
    if(!user.name.trim()||!user.phone.trim()||!user.email.trim()){ Alert.alert('Cika komai'); return; }
    const email=user.email.trim().toLowerCase(); const code=String(Math.floor(100000+Math.random()*900000));
    setSendingOtp(true);
    try{
      const r=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:EMAILJS_SERVICE_ID,template_id:EMAILJS_TEMPLATE_ID,user_id:EMAILJS_PUBLIC_KEY,template_params:{to_email:email,otp:code,to_name:user.name}})});
      if(!r.ok) throw new Error(await r.text());
      setUser(o=>({...o,email})); setEmailOtp(code); setOtpExpiresAt(Date.now()+600000); setOtp(''); setScreen('verify');
      Alert.alert('Sent!','Code ya tafi '+email);
    }catch(e){ Alert.alert('Error',String(e.message).slice(0,500)); } finally{ setSendingOtp(false); }
  };
  const verifyAccount = async () => {
    if(Date.now()>otpExpiresAt){ Alert.alert('Expired'); return; }
    if(otp.trim()!==emailOtp){ Alert.alert('Wrong code'); return; }
    await AsyncStorage.setItem('vyra_user', JSON.stringify(user));
    await saveUserToFirestore(user, bonusPoints, quizBalance);
    setScreen('home');
  };
  const watchAd = async () => { if(!rewardedLoaded){ rewardedAd.load(); Alert.alert('Wait'); return; } try{ await rewardedAd.show(); setRewardedLoaded(false); }catch{ Alert.alert('Ad error'); } };
  const tapForProgress = async () => {
    const next=tapCount+1; const total=totalTaps+1; setTotalTaps(total);
    await AsyncStorage.setItem('vyra_total_taps',String(total));
    const nb=bonusPoints+1; setBonusPoints(nb); await AsyncStorage.setItem('vyra_bonus',String(nb));
    saveUserToFirestore(user,nb,quizBalance);
    if(next>=50){ setTapCount(0); await AsyncStorage.setItem('vyra_tap_count','0'); Alert.alert('50 taps!','+5 extra'); setBonusPoints(b=>b+5); }
    else{ setTapCount(next); await AsyncStorage.setItem('vyra_tap_count',String(next)); }
  };
  // REAL FIRESTORE FUNCTIONS
  const openReferralLink = async (item) => {
    try{ await addDoc(collection(db,"referral_clicks"),{userEmail:user.email,userName:user.name,code:item.code,bank:item.name,createdAt:serverTimestamp()}); }catch{}
    Linking.openURL(item.link);
  };
  const submitProofReal = async () => {
    if(!proofBank||!proofPhone){ Alert.alert('Zabi Bank da Phone'); return; }
    try{
      const sel=REFERRAL_LINKS.find(r=>r.id===proofBank);
      await addDoc(collection(db,"referral_proofs"),{userEmail:user.email,userName:user.name,userPhone:user.phone,proofPhone:proofPhone,bank:sel.name,bankId:sel.id,code:sel.code,reward:sel.reward,status:"pending",createdAt:serverTimestamp()});
      Alert.alert('✅ REAL!','Proof ya tafi Firebase - '+sel.name+' - Duba Firestore'); setProofPhone(''); setProofBank('');
    }catch(e){ Alert.alert('Error',e.message); }
  };
  const requestWithdrawalReal = async (type) => {
    if(bonusPoints<100){ Alert.alert('Basu isa','100 points'); return; }
    try{ await addDoc(collection(db,"withdrawals"),{userEmail:user.email,userName:user.name,userPhone:user.phone,points:bonusPoints,type:type,status:"pending",createdAt:serverTimestamp()}); Alert.alert('✅ REAL!','Request ya tafi withdrawals'); }catch(e){ Alert.alert('Error',e.message); }
  };
  const startQuiz = () => { setQuizIndex(0); setQuizScore(0); setQuizAnswered(false); setQuizFinished(false); setScreen('quiz'); };
  const answerQuiz = (idx) => { if(quizAnswered) return; setQuizAnswered(true); if(QUIZ_QUESTIONS[quizIndex].correctIndex===idx) setQuizScore(s=>s+10); };
  const nextQuizQuestion = async () => {
    if(quizIndex<QUIZ_QUESTIONS.length-1){ setQuizIndex(i=>i+1); setQuizAnswered(false); }
    else{ setQuizFinished(true); const fb=quizBalance+quizScore; setQuizBalance(fb); await AsyncStorage.setItem('vyra_quiz_balance',String(fb)); saveUserToFirestore(user,bonusPoints,fb); if(interstitialLoaded) try{ await interstitialAd.show(); }catch{} }
  };
    const signOut = () => Alert.alert('Sign out?','',[{text:'Cancel',style:'cancel'},{text:'Sign out',onPress:()=>setScreen('register')}] );
  const clearAllData = async () => { await AsyncStorage.clear(); setUser({name:'',phone:'',email:''}); setBonusPoints(0); setTotalTaps(0); setTapCount(0); setQuizBalance(0); setScreen('register'); };
  const VersionTag = () => (<View style={s.verBox}><Text style={s.verText}>Vyra Rewards v{VERSION} Build {BUILD} REAL FIREBASE</Text></View>);
  const Header = () => (<View style={s.head}><View style={{flex:1}}><Text style={s.logoSm}>👑 VYRA <Text style={{color:'#facc15'}}>REWARDS PRO</Text></Text><Text style={s.smallMuted}>{user.phone} • {user.email}</Text></View><TouchableOpacity style={s.out} onPress={signOut}><Text style={{color:'#0a1931',fontWeight:'900'}}>OUT</Text></TouchableOpacity></View>);
  const Banner = () => (<View style={s.banner}><BannerAd unitId={bannerUnitId} size={BannerAdSize.BANNER} requestOptions={{requestNonPersonalizedAdsOnly:true}} /></View>);

  if(screen==='loading') return (<View style={s.load}><Text style={{fontSize:50}}>👑</Text><Text style={s.logo}>VYRA <Text style={{color:'#facc15'}}>REWARDS</Text></Text><ActivityIndicator color="#facc15" style={{marginTop:16}} /><VersionTag /></View>);
  if(screen==='register') return (<ScrollView contentContainerStyle={s.cont}><Text style={s.logo}>VYRA <Text style={{color:'#facc15'}}>REWARDS</Text></Text><View style={s.card}><Text style={s.lab}>Full name *</Text><TextInput style={s.inp} value={user.name} onChangeText={v=>setUser(o=>({...o,name:v}))} /><Text style={s.lab}>Phone *</Text><TextInput style={s.inp} keyboardType="phone-pad" value={user.phone} onChangeText={v=>setUser(o=>({...o,phone:v}))} /><Text style={s.lab}>Email *</Text><TextInput style={s.inp} autoCapitalize="none" value={user.email} onChangeText={v=>setUser(o=>({...o,email:v.toLowerCase()}))} /><TouchableOpacity style={s.yBtn} onPress={createAccount} disabled={sendingOtp}><Text style={s.yTxt}>{sendingOtp?'SENDING...':'SEND CODE'}</Text></TouchableOpacity><VersionTag /></View></ScrollView>);
  if(screen==='verify') return (<ScrollView contentContainerStyle={s.cont}><Text style={s.logo}>VERIFY</Text><View style={s.card}><TextInput style={[s.inp,{textAlign:'center',fontSize:20,letterSpacing:6}]} maxLength={6} keyboardType="number-pad" placeholder="6-digit" value={otp} onChangeText={setOtp} /><TouchableOpacity style={s.yBtn} onPress={verifyAccount}><Text style={s.yTxt}>VERIFY</Text></TouchableOpacity></View></ScrollView>);

  return (
    <View style={s.page}>
      <ScrollView style={s.main} contentContainerStyle={{paddingBottom:24}}>
        <Header />
        {screen==='home' && <>
          <View style={s.statRow}><View style={s.statCard}><Text style={s.ml}>BONUS (REAL)</Text><Text style={s.mv}>{bonusPoints}</Text></View><View style={s.statCard}><Text style={s.ml}>TAPS</Text><Text style={s.mv}>{totalTaps}</Text></View></View>
          <View style={s.tot}><Text style={s.ml}>Firestore Synced</Text><Text style={s.balance}>{bonusPoints}</Text></View>
          <View style={s.prog}><Text style={s.progressText}>{tapCount}/50</Text><View style={s.pb}><View style={[s.pf,{width:`${Math.min(100,tapCount*2)}%`}]} /></View></View>
          <TouchableOpacity style={s.tap} onPress={tapForProgress}><Text style={s.tapDark}>VYRA TAP</Text></TouchableOpacity>
          <TouchableOpacity style={[s.abf,{backgroundColor:'#FF6B00'}]} onPress={()=>setScreen('cpx')}><Text style={[s.abt,{color:'#fff'}]}>🎯 CPX SURVEYS REAL</Text></TouchableOpacity>
          <TouchableOpacity style={s.gb} onPress={watchAd}><Text style={s.gbt}>{rewardedLoaded?'WATCH AD +10':'Loading ad...'}</Text></TouchableOpacity>
          <TouchableOpacity style={[s.abf,{backgroundColor:'#facc15'}]} onPress={()=>setScreen('tasks')}><Text style={[s.abt,{color:'#0a1931'}]}>🔥 7 OFFERS REAL - NSFM3287 etc</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={()=>setScreen('wallet')}><Text style={s.abt}>💰 WALLET REAL WITHDRAW</Text></TouchableOpacity>
          <Banner />
        </>}
        {screen==='tasks' && <>
          <Text style={s.sec}>7 REFERRALS REAL - FIREBASE</Text>
          <View style={s.card}>
            <Text style={s.lab}>Zabi Bank</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {REFERRAL_LINKS.map(r=><TouchableOpacity key={r.id} onPress={()=>setProofBank(r.id)} style={[s.chip,proofBank===r.id&&{backgroundColor:'#facc15'}]}><Text style={[s.chipTxt,proofBank===r.id&&{color:'#0a1931'}]}>{r.name}</Text></TouchableOpacity>)}
            </ScrollView>
            <TextInput style={s.inp} placeholder="Lambar da ka yi register" value={proofPhone} onChangeText={setProofPhone} keyboardType="phone-pad" />
            <TouchableOpacity style={s.yBtn} onPress={submitProofReal}><Text style={s.yTxt}>SUBMIT PROOF REAL TO FIRESTORE</Text></TouchableOpacity>
          </View>
          {REFERRAL_LINKS.map(item=><View key={item.id} style={s.shop}><View style={{flex:1}}><Text style={s.itemTitle}>{item.name} - {item.code}</Text><Text style={[s.demoLabel,{color:'#22c55e'}]}>REAL +{item.reward}pts • {item.bonus||''}</Text><Text style={s.smallMuted} numberOfLines={1}>{item.link}</Text></View><View><TouchableOpacity style={[s.secondaryBtn,{backgroundColor:'#22c55e',marginTop:0}]} onPress={()=>openReferralLink(item)}><Text style={s.secondaryText}>JOIN</Text></TouchableOpacity><TouchableOpacity style={[s.secondaryBtn,{marginTop:6}]} onPress={()=>setProofBank(item.id)}><Text style={s.secondaryText}>PROOF</Text></TouchableOpacity></View></View>)}
        </>}
        {screen==='quiz' && <><Text style={s.sec}>QUIZ</Text>{!quizFinished?<View style={s.card}><Text style={s.question}>{QUIZ_QUESTIONS[quizIndex].question}</Text>{QUIZ_QUESTIONS[quizIndex].options.map((op,i)=><TouchableOpacity key={op} disabled={quizAnswered} style={[s.yBtn,{backgroundColor:quizAnswered&&i===QUIZ_QUESTIONS[quizIndex].correctIndex?'#22c55e':'#facc15'}]} onPress={()=>answerQuiz(i)}><Text style={s.yTxt}>{op}</Text></TouchableOpacity>)}<Text style={s.note}>+10 per correct</Text>{quizAnswered&&<TouchableOpacity style={s.secondaryBtn} onPress={nextQuizQuestion}><Text style={s.secondaryText}>{quizIndex===QUIZ_QUESTIONS.length-1?'RESULT':'NEXT'}</Text></TouchableOpacity>}</View>:<View style={s.card}><Text style={s.question}>Complete! {quizScore}</Text><TouchableOpacity style={s.yBtn} onPress={()=>setScreen('home')}><Text style={s.yTxt}>HOME</Text></TouchableOpacity></View>}</>}
        {screen==='wallet' && <><Text style={s.sec}>WALLET REAL</Text><View style={s.card}><Text style={s.question}>Balance: {bonusPoints} REAL</Text><TouchableOpacity style={s.yBtn} onPress={()=>requestWithdrawalReal('Airtime')}><Text style={s.yTxt}>REQUEST AIRTIME REAL</Text></TouchableOpacity><TouchableOpacity style={[s.yBtn,{backgroundColor:'#22c55e'}]} onPress={()=>requestWithdrawalReal('Data')}><Text style={s.yTxt}>REQUEST DATA REAL</Text></TouchableOpacity><Text style={s.note}>Yana zuwa Firestore withdrawals</Text></View></>}
        {screen==='settings' && <><Text style={s.sec}>SETTINGS</Text><View style={s.card}><Text style={s.lab}>Name</Text><TextInput style={s.inp} value={user.name} onChangeText={v=>setUser(o=>({...o,name:v}))} /><Text style={s.lab}>Phone</Text><TextInput style={s.inp} value={user.phone} onChangeText={v=>setUser(o=>({...o,phone:v}))} /><TouchableOpacity style={s.yBtn} onPress={async()=>{await AsyncStorage.setItem('vyra_user',JSON.stringify(user)); await saveUserToFirestore(user,bonusPoints,quizBalance); Alert.alert('Saved REAL');}}><Text style={s.yTxt}>SAVE REAL</Text></TouchableOpacity></View><View style={s.card}><TouchableOpacity style={[s.secondaryBtn,{backgroundColor:'#ef4444'}]} onPress={clearAllData}><Text style={[s.secondaryText,{color:'#fff'}]}>CLEAR DATA</Text></TouchableOpacity><VersionTag /></View></>}
        {screen==='cpx' && <><Text style={s.sec}>CPX REAL</Text><View style={{height:700,backgroundColor:'#fff',borderRadius:12,overflow:'hidden'}}><CpxOfferwall user={user} /></View><TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('home')}><Text style={s.secondaryText}>BACK</Text></TouchableOpacity></>}
        <View style={s.bottom}>{[['home','Home'],['tasks','7 Offers'],['wallet','Wallet'],['settings','Settings']].map(([n,l])=><TouchableOpacity key={n} onPress={()=>setScreen(n)}><Text style={[s.bTxt,screen===n&&{color:'#facc15'}]}>{l}</Text></TouchableOpacity>)}</View>
        <VersionTag />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:'#0a1931'}, cont:{flexGrow:1,backgroundColor:'#0a1931',padding:20,justifyContent:'center'}, load:{flex:1,backgroundColor:'#0a1931',alignItems:'center',justifyContent:'center',padding:20},
  logo:{color:'#fff',fontSize:26,fontWeight:'900',textAlign:'center'}, sub:{color:'#facc15',textAlign:'center',marginBottom:18},
  card:{backgroundColor:'#132a4f',borderRadius:16,padding:18,borderWidth:1,borderColor:'#facc1530',marginTop:12},
  lab:{color:'#facc15',marginTop:10,fontWeight:'700',fontSize:12}, inp:{backgroundColor:'#0f2342',borderWidth:1,borderColor:'#facc1530',borderRadius:10,padding:12,color:'#fff',marginTop:6},
  yBtn:{backgroundColor:'#facc15',padding:14,borderRadius:10,marginTop:12,alignItems:'center'}, yTxt:{color:'#0a1931',fontWeight:'900',textAlign:'center'},
  secondaryBtn:{backgroundColor:'#243958',padding:10,borderRadius:10,marginTop:12,alignItems:'center'}, secondaryText:{color:'#fff',fontWeight:'800',fontSize:11},
  main:{flex:1,backgroundColor:'#0a1931',padding:10}, head:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderColor:'#ffffff15'},
  logoSm:{color:'#fff',fontWeight:'900'}, out:{backgroundColor:'#facc15',paddingHorizontal:12,paddingVertical:8,borderRadius:14}, smallMuted:{color:'#94a3b8',fontSize:11,marginTop:3},
  statRow:{flexDirection:'row',marginTop:10}, statCard:{backgroundColor:'#132a4f',flex:1,margin:3,borderRadius:10,padding:12,alignItems:'center',borderWidth:1,borderColor:'#ffffff10'},
  ml:{color:'#94a3b8',fontSize:11,textAlign:'center'}, mv:{color:'#facc15',fontWeight:'900',marginTop:4,fontSize:20},
  tot:{backgroundColor:'#132a4f',borderRadius:14,padding:16,alignItems:'center',marginTop:10,borderWidth:1,borderColor:'#facc1530'}, balance:{color:'#facc15',fontSize:36,fontWeight:'900',marginTop:4},
  prog:{backgroundColor:'#132a4f',borderRadius:10,padding:10,marginTop:10}, progressText:{color:'#facc15',fontWeight:'900',textAlign:'center'}, pb:{height:7,backgroundColor:'#0a1931',borderRadius:4,marginTop:6,overflow:'hidden'}, pf:{height:7,backgroundColor:'#facc15',borderRadius:4},
  tap:{backgroundColor:'#facc15',width:190,height:190,borderRadius:95,alignSelf:'center',marginTop:16,alignItems:'center',justifyContent:'center'}, tapDark:{color:'#0a1931',fontWeight:'900',fontSize:20},
  gb:{backgroundColor:'#2a344e',padding:12,borderRadius:10,marginTop:10,alignItems:'center'}, gbt:{color:'#facc15',fontWeight:'700',fontSize:11}, abf:{backgroundColor:'#132a4f',borderRadius:10,padding:12,alignItems:'center',marginTop:8,borderWidth:1,borderColor:'#facc15'}, abt:{color:'#facc15',fontWeight:'700',textAlign:'center',fontSize:12},
  sec:{color:'#facc15',fontWeight:'900',marginTop:14,marginBottom:8}, shop:{flexDirection:'row',backgroundColor:'#132a4f',padding:12,borderRadius:10,marginTop:6,alignItems:'center',borderWidth:1,borderColor:'#ffffff10'},
  itemTitle:{color:'#fff',fontWeight:'700'}, demoLabel:{color:'#facc15',fontSize:10,fontWeight:'900',marginTop:5}, bottom:{flexDirection:'row',justifyContent:'space-around',padding:12,backgroundColor:'#132a4f',borderRadius:10,marginTop:16},
  bTxt:{color:'#94a3b8',fontWeight:'700'}, banner:{marginTop:10,alignItems:'center'}, verBox:{marginTop:12,alignItems:'center'}, verText:{color:'#ffffff40',fontSize:10}, question:{color:'#fff',fontSize:16,fontWeight:'700',marginBottom:10}, note:{color:'#94a3b8',fontSize:11,marginTop:8,textAlign:'center'},
  chip:{backgroundColor:'#0f2342',borderWidth:1,borderColor:'#facc1530',paddingHorizontal:12,paddingVertical:8,borderRadius:20,marginRight:6,marginTop:6}, chipTxt:{color:'#fff',fontSize:11,fontWeight:'800'}
});
