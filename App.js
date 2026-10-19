import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import mobileAds, { InterstitialAd, RewardedAd, AdEventType, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

const REWARDED_ID = 'ca-app-pub-555038412799882/2946868491';
const INTERSTITIAL_ID = 'ca-app-pub-555038412799882/8282953653';
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

const WITHDRAW_METHODS = ['Bank Transfer','Opay','Palmpay','Moniepoint','Kuda','USDT'];
const AIRTIME_NETWORKS = ['MTN','GLO','AIRTEL','9MOBILE'];
const Tab = createBottomTabNavigator();

function HomeTab({ balance, totalTaps, tapProgress, bonus, onTap }){
  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:15}}>
      <Text style={styles.title}>Vyra Rewards</Text>
      <Text style={styles.globalId}>Balance: {balance} VYR</Text>
      <View style={styles.row}>
        <View style={styles.purpleBox}><Text style={styles.boxLabel}>BONUS</Text><Text style={styles.boxVal}>{bonus}</Text></View>
        <View style={styles.purpleBox}><Text style={styles.boxLabel}>TOTAL TAPS</Text><Text style={styles.boxVal}>{totalTaps}</Text></View>
        <View style={styles.purpleBox}><Text style={styles.boxLabel}>PROGRESS</Text><Text style={styles.boxVal}>{tapProgress}/151</Text></View>
      </View>
      <TouchableOpacity style={styles.tapBtn} onPress={onTap}>
        <Text style={styles.tapText}>{tapProgress >= 150 ? 'WATCH AD FOR +100 BONUS' : 'TAP TO EARN +10'}</Text>
        <Text style={styles.tapSub}>{tapProgress >= 150 ? 'Rewarded Ad Required' : 'Instant +10 VYR per tap'}</Text>
      </TouchableOpacity>
      <View style={styles.infoCard}><Text style={styles.infoText}>Ad Verification Only: After 150 taps, watch full Rewarded Ad to get +100 Bonus. IDs hidden for security.</Text></View>
    </ScrollView>
  );
}

function OffersTab({ user, onCompleteOffer }){
  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:15}}>
      <Text style={styles.title}>Offers</Text>
      <TouchableOpacity style={[styles.tapBtn,{backgroundColor:'#0d47a1'}]} onPress={()=> Linking.openURL(`https://cpx-research.com/?user_id=${user?.uid}&hash=${CPX_HASH}`)}>
        <Text style={styles.tapText}>CPX SURVEYS - HIGH PAY</Text><Text style={styles.tapSub}>High reward surveys available</Text>
      </TouchableOpacity>
      <Text style={styles.section}>7 OFFERS - Ad Required Before Link</Text>
      {OFFERS.map(o=>(
        <View key={o.id} style={[styles.offerCard,{borderColor:o.color}]}>
          <View style={{flex:1}}><Text style={styles.offerName}>{o.name} - {o.reward} VYR</Text><Text style={styles.offerDesc}>{o.desc} - Code: {o.code}</Text></View>
          <TouchableOpacity style={[styles.completeBtn,{backgroundColor:o.color}]} onPress={()=> onCompleteOffer(o)}><Text style={styles.btnText}>COMPLETE</Text></TouchableOpacity>
        </View>
      ))}
      <Text style={styles.footer}>Interstitial Ad will show before opening link. Proof submitted as pending for admin approval.</Text>
    </ScrollView>
  );
}

function WalletTab({ balance, user }){
  const [method,setMethod]=useState(WITHDRAW_METHODS[0]);
  const [network,setNetwork]=useState(AIRTIME_NETWORKS[0]);
  const [amount,setAmount]=useState('');
  const [account,setAccount]=useState('');
  const handleWithdraw = async () => {
    if(balance < 1000){ Alert.alert('Error','Minimum withdraw is 1000 VYR'); return; }
    if(!amount || !account){ Alert.alert('Error','Please fill amount and account'); return; }
    await addDoc(collection(db,'withdrawals'),{userId:user.uid,method,network: method==='Airtime'?network:'',amount:parseInt(amount),account,balanceBefore:balance,createdAt:serverTimestamp(),status:'pending',hiddenGlobal:HIDDEN_GLOBAL});
    Alert.alert('Request Sent','Withdraw pending - Admin will process');
  };
  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:15}}>
      <Text style={styles.title}>Wallet</Text>
      <Text style={styles.globalId}>Balance: {balance} VYR - Min 1000</Text>
      <Text style={styles.section}>Withdraw Methods</Text>
      <View style={styles.chipRow}>{WITHDRAW_METHODS.map(m=>(<TouchableOpacity key={m} onPress={()=> setMethod(m)} style={[styles.chip, method===m && styles.chipActive]}><Text style={method===m? styles.chipTextActive: styles.chipText}>{m}</Text></TouchableOpacity>))}</View>
      <Text style={styles.section}>Airtime Network (if Airtime selected)</Text>
      <View style={styles.chipRow}>{AIRTIME_NETWORKS.map(n=>(<TouchableOpacity key={n} onPress={()=> setNetwork(n)} style={[styles.chip, network===n && styles.chipActive]}><Text style={network===n? styles.chipTextActive: styles.chipText}>{n}</Text></TouchableOpacity>))}</View>
      <TextInput style={styles.input} placeholder="Amount VYR (Min 1000)" value={amount} onChangeText={setAmount} keyboardType="numeric"/>
      <TextInput style={styles.input} placeholder={method==='Bank Transfer'?'Account No / Bank Name':'Opay / Palmpay No / USDT Address'} value={account} onChangeText={setAccount}/>
      <TouchableOpacity style={styles.tapBtn} onPress={handleWithdraw}><Text style={styles.tapText}>REQUEST WITHDRAW - {method} {method==='Airtime'?network:''}</Text></TouchableOpacity>
    </ScrollView>
  );
}

function SettingsTab({ bonus, onWatchAd, onLogout }){
  return (
    <ScrollView style={styles.container} contentContainerStyle={{padding:15}}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.infoCard}><Text style={styles.infoText}>Theme: Default Purple - Secure IDs hidden. No IDs visible to user.</Text></View>
      <TouchableOpacity style={styles.tapBtn} onPress={onWatchAd}><Text style={styles.tapText}>WATCH REWARDED AD +50 BONUS</Text><Text style={styles.tapSub}>Ad Verification - Instant +50</Text></TouchableOpacity>
      <Text style={styles.globalId}>Current Bonus: {bonus}</Text>
      <TouchableOpacity style={[styles.btn,{backgroundColor:'#333',marginTop:20}]} onPress={onLogout}><Text style={styles.btnText}>Logout</Text></TouchableOpacity>
      <Text style={styles.footer}>Secure app - All reward IDs hidden. AdMob integrated.</Text>
    </ScrollView>
  );
}

export default function App(){
  const [user,setUser]=useState(null);
  const [balance,setBalance]=useState(0);
  const [totalTaps,setTotalTaps]=useState(0);
  const [tapProgress,setTapProgress]=useState(0);
  const [bonus,setBonus]=useState(0);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [name,setName]=useState('');
  const [otpInput,setOtpInput]=useState('');
  const [generatedOtp,setGeneratedOtp]=useState('');
  const [showOtp,setShowOtp]=useState(false);
  const [loading,setLoading]=useState(false);
  const [currentScreen,setCurrentScreen]=useState('auth');
  const rewardedRef=useRef(null);
  const interstitialRef=useRef(null);
  const [rewardedLoaded,setRewardedLoaded]=useState(false);
  const [interstitialLoaded,setInterstitialLoaded]=useState(false);

  useEffect(()=>{
    mobileAds().initialize().then(()=>{loadRewarded(); loadInterstitial();});
    const unsub=onAuthStateChanged(auth, async (u)=>{
      if(u){ setUser(u); const snap=await getDoc(doc(db,'users',u.uid)); if(snap.exists()){ const d=snap.data(); setBalance(d.balance||0); setTotalTaps(d.totalTaps||0); setTapProgress(d.tapProgress||0); setBonus(d.bonus||0);} setCurrentScreen('home'); } else setCurrentScreen('auth');
    }); return unsub;
  },[]);

  const loadRewarded=()=>{ 
    const ad=RewardedAd.createForAdRequest(rewardedAdUnitId,{requestNonPersonalizedAdsOnly:true}); 
    ad.addAdEventListener(RewardedAdEventType.LOADED,()=> setRewardedLoaded(true)); 
    ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, async (r)=>{ 
      if(r.type){ await handleTapReward(true,50); }
    }); 
    ad.addAdEventListener(AdEventType.CLOSED,()=>{ setRewardedLoaded(false); loadRewarded();}); 
    ad.load(); 
    rewardedRef.current=ad; 
  };
  
  const loadInterstitial=()=>{ 
    const ad=InterstitialAd.createForAdRequest(interstitialAdUnitId,{requestNonPersonalizedAdsOnly:true}); 
    ad.addAdEventListener(AdEventType.LOADED,()=> setInterstitialLoaded(true)); 
    ad.addAdEventListener(AdEventType.CLOSED,()=>{ setInterstitialLoaded(false); loadInterstitial();}); 
    ad.load(); 
    interstitialRef.current=ad; 
  };

  const handleTapReward=async (isBonus=false, customReward=null)=>{
    if(!user) return; 
    let newProgress=tapProgress+1; 
    let reward=customReward||10; 
    if(isBonus && !customReward){ newProgress=0; reward=100; } 
    if(!isBonus && tapProgress>=150) return; 
    const newTotal=totalTaps+1; 
    const newBalance=balance+reward; 
    setTapProgress(newProgress); 
    setTotalTaps(newTotal); 
    setBalance(newBalance); 
    if(isBonus && !customReward) setBonus(b=>b+100); 
    if(customReward) setBonus(b=>b+customReward); 
    await updateDoc(doc(db,'users',user.uid),{balance:newBalance,totalTaps:newTotal,tapProgress:newProgress,bonus: isBonus && !customReward ? bonus+100 : customReward ? bonus+customReward : bonus}); 
    Alert.alert('Success',`+${reward} VYR Added`);
  };
  
  const onTapToEarn=()=>{ 
    if(tapProgress<150) handleTapReward(false); 
    else { 
      if(rewardedLoaded && rewardedRef.current) 
        Alert.alert('Watch Ad','Watch full Ad to get +100 BONUS',[{text:'Cancel',style:'cancel'},{text:'Watch',onPress:()=> rewardedRef.current.show()}]); 
      else { Alert.alert('Loading Ad','Ad is loading...'); loadRewarded(); } 
    } 
  };
  
  const onCompleteOffer=async (offer)=>{ 
    if(interstitialLoaded && interstitialRef.current){ try{ await interstitialRef.current.show(); }catch(e){} } 
    Linking.openURL(offer.link); 
    await addDoc(collection(db,'proofs'),{userId:user.uid,offerName:offer.name,reward:offer.reward,code:offer.code,createdAt:serverTimestamp(),status:'pending'}); 
    Alert.alert('Proof Submitted',`${offer.name} - ${offer.reward} VYR pending approval - Ad verified`); 
    loadInterstitial(); 
  };
  
  const onWatchSettingsAd=()=>{ 
    if(rewardedLoaded && rewardedRef.current){ rewardedRef.current.show(); } 
    else { Alert.alert('Loading','Ad loading...'); loadRewarded(); } 
  };

  const sendOtpEmail=async (to_email,otp,to_name)=>{ 
    try{ 
      const res=await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:EMAILJS_SERVICE_ID,template_id:EMAILJS_TEMPLATE_ID,user_id:EMAILJS_PUBLIC_KEY,template_params:{to_email,otp,to_name}})}); 
      return res.ok; 
    }catch(e){ return false; } 
  };
  
  const handleSignup=async ()=>{ 
    if(!email||!password||!name){ Alert.alert('Error','Please fill all fields'); return; } 
    setLoading(true); 
    const otp=Math.floor(100000+Math.random()*900000).toString(); 
    setGeneratedOtp(otp); 
    const sent=await sendOtpEmail(email,otp,name); 
    if(sent){ setShowOtp(true); Alert.alert('OTP Sent',`OTP sent to ${email}`);} 
    else Alert.alert('Error','Failed to send OTP - Check EmailJS'); 
    setLoading(false); 
  };
  
  const verifyOtpAndCreate=async ()=>{ 
    if(otpInput!==generatedOtp){ Alert.alert('Error','Invalid OTP'); return; } 
    setLoading(true); 
    try{ 
      const cred=await createUserWithEmailAndPassword(auth,email,password); 
      await setDoc(doc(db,'users',cred.user.uid),{name,email,balance:0,totalTaps:0,tapProgress:0,bonus:0,globalId:HIDDEN_GLOBAL+'-'+cred.user.uid.slice(0,6),hiddenAppId:HIDDEN_APP,createdAt:serverTimestamp()}); 
      setShowOtp(false); 
      setCurrentScreen('home'); 
    }catch(e){ Alert.alert('Firebase Error',e.message);} 
    setLoading(false); 
  };
  
  const handleLogin=async ()=>{ 
    setLoading(true); 
    try{ await signInWithEmailAndPassword(auth,email,password);}catch(e){ Alert.alert('Login Error',e.message);} 
    setLoading(false); 
  };

  if(currentScreen==='auth'){
    return (<ScrollView style={styles.container} contentContainerStyle={{padding:20}}><StatusBar style="dark"/><Text style={styles.title}>Vyra Rewards</Text>
      {!showOtp ? (<><TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName}/><TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none"/><TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry/><TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={styles.btnText}>Sign Up + Send OTP</Text>}</TouchableOpacity><TouchableOpacity style={[styles.btn,{backgroundColor:'#000'}]} onPress={handleLogin}><Text style={styles.btnText}>Login</Text></TouchableOpacity></>) : (<><TextInput style={styles.input} placeholder="6-digit OTP Code" value={otpInput} onChangeText={setOtpInput} keyboardType="numeric"/><TouchableOpacity style={styles.btn} onPress={verifyOtpAndCreate}><Text style={styles.btnText}>Verify & Create Account</Text></TouchableOpacity></>)}
    </ScrollView>);
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{headerShown:false, tabBarActiveTintColor:'#6a00f4', tabBarStyle:{height:60}}}>
        <Tab.Screen name="Home" options={{tabBarLabel:'Home'}}>{()=> <HomeTab balance={balance} totalTaps={totalTaps} tapProgress={tapProgress} bonus={bonus} onTap={onTapToEarn}/>}</Tab.Screen>
        <Tab.Screen name="Offers" options={{tabBarLabel:'Offers'}}>{()=> <OffersTab user={user} onCompleteOffer={onCompleteOffer}/>}</Tab.Screen>
        <Tab.Screen name="Wallet" options={{tabBarLabel:'Wallet'}}>{()=> <WalletTab balance={balance} user={user}/>}</Tab.Screen>
        <Tab.Screen name="Settings" options={{tabBarLabel:'Settings'}}>{()=> <SettingsTab bonus={bonus} onWatchAd={onWatchSettingsAd} onLogout={()=> signOut(auth)}/>}</Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles=StyleSheet.create({
  container:{flex:1,backgroundColor:'#f5f5ff',paddingTop:40},
  title:{fontSize:26,fontWeight:'bold',color:'#6a00f4',textAlign:'center',marginBottom:10},
  globalId:{textAlign:'center',marginBottom:15,fontWeight:'600'},
  row:{flexDirection:'row',justifyContent:'space-between',marginBottom:15},
  purpleBox:{width:'31%',borderWidth:2,borderColor:'#6a00f4',borderRadius:12,padding:10,backgroundColor:'#fff',alignItems:'center'},
  boxLabel:{fontSize:10,color:'#6a00f4',fontWeight:'bold'},
  boxVal:{fontSize:18,fontWeight:'bold',marginTop:5},
  tapBtn:{backgroundColor:'#6a00f4',padding:18,borderRadius:14,alignItems:'center',marginBottom:12},
  tapText:{color:'#fff',fontWeight:'bold',fontSize:16},
  tapSub:{color:'#e0d0ff',fontSize:10,marginTop:4},
  section:{fontSize:16,fontWeight:'bold',marginVertical:10},
  offerCard:{flexDirection:'row',backgroundColor:'#fff',borderWidth:2,borderRadius:12,padding:12,marginBottom:10,alignItems:'center'},
  offerName:{fontWeight:'bold'},offerDesc:{fontSize:11,color:'#666'},
  completeBtn:{paddingHorizontal:14,paddingVertical:8,borderRadius:8},
  input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#ddd',borderRadius:10,padding:12,marginBottom:10},
  btn:{backgroundColor:'#6a00f4',padding:14,borderRadius:10,alignItems:'center',marginBottom:10},
  btnText:{color:'#fff',fontWeight:'bold'},
  footer:{fontSize:8,color:'#999',textAlign:'center',marginTop:20},
  infoCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e0d0ff',borderRadius:10,padding:12,marginBottom:10},
  infoText:{fontSize:12,color:'#555'},
  chipRow:{flexDirection:'row',flexWrap:'wrap',marginBottom:10},
  chip:{borderWidth:1,borderColor:'#6a00f4',borderRadius:20,paddingHorizontal:12,paddingVertical:6,marginRight:8,marginBottom:8},
  chipActive:{backgroundColor:'#6a00f4'},
  chipText:{color:'#6a00f4',fontSize:12},chipTextActive:{color:'#fff',fontSize:12}
});
