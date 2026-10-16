import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Alert, ScrollView,
  StyleSheet, ActivityIndicator, Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import CpxOfferwall from './CpxOfferwall';
import mobileAds, {
  BannerAd, BannerAdSize, RewardedAd, InterstitialAd,
  RewardedAdEventType, AdEventType, TestIds
} from 'react-native-google-mobile-ads';

const VERSION = '1.0.5';
const BUILD = 8;
const BANNER_ID = 'ca-app-pub-4487679675698542/5498846987';
const REWARDED_ID = 'ca-app-pub-4487679675698542/9277117923';
const INTERSTITIAL_ID = 'ca-app-pub-4487679675698542/7002308379';

const bannerUnitId = __DEV__ ? TestIds.BANNER : BANNER_ID;
const rewardedUnitId = __DEV__ ? TestIds.REWARDED : REWARDED_ID;
const interstitialUnitId = __DEV__ ? TestIds.INTERSTITIAL : INTERSTITIAL_ID;

const QUIZ_QUESTIONS = [
  { category: 'General Knowledge', question: 'What is the capital city of Nigeria?', options: ['Kano', 'Abuja', 'Lagos', 'Kaduna'], correctIndex: 1 },
  { category: 'Science', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Mercury'], correctIndex: 2 },
  { category: 'Mathematics', question: 'What is 12 × 8?', options: ['88', '96', '108', '86'], correctIndex: 1 },
  { category: 'Technology', question: 'Which device is mainly used to type text into a computer?', options: ['Monitor', 'Speaker', 'Keyboard', 'Printer'], correctIndex: 2 },
  { category: 'History', question: 'Who was Nigerias first President?', options: ['Nnamdi Azikiwe', 'Olusegun Obasanjo', 'Yakubu Gowon', 'Murtala Mohammed'], correctIndex: 0 },
  { category: 'Science', question: 'Which gas do plants absorb from the air?', options: ['Oxygen', 'Carbon dioxide', 'Hydrogen', 'Helium'], correctIndex: 1 },
  { category: 'General Knowledge', question: 'What is the largest ocean on Earth?', options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'], correctIndex: 3 },
  { category: 'Technology', question: 'What does CPU stand for?', options: ['Central Processing Unit', 'Computer Power Utility', 'Central Program User', 'Core Processing Upload'], correctIndex: 0 },
  { category: 'Mathematics', question: 'How many sides does a hexagon have?', options: ['Five', 'Six', 'Seven', 'Eight'], correctIndex: 1 },
  { category: 'History', question: 'In which year did Nigeria gain independence?', options: ['1957', '1960', '1963', '1970'], correctIndex: 1 },
];

const TASKS = [
  ['GTB80', 'GTBank / GTWorld'], ['PALM100', 'PalmPay'],
  ['FAIR90', 'FairMoney'], ['BIN120', 'Binance'],
  ['PIGGY80', 'PiggyVest'], ['MONIE100', 'Moniepoint'],
  ['FLUT70', 'Flutterwave'], ['OPAY80', 'OPay'],
  ['KUDA80', 'Kuda'], ['CARB70', 'Carbon'],
];

const EMAILJS_SERVICE_ID = 'service_eo4mafe';
const EMAILJS_TEMPLATE_ID = 'template_vla0zff';
const EMAILJS_PUBLIC_KEY = 'Ee45lolv3ZCjOSWUy';

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpExpiresAt, setOtpExpiresAt] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [coins, setCoins] = useState(0);
  const [bonusPoints, setBonusPoints] = useState(0);
  const [quizBalance, setQuizBalance] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [inputReferral, setInputReferral] = useState('');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [score, setScore] = useState(0);
  const [surveyStep, setSurveyStep] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [adMessage, setAdMessage] = useState('Loading ad...');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  dy', 'Wait a moment and try again.'); return; }
    try { await rewardedAd.show(); setRewardedLoaded(false); }
    catch { setRewardedLoaded(false); Alert.alert('Ad unavailable', 'The ad could not be shown.'); }
  };

  const tapForProgress = async () => {
    const next = tapCount + 1; const total = totalTaps + 1;
    setTotalTaps(total); await AsyncStorage.setItem('vyra_total_taps', String(total)).catch(() => {});
    const newBonus = bonusPoints + 1;
    setBonusPoints(newBonus);
    if (next >= 50) { setTapCount(0); await AsyncStorage.setItem('vyra_tap_count', '0').catch(() => {}); Alert.alert('Progress complete', 'You reached 50 taps! +5 extra'); setBonusPoints(b => b+5); }
    else { setTapCount(next); await AsyncStorage.setItem('vyra_tap_count', String(next)).catch(() => {}); }
  };

  const startQuiz = () => { setQuizIndex(0); setQuizScore(0); setQuizAnswered(false); setQuizFinished(false); setScore(0); setScreen('quiz'); };
  const answerQuiz = (idx) => {
    if (quizAnswered) return;
    setQuizAnswered(true);
    const correct = QUIZ_QUESTIONS[quizIndex].correctIndex === idx;
    if (correct) {
      const newScore = quizScore + 10;
      setQuizScore(newScore);
      setScore(newScore);
    }
  };
  const nextQuizQuestion = async () => {
    if (quizIndex < QUIZ_QUESTIONS.length - 1) { setQuizIndex(i => i+1); setQuizAnswered(false); }
    else {
      setQuizFinished(true);
      const finalBal = quizBalance + quizScore;
      setQuizBalance(finalBal);
      await AsyncStorage.setItem('vyra_quiz_balance', String(finalBal)).catch(()=>{});
      if (interstitialLoaded) { try { await interstitialAd.show(); } catch { setInterstitialLoaded(false); } }
    }
  };

  const signOut = () => Alert.alert('Sign out?', 'Your profile remains saved.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => setScreen('register') }]);

  const clearAllData = () => {
    Alert.alert('Clear all data?', 'This will delete your profile and points.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear();
        setUser({ name: '', phone: '', email: '' });
        setBonusPoints(0); setTotalTaps(0); setTapCount(0); setQuizBalance(0);
        setScreen('register');
      }}
    ]);
  };

  const VersionTag = () => (<View style={s.verBox}><Text style={s.verText}>Vyra Rewards v{VERSION} • Build #{BUILD}</Text></View>);
  const Header = () => (<View style={s.head}><View style={{ flex: 1 }}><Text style={s.logoSm}>👑 VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text><Text style={s.smallMuted}>{user.phone || 'Profile'}</Text></View><TouchableOpacity style={s.out} onPress={signOut}><Text style={{ color: '#0a1931', fontWeight: '900' }}>SIGN OUT</Text></TouchableOpacity></View>);
  const Banner = () => (<View style={s.banner}><BannerAd unitId={bannerUnitId} size={BannerAdSize.BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} /></View>);

  if (screen === 'loading') return (<View style={s.load}><Text style={{ fontSize: 50 }}>👑</Text><Text style={s.logo}>VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text><ActivityIndicator color="#facc15" style={{ marginTop: 16 }} /><VersionTag /></View>);
  if (screen === 'register') return (<ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled"><Text style={s.logo}>VYRA <Text style={{ color: '#facc15' }}>REWARDS</Text></Text><Text style={s.sub}>Welcome • Verify your email</Text><View style={s.card}><Text style={s.lab}>Full name *</Text><TextInput style={s.inp} placeholder="Full name" value={user.name} onChangeText={v => setUser(old => ({...old, name: v }))} /><Text style={s.lab}>Phone *</Text><TextInput style={s.inp} placeholder="080..." keyboardType="phone-pad" value={user.phone} onChangeText={v => setUser(old => ({...old, phone: v }))} /><Text style={s.lab}>Email *</Text><TextInput style={s.inp} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" value={user.email} onChangeText={v => setUser(old => ({...old, email: v }))} /><TouchableOpacity style={s.yBtn} onPress={createAccount} disabled={sendingOtp}><Text style={s.yTxt}>{sendingOtp? 'SENDING CODE…' : 'SEND VERIFICATION CODE'}</Text></TouchableOpacity><VersionTag /></View></ScrollView>);
  if (screen === 'verify') return (<ScrollView contentContainerStyle={s.cont} keyboardShouldPersistTaps="handled"><Text style={s.logo}>EMAIL VERIFICATION</Text><View style={s.card}><Text style={s.sub}>We sent a 6-digit code to {user.email}. Check your inbox and spam folder. The code expires in 10 minutes.</Text><TextInput style={[s.inp, { textAlign: 'center', fontSize: 20, letterSpacing: 6 }]} maxLength={6} keyboardType="number-pad" placeholder="6-digit code" value={otp} onChangeText={setOtp} /><TouchableOpacity style={s.yBtn} onPress={verifyAccount}><Text style={s.yTxt}>VERIFY EMAIL & CONTINUE</Text></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={() => { setEmailOtp(''); setOtp(''); setScreen('register'); }}><Text style={s.secondaryText}>BACK</Text></TouchableOpacity><VersionTag /></View></ScrollView>);

  return (
    <View style={s.page}>
      <ScrollView style={s.main} contentContainerStyle={{ paddingBottom: 24 }}>
        <Header />
        {screen === 'home' && <>
          <View style={s.statRow}><View style={s.statCard}><Text style={s.ml}>BONUS POINTS</Text><Text style={s.mv}>{bonusPoints}</Text></View><View style={s.statCard}><Text style={s.ml}>TOTAL TAPS</Text><Text style={s.mv}>{totalTaps}</Text></View></View>
          <View style={s.tot}><Text style={s.ml}>IN-APP BONUS POINTS</Text><Text style={s.balance}>{bonusPoints}</Text></View>
          <View style={s.prog}><Text style={s.progressText}>{tapCount}/50 taps</Text><View style={s.pb}><View style={[s.pf, { width: `${Math.min(100, tapCount * 2)}%` }]} /></View></View>
          <TouchableOpacity style={s.tap} onPress={tapForProgress}><Text style={s.tapDark}>VYRA</Text><Text style={s.tapDark}>TAP FOR</Text><Text style={s.tapDark}>PROGRESS</Text></TouchableOpacity>
          <TouchableOpacity style={[s.abf, { backgroundColor: '#FF6B00', borderColor: '#FF6B00' }]} onPress={() => setScreen('cpx')}>
            <Text style={[s.abt, { color: '#fff' }]}>🎯 CPX SURVEYS - EARN POINTS (REAL)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.gb} onPress={watchAd}><Text style={s.gbt}>{rewardedLoaded? 'WATCH REWARDED AD • +10 BONUS POINTS' : adMessage.toUpperCase()}</Text></TouchableOpacity>
            <View style={s.tot}><Text style={s.ml}>QUIZ BALANCE</Text><Text style={s.balance}>{quizBalance}</Text></View>
          <TouchableOpacity style={s.abf} onPress={startQuiz}><Text style={s.abt}>🧠 PLAY QUIZ</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={() => setScreen('tasks')}><Text style={s.abt}>REFERRALS & OFFERS</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={() => setScreen('survey')}><Text style={s.abt}>SURVEY DEMO</Text></TouchableOpacity>
          <TouchableOpacity style={s.abf} onPress={() => setScreen('wallet')}><Text style={s.abt}>REWARDS STATUS</Text></TouchableOpacity>
          <Banner />
        </>}

        {screen === 'cpx' && <>
          <Text style={s.sec}>CPX RESEARCH - REAL SURVEYS</Text>
          <View style={{ flex: 1, height: 700, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' }}>
            <CpxOfferwall user={user} />
          </View>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => setScreen('home')}>
            <Text style={s.secondaryText}>BACK TO HOME</Text>
          </TouchableOpacity>
        </>}

        {screen === 'quiz' && <><Text style={s.sec}>🧠 VYRA QUIZ</Text>{!quizFinished? <View style={s.card}><Text style={s.progressText}>Question {quizIndex + 1}/{QUIZ_QUESTIONS.length}</Text><Text style={s.question}>{QUIZ_QUESTIONS[quizIndex].question}</Text>{QUIZ_QUESTIONS[quizIndex].options.map((option, index) => <TouchableOpacity key={option} disabled={quizAnswered} style={[s.yBtn, { backgroundColor: quizAnswered && index === QUIZ_QUESTIONS[quizIndex].correctIndex? '#22c55e' : '#facc15' }]} onPress={() => answerQuiz(index)}><Text style={s.yTxt}>{option}</Text></TouchableOpacity>)}<Text style={s.note}>Each correct answer adds 10 points.</Text>{quizAnswered && <TouchableOpacity style={s.secondaryBtn} onPress={nextQuizQuestion}><Text style={s.secondaryText}>{quizIndex === QUIZ_QUESTIONS.length - 1? 'VIEW RESULT' : 'NEXT'}</Text></TouchableOpacity>}</View> : <View style={s.card}><Text style={s.question}>Quiz complete!</Text><Text style={s.balance}>{quizScore} / {QUIZ_QUESTIONS.length * 10}</Text><Text style={s.noteCenter}>Added to your Quiz Balance</Text><TouchableOpacity style={s.yBtn} onPress={() => setScreen('home')}><Text style={s.yTxt}>BACK TO HOME</Text></TouchableOpacity></View>}</>}

        {screen === 'tasks' && <><Text style={s.sec}>REFERRALS & OFFERS</Text>{TASKS.map(([id, name]) => <View key={id} style={s.shop}><View style={{ flex: 1 }}><Text style={s.itemTitle}>{name}</Text><Text style={s.demoLabel}>COMING SOON</Text></View><TouchableOpacity style={[s.secondaryBtn, { marginTop: 0 }]} onPress={() => Alert.alert('Offer', `${name} will be available soon. Stay tuned!`)}><Text style={s.secondaryText}>DETAILS</Text></TouchableOpacity></View>)}</>}

        {screen === 'survey' && <><Text style={s.sec}>SURVEY • DEMO ONLY</Text><View style={s.card}><Text style={s.progressText}>Question {surveyStep + 1}/3</Text>{surveyStep === 0 && <><Text style={s.question}>How often do you use banking apps?</Text><TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(1)}><Text style={s.yTxt}>Daily</Text></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={() => setSurveyStep(1)}><Text style={s.secondaryText}>Weekly</Text></TouchableOpacity></>}{surveyStep === 1 && <><Text style={s.question}>Which mobile wallet do you prefer?</Text><TouchableOpacity style={s.yBtn} onPress={() => setSurveyStep(2)}><Text style={s.yTxt}>OPay</Text></TouchableOpacity><TouchableOpacity style={s.secondaryBtn} onPress={() => setSurveyStep(2)}><Text style={s.secondaryText}>PalmPay</Text></TouchableOpacity></>}{surveyStep === 2 && <><Text style={s.question}>Rate your experience?</Text><TouchableOpacity style={s.yBtn} onPress={() => { setSurveyStep(0); setScreen('home'); Alert.alert('Thanks!', 'Survey completed'); }}><Text style={s.yTxt}>5 Stars ⭐</Text></TouchableOpacity></>}</View></>}

        {screen === 'wallet' && <><Text style={s.sec}>REWARDS STATUS</Text><View style={s.card}><Text style={s.ml}>BONUS POINTS</Text><Text style={s.balance}>{bonusPoints}</Text><Text style={s.ml}>QUIZ BALANCE</Text><Text style={s.balance}>{quizBalance}</Text><Text style={s.ml}>TOTAL TAPS</Text><Text style={s.balance}>{totalTaps}</Text><Text style={s.noteCenter}>Withdrawal will be enabled in next update. Points are in-app for now.</Text></View></>}

        {screen === 'settings' && <>
          <Text style={s.sec}>⚙️ SETTINGS</Text>
          <View style={s.card}>
            <Text style={s.sec}>Profile</Text>
            <Text style={s.lab}>Full name</Text><TextInput style={s.inp} value={user.name} onChangeText={v => setUser(o=>({...o, name: v}))} />
            <Text style={s.lab}>Phone</Text><TextInput style={s.inp} value={user.phone} onChangeText={v => setUser(o=>({...o, phone: v}))} keyboardType="phone-pad" />
            <Text style={s.lab}>Email</Text><TextInput style={s.inp} value={user.email} editable={false} />
            <TouchableOpacity style={s.yBtn} onPress={async ()=>{ await AsyncStorage.setItem('vyra_user', JSON.stringify(user)); Alert.alert('Saved', 'Profile updated'); }}><Text style={s.yTxt}>SAVE PROFILE</Text></TouchableOpacity>
          </View>
          <View style={s.card}>
            <Text style={s.sec}>Preferences</Text>
            <View style={s.rowBetween}><Text style={s.itemTitle}>Notifications</Text><Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ true: '#facc15' }} /></View>
            <View style={s.rowBetween}><Text style={s.itemTitle}>Sound</Text><Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ true: '#facc15' }} /></View>
          </View>
          <View style={s.card}>
            <Text style={s.sec}>Support</Text>
            <TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('Contact', 'Email: support@vyrarewards.com')}><Text style={s.settingText}>📧 Contact Us</Text></TouchableOpacity>
            <TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('Privacy', 'Your data is stored locally and not shared.')}><Text style={s.settingText}>🔒 Privacy Policy</Text></TouchableOpacity>
            <TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('Terms', 'Points are in-app and have no cash value until withdrawal is enabled.')}><Text style={s.settingText}>📄 Terms of Service</Text></TouchableOpacity>
            <TouchableOpacity style={s.settingItem} onPress={()=>Alert.alert('About', `Vyra Rewards v${VERSION} Build ${BUILD}\nReal: EmailJS, AdMob, CPX Surveys\nDemo: Quiz, Tasks, Survey`)}><Text style={s.settingText}>ℹ️ About App</Text></TouchableOpacity>
          </View>
          <View style={s.card}>
            <Text style={s.sec}>Data & Security</Text>
            <TouchableOpacity style={[s.secondaryBtn, { backgroundColor: '#ef4444' }]} onPress={clearAllData}><Text style={[s.secondaryText, { color: '#fff' }]}>🗑️ CLEAR ALL DATA</Text></TouchableOpacity>
            <VersionTag />
          </View>
        </>}

        <View style={s.bottom}>{[['home', 'Home'], ['quiz', 'Quiz'], ['tasks', 'Offers'], ['wallet', 'Rewards'], ['settings', 'Settings']].map(([name, label]) => <TouchableOpacity key={name} onPress={() => setScreen(name)}><Text style={[s.bTxt, screen === name && { color: '#facc15' }]}>{label}</Text></TouchableOpacity>)}</View>
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
  secondaryBtn: { backgroundColor: '#243958', padding: 10, borderRadius: 10, marginTop: 12, alignItems: 'center' },
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
  banner: { alignItems: 'center', marginTop: 12, minHeight: 50 },
  note: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginVertical: 8 },
  noteCenter: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  question: { color: '#fff', marginTop: 12, lineHeight: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#ffffff10' },
  settingItem: { paddingVertical: 14, borderBottomWidth: 1, borderColor: '#ffffff10' },
  settingText: { color: '#fff', fontWeight: '600' },
});
