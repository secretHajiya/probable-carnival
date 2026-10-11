import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Alert, ScrollView,
  StyleSheet, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import mobileAds, {
  AdEventType, BannerAd, BannerAdSize, RewardedAd,
  RewardedAdEventType, TestIds
} from 'react-native-google-mobile-ads';

const VERSION = '1.0.4';
const BUILD = 5;
const BANNER_ID = 'ca-app-pub-4487679675698542/5498846987';
const REWARDED_ID = 'ca-app-pub-4487679675698542/9277117923';
const bannerUnitId = __DEV__ ? TestIds.BANNER : BANNER_ID;
const rewardedUnitId = __DEV__ ? TestIds.REWARDED : REWARDED_ID;

const TASKS = [
  ['GTB80', 'GTBank / GTWorld'], ['PALM100', 'PalmPay'],
  ['FAIR90', 'FairMoney'], ['BIN120', 'Binance'],
  ['PIGGY80', 'PiggyVest'], ['MONIE100', 'Moniepoint'],
  ['FLUT70', 'Flutterwave'], ['OPAY80', 'OPay'],
  ['KUDA80', 'Kuda'], ['CARB70', 'Carbon'],
];

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [bonusPoints, setBonusPoints] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [surveyStep, setSurveyStep] = useState(0);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [adMessage, setAdMessage] = useState('Loading rewarded ad…');
  const [rewardedAd] = useState(() => RewardedAd.createForAdRequest(rewardedUnitId, {
    requestNonPersonalizedAdsOnly: true,
  }));

  useEffect(() => {
    let active = true;
    mobileAds().initialize().catch(() => {});
    (async () => {
      try {
        const savedUser = await AsyncStorage.getItem('vyra_user');
        const savedBonus = await AsyncStorage.getItem('vyra_bonus_points');
        const savedTap = await AsyncStorage.getItem('vyra_tap_count');
        const savedTotal = await AsyncStorage.getItem('vyra_total_taps');
        if (!active) return;
        if (savedUser) {
          try { setUser(JSON.parse(savedUser)); } catch { await AsyncStorage.removeItem('vyra_user'); }
        }
        setBonusPoints(parseInt(savedBonus || '0', 10) || 0);
        setTapCount(parseInt(savedTap || '0', 10) || 0);
        setTotalTaps(parseInt(savedTotal || '0', 10) || 0);
        const net = await NetInfo.fetch();
        if (!net.isConnected) Alert.alert('Internet required', 'Turn on Wi-Fi or mobile data to load ads.');
        setScreen(savedUser ? 'home' : 'register');
      } catch {
        if (active) setScreen('register');
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const loaded = rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      setRewardedLoaded(true);
      setAdMessage('Watch ad for +10 bonus points');
    });
    const earned = rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      setBonusPoints(prev => {
        const next = prev + 10;
        AsyncStorage.setItem('vyra_bonus_points', String(next)).catch(() => {});
        return next;
      });
      Alert.alert('Bonus received', '10 in-app points added. They have no cash, airtime, gift-card, or shopping value.');
    });
    const closed = rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      setRewardedLoaded(false);
      setAdMessage('Loading rewarded ad…');
      rewardedAd.load();
    });
    const error = rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
      setRewardedLoaded(false);
      setAdMessage('Ad unavailable. Check internet and try again.');
    });
    rewardedAd.load();
    return () => { loaded(); earned(); closed(); error(); };
  }, [rewardedAd]);

  const checkInternet = async () => {
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        Alert.alert('Internet required', 'Please turn on Wi-Fi or mobile data.');
        return false;
      }
      return true;
    } catch {
      Alert.alert('Connection error', 'Could not check internet connection.');
      return false;
    }
  };

  const createAccount = async () => {
    if (!(await checkInternet())) return;
    if (!user.name.trim() || !user.phone.trim() || !user.email.trim()) {
      Alert.alert('Missing information', 'Please fill in your name, phone number, and email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) {
      Alert.alert('Check email', 'Please enter a valid email address.');
      return;
    }
    // Prototype only: no SMS or email is sent.
    const code = String(Math.floor(1000 + Math.random() * 9000));
    setDemoOtp(code);
    setOtp('');
    setScreen('verify');
    Alert.alert('Demo verification only', 'This prototype does not send SMS or email. The demo code is shown on the next screen.');
  };

  const verifyAccount = async () => {
    if (!demoOtp || otp !== demoOtp) {
      Alert.alert('Incorrect code', 'Enter the demo code shown on screen.');
      return;
    }
    try {
      await AsyncStorage.setItem('vyra_user', JSON.stringify(user));
      setScreen('home');
    } catch {
      Alert.alert('Save error', 'Could not save your profile. Please try again.');
    }
  };

  const watchAd = async () => {
    if (!(await checkInternet())) return;
    if (!rewardedLoaded) {
      rewardedAd.load();
      Alert.alert('Ad not ready', 'Wait a moment and try again.');
      return;
    }
    try {
      await rewardedAd.show();
      setRewardedLoaded(false);
    } catch {
      setRewardedLoaded(false);
      Alert.alert('Ad unavailable', 'The ad could not be shown. Please try again later.');
    }
  };

  const tapForProgress = async () => {
    const next = tapCount + 1;
    const total = totalTaps + 1;
    setTotalTaps(total);
    await AsyncStorage.setItem('vyra_total_taps', String(total)).catch(() => {});
    if (next >= 50) {
      setTapCount(0);
      await AsyncStorage.setItem('vyra_tap_count', '0').catch(() => {});
      Alert.alert('Progress complete', 'You reached 50 taps. Taps do not earn money or withdrawable coins.');
    } else {
      setTapCount(next);
      await AsyncStorage.setItem('vyra_tap_count', String(next)).catch(() => {});
    }
  };

  const signOut = () => Alert.alert('Sign out?', 'Your profile remains saved on this device.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', onPress: () => setScreen('register') },
  ]);

  const VersionTag = () => (
    <View style={s.verBox}>
      <Text style={s.verText}>Vyra Rewards v{VERSION} • Build #{BUILD}</Text>
      <Text style={s.verSub}>Prototype • payments and redeemable rewards are not enabled</Text>
    </View>
  );

  const Header = () => (
    <View style={s.head}>
      <View style={{ flex: 1 }}>
        <Text style={s.logoSm}>👑 VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text>
        <Text style={s.smallMuted}>{user.phone || 'Profile'} • Demo mode</Text>
      </View>
      <TouchableOpacity style={s.out} onPress={signOut}>
        <Text style={{ color: '#0a1931', fontWeight: '900' }}>SIGN OUT</Text>
      </TouchableOpacity>
    </View>
  );

  const Banner = () => (
    <View style={s.banner}>
      <BannerAd
        unitId={bannerUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={error => console.log('Banner ad failed:', error?.message || 'Unknown error')}
      />
    </View>
  );

  if (screen === 'loading') return (
    <View style={s.load}>
      <Text style={{ fontSize: 50 }}>👑</Text>
      <Text style={s.logo}>VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text>
      <ActivityIndicator color="#facc15" style={{ marginTop: 16 }} />
      <VersionTag />
    </View>
  );

  if (screen === 'register') return (
    <ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text>
      <Text style={s.sub}>Welcome • Prototype mode</Text>
      <View style={s.card}>
        <Text style={s.lab}>Full name *</Text>
        <TextInput style={s.inp} placeholder="Full name" placeholderTextColor="#94a3b8"
          autoCapitalize="words" value={user.name}
          onChangeText={v => setUser(old => ({ ...old, name: v }))} />
        <Text style={s.lab}>Phone *</Text>
        <TextInput style={s.inp} placeholder="080..." keyboardType="phone-pad"
          placeholderTextColor="#94a3b8" value={user.phone}
          onChangeText={v => setUser(old => ({ ...old, phone: v }))} />
        <Text style={s.lab}>Email *</Text>
        <TextInput style={s.inp} placeholder="email@example.com" keyboardType="email-address"
          autoCapitalize="none" autoCorrect={false} placeholderTextColor="#94a3b8"
          value={user.email} onChangeText={v => setUser(old => ({ ...old, email: v }))} />
        <TouchableOpacity style={s.yBtn} onPress={createAccount}><Text style={s.yTxt}>CONTINUE</Text></TouchableOpacity>
        <Text style={s.note}>Local demo registration only. It is not secure account or real SMS/email verification.</Text>
        <VersionTag />
      </View>
    </ScrollView>
  );

  if (screen === 'verify') return (
    <ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>DEMO VERIFICATION</Text>
      <View style={s.card}>
        <Text style={s.demoCode}>DEMO CODE: {demoOtp}</Text>
        <Text style={s.note}>This code is generated on this device only; it is not a real security check.</Text>
        <TextInput style={[s.inp, { textAlign: 'center', fontSize: 20 }]} maxLength={4}
          keyboardType="number-pad" placeholder="Enter code" placeholderTextColor="#94a3b8"
          value={otp} onChangeText={setOtp} />
        <TouchableOpacity style={s.yBtn} onPress={verifyAccount}><Text style={s.yTxt}>CONTINUE TO APP</Text></TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => setScreen('register')}><Text style={s.secondaryText}>BACK</Text></TouchableOpacity>
        <VersionTag />
      </View>
    </ScrollView>
  );

  return (
    <View style={s.page}>
      <ScrollView style={s.main} contentContainerStyle={{ paddingBottom: 24 }}>
        <Header />
        {screen === 'home' && <>
          <View style={s.statRow}>
            <View style={s.statCard}><Text style={s.ml}>BONUS POINTS</Text><Text style={s.mv}>{bonusPoints}</Text></View>
            <View style={s.statCard}><Text style={s.ml}>TOTAL TAPS</Text><Text style={s.mv}>{totalTaps}</Text></View>
          </View>
          <View style={s.tot}>
            <Text style={s.ml}>IN-APP BONUS POINTS</Text>
            <Text style={s.balance}>{bonusPoints}</Text>
            <Text style={s.noteCenter}>Points are only for in-app progress. They cannot be exchanged for cash, airtime, gift cards, or products.</Text>
          </View>
          <View style={s.prog}>
            <Text style={s.progressText}>{tapCount}/50 taps</Text>
            <View style={s.pb}><View style={[s.pf, { width: `${Math.min(100, tapCount * 2)}%` }]} /></View>
          </View>
          <TouchableOpacity style={s.tap} onPress={tapForProgress}>
            <Text style={s.tapDark}>VYRA</Text><Text style={s.tapDark}>TAP FOR</Text><Text style={s.tapDark}>PROGRESS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.gb} onPress={watchAd}>
            <Text style={s.gbt}>{rewardedLoaded ? 'WATCH REWARDED AD • +10 BONUS POINTS' : adMessage.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={() => setScreen('tasks')}><Text style={s.abt}>REFERRALS & OFFERS</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={() => setScreen('survey')}><Text style={s.abt}>SURVEY DEMO</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={() => setScreen('wallet')}><Text style={s.abt}>REWARDS STATUS</Text></TouchableOpacity>
          {/* The banner appears in this single place only. */}
          <Banner />
        </>}

        {screen === 'tasks' && <>
          <Text style={s.sec}>REFERRALS & OFFERS</Text>
          <Text style={s.note}>These are placeholders, not active offers. No referral links or rewards are enabled. Add only official links you are authorised to promote. A reward must be confirmed by the provider or a secure server before crediting it.</Text>
          {TASKS.map(([id, name]) => <View key={id} style={s.shop}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemTitle}>{name}</Text>
              <Text style={s.smallMuted}>Official link not configured</Text>
              <Text style={s.demoLabel}>NOT ACTIVE</Text>
            </View>
            <TouchableOpacity style={[s.secondaryBtn, { marginTop: 0 }]}
              onPress={() => Alert.alert('Offer not configured', 'This placeholder cannot verify registration or award a reward.')}>
              <Text style={s.secondaryText}>DETAILS</Text>
            </TouchableOpacity>
          </View>)}
        </>}

        {screen === 'survey' && <>
          <Text style={s.sec}>SURVEY • DEMO ONLY</Text>
          <View style={s.card}>
            <Text style={s.progressText}>Question {surveyStep + 1}/3</Text>
            {surveyStep === 0 && <>
              <Text style={s.question}>How often do you use banking apps?</Text>
              <TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(1)}><Text style={s.yTxt}>Daily</Text></TouchableOpacity>
              <TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(1)}><Text style={s.yTxt}>Weekly</Text></TouchableOpacity>
            </>}
            {surveyStep === 1 && <>
              <Text style={s.question}>Which mobile wallet do you prefer?</Text>
              <TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(2)}><Text style={s.yTxt}>OPay</Text></TouchableOpacity>
              <TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(2)}><Text style={s.yTxt}>PalmPay</Text></TouchableOpacity>
            </>}
            {surveyStep === 2 && <>
              <Text style={s.question}>How would you rate this prototype?</Text>
              <TouchableOpacity style={s.yBtn} onPress={() => {
                setSurveyStep(0); setScreen('home');
                Alert.alert('Survey finished', 'This sample survey does not provide rewards.');
              }}><Text style={s.yTxt}>5 Stars ⭐⭐⭐⭐⭐</Text></TouchableOpacity>
            </>}
            <Text style={s.note}>This is not a paid survey provider. It does not award points.</Text>
          </View>
        </>}

        {screen === 'wallet' && <>
          <Text style={s.sec}>REWARDS STATUS</Text>
          <View style={s.card}>
            <Text style={s.question}>Cashable balance: Not enabled</Text>
            <Text style={s.note}>This prototype has no verified offer provider, secure reward ledger, payment backend, or withdrawal system. Taps and bonus points are not money. Do not enter bank details or expect payouts from this demo.</Text>
            <TouchableOpacity style={s.yBtn} onPress={() => Alert.alert('Not enabled', 'Cash rewards and withdrawals are not connected in this prototype.')}>
              <Text style={s.yTxt}>WITHDRAWALS NOT AVAILABLE</Text>
            </TouchableOpacity>
          </View>
        </>}

        <View style={s.bottom}>
          {[['home', 'Home'], ['tasks', 'Offers'], ['survey', 'Survey'], ['wallet', 'Rewards']].map(([name, label]) =>
            <TouchableOpacity key={name} onPress={() => setScreen(name)}>
              <Text style={[s.bTxt, screen === name && { color: '#facc15' }]}>{label}</Text>
            </TouchableOpacity>
          )}
        </View>
        <VersionTag />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0a1931' },
  cont: { flexGrow: 1, backgroundColor: '#0a1931', padding: 20, justifyContent: 'center' },
  load: { flex: 1, backgroundColor: '#0a1931', alignItems: 'center', justifyContent: 'center', padding: 20 },
  logo: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center' },
  sub: { color: '#facc15', textAlign: 'center', marginBottom: 18 },
  card: { backgroundColor: '#132a4f', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#facc1530', marginTop: 12 },
  lab: { color: '#facc15', marginTop: 10, fontWeight: '700', fontSize: 12 },
  inp: { backgroundColor: '#0f2342', borderWidth: 1, borderColor: '#facc1530', borderRadius: 10, padding: 12, color: '#fff', marginTop: 6 },
  yBtn: { backgroundColor: '#facc15', padding: 14, borderRadius: 10, marginTop: 12, alignItems: 'center' },
  yTxt: { color: '#0a1931', fontWeight: '900', textAlign: 'center' },
  secondaryBtn: { backgroundColor: '#243958', padding: 10, borderRadius: 10, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#fff', fontWeight: '800', fontSize: 11, textAlign: 'center' },
  main: { flex: 1, backgroundColor: '#0a1931', padding: 10 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ffffff15' },
  logoSm: { color: '#fff', fontWeight: '900' },
  out: { backgroundColor: '#facc15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginLeft: 8 },
  smallMuted: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  statRow: { flexDirection: 'row', marginTop: 10 },
  statCard: { backgroundColor: '#132a4f', flex: 1, margin: 3, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' },
  ml: { color: '#94a3b8', fontSize: 11, textAlign: 'center' },
  mv: { color: '#facc15', fontWeight: '900', marginTop: 4, fontSize: 20 },
  tot: { backgroundColor: '#132a4f', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#facc1530' },
  balance: { color: '#facc15', fontSize: 36, fontWeight: '900', marginTop: 4 },
  prog: { backgroundColor: '#132a4f', borderRadius: 10, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#ffffff10' },
  progressText: { color: '#facc15', fontWeight: '900', textAlign: 'center' },
  pb: { height: 7, backgroundColor: '#0a1931', borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  pf: { height: 7, backgroundColor: '#facc15', borderRadius: 4 },
  tap: { backgroundColor: '#facc15', width: 190, height: 190, borderRadius: 95, alignSelf: 'center', marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  tapDark: { color: '#0a1931', fontWeight: '900', fontSize: 20 },
  gb: { backgroundColor: '#2a344e', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  gbt: { color: '#facc15', fontWeight: '700', fontSize: 11, textAlign: 'center' },
  abf: { backgroundColor: '#132a4f', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#facc15' },
  abt: { color: '#facc15', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  sec: { color: '#facc15', fontWeight: '900', marginTop: 14, marginBottom: 8 },
  shop: { flexDirection: 'row', backgroundColor: '#132a4f', padding: 12, borderRadius: 10, marginTop: 6, alignItems: 'center', borderWidth: 1, borderColor: '#ffffff10' },
  itemTitle: { color: '#fff', fontWeight: '700' },
  demoLabel: { color: '#facc15', fontSize: 10, fontWeight: '900', marginTop: 5 },
  bottom: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#132a4f', padding: 14, borderRadius: 12, marginTop: 16, borderWidth: 1, borderColor: '#facc1530' },
  bTxt: { color: '#94a3b8', fontWeight: '700', fontSize: 11 },
  verBox: { backgroundColor: '#0f2342', padding: 8, borderRadius: 8, marginTop: 12, alignItems: 'center', borderWidth: 1, borderColor: '#facc1520' },
  verText: { color: '#facc15', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  verSub: { color: '#94a3b8', fontSize: 8, textAlign: 'center', marginTop: 2 },
  banner: { alignItems: 'center', marginTop: 12, minHeight: 50 },
  note: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  noteCenter: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  question: { color: '#fff', marginTop: 12, lineHeight: 20 },
  demoCode: { color: '#facc15', textAlign: 'center', fontWeight: '900', fontSize: 18 },
});
