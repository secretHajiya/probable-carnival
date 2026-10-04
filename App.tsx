import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Animated, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, InterstitialAd, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';

const IDS = {
  banner: TestIds.BANNER,
  interstitial: TestIds.INTERSTITIAL,
  rewarded: TestIds.REWARDED,
};
const STORE = { coins: 'vyra.coins', streak: 'vyra.streak', lastCheckin: 'vyra.lastCheckin', ads: 'vyra.adsWatched', spin: 'vyra.spinDate', scratch: 'vyra.scratch', withdrawals: 'vyra.withdrawals', referral: 'vyra.referral', user: 'vyra.user', isLoggedIn: 'vyra.isLoggedIn' };
const COINS_PER_NAIRA = 20;
const MIN_WITHDRAWAL = 100000;
const GIFT_CARDS = [
  { id: 'mtn_1000', name: 'MTN Airtime ₦1,000', cost: 20000, icon: '📱', type: 'Airtime' },
  { id: 'airtel_1000', name: 'Airtel Airtime ₦1,000', cost: 20000, icon: '📱', type: 'Airtime' },
  { id: 'glo_1000', name: 'Glo Airtime ₦1,000', cost: 20000, icon: '📱', type: 'Airtime' },
  { id: 'google_5', name: 'Google Play $5', cost: 50000, icon: '🎮', type: 'Gift Card' },
  { id: 'amazon_10', name: 'Amazon $10', cost: 100000, icon: '🛒', type: 'Gift Card' },
  { id: 'steam_10', name: 'Steam $10', cost: 100000, icon: '🎮', type: 'Gift Card' },
  { id: 'netflix_1', name: 'Netflix 1 Month', cost: 75000, icon: '🎬', type: 'Subscription' },
  { id: 'opay_2000', name: 'OPay Cash ₦2,000', cost: 40000, icon: '💰', type: 'Cash' },
  { id: 'bank_5000', name: 'Bank Transfer ₦5,000', cost: 100000, icon: '🏦', type: 'Cash' },
];
const streakRewards = [20, 30, 50, 80, 120, 150, 200];
const todayKey = () => new Date().toISOString().slice(0, 10);
const money = (coins: number) => `₦${(coins / COINS_PER_NAIRA).toFixed(2)}`;
type Withdrawal = { id: string; amount: number; method: string; details: string; date: string; status: string };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [screen, setScreen] = useState<'home'|'wallet'|'shop'>('home');
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastCheckin, setLastCheckin] = useState('');
  const [adsWatched, setAdsWatched] = useState(0);
  const [spinDate, setSpinDate] = useState('');
  const [scratchCount, setScratchCount] = useState(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [referral, setReferral] = useState('VYRA-4821');
  const [rewardLoaded, setRewardLoaded] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [method, setMethod] = useState('Airtime - MTN');
  const [amount, setAmount] = useState('100000');
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
        const logged = await AsyncStorage.getItem(STORE.isLoggedIn);
        if (logged === 'true') setIsLoggedIn(true);
        const pairs = await AsyncStorage.multiGet(Object.values(STORE));
        const data: any = {}; pairs.forEach(([k, v]) => { data[k] = v; });
        setCoins(Number(data[STORE.coins] || 0));
        setStreak(Number(data[STORE.streak] || 0));
        setLastCheckin(data[STORE.lastCheckin] || '');
        setAdsWatched(Number(data[STORE.ads] || 0));
        setSpinDate(data[STORE.spin] || '');
        setWithdrawals(data[STORE.withdrawals]? JSON.parse(data[STORE.withdrawals]) : []);
        setReferral(data[STORE.referral] || `VYRA-${Math.floor(1000 + Math.random() * 9000)}`);
        if (data[STORE.user]) { const u = JSON.parse(data[STORE.user]); setUserPhone(u.phone); }
      } catch {}
    })();
    const r1 = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardLoaded(true));
    const r2 = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      setCoins(c => { const n = c + 50; AsyncStorage.setItem(STORE.coins, String(n)); return n; });
      setAdsWatched(c => { const n = c + 1; AsyncStorage.setItem(STORE.ads, String(n)); return n; });
      Alert.alert('Reward!', '+50 coins');
    });
    const r3 = rewarded.addAdEventListener(AdEventType.CLOSED, () => { setRewardLoaded(false); setAdBusy(false); rewarded.load(); });
    const r4 = rewarded.addAdEventListener(AdEventType.ERROR, () => { setTimeout(()=>rewarded.load(), 2000); });
    interstitial.load(); rewarded.load();
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => { r1(); r2(); r3(); r4(); anim.stop(); };
  }, []);

  const handleLogin = async () => {
    if (!loginPhone &&!loginEmail) return Alert.alert('Required', 'Enter phone or Gmail');
    await AsyncStorage.setItem(STORE.user, JSON.stringify({ phone: loginPhone, email: loginEmail }));
    await AsyncStorage.setItem(STORE.isLoggedIn, 'true');
    setUserPhone(loginPhone); setIsLoggedIn(true);
  };
  const saveCoins = (n: number) => { setCoins(n); AsyncStorage.setItem(STORE.coins, String(n)); };
  const addCoins = (n: number) => saveCoins(coins + n);
  const watchAd = () => { if (!rewardLoaded || adBusy) return; setAdBusy(true); setRewardLoaded(false); rewarded.show().catch(() => { setAdBusy(false); rewarded.load(); }); };
  const checkin = async () => {
    if (lastCheckin === todayKey()) return Alert.alert('Already claimed', 'Come tomorrow');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const nextStreak = lastCheckin === yesterday? (streak % 7) + 1 : 1;
    const reward = streakRewards[nextStreak - 1];
    setStreak(nextStreak); setLastCheckin(todayKey()); saveCoins(coins + reward);
    await AsyncStorage.multiSet([[STORE.streak, String(nextStreak)], [STORE.lastCheckin, todayKey()]]);
    Alert.alert('Check-in', `+${reward} coins!`);
  };
  const spin = async () => {
    if (spinDate === todayKey()) return Alert.alert('Used', 'Come back tomorrow');
    const reward = Math.floor(10 + Math.random() * 91);
    setSpinDate(todayKey()); await AsyncStorage.setItem(STORE.spin, todayKey());
    addCoins(reward); Alert.alert('Spin', `+${reward} coins!`);
  };
  const scratch = async () => {
    const saved = await AsyncStorage.getItem(STORE.scratch);
    const count = saved?.startsWith(todayKey() + ':')? Number(saved.split(':')[1]) : 0;
    if (count >= 3) return Alert.alert('Limit', '3 per day');
    const reward = Math.floor(10 + Math.random() * 41);
    await AsyncStorage.setItem(STORE.scratch, `${todayKey()}:${count+1}`);
    setScratchCount(count+1); addCoins(reward); Alert.alert('Scratch', `+${reward} coins!`);
  };
  const invite = async () => { try { await Share.share({ message: `Join Vyra Rewards! Code: ${referral}` }); } catch {} };
  const submitWithdrawal = async () => {
    const value = Number(amount);
    if (adsWatched < 5) return Alert.alert('Verify', 'Watch 5 ads first');
    if (!value || value < MIN_WITHDRAWAL || value > coins) return Alert.alert('Invalid', `Minimum is ${MIN_WITHDRAWAL.toLocaleString()} coins (₦${MIN_WITHDRAWAL/COINS_PER_NAIRA})`);
    let details = method.startsWith('Airtime')? phone : method === 'Bank Transfer'? `${bank} / ${account}` : account;
    if (!details.trim()) return Alert.alert('Missing', 'Enter details');
    const item: Withdrawal = { id: String(Date.now()), amount: value, method, details, date: new Date().toLocaleDateString(), status: 'Pending' };
    const next = [item,...withdrawals];
    setWithdrawals(next); await AsyncStorage.setItem(STORE.withdrawals, JSON.stringify(next));
    saveCoins(coins - value); Alert.alert('Submitted', 'Withdrawal pending.');
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.loginRoot}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <Text style={styles.loginBrand}>VYRA <Text style={{color:GREEN}}>REWARDS</Text></Text>
        <Text style={styles.loginSub}>Login to start earning - 100,000 coins = ₦5,000</Text>
        <View style={styles.loginCard}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput value={loginPhone} onChangeText={setLoginPhone} keyboardType="phone-pad" style={styles.input} placeholder="08012345678" placeholderTextColor="#777" />
          <Text style={styles.label}>Gmail (Optional)</Text>
          <TextInput value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" style={styles.input} placeholder="example@gmail.com" placeholderTextColor="#777" />
          <TouchableOpacity onPress={handleLogin} style={styles.primaryButton}><Text style={styles.primaryText}>LOGIN / REGISTER</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  const Pill = ({ text, value, color = GREEN }: any) => (<View style={styles.pill}><Text style={styles.muted}>{text}</Text><Text style={[styles.pillValue,{color}]}>{value}</Text></View>);
  const Action = ({ title, subtitle, onPress, color = GREEN, disabled = false }: any) => (<TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.action,{borderColor:color,opacity:disabled?0.5:1}]}><Text style={[styles.actionTitle,{color}]}>{title}</Text>{subtitle? <Text style={styles.muted}>{subtitle}</Text> : null}</TouchableOpacity>);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={styles.header}><View><Text style={styles.brand}>VYRA <Text style={{color:GREEN}}>REWARDS</Text></Text><Text style={styles.muted}>{userPhone} • 20 coins = ₦1</Text></View><TouchableOpacity onPress={async()=>{await AsyncStorage.removeItem(STORE.isLoggedIn); setIsLoggedIn(false);}} style={styles.avatar}><Text style={{color:GOLD,fontWeight:'900'}}>V</Text></TouchableOpacity></View>
      <View style={styles.pills}><Pill text="WALLET" value={`${coins.toLocaleString()} 🪙`} /><Pill text="MIN" value={`₦5K`} color={GOLD} /><Pill text="RATE" value={`${COINS_PER_NAIRA}/₦1`} color={GOLD} /></View>
      <ScrollView contentContainerStyle={{paddingBottom:20}} showsVerticalScrollIndicator={false}>
        {screen === 'home'? <>
          <View style={styles.scoreCard}><Text style={styles.muted}>TOTAL SCORE</Text><Text style={styles.score}>{coins.toLocaleString()}</Text><Text style={styles.naira}>{money(coins)} • Need {MIN_WITHDRAWAL.toLocaleString()} for ₦5,000</Text></View>
          <TouchableOpacity activeOpacity={0.7} onPress={() => addCoins(1)}>
            <Animated.View style={[styles.tapCircle,{transform:[{scale:pulse}]}]}>
              <Text style={styles.tapSmall}>VYRA</Text><Text style={styles.tapTitle}>TAP TO</Text><Text style={styles.tapTitle}>EARN</Text><Text style={styles.tapSmall}>+1 COIN</Text>
            </Animated.View>
          </TouchableOpacity>
          <Text style={[styles.muted,{textAlign:'center',marginTop:10}]}>Tap circle to earn! Need 100,000 taps for ₦5,000</Text>
          <View style={styles.threeCards}><Action title="2X SPEED" subtitle="Soon" onPress={() => Alert.alert('Soon')} color={GOLD}/><Action title="WALLET" subtitle={`${money(coins)}`} onPress={() => setScreen('wallet')}/><Action title="SHOP" subtitle={`${GIFT_CARDS.length} gifts`} onPress={() => setScreen('shop')} color={GOLD}/></View>
          <TouchableOpacity onPress={watchAd} disabled={!rewardLoaded || adBusy} style={[styles.watch,{backgroundColor:rewardLoaded &&!adBusy? GREEN : '#555566'}]}><Text style={styles.watchTitle}>{adBusy? 'LOADING…' : rewardLoaded? '▶ WATCH AD +50 COINS' : 'LOADING AD...'}</Text></TouchableOpacity>
          <View style={styles.row}><Action title="DAILY CHECK-IN" onPress={checkin} disabled={lastCheckin === todayKey()}/><Action title="SCRATCH" subtitle={`${scratchCount}/3`} onPress={scratch} color={GOLD}/></View>
          <TouchableOpacity onPress={spin} style={styles.spin}><Text style={styles.actionTitle}>🎡 SPIN & WIN</Text></TouchableOpacity>
          <TouchableOpacity onPress={invite} style={styles.invite}><Text style={styles.inviteTitle}>✦ INVITE +200</Text><Text style={styles.inviteSub}>Code: {referral}</Text></TouchableOpacity>
        </> : screen === 'wallet'? <>
          <Text style={styles.pageTitle}>My Wallet - Min ₦5,000</Text>
          <View style={styles.walletCard}><Text style={styles.muted}>BALANCE</Text><Text style={styles.score}>{coins.toLocaleString()} 🪙</Text><Text style={styles.naira}>{money(coins)}</Text><Text style={styles.muted}>Rate: 20 coins = ₦1 • Minimum: 100,000 coins = ₦5,000</Text></View>
          <Text style={styles.sectionTitle}>WITHDRAW</Text>
          <View style={styles.methodRow}>{['Airtime - MTN','Airtime - Airtel','OPay','PalmPay','Bank Transfer'].map(m=><TouchableOpacity key={m} onPress={()=>setMethod(m)} style={[styles.method,{borderColor:method===m?GREEN:BORDER,backgroundColor:method===m?'#12362B':CARD}]}><Text style={{color:TEXT,fontSize:12}}>{m}</Text></TouchableOpacity>)}</View>
          <Text style={styles.label}>Amount (Min 100,000)</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.input} />
          {method.startsWith('Airtime')? <><Text style={styles.label}>Phone</Text><TextInput value={phone} onChangeText={setPhone} style={styles.input} /></> : <><Text style={styles.label}>Account</Text><TextInput value={account} onChangeText={setAccount} style={styles.input} /></>}
          <Text style={[styles.muted,{marginHorizontal:16,marginTop:8}]}>Ads: {adsWatched}/5 required • Balance: {coins}/{MIN_WITHDRAWAL}</Text>
          <TouchableOpacity onPress={submitWithdrawal} disabled={adsWatched<5 || coins<MIN_WITHDRAWAL} style={[styles.primaryButton,{opacity:adsWatched<5||coins<MIN_WITHDRAWAL?0.45:1}]}><Text style={styles.primaryText}>REQUEST ₦5,000 WITHDRAWAL</Text></TouchableOpacity>
          <Text style={styles.sectionTitle}>HISTORY</Text>
          {withdrawals.map(w=><View key={w.id} style={styles.history}><View style={{flex:1}}><Text style={styles.leaderName}>{w.method}</Text><Text style={styles.muted}>{w.details}</Text></View><Text style={styles.leaderCoins}>{money(w.amount)}</Text></View>)}
        </> : <>
          <Text style={styles.pageTitle}>Gift Shop 🎁 - 9 Items</Text>
          <View style={styles.walletCard}><Text style={styles.muted}>YOUR BALANCE</Text><Text style={styles.score}>{coins.toLocaleString()} 🪙</Text><Text style={styles.naira}>{money(coins)}</Text></View>
          {GIFT_CARDS.map(item=>{
            const canAfford = coins >= item.cost;
            return (
              <View key={item.id} style={styles.shopItemNew}>
                <View style={styles.shopIcon}><Text style={{fontSize:22}}>{item.icon}</Text></View>
                <View style={{flex:1,marginLeft:12}}>
                  <Text style={styles.leaderName}>{item.name}</Text>
                  <Text style={styles.muted}>{item.cost.toLocaleString()} coins • {money(item.cost)}</Text>
                </View>
                <TouchableOpacity onPress={()=>{
                  if (!canAfford) return Alert.alert('Need more coins', `Need ${item.cost.toLocaleString()}, you have ${coins.toLocaleString()}`);
                  if (adsWatched<5) return Alert.alert('Watch 5 ads first');
                  Alert.alert('Redeem?', `${item.name} for ${item.cost} coins?`, [{text:'Cancel'},{text:'Redeem', onPress: async()=>{
                    saveCoins(coins-item.cost);
                    const w: Withdrawal = {id:String(Date.now()), amount:item.cost, method:item.type, details:item.name, date:new Date().toLocaleDateString(), status:'Pending'};
                    const next=[w,...withdrawals]; setWithdrawals(next); await AsyncStorage.setItem(STORE.withdrawals, JSON.stringify(next));
                    Alert.alert('Success', 'Gift redeemed!');
                  }}]);
                }} style={[styles.redeemButton,{backgroundColor:canAfford?GREEN:'#444'}]}><Text style={styles.redeemText}>{canAfford?'REDEEM':'LOCKED'}</Text></TouchableOpacity>
              </View>
            );
          })}
        </>}
      </ScrollView>
      <View style={styles.bottomNav}><TouchableOpacity onPress={()=>setScreen('home')}><Text style={[styles.navText,screen==='home'&&{color:GREEN}]}>Home</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('wallet')}><Text style={[styles.navText,screen==='wallet'&&{color:GREEN}]}>Wallet</Text></TouchableOpacity><TouchableOpacity onPress={()=>setScreen('shop')}><Text style={[styles.navText,screen==='shop'&&{color:GREEN}]}>Shop</Text></TouchableOpacity></View>
      <View style={styles.banner}><BannerAd unitId={IDS.banner} size={BannerAdSize.BANNER} requestOptions={{requestNonPersonalizedAdsOnly:true}} /></View>
    </View>
  );
}
const BG='#0A0A14', CARD='#1E1E2E', GREEN='#00FF88', GOLD='#FFD700', TEXT='#F5F5FA', MUTED='#9B9BAF', BORDER='#343449';
const styles=StyleSheet.create({
  loginRoot:{flex:1,backgroundColor:BG,justifyContent:'center',padding:20},
  loginBrand:{color:TEXT,fontSize:32,fontWeight:'900',textAlign:'center'},
  loginSub:{color:MUTED,fontSize:13,textAlign:'center',marginTop:8,marginBottom:20},
  loginCard:{backgroundColor:CARD,borderRadius:16,padding:18},
  root:{flex:1,backgroundColor:BG,paddingTop:8},
  header:{paddingHorizontal:18,paddingVertical:12,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},
  brand:{color:TEXT,fontSize:20,fontWeight:'900'},
  muted:{color:MUTED,fontSize:12},
  avatar:{width:38,height:38,borderRadius:19,backgroundColor:CARD,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:GOLD},
  pills:{flexDirection:'row',gap:7,paddingHorizontal:14,marginBottom:8},
  pill:{flex:1,backgroundColor:CARD,borderRadius:12,padding:10},
  pillValue:{fontSize:13,fontWeight:'900',marginTop:4},
  scoreCard:{alignItems:'center',padding:12,marginHorizontal:16,backgroundColor:CARD,borderRadius:18},
  score:{fontSize:34,fontWeight:'900',color:TEXT,marginVertical:3},
  naira:{color:GREEN,fontSize:13,fontWeight:'700'},
  tapCircle:{alignSelf:'center',marginTop:20,width:190,height:190,borderRadius:95,borderWidth:3,borderColor:GREEN,backgroundColor:'#10271F',alignItems:'center',justifyContent:'center',elevation:12},
  tapSmall:{color:GREEN,fontSize:12,fontWeight:'900',letterSpacing:3},
  tapTitle:{color:TEXT,fontSize:25,fontWeight:'900'},
  threeCards:{flexDirection:'row',gap:8,paddingHorizontal:14,marginTop:4},
  action:{flex:1,minHeight:66,backgroundColor:CARD,borderRadius:13,borderWidth:1,padding:10,alignItems:'center',justifyContent:'center',marginBottom:8},
  actionTitle:{fontWeight:'900',fontSize:12,textAlign:'center'},
  watch:{marginHorizontal:14,marginTop:10,borderRadius:15,padding:17,alignItems:'center'},
  watchTitle:{color:BG,fontWeight:'900',fontSize:15},
  row:{flexDirection:'row',gap:8,paddingHorizontal:14,marginTop:10},
  spin:{marginHorizontal:14,marginTop:6,backgroundColor:CARD,borderRadius:14,borderWidth:1,borderColor:'#755F15',padding:14,alignItems:'center'},
  invite:{margin:14,backgroundColor:'#332A08',borderColor:GOLD,borderWidth:1,borderRadius:15,padding:16,alignItems:'center'},
  inviteTitle:{color:GOLD,fontSize:16,fontWeight:'900'},
  inviteSub:{color:'#E5D88D',fontSize:12,marginTop:5},
  sectionTitle:{color:TEXT,fontWeight:'900',fontSize:13,marginHorizontal:16,marginTop:14,marginBottom:8},
  leaderName:{color:TEXT,fontSize:13,fontWeight:'700',flex:1},
  leaderCoins:{color:GREEN,fontSize:12,fontWeight:'800'},
  bottomNav:{flexDirection:'row',justifyContent:'space-around',paddingVertical:10,borderTopWidth:1,borderColor:BORDER},
  navText:{color:MUTED,fontSize:13,fontWeight:'700'},
  banner:{height:52,alignItems:'center',justifyContent:'center',backgroundColor:BG},
  pageTitle:{fontSize:22,fontWeight:'900',color:TEXT,margin:16},
  walletCard:{backgroundColor:CARD,borderRadius:16,marginHorizontal:14,padding:18,alignItems:'center'},
  label:{color:MUTED,fontSize:12,marginHorizontal:16,marginTop:12,marginBottom:5},
  methodRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginHorizontal:14},
  method:{borderWidth:1,borderRadius:9,padding:9},
  input:{marginHorizontal:14,backgroundColor:CARD,borderRadius:10,padding:12,color:TEXT,borderWidth:1,borderColor:BORDER},
  primaryButton:{marginHorizontal:14,marginTop:14,backgroundColor:GREEN,borderRadius:12,padding:14,alignItems:'center'},
  primaryText:{color:BG,fontWeight:'900'},
  history:{flexDirection:'row',alignItems:'center',marginHorizontal:14,marginTop:8,padding:12,backgroundColor:CARD,borderRadius:10},
  shopItemNew:{flexDirection:'row',alignItems:'center',marginHorizontal:14,marginTop:8,padding:14,backgroundColor:CARD,borderRadius:12,borderWidth:1,borderColor:BORDER},
  shopIcon:{width:48,height:48,borderRadius:12,backgroundColor:'#2A2A40',alignItems:'center',justifyContent:'center'},
  redeemButton:{paddingHorizontal:14,paddingVertical:8,borderRadius:8},
  redeemText:{fontWeight:'900',fontSize:11,color:BG},
});
