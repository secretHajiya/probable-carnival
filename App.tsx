import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Animated, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

const IDS = {
  appId: 'ca-app-pub-9958539812897899~1555539022',
  banner: 'ca-app-pub-9958539812897899/2677972441',
  interstitial: 'ca-app-pub-9958539812897899/4358011936',
  rewarded: 'ca-app-pub-9958539812897899/7027357556',
};
const BG = '#0A1931';
const CARD = '#112240';
const GOLD = '#FFD700';
const GOLD2 = '#FFCC00';
const GREEN = GOLD;
const BORDER = '#FFD70033';
const TEXT = '#FFFFFF';
const MUTED = '#9BA3AF';

const STORE = { coins: 'vyra.coins', streak: 'vyra.streak', lastCheckin: 'vyra.lastCheckin', ads: 'vyra.adsWatched', spin: 'vyra.spinDate', scratch: 'vyra.scratch', withdrawals: 'vyra.withdrawals', referral: 'vyra.referral', user: 'vyra.user', isLoggedIn: 'vyra.isLoggedIn', tapCount: 'vyra.tapCount' };
const COINS_PER_NAIRA = 20;
const MIN_WITHDRAWAL = 100000;
const GIFT_CARDS = [
  { id: 'mtn_1000', name: 'MTN Airtime NGN 1,000', cost: 20000, icon: '📱', type: 'Airtime' },
  { id: 'airtel_1000', name: 'Airtel Airtime NGN 1,000', cost: 20000, icon: '📱', type: 'Airtime' },
  { id: 'glo_1000', name: 'Glo Airtime NGN 1,000', cost: 20000, icon: '📱', type: 'Airtime' },
  { id: 'google_5', name: 'Google Play $5', cost: 50000, icon: '🎮', type: 'Gift Card' },
  { id: 'amazon_10', name: 'Amazon $10', cost: 100000, icon: '🛒', type: 'Gift Card' },
  { id: 'steam_10', name: 'Steam $10', cost: 100000, icon: '🎮', type: 'Gift Card' },
  { id: 'netflix_1', name: 'Netflix 1 Month', cost: 75000, icon: '🎬', type: 'Subscription' },
  { id: 'opay_2000', name: 'OPay Cash NGN 2,000', cost: 40000, icon: '💰', type: 'Cash' },
  { id: 'bank_5000', name: 'Bank Transfer NGN 5,000', cost: 100000, icon: '🏦', type: 'Cash' },
];
const streakRewards = [20, 30, 50, 80, 120, 150, 200];
const todayKey = () => new Date().toISOString().slice(0, 10);
const money = (coins) => `NGN ${(coins / COINS_PER_NAIRA).toFixed(2)}`;

export default function App() {
  const [splash, setSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [screen, setScreen] = useState('home');
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lastCheckin, setLastCheckin] = useState('');
  const [adsWatched, setAdsWatched] = useState(0);
  const [spinDate, setSpinDate] = useState('');
  const [scratchCount, setScratchCount] = useState(0);
  const [withdrawals, setWithdrawals] = useState([]);
  const [referral, setReferral] = useState('VYRA-4821');
  const [rewardLoaded, setRewardLoaded] = useState(false);
  const [interLoaded, setInterLoaded] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [method, setMethod] = useState('Airtime - MTN');
  const [amount, setAmount] = useState('100000');
  const [account, setAccount] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const [showBonusModal, setShowBonusModal] = useState(false);
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
        const data = {}; pairs.forEach(([k, v]) => { data[k] = v; });
        setCoins(Number(data[STORE.coins] || 0));
        setStreak(Number(data[STORE.streak] || 0));
        setLastCheckin(data[STORE.lastCheckin] || '');
        setAdsWatched(Number(data[STORE.ads] || 0));
        setSpinDate(data[STORE.spin] || '');
        setWithdrawals(data[STORE.withdrawals]? JSON.parse(data[STORE.withdrawals]) : []);
        setReferral(data[STORE.referral] || `VYRA-${Math.floor(1000 + Math.random() * 9000)}`);
        setTapCount(Number(data[STORE.tapCount] || 0));
        if (data[STORE.user]) { const u = JSON.parse(data[STORE.user]); setUserPhone(u.phone || u.email); }
      } catch {}
      setTimeout(()=>setSplash(false), 1000);
    })();
    const i1 = interstitial.addAdEventListener(AdEventType.LOADED, () => setInterLoaded(true));
    const i2 = interstitial.addAdEventListener(AdEventType.CLOSED, () => { setInterLoaded(false); interstitial.load(); });
    const i3 = interstitial.addAdEventListener(AdEventType.ERROR, () => { setTimeout(()=>interstitial.load(), 3000); });
    const r1 = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardLoaded(true));
    const r2 = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      setCoins(c => { const n = c + 100; AsyncStorage.setItem(STORE.coins, String(n)); return n; });
      setAdsWatched(c => { const n = c + 1; AsyncStorage.setItem(STORE.ads, String(n)); return n; });
      setTapCount(0); AsyncStorage.setItem(STORE.tapCount, '0');
      Alert.alert('Bonus Earned!', '+100 coins!');
    });
    const r3 = rewarded.addAdEventListener(AdEventType.CLOSED, () => { setRewardLoaded(false); setAdBusy(false); rewarded.load(); });
    const r4 = rewarded.addAdEventListener(AdEventType.ERROR, () => { setTimeout(()=>rewarded.load(), 2000); });
    interstitial.load(); rewarded.load();
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.08, duration: 800, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]));
    anim.start();
    return () => { i1(); i2(); i3(); r1(); r2(); r3(); r4(); anim.stop(); };
  }, []);

  const sendOtp = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return Alert.alert("No Internet", "Please turn on data");
    if (!fullName || fullName.length < 3) return Alert.alert('Required', 'Enter your full name');
    if (!loginPhone &&!loginEmail) return Alert.alert('Required', 'Enter phone or email');
    if (loginPhone && loginPhone.length < 11) return Alert.alert('Invalid', 'Phone must be 11 digits');
    if (loginEmail &&!loginEmail.includes('@')) return Alert.alert('Invalid', 'Enter valid email');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code); setOtpSent(true);
    Alert.alert('OTP Code', `Your code is: ${code} sent to ${loginPhone || loginEmail}`);
  };
  const verifyOtpAndLogin = async () => {
    if (enteredOtp!== generatedOtp) return Alert.alert('Invalid Code', 'Incorrect OTP');
    await AsyncStorage.setItem(STORE.user, JSON.stringify({ phone: loginPhone, email: loginEmail, fullName }));
    await AsyncStorage.setItem(STORE.isLoggedIn, 'true');
    setUserPhone(loginPhone || loginEmail); setIsLoggedIn(true); setOtpSent(false); setEnteredOtp('');
  };
  const saveCoins = (n) => { setCoins(n); AsyncStorage.setItem(STORE.coins, String(n)); };
  const addCoins = (n) => saveCoins(coins + n);
  const handleTap = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;
    const newCoins = coins + 1; saveCoins(newCoins);
    const newCount = tapCount + 1; setTapCount(newCount);
    await AsyncStorage.setItem(STORE.tapCount, String(newCount));
    if (newCount >= 50) { setShowBonusModal(true); }
  };
  const handleWatchBonusAd = async () => {
    setShowBonusModal(false);
    if (rewardLoaded) { setAdBusy(true); rewarded.show().catch(()=>{ setAdBusy(false); saveCoins(coins+20); setTapCount(0); }); }
    else if (interLoaded) { interstitial.show().catch(()=>{}); saveCoins(coins+50); setTapCount(0); Alert.alert('Bonus!', '+50 coins!'); }
    else { saveCoins(coins+25); setTapCount(0); Alert.alert('Bonus!', '+25 coins!'); rewarded.load(); interstitial.load(); }
  };
  const handleSkipBonus = () => { setShowBonusModal(false); setTapCount(0); AsyncStorage.setItem(STORE.tapCount,'0'); saveCoins(coins + 5); };
  const watchAd = () => { if (!rewardLoaded || adBusy) return; setAdBusy(true); setRewardLoaded(false); rewarded.show().catch(() => { setAdBusy(false); rewarded.load(); }); };
  const checkin = async () => {
    const netState = await NetInfo.fetch(); if (!netState.isConnected) return Alert.alert("No Internet", "Turn on data");
    if (lastCheckin === todayKey()) return Alert.alert('Already claimed', 'Come tomorrow');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const nextStreak = lastCheckin === yesterday? (streak % 7) + 1 : 1; const reward = streakRewards[nextStreak - 1];
    setStreak(nextStreak); setLastCheckin(todayKey()); saveCoins(coins + reward);
    await AsyncStorage.multiSet([[STORE.streak, String(nextStreak)], [STORE.lastCheckin, todayKey()]]);
    if (interLoaded) interstitial.show(); Alert.alert('Check-in', `+${reward} coins!`);
  };
  const spin = async () => {
    if (spinDate === todayKey()) return Alert.alert('Used', 'Come back tomorrow');
    const reward = Math.floor(10 + Math.random() * 91); setSpinDate(todayKey()); await AsyncStorage.setItem(STORE.spin, todayKey()); addCoins(reward); Alert.alert('Spin', `+${reward} coins!`);
  };
  const scratch = async () => {
    const saved = await AsyncStorage.getItem(STORE.scratch); const count = saved?.startsWith(todayKey() + ':')? Number(saved.split(':')[1]) : 0;
    if (count >= 3) return Alert.alert('Limit', '3 per day'); const reward = Math.floor(10 + Math.random() * 41);
    await AsyncStorage.setItem(STORE.scratch, `${todayKey()}:${count+1}`); setScratchCount(count+1); addCoins(reward); Alert.alert('Scratch', `+${reward} coins!`);
  };
  const invite = async () => { try { await Share.share({ message: `Join Vyra Rewards! Code: ${referral}` }); } catch {} };
  const submitWithdrawal = async () => {
    const value = Number(amount); if (adsWatched < 5) return Alert.alert('Verification', 'Watch 5 ads first');
    if (!value || value < MIN_WITHDRAWAL || value > coins) return Alert.alert('Invalid', `Min ${MIN_WITHDRAWAL.toLocaleString()}`);
    if (!account.trim()) return Alert.alert('Missing', 'Enter details');
    const item = { id: String(Date.now()), amount: value, method, details: account, date: new Date().toLocaleDateString(), status: 'Pending' };
    const next = [item,...withdrawals]; setWithdrawals(next); await AsyncStorage.setItem(STORE.withdrawals, JSON.stringify(next)); saveCoins(coins - value); Alert.alert('Submitted', 'Pending 24h');
  };

  if (splash) { return (<View style={styles.splashRoot}><StatusBar barStyle="light-content" backgroundColor={BG} /><Text style={{fontSize:60}}>👑</Text><Text style={styles.brand}>VYRA <Text style={{color:GOLD}}>REWARDS</Text></Text><Text style={styles.muted}>Loading Premium...</Text></View>); }
  if (!isLoggedIn) { return (
      <View style={styles.loginRoot}><StatusBar barStyle="light-content" backgroundColor={BG} />
        <Text style={styles.loginBrand}>VYRA <Text style={{color:GOLD}}>REWARDS</Text></Text><Text style={styles.loginSub}>Premium Earn - OTP Verification</Text>
        <View style={styles.loginCard}>
          {!otpSent? (<><Text style={styles.label}>Full Name *</Text><TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="John Doe" placeholderTextColor="#777" /><Text style={styles.label}>Phone *</Text><TextInput value={loginPhone} onChangeText={setLoginPhone} keyboardType="phone-pad" style={styles.input} placeholder="08012345678" placeholderTextColor="#777" maxLength={11} /><Text style={styles.label}>Email *</Text><TextInput value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" style={styles.input} placeholder="example@gmail.com" placeholderTextColor="#777" autoCapitalize="none" /><TouchableOpacity onPress={sendOtp} style={styles.primaryButton}><Text style={styles.primaryText}>CREATE ACCOUNT & SEND OTP</Text></TouchableOpacity></>) : (<><Text style={[styles.muted,{textAlign:'center',marginBottom:10}]}>Code sent to {loginPhone || loginEmail}</Text><Text style={styles.label}>Enter OTP</Text><TextInput value={enteredOtp} onChangeText={setEnteredOtp} keyboardType="number-pad" style={[styles.input,{fontSize:22, letterSpacing:10, textAlign:'center', fontWeight:'900'}]} placeholder="1234" placeholderTextColor="#777" maxLength={4} /><TouchableOpacity onPress={verifyOtpAndLogin} style={styles.primaryButton}><Text style={styles.primaryText}>VERIFY & CONTINUE</Text></TouchableOpacity><TouchableOpacity onPress={()=>setOtpSent(false)} style={{marginTop:12}}><Text style={{color:GOLD, textAlign:'center', fontWeight:'700'}}>Change Details</Text></TouchableOpacity></>)}
        </View>
      </View>); }

  const Pill = ({ text, value, color = GOLD }) => (<View style={styles.pill}><Text style={styles.muted}>{text}</Text><Text style={[styles.pillValue,{color}]}>{value}</Text></View>);
  const Action = ({ title, subtitle, onPress, color = GOLD, disabled = false }) => (<TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.action,{borderColor:color,opacity:disabled?0.5:1}]}><Text style={[styles.actionTitle,{color}]}>{title}</Text>{subtitle? <Text style={styles.muted}>{subtitle}</Text> : null}</TouchableOpacity>);
  return (
    <View style={styles.root}><StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={styles.header}><View><Text style={styles.brand}>👑 VYRA <Text style={{color:GOLD}}>REWARDS</Text></Text><Text style={styles.muted}>{userPhone} - 20 coins = NGN 1</Text></View><TouchableOpacity onPress={async()=>{await AsyncStorage.removeItem(STORE.isLoggedIn); setIsLoggedIn(false);}} style={styles.avatar}><Text style={{color:BG,fontWeight:'900'}}>OUT</Text></TouchableOpacity></View>
      <View style={styles.pills}><Pill text="WALLET" value={`${coins.toLocaleString()}`} /><Pill text="MIN" value={`NGN 5K`} color={GOLD} /><Pill text="RATE" value={`${COINS_PER_NAIRA}/1`} color={GOLD2} /></View>
      <ScrollView contentContainerStyle={{paddingBottom:120}} showsVerticalScrollIndicator={false}>
        {screen === 'home'? (<>
            <View style={styles.scoreCard}><Text style={styles.muted}>TOTAL SCORE</Text><Text style={styles.score}>{coins.toLocaleString()}</Text><Text style={styles.naira}>{money(coins)} - Need {MIN_WITHDRAWAL.toLocaleString()} for 5K</Text></View>
            <View style={{ marginHorizontal: 16, marginTop: 12, backgroundColor: CARD, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: BORDER }}>
              <Text style={{ color: GOLD, textAlign: 'center', marginBottom: 6, fontWeight: 'bold', fontSize: 12 }}>{tapCount}/50 taps to BONUS AD ✨</Text>
              <View style={{ height: 12, backgroundColor: BG, borderRadius: 10, overflow: 'hidden', borderWidth:1, borderColor:BORDER }}><View style={{ height: '100%', width: `${(tapCount / 50) * 100}%`, backgroundColor: GOLD, borderRadius: 10 }} /></View>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={handleTap}><Animated.View style={[styles.tapCircle,{transform:[{scale:pulse}]}]}><Text style={styles.tapSmall}>👑 VYRA</Text><Text style={styles.tapTitle}>TAP TO</Text><Text style={styles.tapTitle}>EARN</Text><Text style={styles.tapSmall}>+1 COIN</Text></Animated.View></TouchableOpacity>
            <Text style={[styles.muted,{textAlign:'center',marginTop:10}]}>Tap 50 times for bonus + Ad 💰</Text>
            <View style={styles.threeCards}><Action title="DAILY BONUS" onPress={checkin} /><Action title="WALLET" subtitle={money(coins)} onPress={() => setScreen('wallet')}/><Action title="SHOP" subtitle={`${GIFT_CARDS.length} gifts`} onPress={() => setScreen('shop')} color={GOLD2}/></View>
            <TouchableOpacity onPress={watchAd} disabled={!rewardLoaded || adBusy} style={[styles.watch,{backgroundColor:rewardLoaded &&!adBusy? GOLD : '#2A2A40'}]}><Text style={[styles.watchTitle,{color:rewardLoaded?BG:'#777'}]}>{adBusy? 'LOADING...' : rewardLoaded? 'WATCH AD +100 COINS' : 'LOADING AD...'}</Text></TouchableOpacity>
            <View style={styles.row}><Action title="DAILY CHECK-IN" onPress={checkin} disabled={lastCheckin === todayKey()}/><Action title="SCRATCH" subtitle={`${scratchCount}/3`} onPress={scratch} color={GOLD2}/></View>
            <TouchableOpacity onPress={spin} style={styles.spin}><Text style={styles.actionTitle}>SPIN & WIN 🎡</Text></TouchableOpacity>
            <TouchableOpacity onPress={invite} style={styles.invite}><Text style={styles.inviteTitle}>INVITE +200 🎁</Text><Text style={styles.inviteSub}>Code: {referral}</Text></TouchableOpacity>
            <View style={{alignItems:'center', marginTop:20}}><BannerAd unitId={IDS.banner} size={BannerAdSize.BANNER} /></View>
          </>) : screen === 'wallet'? (<>
            <Text style={styles.pageTitle}>My Wallet - Min 5,000 💼</Text><View style={styles.walletCard}><Text style={styles.muted}>BALANCE</Text><Text style={styles.score}>{coins.toLocaleString()}</Text><Text style={styles.naira}>{money(coins)}</Text></View>
            <Text style={styles.sectionTitle}>WITHDRAW OPTIONS</Text><View style={styles.methodRow}>{['Airtime - MTN','Airtime - Airtel','OPay','PalmPay','Bank Transfer'].map(m=><TouchableOpacity key={m} onPress={()=>setMethod(m)} style={[styles.method,{borderColor:method===m?GOLD:BORDER,backgroundColor:method===m?'#1A2A4A':CARD}]}><Text style={{color:method===m?GOLD:TEXT,fontSize:12}}>{m}</Text></TouchableOpacity>)}</View>
            <Text style={styles.label}>Amount</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.input} /><Text style={styles.label}>Details</Text><TextInput value={account} onChangeText={setAccount} style={styles.input} placeholder="Phone or Account" placeholderTextColor="#777" /><Text style={[styles.muted,{marginHorizontal:16,marginTop:8}]}>Ads: {adsWatched}/5 - Balance: {coins}/{MIN_WITHDRAWAL}</Text><TouchableOpacity onPress={submitWithdrawal} style={[styles.primaryButton,{opacity:adsWatched<5||coins<MIN_WITHDRAWAL?0.45:1}]}><Text style={styles.primaryText}>REQUEST WITHDRAWAL</Text></TouchableOpacity><Text style={styles.sectionTitle}>History</Text>{withdrawals.map(w=><View key={w.id} style={styles.history}><View style={{flex:1}}><Text style={{color:TEXT,fontWeight:'700'}}>{w.method} - {w.amount}</Text><Text style={styles.muted}>{w.date} - {w.status}</Text></View></View>)}
          </>) : (<>
            <Text style={styles.pageTitle}>Gift Shop - {GIFT_CARDS.length} Items 🎁</Text><View style={styles.walletCard}><Text style={styles.muted}>YOUR BALANCE</Text><Text style={styles.score}>{coins.toLocaleString()}</Text><Text style={styles.naira}>{money(coins)}</Text></View>
            {GIFT_CARDS.map(item=>{ const canAfford = coins >= item.cost; return (<View key={item.id} style={styles.shopItemNew}><View style={styles.shopIcon}><Text style={{fontSize:22}}>{item.icon}</Text></View><View style={{flex:1,marginLeft:12}}><Text style={styles.leaderName}>{item.name}</Text><Text style={styles.muted}>{item.cost.toLocaleString()} coins - {money(item.cost)}</Text></View><TouchableOpacity onPress={()=>{ if (!canAfford) return Alert.alert('Need More Coins', `You need ${item.cost.toLocaleString()}`); if (adsWatched<5) return Alert.alert('Verification', 'Watch 5 ads first'); Alert.alert('Redeem?', `${item.name} for ${item.cost}?`, [{text:'Cancel'},{text:'Redeem', onPress: async()=>{ saveCoins(coins-item.cost); const w = {id:String(Date.now()), amount:item.cost, method:item.type, details:item.name, date:new Date().toLocaleDateString(), status:'Pending'}; const next=[w,...withdrawals]; setWithdrawals(next); await AsyncStorage.setItem(STORE.withdrawals, JSON.stringify(next)); Alert.alert('Success','Redeemed!'); }}]); }} style={[styles.redeemBtn,{backgroundColor:canAfford?GOLD:'#333'}]}><Text style={{color:canAfford?BG:'#777', fontWeight:'bold'}}>{canAfford?'Buy':'Low'}</Text></TouchableOpacity></View>); })}
          </>)}
      </ScrollView>
      <View style={styles.bottomTabs}>
        <TouchableOpacity onPress={()=>setScreen('home')} style={[styles.tab, screen==='home'&&styles.tabActive]}><Text style={[styles.tabText, screen==='home'&&{color:GOLD}]}>🏠 Home</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setScreen('wallet')} style={[styles.tab, screen==='wallet'&&styles.tabActive]}><Text style={[styles.tabText, screen==='wallet'&&{color:GOLD}]}>💼 Wallet</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setScreen('shop')} style={[styles.tab, screen==='shop'&&styles.tabActive]}><Text style={[styles.tabText, screen==='shop'&&{color:GOLD}]}>🎁 Shop</Text></TouchableOpacity>
      </View>
      <Modal visible={showBonusModal} transparent animationType="fade"><View style={styles.modalOverlay}><View style={styles.modalBox}><Text style={styles.modalTitle}>🎉 50 TAPS REACHED!</Text><Text style={styles.muted}>Watch ad for +100 coins or skip for +5</Text><TouchableOpacity onPress={handleWatchBonusAd} style={styles.primaryButton}><Text style={styles.primaryText}>WATCH AD +100</Text></TouchableOpacity><TouchableOpacity onPress={handleSkipBonus} style={{marginTop:10}}><Text style={{color:MUTED, textAlign:'center'}}>Skip +5 coins</Text></TouchableOpacity></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root:{flex:1, backgroundColor:BG},
  splashRoot:{flex:1, backgroundColor:BG, justifyContent:'center', alignItems:'center'},
  loginRoot:{flex:1, backgroundColor:BG, padding:20, justifyContent:'center'},
  loginBrand:{color:TEXT, fontSize:28, fontWeight:'900', textAlign:'center'},
  loginSub:{color:GOLD, textAlign:'center', marginBottom:20, fontWeight:'600'},
  loginCard:{backgroundColor:CARD, borderRadius:20, padding:20, borderWidth:1, borderColor:BORDER},
  header:{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:16, paddingTop:50, backgroundColor:BG, borderBottomWidth:1, borderBottomColor:BORDER},
  brand:{color:TEXT, fontSize:20, fontWeight:'900'},
  avatar:{backgroundColor:GOLD, paddingHorizontal:14, paddingVertical:8, borderRadius:20},
  pills:{flexDirection:'row', gap:8, padding:12},
  pill:{flex:1, backgroundColor:CARD, borderRadius:12, padding:10, alignItems:'center', borderWidth:1, borderColor:BORDER},
  pillValue:{fontWeight:'900', fontSize:16, marginTop:2},
  scoreCard:{backgroundColor:CARD, margin:16, borderRadius:20, padding:16, alignItems:'center', borderWidth:1, borderColor:BORDER},
  score:{color:GOLD, fontSize:32, fontWeight:'900'},
  naira:{color:MUTED, marginTop:4},
  tapCircle:{width:160, height:160, borderRadius:80, backgroundColor:GOLD, alignSelf:'center', marginTop:20, justifyContent:'center', alignItems:'center', borderWidth:4, borderColor:GOLD2, shadowColor:GOLD, shadowOpacity:0.5, shadowRadius:20, elevation:10},
  tapTitle:{color:BG, fontWeight:'900', fontSize:18, textAlign:'center'},
  tapSmall:{color:BG, fontSize:10, fontWeight:'700'},
  threeCards:{flexDirection:'row', gap:8, marginHorizontal:16, marginTop:16},
  action:{flex:1, backgroundColor:CARD, borderRadius:12, padding:12, alignItems:'center', borderWidth:1},
  actionTitle:{fontWeight:'900', fontSize:12},
  row:{flexDirection:'row', gap:8, marginHorizontal:16, marginTop:8},
  watch:{marginHorizontal:16, marginTop:12, borderRadius:12, padding:14, alignItems:'center'},
  watchTitle:{fontWeight:'900'},
  spin:{marginHorizontal:16, marginTop:8, backgroundColor:CARD, borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:GOLD},
  invite:{marginHorizontal:16, marginTop:8, backgroundColor:'#1A2A4A', borderRadius:12, padding:14, alignItems:'center', borderWidth:1, borderColor:GOLD},
  inviteTitle:{color:GOLD, fontWeight:'900'},
  inviteSub:{color:MUTED, fontSize:12, marginTop:2},
  pageTitle:{color:GOLD, fontSize:18, fontWeight:'900', margin:16},
  walletCard:{backgroundColor:CARD, marginHorizontal:16, borderRadius:16, padding:16, alignItems:'center', borderWidth:1, borderColor:BORDER},
  sectionTitle:{color:GOLD, fontWeight:'800', marginHorizontal:16, marginTop:16, marginBottom:8},
  methodRow:{flexDirection:'row', flexWrap:'wrap', gap:8, marginHorizontal:16},
  method:{paddingHorizontal:12, paddingVertical:8, borderRadius:20, borderWidth:1},
  label:{color:GOLD, marginHorizontal:16, marginTop:12, fontWeight:'700', fontSize:12},
  input:{backgroundColor:CARD, borderWidth:1, borderColor:BORDER, borderRadius:12, padding:12, color:TEXT, marginHorizontal:16, marginTop:6},
  primaryButton:{backgroundColor:GOLD, borderRadius:12, padding:14, alignItems:'center', marginHorizontal:16, marginTop:12},
  primaryText:{color:BG, fontWeight:'900'},
  history:{backgroundColor:CARD, marginHorizontal:16, marginTop:8, borderRadius:12, padding:12, flexDirection:'row', borderWidth:1, borderColor:BORDER},
  muted:{color:MUTED, fontSize:12},
  shopItemNew:{flexDirection:'row', alignItems:'center', backgroundColor:CARD, marginHorizontal:16, marginTop:8, borderRadius:14, padding:12, borderWidth:1, borderColor:BORDER},
  shopIcon:{width:44, height:44, borderRadius:22, backgroundColor:BG, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:BORDER},
  leaderName:{color:TEXT, fontWeight:'700'},
  redeemBtn:{paddingHorizontal:16, paddingVertical:8, borderRadius:20},
  bottomTabs:{flexDirection:'row', backgroundColor:'#08162E', borderTopWidth:1, borderTopColor:BORDER, paddingBottom:10, paddingTop:8},
  tab:{flex:1, alignItems:'center', paddingVertical:6, borderRadius:12, marginHorizontal:4},
  tabActive:{backgroundColor:'#112240'},
  tabText:{color:MUTED, fontWeight:'700', fontSize:12},
  modalOverlay:{flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center'},
  modalBox:{backgroundColor:CARD, borderRadius:20, padding:20, width:'85%', borderWidth:1, borderColor:GOLD, alignItems:'center'},
  modalTitle:{color:GOLD, fontSize:18, fontWeight:'900', marginBottom:8},
});
