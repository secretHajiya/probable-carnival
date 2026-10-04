import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Animated, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

const BG='#0A0A14', CARD='#1E1E2E', GREEN='#00FF88', GOLD='#FFD700', TEXT='#F5F5FA', MUTED='#9B9BAF', BORDER='#343449';

const IDS = {
  banner: __DEV__ ? TestIds.BANNER : 'ca-app-pub-9958539812897899/2577972441',
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-9958539812897899/4358011936',
  rewarded: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-9958539812897899/7027357556',
};
const STORE = { coins: 'vyra.coins', streak: 'vyra.streak', lastCheckin: 'vyra.lastCheckin', ads: 'vyra.adsWatched', spin: 'vyra.spinDate', scratch: 'vyra.scratch', withdrawals: 'vyra.withdrawals', referral: 'vyra.referral' };
const streakRewards = [20, 30, 50, 80, 120, 150, 200];
const todayKey = () => new Date().toISOString().slice(0, 10);
const money = (coins: number) => `₦${(coins / 10).toFixed(2)}`;
type Withdrawal = { id: string; amount: number; method: string; details: string; date: string; status: string };

export default function App() {
  const [screen, setScreen] = useState<'home'|'wallet'|'shop'>('home');
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastCheckin, setLastCheckin] = useState('');
  const [adsWatched, setAdsWatched] = useState(0);
  const [spinDate, setSpinDate] = useState('');
  const [scratchCount, setScratchCount] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [referral, setReferral] = useState('VYRA-4821');
  const [adLoaded, setAdLoaded] = useState(false);
  const [rewardLoaded, setRewardLoaded] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [method, setMethod] = useState('Airtime - MTN');
  const [amount, setAmount] = useState('1000');
  const [phone, setPhone] = useState('');
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const pulse = useMemo(() => new Animated.Value(1), []);
  const interstitial = useMemo(() => InterstitialAd.createForAdRequest(IDS.interstitial), []);
  const rewarded = useMemo(() => RewardedAd.createForAdRequest(IDS.rewarded), []);

  useEffect(() => {
    mobileAds().initialize();
    (async () => {
      try {
        const pairs = await AsyncStorage.multiGet(Object.values(STORE));
        const data: Record<string, string | null> = {}; pairs.forEach(([k, v]) => { data[k] = v; });
        setCoins(Number(data[STORE.coins] || 0)); setStreak(Number(data[STORE.streak] || 0)); setLastCheckin(data[STORE.lastCheckin] || ''); setAdsWatched(Number(data[STORE.ads] || 0)); setSpinDate(data[STORE.spin] || ''); setWithdrawals(data[STORE.withdrawals] ? JSON.parse(data[STORE.withdrawals]!) : []); setReferral(data[STORE.referral] || `VYRA-${Math.floor(1000 + Math.random() * 9000)}`);
      } catch {}
    })();
    const i1 = interstitial.addAdEventListener(AdEventType.LOADED, () => setAdLoaded(true));
    const i2 = interstitial.addAdEventListener(AdEventType.ERROR, () => setAdLoaded(false));
    const r1 = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardLoaded(true));
    const r2 = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      setCoins(c => { const next = c + 50; AsyncStorage.setItem(STORE.coins, String(next)); return next; });
      setAdsWatched(c => { const next = c + 1; AsyncStorage.setItem(STORE.ads, String(next)); return next; });
      Alert.alert('Reward received', '+50 coins');
    });
    const r3 = rewarded.addAdEventListener(AdEventType.CLOSED, () => { setRewardLoaded(false); setAdBusy(false); rewarded.load(); });
    interstitial.load(); rewarded.load();
    const anim = Animated.loop(Animated.sequence([ Animated.timing(pulse, { toValue: 1.05, duration: 900, useNativeDriver: true }), Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }) ])); anim.start();
    return () => { i1(); i2(); r1(); r2(); r3(); anim.stop(); };
  }, []);

  const saveCoins = (next: number) => { setCoins(next); AsyncStorage.setItem(STORE.coins, String(next)); };
  const addCoins = (n: number) => saveCoins(coins + n);
  const showInterstitial = () => { if (adLoaded) { setAdLoaded(false); interstitial.show().catch(() => interstitial.load()); } else interstitial.load(); };
  const watchAd = () => { if (!rewardLoaded || adBusy) return; setAdBusy(true); setRewardLoaded(false); rewarded.show().catch(() => { setAdBusy(false); rewarded.load(); }); };
  const checkin = async () => {
    if (lastCheckin === todayKey()) return Alert.alert('Already claimed', 'Already claimed today.');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const nextStreak = lastCheckin === yesterday ? (streak % 7) + 1 : 1; const reward = streakRewards[nextStreak - 1];
    setStreak(nextStreak); setLastCheckin(todayKey()); saveCoins(coins + reward); await AsyncStorage.multiSet([[STORE.streak, String(nextStreak)], [STORE.lastCheckin, todayKey()]]); Alert.alert('Check-in', `Day ${nextStreak}: +${reward} coins!`);
  };
  const spin = async () => {
    if (spinDate === todayKey()) return Alert.alert('Come back tomorrow', 'Used today.'); const reward = Math.floor(10 + Math.random() * 91);
    setSpinDate(todayKey()); await AsyncStorage.setItem(STORE.spin, todayKey()); addCoins(reward); Alert.alert('Spin', `You won ${reward} coins!`); showInterstitial();
  };
  const scratch = async () => {
    const saved = await AsyncStorage.getItem(STORE.scratch); const count = saved?.startsWith(todayKey() + ':') ? Number(saved.split(':')[1]) : 0;
    if (count >= 3) return Alert.alert('Limit', '3 scratch used today.'); const reward = Math.floor(10 + Math.random() * 41); const next = count + 1; setScratchCount(next);
    await AsyncStorage.setItem(STORE.scratch, `${todayKey()}:${next}`); addCoins(reward); Alert.alert('Scratch', `You won ${reward} coins!`); if (next === 3) showInterstitial();
  };
  const invite = async () => { try { await Share.share({ message: `Join Vyra Rewards Pro! My code ${referral}.` }); } catch {} };
  const submitWithdrawal = async () => {
    const value = Number(amount); if (adsWatched < 5) return Alert.alert('Verify', 'Watch 5 ads first.'); if (!Number.isFinite(value) || value < 1000 || value > coins) return Alert.alert('Invalid', 'Min 1000 coins.');
    let details = method.startsWith('Airtime') ? phone : method === 'Bank Transfer' ? `${bank} / ${account}` : account; if (!details.trim()) return Alert.alert('Missing', 'Enter details.');
    const item: Withdrawal = { id: String(Date.now()), amount: value, method, details, date: new Date().toLocaleDateString(), status: 'Pending' };
    const next = [item, ...withdrawals]; setWithdrawals(next); await AsyncStorage.setItem(STORE.withdrawals, JSON.stringify(next)); saveCoins(coins - value); Alert.alert('Submitted', 'Pending.');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={styles.header}><View><Text style={styles.brand}>VYRA <Text style={{color:GREEN}}>REWARDS</Text></Text><Text style={styles.muted}>Earn • Save • Enjoy</Text></View><TouchableOpacity onPress={() => setScreen('wallet')} style={styles.avatar}><Text style={{color:GOLD,fontWeight:'900'}}>V</Text></TouchableOpacity></View>
      <View style={styles.pills}><View style={styles.pill}><Text style={styles.muted}>WALLET</Text><Text style={[styles.pillValue,{color:GREEN}]}>{coins.toLocaleString()} 🪙</Text></View><View style={styles.pill}><Text style={styles.muted}>STREAK</Text><Text style={[styles.pillValue,{color:GOLD}]}>{streak} DAYS</Text></View><View style={styles.pill}><Text style={styles.muted}>GIFT</Text><Text style={[styles.pillValue,{color:GOLD}]}>REDEEM</Text></View></View>
      <ScrollView contentContainerStyle={{paddingBottom:20}} showsVerticalScrollIndicator={false}>
        {screen === 'home' ? <>
          <View style={styles.scoreCard}><Text style={styles.muted}>TOTAL SCORE</Text><Text style={styles.score}>{coins.toLocaleString()}</Text><Text style={styles.naira}>{money(coins)} estimated</Text></View>
          <Animated.View style={[styles.tapCircle,{transform:[{scale:pulse}]}]}><Text style={styles.tapSmall}>VYRA</Text><Text style={styles.tapTitle}>TAP TO</Text><Text style={styles.tapTitle}>EARN</Text><Text style={styles.tapSmall}>+1 COIN</Text></Animated.View>
          <TouchableOpacity onPress={() => addCoins(1)} style={styles.tapHit}><Text style={styles.muted}>Tap the glowing circle to earn</Text></TouchableOpacity>
          <TouchableOpacity onPress={watchAd} disabled={!rewardLoaded || adBusy} style={[styles.watch,{backgroundColor:rewardLoaded && !adBusy ? GREEN : '#555566'}]}><Text style={styles.watchTitle}>{adBusy ? 'LOADING…' : rewardLoaded ? '▶  WATCH AD  +50' : 'LOADING AD'}</Text></TouchableOpacity>
          <View style={styles.row}><TouchableOpacity onPress={checkin} disabled={lastCheckin===todayKey()} style={[styles.action,{borderColor:GREEN,opacity:lastCheckin===todayKey()?0.5:1}]}><Text style={[styles.actionTitle,{color:GREEN}]}>DAILY CHECK-IN</Text></TouchableOpacity><TouchableOpacity onPress={scratch} style={[styles.action,{borderColor:GOLD}]}><Text style={[styles.actionTitle,{color:GOLD}]}>SCRATCH {scratchCount}/3</Text></TouchableOpacity></View>
          <TouchableOpacity onPress={spin} style={styles.spin}><Text style={styles.actionTitle}>🎡  SPIN & WIN</Text></TouchableOpacity>
          <TouchableOpacity onPress={invite} style={styles.invite}><Text style={styles.inviteTitle}>✦ INVITE +200</Text><Text style={styles.inviteSub}>Code: {referral}</Text></TouchableOpacity>
        </> : screen === 'wallet' ? <>
          <Text style={styles.pageTitle}>My Wallet</Text><View style={styles.walletCard}><Text style={styles.muted}>BALANCE</Text><Text style={styles.score}>{coins.toLocaleString()} 🪙</Text><Text style={styles.naira}>{money(coins)}</Text></View>
          <Text style={styles.label}>Method</Text><View style={styles.methodRow}>{['Airtime - MTN','Airtime - Airtel','OPay','Bank Transfer'].map(m=><TouchableOpacity key={m} onPress={()=>setMethod(m)} style={[styles.method,{borderColor:method===m?GREEN:BORDER}]}><Text style={{color:TEXT,fontSize:12}}>{m}</Text></TouchableOpacity>)}</View>
          <Text style={styles.label}>Amount</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.input} placeholder="1000" placeholderTextColor="#777"/>
          <Text style={styles.label}>Phone/Account</Text><TextInput value={phone || account} onChangeText={t=>{setPhone(t);setAccount(t);}} style={styles.input} placeholder="080..." placeholderTextColor="#777"/>
          <Text style={styles.muted}>Ads watched: {adsWatched}/5</Text>
          <TouchableOpacity onPress={submitWithdrawal} style={styles.primaryButton}><Text style={styles.primaryText}>REQUEST WITHDRAWAL</Text></TouchableOpacity>
        </> : <>
          <Text style={styles.pageTitle}>Rewards Shop</Text>
          {['Airtime','OPay','PalmPay','Bank'].map(item=><View key={item} style={styles.shopItem}><Text style={styles.leaderName}>{item}</Text><TouchableOpacity onPress={()=>setScreen('wallet')}><Text style={{color:GREEN}}>WITHDRAW →</Text></TouchableOpacity></View>)}
        </>}
      </ScrollView>
      <View style={styles.bottomNav}><TouchableOpacity onPress={()=>setScreen('home')}><Text style={[styles.navText,screen==='home'&&{color:GREEN}]}>Home</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('wallet')}><Text style={[styles.navText,screen==='wallet'&&{color:GREEN}]}>Wallet</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('shop')}><Text style={[styles.navText,screen==='shop'&&{color:GREEN}]}>Shop</Text></TouchableOpacity></View>
      <View style={styles.banner}><BannerAd unitId={IDS.banner} size={BannerAdSize.BANNER} requestOptions={{requestNonPersonalizedAdsOnly:true}} /></View>
    </View>
  );
}

const styles=StyleSheet.create({
 root:{flex:1,backgroundColor:BG,paddingTop:8}, header:{paddingHorizontal:18,paddingVertical:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
 brand:{color:TEXT,fontSize:20,fontWeight:'900'}, muted:{color:MUTED,fontSize:12}, avatar:{width:38,height:38,borderRadius:19,backgroundColor:CARD,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:GOLD},
 pills:{flexDirection:'row',gap:7,paddingHorizontal:14,marginBottom:8}, pill:{flex:1,backgroundColor:CARD,borderRadius:12,padding:10}, pillValue:{fontSize:13,fontWeight:'900',marginTop:4},
 scoreCard:{alignItems:'center',padding:12,marginHorizontal:16,backgroundColor:CARD,borderRadius:18}, score:{fontSize:34,fontWeight:'900',color:TEXT,marginVertical:3}, naira:{color:GREEN,fontSize:13,fontWeight:'700'},
 tapCircle:{alignSelf:'center',marginTop:20,width:190,height:190,borderRadius:95,borderWidth:3,borderColor:GREEN,backgroundColor:'#10271F',alignItems:'center',justifyContent:'center'}, tapSmall:{color:GREEN,fontSize:12,fontWeight:'900',letterSpacing:3}, tapTitle:{color:TEXT,fontSize:25,fontWeight:'900'}, tapHit:{alignItems:'center',paddingVertical:10},
 action:{flex:1,minHeight:66,backgroundColor:CARD,borderRadius:13,borderWidth:1,padding:10,alignItems:'center',justifyContent:'center',marginBottom:8}, actionTitle:{fontWeight:'900',fontSize:12,textAlign:'center'}, watch:{marginHorizontal:14,marginTop:6,borderRadius:15,padding:17,alignItems:'center'}, watchTitle:{color:BG,fontWeight:'900',fontSize:16}, row:{flexDirection:'row',gap:8,paddingHorizontal:14,marginTop:10}, spin:{marginHorizontal:14,marginTop:4,backgroundColor:CARD,borderRadius:14,borderWidth:1,borderColor:'#755F15',padding:14,alignItems:'center'},
 invite:{margin:14,backgroundColor:'#332A08',borderColor:GOLD,borderWidth:1,borderRadius:15,padding:16,alignItems:'center'}, inviteTitle:{color:GOLD,fontSize:16,fontWeight:'900'}, inviteSub:{color:'#E5D88D',fontSize:12,marginTop:5},
 pageTitle:{fontSize:25,fontWeight:'900',color:TEXT,margin:16}, walletCard:{backgroundColor:CARD,borderRadius:16,marginHorizontal:14,padding:18,alignItems:'center'}, label:{color:MUTED,fontSize:12,marginHorizontal:16,marginTop:12,marginBottom:5}, methodRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginHorizontal:14}, method:{borderWidth:1,borderRadius:9,padding:9}, input:{marginHorizontal:14,backgroundColor:CARD,borderRadius:10,padding:12,color:TEXT,borderWidth:1,borderColor:BORDER},
 primaryButton:{margin:14,backgroundColor:GREEN,borderRadius:12,padding:15,alignItems:'center'}, primaryText:{color:BG,fontWeight:'900'}, shopItem:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginHorizontal:14,marginBottom:8,padding:14,backgroundColor:CARD,borderRadius:10}, leaderName:{color:TEXT,fontWeight:'700'}, bottomNav:{flexDirection:'row',justifyContent:'space-around',paddingVertical:10,borderTopWidth:1,borderColor:BORDER}, navText:{color:MUTED,fontSize:13,fontWeight:'700'}, banner:{height:52,alignItems:'center',justifyContent:'center'}
});
