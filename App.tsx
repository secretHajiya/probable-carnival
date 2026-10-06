import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert, StyleSheet, Share } from 'react-native';

const MONETAG_DIRECT_LINK = 'https://uplcm.com/4/11966517';

const REFERRAL_APPS = [
  { id: 1, name: "OPay - N7,200 Bonus", code: "2G7J4", link: "https://opay.ng/s/2G7J4", points: 2500, color: "#00C853", desc: "N7,200 + N100 Airtime + N1,100 Cashback", hot: true },
  { id: 2, name: "PalmPay - N5,550 Bonus", code: "NSFM3287", link: "https://www.palmpay.com/", points: 2000, color: "#6A1B9A", desc: "Register with NSFM3287" },
  { id: 3, name: "FairMoney Loan", code: "UAPM5BZ", link: "https://fairmoney.io/", points: 1500, color: "#FF6F00", desc: "Instant loan - Code UAPM5BZ" },
  { id: 4, name: "Binance Crypto", code: "1205609224", link: "https://www.binance.com/en/activity/referral-entry/CPA?fromActivityPage=true&ref=CPA_00T9W2H95V", points: 1800, color: "#F3BA2F", desc: "ID: 1205609224" },
  { id: 5, name: "PiggyVest Save", code: "secrethajiya004", link: "https://www.piggyvest.com/", points: 1200, color: "#0D60D8", desc: "Ref: secrethajiya004" },
  { id: 6, name: "Moniepoint Business", code: "TLEG561", link: "https://moniepoint.com/", points: 1300, color: "#0A2E65", desc: "Code: TLEG561" },
  { id: 7, name: "Flutterwave Send", code: "OAIH4CJTJI94", link: "https://send.flutterwave.com/", points: 1200, color: "#FB9129", desc: "Code OAIH4CJTJI94 - N1,500" },
  { id: 8, name: "GTBank GTWorld", code: "GTWORLD", link: "https://www.gtbank.com/", points: 1000, color: "#DD4A00", desc: "GTB Mobile Banking" },
  { id: 9, name: "Bing Rewards - 500pts", code: "zO7OSSC6Kfo", link: "https://aka.ms/sarefer?referral_hash=zO7OSSC6Kfo", points: 500, color: "#008273", desc: "Earn Gift Cards" },
  { id: 10, name: "Giftmania Rewards", code: "636858", link: "https://play.google.com/store/apps/details?id=com.giftmania.net", points: 800, color: "#E91E63", desc: "Code 636858 on signup" },
];

const QUIZ_DATA = [
  { q: "Wanne app ne ke bada N7,200 bonus?", options: ["PalmPay", "OPay", "Bing", "GTBank"], ans: 1 },
  { q: "Menene code din PalmPay?", options: ["NSFM3287", "UAPM5BZ", "636858", "2G7J4"], ans: 0 },
  { q: "Giftmania code din mu menene?", options: ["1205609224", "636858", "TLEG561", "secrethajiya004"], ans: 1 },
  { q: "Wanne app ke bada 500 points Bing?", options: ["Bing App", "FairMoney", "Moniepoint", "Binance"], ans: 0 },
];

export default function App() {
  const [screen, setScreen] = useState('home');
  const [coins, setCoins] = useState(0);
  const [claimed, setClaimed] = useState([]);
  const [tapCount, setTapCount] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const openMonetag = () => { Linking.openURL(MONETAG_DIRECT_LINK); };
    const handleClaim = (app) => {
    if (claimed.includes(app.id)) return;
    Linking.openURL(app.link);
    setCoins(c => c + app.points);
    setClaimed([...claimed, app.id]);
    setTapCount(t => t + 1);
    if ((tapCount + 1) % 2 === 0) setTimeout(() => openMonetag(), 800);
  };
  const handleCheckIn = () => { setCoins(c => c + 200); setTapCount(t => t + 1); Alert.alert("Check-in Success!", "+200 Coins"); openMonetag(); };
  const handleSpin = () => { const win = Math.floor(Math.random() * 500) + 100; setCoins(c => c + win); Alert.alert("Spin Win!", `You won ${win} coins!`); openMonetag(); };
  const handleQuiz = (optIndex) => {
    if (optIndex === QUIZ_DATA[quizIndex].ans) { setCoins(c => c + 150); Alert.alert("Correct!", "+150 Coins"); }
    else Alert.alert("Wrong!", "Try next");
    if (quizIndex < QUIZ_DATA.length - 1) setQuizIndex(quizIndex + 1); else { setQuizIndex(0); setScreen('home'); }
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerTitle}>Vyra Rewards</Text><Text style={styles.coinText}>🪙 {coins}</Text></View>
      {screen === 'home' && (
        <ScrollView style={{ flex: 1, padding: 15 }}>
          <View style={styles.card}><Text style={styles.cardTitle}>Daily Rewards</Text><View style={{ flexDirection: 'row', gap: 10 }}><TouchableOpacity style={styles.btn} onPress={handleCheckIn}><Text style={styles.btnText}>Check-in +200</Text></TouchableOpacity><TouchableOpacity style={[styles.btn, { backgroundColor: '#FF9800' }]} onPress={handleSpin}><Text style={styles.btnText}>Spin</Text></TouchableOpacity></View></View>
          <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginVertical: 15 }}>🔥 Top: OPay N7,200</Text>
          <TouchableOpacity style={[styles.appCard, { borderColor: '#00C853', borderWidth: 2 }]} onPress={() => handleClaim(REFERRAL_APPS[0])}><Text style={{ color: '#00C853', fontWeight: 'bold' }}>{REFERRAL_APPS[0].name} 🔥</Text><Text style={styles.appDesc}>{REFERRAL_APPS[0].desc}</Text><Text style={styles.codeText}>{REFERRAL_APPS[0].link}</Text><View style={styles.claimBtn}><Text style={styles.btnText}>{claimed.includes(1)? '✅ Claimed' : 'Claim 2500'}</Text></View></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { marginTop: 20 }]} onPress={() => setScreen('tasks')}><Text style={styles.btnText}>View All 10 Tasks →</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: '#6A1B9A', marginTop: 10 }]} onPress={() => setScreen('quiz')}><Text style={styles.btnText}>🧠 Quiz</Text></TouchableOpacity>
        </ScrollView>
      )}
      {screen === 'tasks' && (
        <ScrollView style={{ flex: 1, padding: 15 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>📋 10 Tasks</Text>
          {REFERRAL_APPS.map(app => (
            <View key={app.id} style={[styles.appCard, { borderLeftColor: app.color, borderLeftWidth: 5 }]}>
              <Text style={[styles.appName, { color: app.color }]}>{app.id}. {app.name}</Text><Text style={styles.appDesc}>{app.desc}</Text><Text style={styles.codeText}>Code: {app.code}</Text><Text style={styles.linkText} numberOfLines={1}>{app.link}</Text>
              <TouchableOpacity style={[styles.claimBtn, { backgroundColor: claimed.includes(app.id)? 'gray' : app.color }]} onPress={() => handleClaim(app)} disabled={claimed.includes(app.id)}><Text style={styles.btnText}>{claimed.includes(app.id)? '✅ Done' : `Claim +${app.points}`}</Text></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}       {screen === 'quiz' && (
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}><Text style={{ color: 'white', fontSize: 18, marginBottom: 20 }}>{QUIZ_DATA[quizIndex].q}</Text>{QUIZ_DATA[quizIndex].options.map((opt, i) => (<TouchableOpacity key={i} style={styles.quizOpt} onPress={() => handleQuiz(i)}><Text style={{ color: 'white' }}>{opt}</Text></TouchableOpacity>))}<Text style={{ color: '#888', marginTop: 20 }}>{quizIndex + 1} / {QUIZ_DATA.length}</Text></View>
      )}
      {screen === 'wallet' && (
        <View style={{ flex: 1, padding: 20 }}><View style={styles.card}><Text style={styles.cardTitle}>Wallet</Text><Text style={{ fontSize: 40, color: '#00C853', fontWeight: 'bold' }}>{coins} 🪙</Text><Text style={{ color: '#aaa' }}>~ N{Math.floor(coins/10)}</Text></View><View style={[styles.card, { marginTop: 15 }]}><Text style={{ color: 'white', fontWeight: 'bold' }}>Withdrawal</Text><Text style={{ color: '#aaa', marginTop: 5 }}>Complete 3 Tasks to withdraw.</Text><Text style={{ color: claimed.length >= 3? '#00C853' : '#FF5252', marginTop: 10 }}>{claimed.length}/3 {claimed.length >= 3? '✅' : '❌'}</Text></View><TouchableOpacity style={[styles.btn, { marginTop: 20, backgroundColor: claimed.length >= 3? '#00C853' : 'gray' }]} disabled={claimed.length < 3} onPress={() => { Alert.alert("Withdraw", "Contact support"); openMonetag(); }}><Text style={styles.btnText}>Withdraw</Text></TouchableOpacity></View>
      )}
      <View style={styles.bottomNav}><TouchableOpacity onPress={() => setScreen('home')} style={styles.navBtn}><Text style={[styles.navText, screen === 'home' && styles.navActive]}>Home</Text></TouchableOpacity><TouchableOpacity onPress={() => setScreen('tasks')} style={styles.navBtn}><Text style={[styles.navText, screen === 'tasks' && styles.navActive]}>Tasks</Text></TouchableOpacity><TouchableOpacity onPress={() => setScreen('quiz')} style={styles.navBtn}><Text style={[styles.navText, screen === 'quiz' && styles.navActive]}>Quiz</Text></TouchableOpacity><TouchableOpacity onPress={() => setScreen('wallet')} style={styles.navBtn}><Text style={[styles.navText, screen === 'wallet' && styles.navActive]}>Wallet</Text></TouchableOpacity></View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#1e293b' },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  coinText: { color: '#FFD700', fontSize: 18, fontWeight: 'bold' },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12 },
  cardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  btn: { backgroundColor: '#00C853', padding: 12, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  appCard: { backgroundColor: '#1e293b', padding: 15, borderRadius: 12, marginBottom: 12 },
  appName: { fontSize: 15, fontWeight: 'bold' },
  appDesc: { color: '#94a3b8', marginTop: 4, fontSize: 13 },
  codeText: { color: '#facc15', marginTop: 4, fontWeight: 'bold', fontSize: 12 },
  linkText: { color: '#60a5fa', fontSize: 10, marginTop: 3 },
  claimBtn: { backgroundColor: '#00C853', padding: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  quizOpt: { backgroundColor: '#1e293b', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  bottomNav: { flexDirection: 'row', backgroundColor: '#1e293b', padding: 10, justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#334155' },
  navBtn: { padding: 5 },
  navText: { color: '#64748b' },
  navActive: { color: '#00C853', fontWeight: 'bold' },
});
      
