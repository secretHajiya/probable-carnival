import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Alert, ScrollView,
  StyleSheet, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import mobileAds, {
  AdEventType,
  BannerAd,
  BannerAdSize,
  RewardedAd,
  RewardedAdEventType,
  InterstitialAd,
  TestIds
} from 'react-native-google-mobile-ads';

const VERSION = '1.0.3';
const BUILD = 4;
const VERSION_CODE = 4;

// IDs copied from the user's AdMob screenshots.
const ADMOB_BANNER_ID = 'ca-app-pub-4487679675698542/5498846987';
const ADMOB_INTERSTITIAL_ID = 'ca-app-pub-4487679675698542/7002308379';
const ADMOB_REWARDED_ID = 'ca-app-pub-4487679675698542/9277117923';

// Always use Google's test ad IDs in development. Real IDs are used only in production builds.
const isDevelopment = __DEV__;
const bannerUnitId = isDevelopment ? TestIds.BANNER : ADMOB_BANNER_ID;
const interstitialUnitId = isDevelopment ? TestIds.INTERSTITIAL : ADMOB_INTERSTITIAL_ID;
const rewardedUnitId = isDevelopment ? TestIds.REWARDED : ADMOB_REWARDED_ID;

const RATE = 20;
const MIN_WITHDRAW = 100000;

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState('');
  const [genOtp, setGenOtp] = useState('');
  const [coins, setCoins] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [surveyStep, setSurveyStep] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);

  const rewardedAd = useMemo(
    () => RewardedAd.createForAdRequest(rewardedUnitId, {
      requestNonPersonalizedAdsOnly: true
    }),
    []
  );

  const interstitialAd = useMemo(
    () => InterstitialAd.createForAdRequest(interstitialUnitId, {
      requestNonPersonalizedAdsOnly: true
    }),
    []
  );

  useEffect(() => {
    mobileAds().initialize().catch(() => {});
    (async () => {
      const net = await NetInfo.fetch();
      if (!net.isConnected) Alert.alert('Internet Required', 'Please enable data.');
      const c = await AsyncStorage.getItem('c');
      const t = await AsyncStorage.getItem('t');
      const tt = await AsyncStorage.getItem('tt');
      const ct = await AsyncStorage.getItem('ct');
      const bp = await AsyncStorage.getItem('bonusPoints');
      const savedUser = await AsyncStorage.getItem('user');
      if (c) setCoins(parseInt(c, 10) || 0);
      if (t) setTapCount(parseInt(t, 10) || 0);
      if (tt) setTotalTaps(parseInt(tt, 10) || 0);
      if (ct) {
        try { setCompletedTasks(JSON.parse(ct)); } catch {}
      }
      if (bp) setBonusPoints(parseInt(bp, 10) || 0);
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); } catch {}
      }
      setTimeout(() => setScreen(savedUser ? 'home' : 'register'), 800);
    })();
  }, []);

  useEffect(() => {
    const unsubLoaded = rewardedAd.addAdEventListener(
      RewardedAdEventType.LOADED, () => setRewardedLoaded(true)
    );
    const unsubEarned = rewardedAd.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD, () => {
        // In-app bonus points only. They are separate from wallet coins and cannot be withdrawn/exchanged.
        setBonusPoints(prev => {
          const next = prev + 10;
          AsyncStorage.setItem('bonusPoints', String(next)).catch(() => {});
          return next;
        });
        Alert.alert('Bonus received', '+10 in-app bonus points added. These points have no cash or shopping value.');
      }
    );
    const unsubClosed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      rewardedAd.load();
    });
    const unsubError = rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
      setRewardedLoaded(false);
    });
    rewardedAd.load();
    return () => {
      unsubLoaded(); unsubEarned(); unsubClosed(); unsubError();
    };
  }, [rewardedAd]);

  useEffect(() => {
    const unsubLoaded = interstitialAd.addAdEventListener(
      AdEventType.LOADED, () => setInterstitialLoaded(true)
    );
    const unsubClosed = interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      setInterstitialLoaded(false);
      interstitialAd.load();
    });
    const unsubError = interstitialAd.addAdEventListener(AdEventType.ERROR, () => {
      setInterstitialLoaded(false);
    });
    interstitialAd.load();
    return () => { unsubLoaded(); unsubClosed(); unsubError(); };
  }, [interstitialAd]);

  const save = async (key: string, value: unknown) => {
    await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  };

  const addCoins = (num: number) => {
    setCoins(prev => {
      const next = prev + num;
      save('c', String(next)).catch(() => {});
      return next;
    });
  };

  const checkNet = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('Internet Required', 'Turn on mobile data or Wi-Fi.');
      return false;
    }
    return true;
  };

  const createAcc = async () => {
    if (!(await checkNet())) return;
    if (!user.name.trim() || !user.phone.trim() || !user.email.trim()) {
      Alert.alert('Error', 'Fill all fields.');
      return;
    }
    // NOTE: This is a local demo OTP, not real SMS/email verification.
    const p = Math.floor(1000 + Math.random() * 9000).toString();
    setGenOtp(p);
    setScreen('verify');
    Alert.alert('Demo verification', 'This demo generates the code locally; it does not send an SMS or email.');
  };

  const verify = async () => {
    if (otp !== genOtp) {
      Alert.alert('Invalid OTP', 'Enter the code displayed on this demo screen.');
      return;
    }
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setScreen('home');
  };

  const watchAd = async () => {
    if (!(await checkNet())) return;
    if (!rewardedLoaded) {
      Alert.alert('Ad not ready', 'Please wait a moment and try again.');
      rewardedAd.load();
      return;
    }
    try {
      await rewardedAd.show();
    } catch {
      Alert.alert('Ad unavailable', 'Please try again later.');
    }
  };

  const showInterstitial = () => {
    if (interstitialLoaded) {
      interstitialAd.show().catch(() => {});
    }
  };

  const onTap = async () => {
    if (!(await checkNet())) return;
    addCoins(1);
    const nt = tapCount + 1;
    const ntt = totalTaps + 1;
    setTapCount(nt);
    setTotalTaps(ntt);
    save('t', String(nt)).catch(() => {});
    save('tt', String(ntt)).catch(() => {});
    if (nt >= 50) {
      setTapCount(0);
      save('t', '0').catch(() => {});
      Alert.alert('Tap bonus', 'You reached 50 taps. You can try a rewarded ad for separate in-app bonus points.', [
        { text: 'Watch rewarded ad', onPress: watchAd },
        { text: 'Skip' }
      ]);
    }
  };

  const completeTask = (id: string, reward: number) => {
    if (completedTasks.includes(id)) {
      Alert.alert('Done', 'Task already marked complete.');
      return;
    }
    Alert.alert(
      'Task verification needed',
      'This demo cannot verify that an offer was actually completed. Do not award or promise real-value rewards until you add a trusted offer provider and server-side verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark demo complete',
          onPress: () => {
            addCoins(reward);
            const list = [...completedTasks, id];
            setCompletedTasks(list);
            save('ct', list).catch(() => {});
          }
        }
      ]
    );
  };

  const ngn = (coins / RATE).toFixed(2);
  const VersionTag = () => (
    <View style={s.verBox}>
      <Text style={s.verText}>Vyra Rewards v{VERSION} (Build #{BUILD}) • VC #{VERSION_CODE}</Text>
      <Text style={s.verSub}>AdMob integration build • Monetag Direct Link removed</Text>
    </View>
  );

  const Head = () => (
    <View style={s.head}>
      <View>
        <Text style={s.logoSm}>👑 VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text> v{VERSION}</Text>
        <Text style={{ color: '#94a3b8', fontSize: 11 }}>{user.phone} • 20 coins = NGN 1</Text>
      </View>
      <TouchableOpacity style={s.out} onPress={() => { setScreen('register'); setOtp(''); }}>
        <Text style={{ fontWeight: '900' }}>OUT</Text>
      </TouchableOpacity>
    </View>
  );

  const Banner = () => (
    <View style={s.banner}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => {}}
      />
    </View>
  );

  if (screen === 'loading') {
    return <View style={s.load}><Text style={{ fontSize: 50 }}>👑</Text><Text style={s.logo}>VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text><ActivityIndicator color="#facc15" style={{ marginTop: 16 }} /><VersionTag /></View>;
  }

  if (screen === 'register') {
    return (
      <ScrollView contentContainerStyle={s.cont}>
        <Text style={s.logo}>VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text>
        <Text style={s.sub}>Premium Earn • v{VERSION}</Text>
        <View style={s.card}>
          <Text style={s.lab}>Full Name *</Text>
          <TextInput style={s.inp} placeholder="Full name" placeholderTextColor="#64748b" onChangeText={v => setUser({ ...user, name: v })} value={user.name} />
          <Text style={s.lab}>Phone *</Text>
          <TextInput style={s.inp} placeholder="080..." keyboardType="phone-pad" placeholderTextColor="#64748b" onChangeText={v => setUser({ ...user, phone: v })} value={user.phone} />
          <Text style={s.lab}>Email *</Text>
          <TextInput style={s.inp} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#64748b" onChangeText={v => setUser({ ...user, email: v })} value={user.email} />
          <TouchableOpacity style={s.yBtn} onPress={createAcc}><Text style={s.yTxt}>CREATE ACCOUNT</Text></TouchableOpacity>
          <VersionTag />
        </View>
      </ScrollView>
    );
  }

  if (screen === 'verify') {
    return (
      <View style={s.cont}>
        <Text style={s.logo}>VERIFY DEMO CODE</Text>
        <View style={s.card}>
          <Text style={{ color: '#facc15', textAlign: 'center', fontWeight: '900', fontSize: 18 }}>DEMO CODE: {genOtp}</Text>
          <TextInput style={[s.inp, { textAlign: 'center', fontSize: 20, marginTop: 16 }]} maxLength={4} keyboardType="number-pad" placeholder="Enter code" placeholderTextColor="#64748b" value={otp} onChangeText={setOtp} />
          <TouchableOpacity style={s.yBtn} onPress={verify}><Text style={s.yTxt}>VERIFY & CONTINUE</Text></TouchableOpacity>
          <VersionTag />
        </View>
      </View>
    );
  }

  const tasks: [string, string, string, number][] = [
    ['GTBank', 'GTWorld App - offer details required', 'GTB80', 80],
    ['PalmPay', 'PalmPay - offer details required', 'PALM100', 100],
    ['FairMoney', 'FairMoney - offer details required', 'FAIR90', 90],
    ['Binance', 'Binance - offer details required', 'BIN120', 120],
    ['PiggyVest', 'PiggyVest - offer details required', 'PIGGY80', 80],
    ['Moniepoint', 'Moniepoint - offer details required', 'MONIE100', 100],
    ['Flutterwave', 'Flutterwave - offer details required', 'FLUT70', 70],
    ['OPay', 'OPay - offer details required', 'OPAY80', 80],
    ['Kuda', 'Kuda - offer details required', 'KUDA80', 80],
    ['Carbon', 'Carbon - offer details required', 'CARB70', 70]
  ];

  return (
    <ScrollView style={s.main} contentContainerStyle={{ paddingBottom: 110 }}>
      <Head />
      <View style={s.r3}>
        <View style={s.mc}><Text style={s.ml}>WALLET COINS</Text><Text style={s.mv}>{coins}</Text></View>
        <View style={s.mc}><Text style={s.ml}>MIN WITHDRAW</Text><Text style={s.mv}>NGN 5K</Text></View>
        <View style={s.mc}><Text style={s.ml}>VERSION</Text><Text style={s.mv}>{VERSION}</Text></View>
      </View>

      {screen === 'home' && <>
        <View style={s.tot}>
          <Text style={s.ml}>WALLET BALANCE</Text>
          <Text style={{ color: '#facc15', fontSize: 36, fontWeight: '900' }}>{coins}</Text>
          <Text style={{ color: '#94a3b8' }}>NGN {ngn} • Need {Math.max(0, MIN_WITHDRAW - coins)} coins for threshold</Text>
        </View>
        <View style={s.tot}>
          <Text style={s.ml}>IN-APP BONUS POINTS (NOT CASHABLE)</Text>
          <Text style={{ color: '#facc15', fontSize: 28, fontWeight: '900' }}>{bonusPoints}</Text>
          <Text style={{ color: '#94a3b8', textAlign: 'center' }}>Bonus points cannot be withdrawn or exchanged for money, airtime, gift cards, shopping, or other items of value.</Text>
        </View>
        <View style={s.prog}>
          <Text style={{ color: '#facc15', fontWeight: '900', textAlign: 'center' }}>{tapCount}/50 taps</Text>
          <View style={s.pb}><View style={[s.pf, { width: `${(tapCount / 50) * 100}%` }]} /></View>
        </View>
        <TouchableOpacity style={s.tap} onPress={onTap}><Text style={{ fontWeight: '900' }}>VYRA</Text><Text style={{ fontWeight: '900', fontSize: 20 }}>TAP TO{'\n'}EARN</Text><Text style={{ fontWeight: '900' }}>+1 COIN</Text></TouchableOpacity>
        <TouchableOpacity style={s.gb} onPress={watchAd}><Text style={s.gbt}>{rewardedLoaded ? 'WATCH REWARDED AD • +10 IN-APP BONUS POINTS' : 'REWARDED AD LOADING...'}</Text></TouchableOpacity>
        <TouchableOpacity style={s.abf} onPress={() => setScreen('tasks')}><Text style={s.abt}>TASKS & OFFERS</Text></TouchableOpacity>
        <TouchableOpacity style={s.abf} onPress={() => setScreen('survey')}><Text style={s.abt}>SURVEYS</Text></TouchableOpacity>
        <TouchableOpacity style={s.abf} onPress={() => setScreen('wallet')}><Text style={s.abt}>WALLET</Text></TouchableOpacity>
        <TouchableOpacity style={s.abf} onPress={() => setScreen('shop')}><Text style={s.abt}>SHOP</Text></TouchableOpacity>
        <Banner />
      </>}

      {screen === 'tasks' && <>
        <Text style={s.sec}>TASKS • DEMO LIST</Text>
        <Text style={s.note}>Tasks below are placeholders. Connect a legitimate offer provider and verify completions on a secure server before awarding redeemable coins.</Text>
        {tasks.map(t => (
          <View key={t[2]} style={s.shop}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{t[0]}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 11 }}>{t[1]}</Text>
              <Text style={{ color: '#facc15', fontSize: 10 }}>Demo reward: {t[3]} wallet coins</Text>
            </View>
            <TouchableOpacity style={[s.yBtn, { padding: 8, marginTop: 0 }]} onPress={() => completeTask(t[2], t[3])}><Text style={[s.yTxt, { fontSize: 10 }]}>{completedTasks.includes(t[2]) ? 'DONE' : 'DETAILS'}</Text></TouchableOpacity>
          </View>
        ))}
      </>}

      {screen === 'survey' && <>
        <Text style={s.sec}>SURVEY • DEMO</Text>
        <View style={s.card}>
          <Text style={{ color: '#facc15', fontWeight: '900', fontSize: 16 }}>Question {surveyStep + 1}/3</Text>
          {surveyStep === 0 && <><Text style={s.question}>How often do you use banking apps?</Text><TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(1)}><Text style={s.yTxt}>Daily</Text></TouchableOpacity><TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(1)}><Text style={s.yTxt}>Weekly</Text></TouchableOpacity></>}
          {surveyStep === 1 && <><Text style={s.question}>Which wallet do you prefer?</Text><TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(2)}><Text style={s.yTxt}>OPay</Text></TouchableOpacity><TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(2)}><Text style={s.yTxt}>PalmPay</Text></TouchableOpacity></>}
          {surveyStep === 2 && <><Text style={s.question}>Rate Vyra Rewards (demo)</Text><TouchableOpacity style={s.yBtn} onPress={() => { setSurveyStep(0); setScreen('home'); Alert.alert('Survey demo', 'This demo survey does not award redeemable coins.'); }}><Text style={s.yTxt}>5 Stars ⭐⭐⭐⭐⭐</Text></TouchableOpacity></>}
        </View>
      </>}

      {screen === 'wallet' && <>
        <Text style={s.sec}>WALLET • DEMO</Text>
        <View style={s.card}>
          <Text style={s.question}>Current balance: {coins} coins (NGN {ngn} estimated display only)</Text>
          <Text style={s.note}>Withdrawal requests are not connected to a payment backend in this demo. Do not promise or send payouts until you implement secure server-side balance and transaction validation.</Text>
          <Text style={s.lab}>Amount</Text><TextInput style={s.inp} placeholder="Amount" keyboardType="numeric" placeholderTextColor="#94a3b8" />
          <Text style={s.lab}>Payment details</Text><TextInput style={s.inp} placeholder="Phone/account" placeholderTextColor="#94a3b8" />
          <TouchableOpacity style={s.yBtn} onPress={() => Alert.alert('Not available', 'Withdrawal is a demo only; no payout backend is connected.')}><Text style={s.yTxt}>REQUEST WITHDRAWAL (DEMO)</Text></TouchableOpacity>
        </View>
      </>}

      {screen === 'shop' && <>
        <Text style={s.sec}>SHOP • DISPLAY ONLY</Text>
        {[
          ['📱', 'MTN airtime', '20k coins'],
          ['📱', 'Airtel airtime', '20k coins'],
          ['🎮', 'Google Play gift card', '50k coins'],
          ['🛒', 'Shopping reward', '100k coins'],
          ['💰', 'OPay reward', '40k coins']
        ].map((item, i) => (
          <View key={i} style={s.shop}><Text style={{ fontSize: 20 }}>{item[0]}</Text><View style={{ flex: 1, marginLeft: 10 }}><Text style={{ color: '#fff', fontWeight: '700' }}>{item[1]}</Text><Text style={{ color: '#94a3b8', fontSize: 11 }}>{item[2]}</Text></View><Text style={s.lowText}>DEMO</Text></View>
        ))}
        <Text style={s.note}>Shop items are placeholders. Keep AdMob bonus points separate from any redeemable wallet balance.</Text>
      </>}

      <View style={s.bottom}>
        {['home', 'tasks', 'survey', 'wallet', 'shop'].map(name => (
          <TouchableOpacity key={name} onPress={() => {
            if (name !== screen && name !== 'home') showInterstitial();
            setScreen(name);
          }}>
            <Text style={[s.bTxt, screen === name && { color: '#facc15' }]}>{name[0].toUpperCase() + name.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <VersionTag />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  cont: { flexGrow: 1, backgroundColor: '#0a1931', padding: 20, justifyContent: 'center' },
  load: { flex: 1, backgroundColor: '#0a1931', alignItems: 'center', justifyContent: 'center', padding: 20 },
  logo: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  sub: { color: '#facc15', textAlign: 'center', marginBottom: 18 },
  card: { backgroundColor: '#132a4f', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#facc1530', marginTop: 12 },
  lab: { color: '#facc15', marginTop: 10, fontWeight: '700', fontSize: 12 },
  inp: { backgroundColor: '#0f2342', borderWidth: 1, borderColor: '#facc1530', borderRadius: 10, padding: 12, color: '#fff', marginTop: 6 },
  yBtn: { backgroundColor: '#facc15', padding: 14, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  yTxt: { color: '#0a1931', fontWeight: '900', textAlign: 'center' },
  main: { flex: 1, backgroundColor: '#0a1931', padding: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ffffff15' },
  logoSm: { color: '#fff', fontWeight: '900' },
  out: { backgroundColor: '#facc15', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  r3: { flexDirection: 'row', marginTop: 10 },
  mc: { backgroundColor: '#132a4f', flex: 1, margin: 3, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' },
  ml: { color: '#94a3b8', fontSize: 11, textAlign: 'center' },
  mv: { color: '#facc15', fontWeight: '900', marginTop: 4 },
  tot: { backgroundColor: '#132a4f', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#facc1530' },
  prog: { backgroundColor: '#132a4f', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#ffffff10' },
  pb: { height: 7, backgroundColor: '#0a1931', borderRadius: 4, marginTop: 6 },
  pf: { height: 7, backgroundColor: '#facc15', borderRadius: 4 },
  tap: { backgroundColor: '#facc15', width: 190, height: 190, borderRadius: 95, alignSelf: 'center', marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  gb: { backgroundColor: '#2a344e', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  gbt: { color: '#facc15', fontWeight: '700', fontSize: 11, textAlign: 'center' },
  abf: { backgroundColor: '#132a4f', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#facc15' },
  abt: { color: '#facc15', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  sec: { color: '#facc15', fontWeight: '900', marginTop: 14, marginBottom: 8 },
  shop: { flexDirection: 'row', backgroundColor: '#132a4f', padding: 12, borderRadius: 10, marginTop: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' },
  bottom: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#132a4f', padding: 12, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#facc1530' },
  bTxt: { color: '#94a3b8', fontWeight: '700', fontSize: 11 },
  verBox: { backgroundColor: '#0f2342', padding: 8, borderRadius: 8, marginTop: 12, alignItems: 'center', borderWidth: 1, borderColor: '#facc1520' },
  verText: { color: '#facc15', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  verSub: { color: '#94a3b8', fontSize: 8, textAlign: 'center', marginTop: 2 },
  banner: { alignItems: 'center', marginTop: 12, minHeight: 50 },
  note: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  question: { color: '#fff', marginTop: 12, lineHeight: 20 },
  lowText: { color: '#facc15', fontSize: 10, fontWeight: '900' }
});
