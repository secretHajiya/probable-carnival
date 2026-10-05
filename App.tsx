import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Animated, ScrollView, Share, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import mobileAds, { AdEventType, BannerAd, BannerAdSize, InterstitialAd, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

const IDS = {
  appId: 'ca-app-pub-9958539812897899~1555539022',
  banner: 'ca-app-pub-9958539812897899/2677972441',
  interstitial: 'ca-app-pub-9958539812897899/4358011936',
  rewarded: 'ca-app-pub-9958539812897899/7027357556',
};

const STORE = { coins: 'vyra.coins', streak: 'vyra.streak', lastCheckin: 'vyra.lastCheckin', ads: 'vyra.adsWatched', spin: 'vyra.spinDate', scratch: 'vyra.scratch', withdrawals: 'vyra.withdrawals', referral: 'vyra.referral', user: 'vyra.user', isLoggedIn: 'vyra.isLoggedIn', tapCount: 'vyra.tapCount' };
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
  const [splash, setSplash] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
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
  const [interLoaded, setInterLoaded] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [method, setMethod] = useState('Airtime - MTN');
  const [amount, setAmount] = useState('100000');
  const [phone, setPhone] = useState('');
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const [tapCount, setTapCount] = useState(0);
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
        setTapCount(Number(data[STORE.tapCount] || 0));
        if (data[STORE.user]) { const u = JSON.parse(data[STORE.user]); setUserPhone(u.phone || u.email); if(u.fullName) setFullName(u.fullName); }
      } catch {}
      setTimeout(()=>setSplash(false), 1200);
    })();
    const i1 = interstitial.addAdEventListener(AdEventType.LOADED, () => setInterLoaded(true));
    const i2 = interstitial.addAdEventListener(AdEventType.CLOSED, () => { setInterLoaded(false); interstitial.load(); });
    const i3 = interstitial.addAdEventListener(AdEventType.ERROR, () => { setTimeout(()=>interstitial.load(), 3000); });
    const r1 = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => setRewardLoaded(true));
    const r2 = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      setCoins(c => { const n = c + 100; AsyncStorage.setItem(STORE.coins, String(n)); return n; });
      setAdsWatched(c => { const n = c + 1; AsyncStorage.setItem(STORE.ads, String(n)); return n; });
      Alert.alert('Bonus', '+100 coins for watching Ad!');
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
    if (!netState.isConnected) return Alert.alert("No Internet", "Please turn on data to receive OTP");
    if (!fullName || fullName.length < 3) return Alert.alert('Required', 'Enter your full name');
    if (!loginPhone &&!loginEmail) return Alert.alert('Required', 'Enter phone number or email');
    if (loginPhone && loginPhone.length < 11) return Alert.alert('Invalid', 'Phone number must be 11 digits');
    if (loginEmail &&!loginEmail.includes('@')) return Alert.alert('Invalid', 'Enter valid email address');
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setOtpSent(true);
    Alert.alert('OTP Code', `Your verification code is: ${code}\n\nSent to: ${loginPhone || loginEmail}`);
  };

  const verifyOtpAndLogin = async () => {
    if (enteredOtp!== generatedOtp) return Alert.alert('Invalid Code', 'Incorrect OTP, please try again');
    await AsyncStorage.setItem(STORE.user, JSON.stringify({ phone: loginPhone, email: loginEmail, fullName }));
    await AsyncStorage.setItem(STORE.isLoggedIn, 'true');
    setUserPhone(loginPhone || loginEmail);
    setIsLoggedIn(true);
    setOtpSent(false);
    setEnteredOtp('');
  };

  const saveCoins = (n: number) => { setCoins(n); AsyncStorage.setItem(STORE.coins, String(n)); };
  const addCoins = (n: number) => saveCoins(coins + n);

  const handleTap = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;
    const newCoins = coins + 1;
    saveCoins(newCoins);
    const newCount = tapCount + 1;
    setTapCount(newCount);
    await AsyncStorage.setItem(STORE.tapCount, String(newCount));
    if (newCount >= 50) {
      setTapCount(0);
      await AsyncStorage.setItem(STORE.tapCount, '0');
      if (rewardLoaded) { setAdBusy(true); rewarded.show().catch(()=>{ setAdBusy(false); }); }
      else if (interLoaded) { interstitial.show().catch(()=>{}); }
      else { saveCoins(newCoins + 100); }
     const watchAd = () => { if (!rewardLoaded || adBusy) return; setAdBusy(true); setRewardLoaded(false); rewarded.show().catch(() => { setAdBusy(false); rewarded.load(); }); };
  const checkin = async () => {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return Alert.alert("No Internet", "Turn on data for check-in");
    if (lastCheckin === todayKey()) return Alert.alert('Already claimed', 'Come back tomorrow');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const nextStreak = lastCheckin === yesterday? (streak % 7) + 1 : 1;
    const reward = streakRewards[nextStreak - 1];
    setStreak(nextStreak); setLastCheckin(todayKey()); saveCoins(coins + reward);
    await AsyncStorage.multiSet([[STORE.streak, String(nextStreak)], [STORE.lastCheckin, todayKey()]]);
    if (interLoaded) interstitial.show();
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
    if (count >= 3) return Alert.alert('Limit Reached', '3 scratches per day');
    const reward = Math.floor(10 + Math.random() * 41);
    await AsyncStorage.setItem(STORE.scratch, `${todayKey()}:${count+1}`);
    setScratchCount(count+1); addCoins(reward); Alert.alert('Scratch', `+${reward} coins!`);
  };
  const invite = async () => { try { await Share.share({ message: `Join Vyra Rewards! Use my code: ${referral}` }); } catch {} };
  const submitWithdrawal = async () => {
    const value = Number(amount);
    if (adsWatched < 5) return Alert.alert('Verification Required', 'Please watch 5 ads first to verify');
    if (!value || value < MIN_WITHDRAWAL || value > coins) return Alert.alert('Invalid Amount', `Minimum is ${MIN_WITHDRAWAL.toLocaleString()} coins`);
    let details = method.startsWith('Airtime')? phone : method === 'Bank Transfer'? `${bank} / ${account}` : account;
    if (!details.trim()) return Alert.alert('Missing Details', 'Enter withdrawal details');
    const item = { id: String(Date.now()), amount: value, method, details, date: new Date().toLocaleDateString(), status: 'Pending' };
    const next = [item,...withdrawals];
    setWithdrawals(next); await AsyncStorage.setItem(STORE.withdrawals, JSON.stringify(next));
    saveCoins(coins - value); Alert.alert('Submitted', 'Withdrawal request pending - 24h review.');
  };

  if (splash) {
    return (
      <View style={styles.splashRoot}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <Text style={{fontSize:60}}>⚡</Text>
        <Text style={styles.brand}>VYRA <Text style={{color:GREEN}}>REWARDS</Text></Text>
        <Text style={styles.muted}>Loading...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.loginRoot}>
        <StatusBar barStyle="light-content" backgroundColor={BG} />
        <Text style={styles.loginBrand}>VYRA <Text style={{color:GREEN}}>REWARDS</Text></Text>
        <Text style={styles.loginSub}>Create Account - Secure OTP Verification</Text>
        <View style={styles.loginCard}>
          {!otpSent? (
            <>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput value={fullName} onChangeText={setFullName} style={styles.input} placeholder="John Doe" placeholderTextColor="#777" />
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput value={loginPhone} onChangeText={setLoginPhone} keyboardType="phone-pad" style={styles.input} placeholder="08012345678" placeholderTextColor="#777" maxLength={11} />
              <Text style={styles.label}>Email Address *</Text>
              <TextInput value={loginEmail} onChangeText={setLoginEmail} keyboardType="email-address" style={styles.input} placeholder="example@gmail.com" placeholderTextColor="#777" autoCapitalize="none" />
              <TouchableOpacity onPress={sendOtp} style={styles.primaryButton}><Text style={styles.primaryText}>CREATE ACCOUNT & SEND OTP</Text></TouchableOpacity>
              <Text style={[styles.muted,{textAlign:'center',marginTop:12}]}>We will send you a 4-digit verification code</Text>
            </>
          ) : (
            <>
              <Text style={[styles.muted,{textAlign:'center',marginBottom:10}]}>Code sent to {loginPhone || loginEmail}</Text>
              <Text style={styles.label}>Enter OTP Code</Text>
              <TextInput value={enteredOtp} onChangeText={setEnteredOtp} keyboardType="number-pad" style={[styles.input,{fontSize:22, letterSpacing:10, textAlign:'center', fontWeight:'900'}]} placeholder="1234" placeholderTextColor="#777" maxLength={4} />
              <TouchableOpacity onPress={verifyOtpAndLogin} style={styles.primaryButton}><Text style={styles.primaryText}>VERIFY & CONTINUE</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>setOtpSent(false)} style={{marginTop:12}}><Text style={{color:GOLD, textAlign:'center', fontWeight:'700'}}>Change Details</Text></TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const Pill = ({ text, value, color = GREEN }: any) => (<View style={styles.pill}><Text style={styles.muted}>{text}</Text><Text style={[styles.pillValue,{color}]}>{value}</Text></View>);
  const Action = ({ title, subtitle, onPress, color = GREEN, disabled = false }: any) => (<TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.action,{borderColor:color,opacity:disabled?0.5:1}]}><Text style={[styles.actionTitle,{color}]}>{title}</Text>{subtitle? <Text style={styles.muted}>{subtitle}</Text> : null}</TouchableOpacity>);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />
      <View style={styles.header}><View><Text style={styles.brand}>VYRA <Text style={{color:GREEN}}>REWARDS</Text></Text><Text style={styles.muted}>{userPhone} • 20 coins = ₦1</Text></View><TouchableOpacity onPress={async()=>{await AsyncStorage.removeItem(STORE.isLoggedIn); setIsLoggedIn(false);}} style={styles.avatar}><Text style={{color:GOLD,fontWeight:'900'}}>LOGOUT</Text></TouchableOpacity></View>
      <View style={styles.pills}><Pill text="WALLET" value={`${coins.toLocaleString()} 🪙`} /><Pill text="MIN" value={`₦5K`} color={GOLD} /><Pill text="RATE" value={`${COINS_PER_NAIRA}/₦1`} color={GOLD} /></View>
      <ScrollView contentContainerStyle={{paddingBottom:120}} showsVerticalScrollIndicator={false}>
        {screen === 'home'? <>
          <View style={styles.scoreCard}><Text style={styles.muted}>TOTAL SCORE</Text><Text style={styles.score}>{coins.toLocaleString()}</Text><Text style={styles.naira}>{money(coins)} • Need {MIN_WITHDRAWAL.toLocaleString()} for ₦5 }
  };
    banner:{height:60,alignItems:'center',justifyContent:'center',backgroundColor:BG},
  pageTitle:{fontSize:22,fontWeight:'900',color:TEXT,margin:16},
  walletCard:{backgroundColor:CARD,borderRadius:16,marginHorizontal:14,padding:18,alignItems:'center', borderWidth:1, borderColor:BORDER},
  label:{color:MUTED,fontSize:12,marginHorizontal:16,marginTop:12,marginBottom:5},
  methodRow:{flexDirection:'row',flexWrap:'wrap',gap:7,marginHorizontal:14},
  method:{borderWidth:1,borderRadius:9,padding:9},
  input:{marginHorizontal:14,backgroundColor:CARD,borderRadius:10,padding:12,color:TEXT,borderWidth:1,borderColor:BORDER, marginTop:4},
  primaryButton:{marginHorizontal:14,marginTop:14,backgroundColor:GREEN,borderRadius:12,padding:14,alignItems:'center'},
  primaryText:{color:BG,fontWeight:'900'},
  history:{flexDirection:'row',alignItems:'center',marginHorizontal:14,marginTop:8,padding:12,backgroundColor:CARD,borderRadius:10, borderWidth:1, borderColor:BORDER},
  shopItemNew:{flexDirection:'row',alignItems:'center',marginHorizontal:14,marginTop:8,padding:14,backgroundColor:CARD,borderRadius:12,borderWidth:1,borderColor:BORDER},
  shopIcon:{width:48,height:48,borderRadius:12,backgroundColor:'#2A2A40',alignItems:'center',justifyContent:'center'},
  redeemButton:{paddingHorizontal:14,paddingVertical:8,borderRadius:8},
  redeemText:{fontWeight:'900',fontSize:11,color:BG},
  navItem:{flex:1, alignItems:'center'}
});
