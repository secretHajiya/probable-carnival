import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const YANDEX_ID = 'R-M-20198314-1';
const MONETAG_LINK = 'https://uplcm.com/4/11966517';
const RATE = 20;
const MIN_WITHDRAW = 100000;
const VERSION = '1.0.2'; // KARMIN VERSION - Kamar yadda kake so
const BUILD = 3;
const VERSION_CODE = 3;

export default function App(){
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({name:'', phone:'', email:''});
  const [otp, setOtp] = useState('');
  const [genOtp, setGenOtp] = useState('');
  const [coins, setCoins] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [ads, setAds] = useState(0);
  const [scratch, setScratch] = useState(0);
  const [invite] = useState('VYRA-'+Math.floor(1000+Math.random()*9000));
  const [completedTasks, setCompletedTasks] = useState([]);
  const [surveyStep, setSurveyStep] = useState(0);

  useEffect(()=>{
    (async()=>{
      const n = await NetInfo.fetch();
      if(!n.isConnected) Alert.alert("Internet Required","Please enable data");
      const c = await AsyncStorage.getItem('c'); if(c) setCoins(parseInt(c));
      const t = await AsyncStorage.getItem('t'); if(t) setTapCount(parseInt(t));
      const tt = await AsyncStorage.getItem('tt'); if(tt) setTotalTaps(parseInt(tt));
      const a = await AsyncStorage.getItem('a'); if(a) setAds(parseInt(a));
      const ct = await AsyncStorage.getItem('ct'); if(ct) setCompletedTasks(JSON.parse(ct));
      setTimeout(()=>setScreen('register'),2000);
    })();
  },[]);

  const save = async(k,v)=>{ await AsyncStorage.setItem(k, typeof v==='string'?v:JSON.stringify(v)); };
  const addCoins = (num)=>{ const nc=coins+num; setCoins(nc); save('c',nc.toString()); };
  const checkNet = async()=>{ const n=await NetInfo.fetch(); if(!n.isConnected){Alert.alert("Internet Required","Turn on data"); return false;} return true; };
  const createAcc = async()=>{
    if(!(await checkNet())) return;
    if(!user.name||!user.phone||!user.email) return Alert.alert("Error","Fill all fields");
    const p=Math.floor(1000+Math.random()*9000).toString(); setGenOtp(p); setScreen('verify');
  };
  const verify = async()=>{ if(otp!==genOtp) return Alert.alert("Invalid OTP","Your code is: "+genOtp); await AsyncStorage.setItem('user', JSON.stringify(user)); setScreen('home'); };

  const onTap = async()=>{
    if(!(await checkNet())) return;
    addCoins(1);
    const nt=tapCount+1; const ntt=totalTaps+1;
    setTapCount(nt); setTotalTaps(ntt);
    save('t',nt.toString()); save('tt',ntt.toString());
    if(ntt % 10 === 0){ Linking.openURL(MONETAG_LINK); }
    if(nt>=50){
      setTapCount(0); save('t','0');
      Alert.alert("Bonus Reward v"+VERSION,"You tapped 50! Watch Ad + Survey for +50 coins",[
        {text:"Watch Ad +20", onPress:()=>{ addCoins(20); setAds(a=>{const na=a+1; save('a',na.toString()); return na;}); }},
        {text:"Take Survey +50", onPress:()=> setScreen('survey')},
        {text:"Skip"}
      ]);
    }
  };

  const watchAd = async()=>{
    if(!(await checkNet())) return;
    Linking.openURL(MONETAG_LINK);
    Alert.alert("Rewarded Ad v"+VERSION,"Yandex: "+YANDEX_ID+" + Monetag +50",[
      {text:"Claim", onPress:()=>{ addCoins(50); const na=ads+1; setAds(na); save('a',na.toString()); }}
    ]);
  };

  const completeTask = (id, reward)=>{
    if(completedTasks.includes(id)) return Alert.alert("Done","Task already completed");
    addCoins(reward);
    const newList=[...completedTasks,id]; setCompletedTasks(newList); save('ct',newList);
    Linking.openURL(MONETAG_LINK);
    Alert.alert("Task Completed v"+VERSION,`+${reward} coins added!`);
  };

  const ngn = (coins/RATE).toFixed(2);

  // Version Component - zai bayyana ko'ina
  const VersionTag = ()=> (
    <View style={s.verBox}>
      <Text style={s.verText}>Vyra APK Fast Build - v{VERSION} (Build #{BUILD}) - VC #{VERSION_CODE}</Text>
      <Text style={s.verSub}>Yandex: {YANDEX_ID} | Monetag 11966517 | MIN {MIN_WITHDRAW}</Text>
    </View>
  );

  if(screen==='loading') return <View style={s.load}><Text style={{fontSize:50}}>👑</Text><Text style={s.logo}>VYRA <Text style={{color:'#facc15'}}>REWARDS</Text></Text><ActivityIndicator color="#facc15" style={{marginTop:16}}/><VersionTag/></View>;
  if(screen==='register') return (
    <View style={s.cont}><Text style={s.logo}>VYRA <Text style={{color:'#facc15'}}>REWARDS</Text></Text><Text style={s.sub}>Premium Earn - OTP - v{VERSION}</Text>
      <View style={s.card}><Text style={s.lab}>Full Name *</Text><TextInput style={s.inp} placeholder="John Doe" placeholderTextColor="#64748b" onChangeText={v=>setUser({...user,name:v})}/><Text style={s.lab}>Phone *</Text><TextInput style={s.inp} placeholder="080..." keyboardType="phone-pad" placeholderTextColor="#64748b" onChangeText={v=>setUser({...user,phone:v})}/><Text style={s.lab}>Email *</Text><TextInput style={s.inp} placeholder="email@gmail.com" placeholderTextColor="#64748b" onChangeText={v=>setUser({...user,email:v})}/><TouchableOpacity style={s.yBtn} onPress={createAcc}><Text style={s.yTxt}>CREATE ACCOUNT & SEND OTP</Text></TouchableOpacity><VersionTag/></View>
    </View>
  );
  if(screen==='verify') return (
    <View style={s.cont}><Text style={s.logo}>VERIFY OTP v{VERSION}</Text><View style={s.card}><Text style={{color:'#facc15', textAlign:'center', fontWeight:'900', fontSize:18}}>YOUR OTP CODE IS: {genOtp}</Text><TextInput style={[s.inp,{textAlign:'center', fontSize:20, marginTop:16}]} maxLength={4} keyboardType="number-pad" placeholder="Enter OTP" placeholderTextColor="#64748b" onChangeText={setOtp}/><TouchableOpacity style={s.yBtn} onPress={verify}><Text style={s.yTxt}>VERIFY & CONTINUE</Text></TouchableOpacity><VersionTag/></View></View>
  );
  if(screen==='survey') return (
    <View style={s.cont}>
      <Text style={s.logo}>SURVEY & EARN v{VERSION}</Text>
      <View style={s.card}>
        <Text style={{color:'#facc15', fontWeight:'900', fontSize:16}}>Survey {surveyStep+1}/3 - +50 Coins Each</Text>
        {surveyStep===0 && <><Text style={{color:'#fff', marginTop:12}}>1. How often do you use banking apps?</Text><TouchableOpacity style={s.yBtn} onPress={()=>{addCoins(50); setSurveyStep(1);}}><Text style={s.yTxt}>Daily</Text></TouchableOpacity><TouchableOpacity style={[s.yBtn,{backgroundColor:'#132a4f', borderWidth:1, borderColor:'#facc15'}]} onPress={()=>{addCoins(50); setSurveyStep(1);}}><Text style={{color:'#facc15', fontWeight:'900'}}>Weekly</Text></TouchableOpacity></>}
        {surveyStep===1 && <><Text style={{color:'#fff', marginTop:12}}>2. Which wallet do you prefer?</Text><TouchableOpacity style={s.yBtn} onPress={()=>{addCoins(50); setSurveyStep(2);}}><Text style={s.yTxt}>OPay</Text></TouchableOpacity><TouchableOpacity style={[s.yBtn,{backgroundColor:'#132a4f', borderWidth:1, borderColor:'#facc15'}]} onPress={()=>{addCoins(50); setSurveyStep(2);}}><Text style={{color:'#facc15', fontWeight:'900'}}>PalmPay</Text></TouchableOpacity></>}
        {surveyStep===2 && <><Text style={{color:'#fff', marginTop:12}}>3. Rate VYRA REWARDS v{VERSION}</Text><TouchableOpacity style={s.yBtn} onPress={()=>{addCoins(50); setSurveyStep(0); setScreen('home'); Linking.openURL(MONETAG_LINK); Alert.alert("Survey Done v"+VERSION,"+150 coins total!");}}><Text style={s.yTxt}>5 Stars ⭐⭐⭐⭐⭐</Text></TouchableOpacity></>}
        <TouchableOpacity style={s.gb} onPress={()=>setScreen('home')}><Text style={s.gbt}>BACK TO HOME</Text></TouchableOpacity><VersionTag/>
      </View>
    </View>
  );

  const Head = ()=> <View style={s.head}><View><Text style={s.logoSm}>👑 VYRA <Text style={{color:'#facc15'}}>REWARDS</Text> v{VERSION}</Text><Text style={{color:'#94a3b8', fontSize:11}}>{user.phone} - 20 coins = NGN 1 - Build #{BUILD}</Text></View><TouchableOpacity style={s.out}><Text style={{fontWeight:'900'}}>OUT</Text></TouchableOpacity></View>;

  if(screen==='home'||screen==='tasks'||screen==='wallet'||screen==='shop'){
    return (
      <ScrollView style={s.main}>
        <Head/>
        <View style={s.r3}><View style={s.mc}><Text style={s.ml}>WALLET</Text><Text style={s.mv}>{coins}</Text></View><View style={s.mc}><Text style={s.ml}>MIN</Text><Text style={s.mv}>NGN 5K</Text></View><View style={s.mc}><Text style={s.ml}>VER</Text><Text style={s.mv}>{VERSION}</Text></View></View>

        {screen==='home' && <>
          <View style={s.tot}><Text style={s.ml}>TOTAL SCORE v{VERSION}</Text><Text style={{color:'#facc15', fontSize:36, fontWeight:'900'}}>{coins}</Text><Text style={{color:'#94a3b8'}}>NGN {ngn} - Need {MIN_WITHDRAW-coins>0?MIN_WITHDRAW-coins:0} for 5K</Text></View>
          <View style={s.prog}><Text style={{color:'#facc15', fontWeight:'900', textAlign:'center'}}>{tapCount}/50 taps to BONUS AD + SURVEY ✨</Text><View style={s.pb}><View style={[s.pf,{width:`${(tapCount/50)*100}%`}]}/></View><Text style={{color:'#64748b', fontSize:10, textAlign:'center', marginTop:4}}>Every 10 taps = Monetag - Every 50 taps = Yandex {YANDEX_ID} + Survey - v{VERSION}</Text></View>
          <TouchableOpacity style={s.tap} onPress={onTap}><Text style={{fontWeight:'900'}}>VYRA</Text><Text style={{fontWeight:'900', fontSize:20}}>TAP TO{'\n'}EARN</Text><Text style={{fontWeight:'900'}}>+1 COIN</Text></TouchableOpacity>
          <View style={s.r3}><TouchableOpacity style={s.ab} onPress={()=>{addCoins(50); Alert.alert("+50 v"+VERSION,"Daily Bonus")}}><Text style={s.abt}>DAILY BONUS</Text></TouchableOpacity><TouchableOpacity style={s.ab} onPress={()=>setScreen('wallet')}><Text style={s.abt}>WALLET{'\n'}NGN {ngn}</Text></TouchableOpacity><TouchableOpacity style={s.ab} onPress={()=>setScreen('shop')}><Text style={s.abt}>SHOP{'\n'}9 gifts</Text></TouchableOpacity></View>
          <TouchableOpacity style={s.gb} onPress={watchAd}><Text style={s.gbt}>WATCH AD +50 - {YANDEX_ID} + MONETAG - v{VERSION}</Text></TouchableOpacity>
          <View style={s.r2}><TouchableOpacity style={s.ab} onPress={()=>setScreen('tasks')}><Text style={s.abt}>TASKS{'\n'}10 offers</Text></TouchableOpacity><TouchableOpacity style={s.ab} onPress={()=>setScreen('survey')}><Text style={s.abt}>SURVEY{'\n'}+150</Text></TouchableOpacity></View>
          <TouchableOpacity style={s.abf} onPress={()=>{addCoins(Math.floor(Math.random()*100));}}><Text style={s.abt}>SPIN & WIN 🎡 SCRATCH {scratch}/3 - v{VERSION}</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf}><Text style={s.abt}>INVITE +200 🎁 Code: {invite} - v{VERSION}</Text></TouchableOpacity>
          <VersionTag/>
        </>}

        {screen==='tasks' && <>
          <Text style={s.sec}>TASKS v{VERSION} - Complete & Earn</Text>
          {[
            ['GTBank','GTWorld App - Open Account +80','GTB80','https://www.gtbank.com',80],
            ['PalmPay','Bonus 5,550 +100 - Code NSFM3287','PALM100','https://palmpay.com',100],
            ['FairMoney','Loan App +90 - Code UAPM5BZ','FAIR90','https://fairmoney.io',90],
            ['Binance','Crypto +120 - Code 1205609224','BIN120','https://binance.com',120],
            ['PiggyVest','Save +80 - Code secrethajiya004','PIGGY80','https://piggyvest.com',80],
            ['Moniepoint','Business +100 - Code TLEG561','MONIE100','https://moniepoint.com',100],
            ['Flutterwave','Payment +70 - Code OAIH4CJTJI94','FLUT70','https://flutterwave.com',70],
            ['OPay','Wallet +80','OPAY80','https://opayweb.com',80],
            ['Kuda','Bank +80','KUDA80','https://kuda.com',80],
            ['Carbon','Loan +70','CARB70','https://getcarbon.co',70],
          ].map((t,i)=>(
            <View key={i} style={s.shop}><View style={{backgroundColor:'#facc15', borderRadius:6, padding:6}}><Text style={{fontWeight:'900', fontSize:10}}>{t[0]}</Text></View><View style={{flex:1, marginLeft:10}}><Text style={{color:'#fff', fontWeight:'700', fontSize:12}}>{t[1]}</Text><Text style={{color:'#facc15', fontSize:10}}>Code: {t[2]}</Text></View><TouchableOpacity style={[s.yBtn,{padding:8, marginTop:0}]} onPress={()=>completeTask(t[2], t[4])}><Text style={[s.yTxt,{fontSize:10}]}>{completedTasks.includes(t[2])?'DONE':`+${t[4]}`}</Text></TouchableOpacity></View>
          ))}
          <VersionTag/><TouchableOpacity style={s.ab} onPress={()=>setScreen('home')}><Text style={s.abt}>BACK HOME v{VERSION}</Text></TouchableOpacity>
        </>}

        {screen==='wallet' && <>
          <Text style={s.sec}>WITHDRAW OPTIONS v{VERSION}</Text><View style={s.wr}>{['MTN','Airtel','OPay','PalmPay','Bank'].map(x=><TouchableOpacity key={x} style={s.chip}><Text style={{color:'#fff', fontSize:12}}>{x}</Text></TouchableOpacity>)}</View>
          <Text style={s.lab}>Amount</Text><TextInput style={s.inp} placeholder="100000" placeholderTextColor="#94a3b8"/><Text style={s.lab}>Details</Text><TextInput style={s.inp} placeholder="Phone/Account" placeholderTextColor="#94a3b8"/><Text style={{color:'#94a3b8', marginVertical:10}}>Ads: {ads}/5 - Balance: {coins}/{MIN_WITHDRAW} - v{VERSION} - VC #{VERSION_CODE}</Text>
          <TouchableOpacity style={[s.yBtn,{opacity: coins>=MIN_WITHDRAW && ads>=5?1:0.4}]} disabled={coins<MIN_WITHDRAW||ads<5}><Text style={s.yTxt}>REQUEST WITHDRAWAL v{VERSION}</Text></TouchableOpacity>
          <VersionTag/><TouchableOpacity style={s.ab} onPress={()=>setScreen('home')}><Text style={s.abt}>BACK HOME v{VERSION}</Text></TouchableOpacity>
        </>}

        {screen==='shop' && <>
          {[
            ['📱','MTN 1,000','20k'],['📱','Airtel 1,000','20k'],['📱','Glo 1,000','20k'],['🎮','Google Play $5','50k'],['🛒','Amazon $10','100k'],['🎮','Steam $10','100k'],['🎬','Netflix 1M','75k'],['💰','OPay 2,000','40k'],['🏦','Bank 5,000','100k']
          ].map((i,k)=>(<View key={k} style={s.shop}><Text style={{fontSize:20}}>{i[0]}</Text><View style={{flex:1, marginLeft:10}}><Text style={{color:'#fff', fontWeight:'700'}}>{i[1]}</Text><Text style={{color:'#94a3b8', fontSize:11}}>{i[2]} coins</Text></View><View style={s.low}><Text style={{fontSize:11}}>Low</Text></View></View>))}
          <VersionTag/><TouchableOpacity style={s.ab} onPress={()=>setScreen('home')}><Text style={s.abt}>BACK HOME v{VERSION}</Text></TouchableOpacity>
        </>}

        <View style={s.bottom}><TouchableOpacity onPress={()=>setScreen('home')}><Text style={[s.bTxt, screen==='home'&&{color:'#facc15'}]}>Home</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('tasks')}><Text style={[s.bTxt, screen==='tasks'&&{color:'#facc15'}]}>Tasks</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('survey')}><Text style={[s.bTxt, screen==='survey'&&{color:'#facc15'}]}>Survey</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('wallet')}><Text style={[s.bTxt, screen==='wallet'&&{color:'#facc15'}]}>Wallet</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('shop')}><Text style={[s.bTxt, screen==='shop'&&{color:'#facc15'}]}>Shop</Text></TouchableOpacity></View>
        <View style={{height:20}}/><VersionTag/><View style={{height:80}}/>
      </ScrollView>
    );
  }
}

const s = StyleSheet.create({
  cont:{flex:1, backgroundColor:'#0a1931', padding:20, justifyContent:'center'}, load:{flex:1, backgroundColor:'#0a1931', alignItems:'center', justifyContent:'center'},
  logo:{color:'#fff', fontSize:26, fontWeight:'900', textAlign:'center'}, sub:{color:'#facc15', textAlign:'center', marginBottom:18},
  card:{backgroundColor:'#132a4f', borderRadius:16, padding:18, borderWidth:1, borderColor:'#facc1530'},
  lab:{color:'#facc15', marginTop:10, fontWeight:'700', fontSize:12}, inp:{backgroundColor:'#0f2342', borderWidth:1, borderColor:'#facc1530', borderRadius:10, padding:12, color:'#fff', marginTop:6},
  yBtn:{backgroundColor:'#facc15', padding:14, borderRadius:10, marginTop:12, alignItems:'center'}, yTxt:{color:'#0a1931', fontWeight:'900'},
  main:{flex:1, backgroundColor:'#0a1931', padding:10}, head:{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:10, borderBottomWidth:1, borderColor:'#ffffff15'},
  logoSm:{color:'#fff', fontWeight:'900'}, out:{backgroundColor:'#facc15', paddingHorizontal:14, paddingVertical:6, borderRadius:14},
  r3:{flexDirection:'row', marginTop:10}, mc:{backgroundColor:'#132a4f', flex:1, margin:3, borderRadius:10, padding:10, alignItems:'center', borderWidth:1, borderColor:'#ffffff10'},
  ml:{color:'#94a3b8', fontSize:11}, mv:{color:'#facc15', fontWeight:'900'},
  tot:{backgroundColor:'#132a4f', borderRadius:14, padding:16, alignItems:'center', marginTop:10, borderWidth:1, borderColor:'#facc1530'},
  prog:{backgroundColor:'#132a4f', borderRadius:10, padding:10, marginTop:10, borderWidth:1, borderColor:'#ffffff10'}, pb:{height:7, backgroundColor:'#0a1931', borderRadius:4, marginTop:6}, pf:{height:7, backgroundColor:'#facc15', borderRadius:4},
  tap:{backgroundColor:'#facc15', width:190, height:190, borderRadius:95, alignSelf:'center', marginTop:16, alignItems:'center', justifyContent:'center'},
  ab:{backgroundColor:'#132a4f', flex:1, margin:3, borderRadius:10, padding:12, alignItems:'center', borderWidth:1, borderColor:'#facc15'}, abt:{color:'#facc15', fontWeight:'700', textAlign:'center', fontSize:12},
  gb:{backgroundColor:'#2a344e', padding:12, borderRadius:10, marginTop:10, alignItems:'center'}, gbt:{color:'#94a3b8', fontWeight:'700', fontSize:11},
  r2:{flexDirection:'row', marginTop:6}, abf:{backgroundColor:'#132a4f', borderRadius:10, padding:12, alignItems:'center', marginTop:6, borderWidth:1, borderColor:'#facc15'},
  sec:{color:'#facc15', fontWeight:'900', marginTop:14}, wr:{flexDirection:'row', flexWrap:'wrap', marginTop:6}, chip:{borderWidth:1, borderColor:'#ffffff30', paddingHorizontal:10, paddingVertical:6, borderRadius:16, margin:3},
  shop:{flexDirection:'row', backgroundColor:'#132a4f', padding:12, borderRadius:10, marginTop:6, alignItems:'center', borderWidth:1, borderColor:'#ffffff10'}, low:{backgroundColor:'#3f3f46', paddingHorizontal:10, paddingVertical:4, borderRadius:10},
  bottom:{flexDirection:'row', justifyContent:'space-around', backgroundColor:'#132a4f', padding:12, borderRadius:12, marginTop:16, borderWidth:1, borderColor:'#facc1530'}, bTxt:{color:'#94a3b8', fontWeight:'700'},
  verBox:{backgroundColor:'#0f2342', padding:8, borderRadius:8, marginTop:12, alignItems:'center', borderWidth:1, borderColor:'#facc1520'}, verText:{color:'#facc15', fontSize:9, fontWeight:'900', textAlign:'center'}, verSub:{color:'#475569', fontSize:7, textAlign:'center', marginTop:2}
});
