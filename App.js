import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import mobileAds, { InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

const REWARDED_ID = 'ca-app-pub-5550384127909882/2946866491';
const INTERSTITIAL_ID = 'ca-app-pub-5550384127909882/8282953653';
const rewardedAdUnitId = __DEV__ ? TestIds.REWARDED : REWARDED_ID;
const interstitialAdUnitId = __DEV__ ? TestIds.INTERSTITIAL : INTERSTITIAL_ID;
const HIDDEN_GLOBAL = 'VYRAGJVOP1';
const HIDDEN_APP = '37222';
const CPX_HASH = 'zq6KgHGIgOujXyncpghe4Nb1sIdDf0ph';

const firebaseConfig = {
  apiKey: "AIzaSyCku3iG2yg5MigEU0vpDr4MEwEncW5Tn6w",
  authDomain: "vyra-rewards-pro.firebaseapp.com",
  projectId: "vyra-rewards-pro",
  storageBucket: "vyra-rewards-pro.firebasestorage.app",
  messagingSenderId: "250039191069",
  appId: "1:250039191069:web:7383d18279c8395438a8f4",
  measurementId: "G-2YT4YDL9FT"
};
const appInit = initializeApp(firebaseConfig);
const auth = getAuth(appInit);
const db = getFirestore(appInit);

// Cloudflare Worker + D1 backend; Firebase Authentication remains the identity provider.
const BACKEND_URL = 'https://vyra-rewards-backend.abdullahiwaziri9004.workers.dev';
async function callBackend(path, { method = 'GET', body } = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Please log in first.');
  const token = await currentUser.getIdToken();
  const response = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error(result.error || result.message || `Backend request failed (${response.status})`);
  return result;
}
const getBackendProfile = (result) => result?.user || result?.profile || result?.data || result || {};

const EMAILJS_SERVICE_ID = 'service_eo4mafe';
const EMAILJS_TEMPLATE_ID = 'template_vla0zff';
const EMAILJS_PUBLIC_KEY = 'Ee45lolv3ZCjOSWUy';
const OFFERS = [
  { id: '1', name: 'PalmPay', reward: 800, code: 'NSFM3287', link: 'https://app.palmpay.com/invite/NSFM3287', color: '#6a00f4', desc: 'Register + Fund 500' },
  { id: '2', name: 'Opay', reward: 1000, code: 'OPAYVYRA', link: 'https://opay.com/join/OPAYVYRA', color: '#00c853', desc: 'Register + KYC' },
  { id: '3', name: 'Moniepoint', reward: 1200, code: 'MONIEVYRA', link: 'https://moniepoint.com/refer/MONIEVYRA', color: '#0d47a1', desc: 'Business account' },
  { id: '4', name: 'FairMoney', reward: 900, code: 'FAIRVYRA', link: 'https://fairmoney.io/r/FAIRVYRA', color: '#ff6f00', desc: 'Install + Register' },
  { id: '5', name: 'Carbon', reward: 850, code: 'CARBONVYRA', link: 'https://getcarbon.co/invite/CARBONVYRA', color: '#212121', desc: 'Register + BVN' },
  { id: '6', name: 'Branch', reward: 700, code: 'BRANCHVYRA', link: 'https://branch.com.ng/a/BRANCHVYRA', color: '#1e88e5', desc: 'Install + Loan check' },
  { id: '7', name: 'Kuda', reward: 1100, code: 'KUDAVYRA', link: 'https://kuda.com/join/KUDAVYRA', color: '#4a148c', desc: 'Register + Fund 1000' },
];
const WITHDRAW_METHODS = ['Bank Transfer','Opay','Palmpay','Moniepoint','Kuda','PayPal (USD)','USDT','Airtime'];
const MIN_NAIRA_POINTS = 200000;
const MIN_USD_POINTS = 300000;
const isUsdMethod = (m) => m === 'PayPal (USD)' || m === 'USDT';
const getPayoutPreview = (points, m) => {
  if (!Number.isFinite(points) || points <= 0) return '';
  return isUsdMethod(m) ? `Estimated payout: $${(points / MIN_USD_POINTS * 5).toFixed(2)} USD` : `Estimated payout: ₦${(points / MIN_NAIRA_POINTS * 5000).toLocaleString('en-NG', {maximumFractionDigits: 2})}`;
};
const AIRTIME_NETWORKS = ['MTN','GLO','AIRTEL','9MOBILE'];
const Tab = createBottomTabNavigator();

function HomeTab({ balance, totalTaps, tapProgress, bonus, onTap }) {
  return <ScrollView style={styles.container} contentContainerStyle={{padding:15}}>
    <Text style={styles.title}>Vyra Rewards</Text><Text style={styles.globalId}>Balance: {balance} VYR</Text>
    <View style={styles.row}><View style={styles.purpleBox}><Text style={styles.boxLabel}>BONUS</Text><Text style={styles.boxVal}>{bonus}</Text></View><View style={styles.purpleBox}><Text style={styles.boxLabel}>TOTAL TAPS</Text><Text style={styles.boxVal}>{totalTaps}</Text></View><View style={styles.purpleBox}><Text style={styles.boxLabel}>PROGRESS</Text><Text style={styles.boxVal}>{tapProgress}/150</Text></View></View>
    <TouchableOpacity style={styles.tapBtn} onPress={onTap}><Text style={styles.tapText}>{tapProgress >= 150 ? 'WATCH AD FOR +100 BONUS' : 'TAP TO EARN +10'}</Text><Text style={styles.tapSub}>{tapProgress >= 150 ? 'Rewarded Ad Required' : 'Instant +10 VYR per tap'}</Text></TouchableOpacity>
    <View style={styles.infoCard}><Text style={styles.infoText}>After 150 taps, a completed Rewarded Ad can grant +100 VYR bonus. Rewards depend on a valid ad completion.</Text></View>
  </ScrollView>;
}
function OffersTab({ user, onCompleteOffer }) {
  return <ScrollView style={styles.container} contentContainerStyle={{padding:15}}>
    <Text style={styles.title}>Offers</Text>
    <TouchableOpacity style={[styles.tapBtn,{backgroundColor:'#0d47a1'}]} onPress={()=>Linking.openURL(`https://cpx-research.com/?user_id=${user?.uid}&hash=${CPX_HASH}`)}><Text style={styles.tapText}>CPX SURVEYS - HIGH PAY</Text><Text style={styles.tapSub}>High reward surveys available</Text></TouchableOpacity>
    <Text style={styles.section}>7 OFFERS - Ad May Show Before Link</Text>
    {OFFERS.map(o=><View key={o.id} style={[styles.offerCard,{borderColor:o.color}]}><View style={{flex:1}}><Text style={styles.offerName}>{o.name} - {o.reward} VYR</Text><Text style={styles.offerDesc}>{o.desc} - Code: {o.code}</Text></View><TouchableOpacity style={[styles.completeBtn,{backgroundColor:o.color}]} onPress={()=>onCompleteOffer(o)}><Text style={styles.btnText}>COMPLETE</Text></TouchableOpacity></View>)}
    <Text style={styles.footer}>An interstitial may show before the offer opens. Offer rewards stay pending until completion is verified by an admin.</Text>
  </ScrollView>;
}
function WalletTab({ balance, user, setBalance }) {
  const [method,setMethod]=useState(WITHDRAW_METHODS[0]); const [network,setNetwork]=useState(AIRTIME_NETWORKS[0]); const [amount,setAmount]=useState(''); const [account,setAccount]=useState(''); const [submitting,setSubmitting]=useState(false);
  const handleWithdraw = async () => {
    if(!user){Alert.alert('Error','Please log in first');return;}
    const requestedAmount=Number.parseInt(amount,10); const minimumPoints=isUsdMethod(method)?MIN_USD_POINTS:MIN_NAIRA_POINTS;
    if(!Number.isSafeInteger(requestedAmount)||requestedAmount<minimumPoints){Alert.alert('Error',isUsdMethod(method)?'Minimum USD/USDT withdrawal is 300,000 points ($5).':'Minimum Naira withdrawal is 200,000 points (₦5,000).');return;}
    if(requestedAmount>balance){Alert.alert('Error','Withdrawal amount cannot exceed your current balance');return;}
    if(!account.trim()){Alert.alert('Error','Please enter the required account, phone number, or wallet address');return;}
    if(method==='Airtime'&&!network){Alert.alert('Error','Please select an airtime network');return;}
    if(submitting)return; setSubmitting(true);
    try {
      const result=await callBackend('/withdraw',{method:'POST',body:{method,network:method==='Airtime'?network:'',account:account.trim(),amountPoints:requestedAmount}});
      const d=getBackendProfile(result); const returnedBalance=result.balance??d.balance??d.points;
      if(returnedBalance!==undefined&&Number.isFinite(Number(returnedBalance)))setBalance(Number(returnedBalance));
      setAmount('');setAccount('');Alert.alert('Request Sent',result.message||'Your withdrawal request is pending admin review. Points have been reserved from your available balance. This app has not paid it automatically.');
    } catch(e){Alert.alert('Withdrawal Error',e.message||'Could not submit withdrawal request');} finally{setSubmitting(false);}
  };
  return <ScrollView style={styles.container} contentContainerStyle={{padding:15}}>
    <Text style={styles.title}>Wallet</Text><Text style={styles.globalId}>Balance: {balance.toLocaleString('en-NG')} Points</Text><Text style={styles.infoText}>Naira: 200,000 points = ₦5,000 minimum. USD/USDT: 300,000 points = $5 minimum.</Text>
    <Text style={styles.section}>Withdraw Methods</Text><View style={styles.chipRow}>{WITHDRAW_METHODS.map(m=><TouchableOpacity key={m} onPress={()=>setMethod(m)} style={[styles.chip,method===m&&styles.chipActive]}><Text style={method===m?styles.chipTextActive:styles.chipText}>{m}</Text></TouchableOpacity>)}</View>
    <Text style={styles.section}>Airtime Network (if Airtime selected)</Text><View style={styles.chipRow}>{AIRTIME_NETWORKS.map(n=><TouchableOpacity key={n} onPress={()=>setNetwork(n)} style={[styles.chip,network===n&&styles.chipActive]}><Text style={network===n?styles.chipTextActive:styles.chipText}>{n}</Text></TouchableOpacity>)}</View>
    <TextInput style={styles.input} placeholder={isUsdMethod(method)?'Points to withdraw (Min 300000)':'Points to withdraw (Min 200000)'} value={amount} onChangeText={setAmount} keyboardType="numeric"/><Text style={styles.infoText}>{getPayoutPreview(Number.parseInt(amount,10),method)||(isUsdMethod(method)?'300,000 points = $5 USD':'200,000 points = ₦5,000')}</Text>
    <TextInput style={styles.input} placeholder={method==='Bank Transfer'?'Account No / Bank Name':method==='PayPal (USD)'?'PayPal email address':method==='USDT'?'USDT wallet address':method==='Airtime'?'Phone number':'Opay / Palmpay account or phone number'} value={account} onChangeText={setAccount}/>
    <TouchableOpacity style={[styles.tapBtn,submitting&&{opacity:0.6}]} onPress={handleWithdraw} disabled={submitting}><Text style={styles.tapText}>{submitting?'SUBMITTING...':`REQUEST WITHDRAW - ${method} ${method==='Airtime'?network:''}`}</Text></TouchableOpacity>
  </ScrollView>;
}
function SettingsTab({ bonus, onWatchAd, onLogout }) {
  return <ScrollView style={styles.container} contentContainerStyle={{padding:15}}><Text style={styles.title}>Settings</Text><View style={styles.infoCard}><Text style={styles.infoText}>Theme: Default Purple - Secure IDs hidden. No IDs visible to user.</Text></View><TouchableOpacity style={styles.tapBtn} onPress={onWatchAd}><Text style={styles.tapText}>WATCH REWARDED AD +50 VYR BONUS</Text><Text style={styles.tapSub}>A valid completed ad grants +50 VYR</Text></TouchableOpacity><Text style={styles.globalId}>Current Bonus: {bonus}</Text><TouchableOpacity style={[styles.btn,{backgroundColor:'#333',marginTop:20}]} onPress={onLogout}><Text style={styles.btnText}>Logout</Text></TouchableOpacity><Text style={styles.footer}>AdMob is integrated in the app. Do not treat client-side IDs or balances as secret or tamper-proof.</Text></ScrollView>;
}

export default function App() {
  const [user,setUser]=useState(null); const [balance,setBalance]=useState(0); const [totalTaps,setTotalTaps]=useState(0); const [tapProgress,setTapProgress]=useState(0); const [bonus,setBonus]=useState(0);
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState(''); const [otpInput,setOtpInput]=useState(''); const [generatedOtp,setGeneratedOtp]=useState(''); const [showOtp,setShowOtp]=useState(false); const [loading,setLoading]=useState(false); const [currentScreen,setCurrentScreen]=useState('auth');
  const rewardedRef=useRef(null); const interstitialRef=useRef(null); const rewardContextRef=useRef('tapBonus'); const pendingOfferRef=useRef(null); const [rewardedLoaded,setRewardedLoaded]=useState(false); const [interstitialLoaded,setInterstitialLoaded]=useState(false);

  useEffect(()=>{
    mobileAds().initialize().then(()=>{loadRewarded();loadInterstitial();});
    const unsub=onAuthStateChanged(auth,async(u)=>{
      if(!u){setUser(null);setCurrentScreen('auth');return;} setUser(u);
      try {
        const fallbackName=u.displayName||(u.email?u.email.split('@')[0]:'Vyra User');
        await callBackend('/profile',{method:'POST',body:{name:fallbackName}});
        const response=await callBackend('/me'); const d=getBackendProfile(response);
        setBalance(Number(d.balance??d.points??0)); setTotalTaps(Number(d.totalTaps??d.total_taps??0)); setTapProgress(Number(d.tapProgress??d.tap_progress??0)); setBonus(Number(d.bonus??0)); setCurrentScreen('home');
      } catch(e){Alert.alert('Profile Error',e.message||'Could not load your account profile.');setCurrentScreen('home');}
    }); return unsub;
  },[]);

  const loadRewarded=()=>{
    const ad=RewardedAd.createForAdRequest(rewardedAdUnitId,{requestNonPersonalizedAdsOnly:true});
    ad.addAdEventListener(RewardedAdEventType.LOADED,()=>setRewardedLoaded(true));
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD,async()=>Alert.alert('Ad Completed','An kammala kallon tallan. Ba a ƙara bonus ba tukuna saboda muna kammala tabbatar da reward daga AdMob server domin hana magudi.'));
    ad.addAdEventListener(AdEventType.CLOSED,()=>{setRewardedLoaded(false);loadRewarded();}); ad.load(); rewardedRef.current=ad;
  };
  const loadInterstitial=()=>{
    const ad=InterstitialAd.createForAdRequest(interstitialAdUnitId,{requestNonPersonalizedAdsOnly:true});
    ad.addAdEventListener(AdEventType.LOADED,()=>setInterstitialLoaded(true));
    ad.addAdEventListener(AdEventType.CLOSED,()=>{setInterstitialLoaded(false);const offer=pendingOfferRef.current;pendingOfferRef.current=null;if(offer)completeOfferAfterAd(offer,true);loadInterstitial();}); ad.load(); interstitialRef.current=ad;
  };
  const handleTapReward=async()=>{
    if(!user||tapProgress>=150)return;
    try {const response=await callBackend('/tap',{method:'POST',body:{}});const d=getBackendProfile(response);setTapProgress(Number(d.tapProgress??d.tap_progress??(tapProgress+1)));setTotalTaps(Number(d.totalTaps??d.total_taps??(totalTaps+1)));setBalance(Number(d.balance??d.points??(balance+10)));setBonus(Number(d.bonus??bonus));Alert.alert('Success','+10 VYR added');}
    catch(e){Alert.alert('Reward Error',e.message||'Could not save reward. Please try again.');}
  };
  const onTapToEarn=()=>{
    if(tapProgress<150){handleTapReward();return;}
    if(rewardedLoaded&&rewardedRef.current){rewardContextRef.current='tapBonus';Alert.alert('Watch Ad','Watch the rewarded ad to claim +100 VYR bonus',[{text:'Cancel',style:'cancel'},{text:'Watch',onPress:()=>rewardedRef.current?.show()}]);}
    else{Alert.alert('Loading Ad','Rewarded ad is loading. Please try again shortly.');loadRewarded();}
  };
  const completeOfferAfterAd=async(offer,adShown=false)=>{
    try{await Linking.openURL(offer.link);await addDoc(collection(db,'proofs'),{userId:user.uid,offerName:offer.name,reward:offer.reward,code:offer.code,createdAt:serverTimestamp(),status:'pending',interstitialShown:adShown});Alert.alert('Offer Started',`${offer.name} has been opened. Any reward remains pending until an admin verifies completion.`);}
    catch(e){Alert.alert('Offer Error',e.message||'Could not open the offer');}
  };
  const onCompleteOffer=async(offer)=>{
    if(!user){Alert.alert('Error','Please log in first');return;}
    if(interstitialLoaded&&interstitialRef.current){pendingOfferRef.current=offer;try{await interstitialRef.current.show();}catch(e){pendingOfferRef.current=null;await completeOfferAfterAd(offer,false);}}
    else{Alert.alert('Ad Unavailable','The interstitial ad is not ready. The offer will open without an ad.');await completeOfferAfterAd(offer,false);loadInterstitial();}
  };
  const onWatchSettingsAd=()=>{if(rewardedLoaded&&rewardedRef.current){rewardContextRef.current='settingsBonus';rewardedRef.current.show();}else{Alert.alert('Loading','Rewarded ad is loading. Please try again shortly.');loadRewarded();}};
  const sendOtpEmail=async(to_email,otp,to_name)=>{
    try{const res=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:EMAILJS_SERVICE_ID,template_id:EMAILJS_TEMPLATE_ID,user_id:EMAILJS_PUBLIC_KEY,template_params:{to_email,otp,to_name}})});return res.ok;}catch(e){return false;}
  };
  const handleSignup=async()=>{
    if(!email||!password||!name){Alert.alert('Error','Please fill all fields');return;} setLoading(true);
    const otp=Math.floor(100000+Math.random()*900000).toString();setGeneratedOtp(otp);const sent=await sendOtpEmail(email,otp,name);
    if(sent){setShowOtp(true);Alert.alert('OTP Sent',`OTP sent to ${email}`);}else Alert.alert('Error','Failed to send OTP - Check EmailJS');setLoading(false);
  };
  const verifyOtpAndCreate=async()=>{
    if(otpInput!==generatedOtp){Alert.alert('Error','Invalid OTP');return;}setLoading(true);
    try{const credential=await createUserWithEmailAndPassword(auth,email,password);await callBackend('/profile',{method:'POST',body:{name}});setUser(credential.user);setShowOtp(false);setCurrentScreen('home');}
    catch(e){Alert.alert('Account Setup Error',e.message||'Could not create your account profile.');}setLoading(false);
  };
  const handleLogin=async()=>{setLoading(true);try{await signInWithEmailAndPassword(auth,email,password);}catch(e){Alert.alert('Login Error',e.message);}setLoading(false);};

  if(currentScreen==='auth')return <ScrollView style={styles.container} contentContainerStyle={{padding:20}}><StatusBar style="dark"/><Text style={styles.title}>Vyra Rewards</Text>{!showOtp?<><TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName}/><TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none"/><TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry/><TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={styles.btnText}>Sign Up + Send OTP</Text>}</TouchableOpacity><TouchableOpacity style={[styles.btn,{backgroundColor:'#000'}]} onPress={handleLogin}><Text style={styles.btnText}>Login</Text></TouchableOpacity></>:<><TextInput style={styles.input} placeholder="6-digit OTP Code" value={otpInput} onChangeText={setOtpInput} keyboardType="numeric"/><TouchableOpacity style={styles.btn} onPress={verifyOtpAndCreate} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={styles.btnText}>Verify & Create Account</Text>}</TouchableOpacity></>}</ScrollView>;
  return <NavigationContainer><Tab.Navigator screenOptions={{headerShown:false,tabBarActiveTintColor:'#6a00f4',tabBarStyle:{height:60}}}><Tab.Screen name="Home" options={{tabBarLabel:'Home'}}>{()=> <HomeTab balance={balance} totalTaps={totalTaps} tapProgress={tapProgress} bonus={bonus} onTap={onTapToEarn}/>}</Tab.Screen><Tab.Screen name="Offers" options={{tabBarLabel:'Offers'}}>{()=> <OffersTab user={user} onCompleteOffer={onCompleteOffer}/>}</Tab.Screen><Tab.Screen name="Wallet" options={{tabBarLabel:'Wallet'}}>{()=> <WalletTab balance={balance} user={user} setBalance={setBalance}/>}</Tab.Screen><Tab.Screen name="Settings" options={{tabBarLabel:'Settings'}}>{()=> <SettingsTab bonus={bonus} onWatchAd={onWatchSettingsAd} onLogout={()=>signOut(auth)}/>}</Tab.Screen></Tab.Navigator></NavigationContainer>;
}
const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#f5f5ff',paddingTop:40},title:{fontSize:26,fontWeight:'bold',color:'#6a00f4',textAlign:'center',marginBottom:10},globalId:{textAlign:'center',marginBottom:15,fontWeight:'600'},row:{flexDirection:'row',justifyContent:'space-between',marginBottom:15},purpleBox:{width:'31%',borderWidth:2,borderColor:'#6a00f4',borderRadius:12,padding:10,backgroundColor:'#fff',alignItems:'center'},boxLabel:{fontSize:10,color:'#6a00f4',fontWeight:'bold'},boxVal:{fontSize:18,fontWeight:'bold',marginTop:5},tapBtn:{backgroundColor:'#6a00f4',padding:18,borderRadius:14,alignItems:'center',marginBottom:12},tapText:{color:'#fff',fontWeight:'bold',fontSize:16},tapSub:{color:'#e0d0ff',fontSize:10,marginTop:4},section:{fontSize:16,fontWeight:'bold',marginVertical:10},offerCard:{flexDirection:'row',backgroundColor:'#fff',borderWidth:2,borderRadius:12,padding:12,marginBottom:10,alignItems:'center'},offerName:{fontWeight:'bold'},offerDesc:{fontSize:11,color:'#666'},completeBtn:{paddingHorizontal:14,paddingVertical:8,borderRadius:8},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:12,marginBottom:10},btn:{backgroundColor:'#6a00f4',padding:14,borderRadius:10,alignItems:'center',marginBottom:10},btnText:{color:'#fff',fontWeight:'bold'},footer:{fontSize:8,color:'#999',textAlign:'center',marginTop:20},infoCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e0d0ff',borderRadius:10,padding:12,marginBottom:10},infoText:{fontSize:12,color:'#555'},chipRow:{flexDirection:'row',flexWrap:'wrap',marginBottom:10},chip:{borderWidth:1,borderColor:'#6a00f4',borderRadius:20,paddingHorizontal:12,paddingVertical:6,marginRight:8,marginBottom:8},chipActive:{backgroundColor:'#6a00f4'},chipText:{color:'#6a00f4',fontSize:12},chipTextActive:{color:'#fff',fontSize:12}
});
