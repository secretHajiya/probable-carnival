import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_VERSION = '1.0.1';
const MONETAG_DIRECT_LINK = 'https://uplcm.com/4/11966517';
const MIN_WITHDRAW = 5000;

const TASKS = [
  { id: 'gtworld', title: 'GTBank - GTWorld', reward: 80, code: '' },
  { id: 'palmpay', title: 'PalmPay - 5,550 Bonus', reward: 100, code: 'NSFM3287' },
  { id: 'fairmoney', title: 'FairMoney', reward: 90, code: 'UAPM5BZ' },
  { id: 'binance', title: 'Binance', reward: 120, code: '1205609224' },
  { id: 'piggyvest', title: 'PiggyVest - 1,000 Bonus', reward: 80, code: 'secrethajiya004' },
  { id: 'moniepoint', title: 'Moniepoint', reward: 100, code: 'TLEG561' },
  { id: 'flutterwave', title: 'Flutterwave Send', reward: 70, code: 'OAIH4CJTJI94' },
  { id: 'opay', title: 'OPay', reward: 80, code: '' },
  { id: 'kuda', title: 'Kuda Bank', reward: 80, code: '' },
  { id: 'carbon', title: 'Carbon', reward: 70, code: '' },
];

const STORAGE = {
  points: 'vyra_points',
  taps: 'vyra_taps',
  completed: 'vyra_completed',
  email: 'vyra_email',
  withdrawMethod: 'vyra_withdraw_method',
  firstLaunch: 'vyra_first_launch',
};

function StatCard({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<'home' | 'wallet'>('home');
  const [points, setPoints] = useState(0);
  const [taps, setTaps] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('OPay');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const savedPoints = await AsyncStorage.getItem(STORAGE.points);
      const savedTaps = await AsyncStorage.getItem(STORAGE.taps);
      const savedCompleted = await AsyncStorage.getItem(STORAGE.completed);
      const savedEmail = await AsyncStorage.getItem(STORAGE.email);
      const savedMethod = await AsyncStorage.getItem(STORAGE.withdrawMethod);
      if (savedPoints) setPoints(Number(savedPoints));
      if (savedTaps) setTaps(Number(savedTaps));
      if (savedCompleted) setCompleted(JSON.parse(savedCompleted));
      if (savedEmail) setEmail(savedEmail);
      if (savedMethod) setWithdrawMethod(savedMethod);
      await AsyncStorage.setItem(STORAGE.firstLaunch, '1');
    } catch (error) { console.log('Load error:', error); }
    finally { setLoading(false); }
  }

  async function savePoints(value: number) {
    setPoints(value);
    await AsyncStorage.setItem(STORAGE.points, String(value));
  }

  async function saveTaps(value: number) {
    setTaps(value);
    await AsyncStorage.setItem(STORAGE.taps, String(value));
  }

  async function handleTap() {
    const newTaps = taps + 1;
    const newPoints = points + 2;
    await saveTaps(newTaps);
    await savePoints(newPoints);
    if (newTaps % 10 === 0) {
      try { await Linking.openURL(MONETAG_DIRECT_LINK); }
      catch (error) { console.log('Direct link error:', error); }
    }
  }

  async function handleWatchAd() {
    try {
      await Linking.openURL(MONETAG_DIRECT_LINK);
      await savePoints(points + 50);
      Alert.alert('Reward Added', '50 Coins have been added to your balance.');
    } catch (error) {
      Alert.alert('Unable to Open', 'The reward link could not be opened.');
    }
  }

  async function handleTask(task: (typeof TASKS)[number]) {
    if (completed.includes(task.id)) {
      Alert.alert('Already Completed', 'You have already completed this task.');
      return;
    }
    const newCompleted = [...completed, task.id];
    setCompleted(newCompleted);
    await AsyncStorage.setItem(STORAGE.completed, JSON.stringify(newCompleted));
    await savePoints(points + task.reward);
    if (task.code) {
      Alert.alert(task.title, `Reward: ${task.reward} Coins\n\nReferral/Promo Code: ${task.code}`);
    } else {
      Alert.alert(task.title, `${task.reward} Coins have been added.`);
    }
  }

  async function handleShare() {
    try { await Share.share({ message: 'Join Vyra Rewards and earn Coins by completing simple tasks!' }); }
    catch (error) { console.log('Share error:', error); }
  }

  async function handleWithdraw() {
    if (points < MIN_WITHDRAW) {
      Alert.alert('Not Enough Coins', `You need at least ${MIN_WITHDRAW.toLocaleString()} Coins before requesting a withdrawal.`);
      return;
    }
    if (!email.trim()) {
      Alert.alert('Account Required', 'Please enter your account number, phone number or email.');
      return;
    }
    await AsyncStorage.setItem(STORAGE.email, email.trim());
    await AsyncStorage.setItem(STORAGE.withdrawMethod, withdrawMethod);
    Alert.alert('Withdrawal Request', `Your ${withdrawMethod} withdrawal request has been recorded for testing.\n\nAccount: ${email.trim()}`);
  }

  async function resetApp() {
    Alert.alert('Reset Test App', 'This will delete your saved Coins, tasks and account information.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await AsyncStorage.multiRemove([STORAGE.points, STORAGE.taps, STORAGE.completed, STORAGE.email, STORAGE.withdrawMethod]);
        setPoints(0); setTaps(0); setCompleted([]); setEmail(''); setWithdrawMethod('OPay'); setScreen('home');
      } },
    ]);
  }

  function showAbout() {
    Alert.alert('Vyra Rewards', `Test Rewards App\n\nVersion ${APP_VERSION}\n\nThis is a testing version of Vyra Rewards.`);
  }

  const completedCount = completed.length;
  const taskCoins = useMemo(() => TASKS.reduce((total, task) => completed.includes(task.id) ? total + task.reward : total, 0), [completed]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.logoText}>VYRA</Text>
        <Text style={styles.loadingText}>Rewards</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {screen === 'home' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View><Text style={styles.brand}>VYRA</Text><Text style={styles.brandSubtitle}>Rewards</Text></View>
            <TouchableOpacity style={styles.aboutButton} onPress={showAbout}><Text style={styles.aboutButtonText}>?</Text></TouchableOpacity>
          </View>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <Text style={styles.balance}>{points.toLocaleString()}</Text>
            <Text style={styles.coinsLabel}>COINS</Text>
            <TouchableOpacity style={styles.tapButton} onPress={handleTap} activeOpacity={0.8}>
              <Text style={styles.tapButtonTitle}>TAP TO EARN</Text><Text style={styles.tapButtonSub}>+2 Coins</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <StatCard icon="🪙" title="Coins" value={points.toLocaleString()} />
            <StatCard icon="👆" title="Taps" value={taps.toLocaleString()} />
            <StatCard icon="✓" title="Tasks" value={`${completedCount}/${TASKS.length}`} />
          </View>
          <View style={styles.watchCard}>
            <View style={styles.watchTextBox}><Text style={styles.watchTitle}>Watch & Earn</Text><Text style={styles.watchSubtitle}>Open an offer and get 50 Coins</Text></View>
            <TouchableOpacity style={styles.watchButton} onPress={handleWatchAd} activeOpacity={0.8}><Text style={styles.watchButtonText}>+50</Text></TouchableOpacity>
          </View>
          <SectionHeader title="Earn More Coins" subtitle="Complete tasks to increase your balance" />
          {TASKS.map(task => {
            const isCompleted = completed.includes(task.id);
            return (
              <TouchableOpacity key={task.id} style={[styles.taskCard, isCompleted && styles.taskCompleted]} onPress={() => handleTask(task)} activeOpacity={0.8}>
                <View style={styles.taskIcon}><Text style={styles.taskIconText}>{isCompleted ? '✓' : '＋'}</Text></View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskReward}>+{task.reward} Coins</Text>
                  {task.code ? <Text style={styles.taskCode}>Code: {task.code}</Text> : null}
                </View>
                <Text style={styles.taskArrow}>{isCompleted ? '✓' : '›'}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}><Text style={styles.shareButtonText}>Share Vyra Rewards</Text></TouchableOpacity>
          <TouchableOpacity style={styles.resetButton} onPress={resetApp}><Text style={styles.resetButtonText}>Reset Test Data</Text></TouchableOpacity>
          <Text style={styles.versionText}>Vyra Rewards v{APP_VERSION}</Text>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}><View><Text style={styles.brand}>VYRA</Text><Text style={styles.brandSubtitle}>Wallet</Text></View></View>
          <View style={styles.walletBalanceCard}><Text style={styles.balanceLabel}>Available Coins</Text><Text style={styles.balance}>{points.toLocaleString()}</Text><Text style={styles.coinsLabel}>COINS</Text></View>
          <SectionHeader title="Withdraw" subtitle={`Minimum withdrawal: ${MIN_WITHDRAW.toLocaleString()} Coins`} />
          <View style={styles.methodRow}>
            {['OPay', 'PalmPay', 'Bank'].map(method => (
              <TouchableOpacity key={method} style={[styles.methodButton, withdrawMethod === method && styles.methodButtonActive]} onPress={async () => { setWithdrawMethod(method); await AsyncStorage.setItem(STORAGE.withdrawMethod, method); }}>
                <Text style={[styles.methodText, withdrawMethod === method && styles.methodTextActive]}>{method}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.inputLabel}>Account / Phone / Email</Text>
          <TextInput style={styles.input} placeholder="Enter account details" placeholderTextColor="#777" value={email} onChangeText={setEmail} keyboardType="default" autoCapitalize="none" />
          <TouchableOpacity style={styles.withdrawButton} onPress={handleWithdraw}><Text style={styles.withdrawButtonText}>REQUEST WITHDRAWAL</Text></TouchableOpacity>
          <View style={styles.infoCard}><Text style={styles.infoTitle}>How It Works</Text><Text style={styles.infoText}>• Tap to earn Coins</Text><Text style={styles.infoText}>• Watch offers to earn more</Text><Text style={styles.infoText}>• Complete available tasks</Text><Text style={styles.infoText}>• Reach the minimum withdrawal</Text><Text style={styles.infoText}>• Submit your withdrawal details</Text></View>
          <View style={styles.infoCard}><Text style={styles.infoTitle}>Task Earnings</Text><Text style={styles.taskCoinsValue}>{taskCoins.toLocaleString()} Coins</Text></View>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}><Text style={styles.shareButtonText}>Share Vyra Rewards</Text></TouchableOpacity>
        </ScrollView>
      )}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen('home')}><Text style={[styles.navIcon, screen === 'home' && styles.navActive]}>🏠</Text><Text style={[styles.navText, screen === 'home' && styles.navActive]}>Home</Text></TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => setScreen('wallet')}><Text style={[styles.navIcon, screen === 'wallet' && styles.navActive]}>💰</Text><Text style={[styles.navText, screen === 'wallet' && styles.navActive]}>Wallet</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:'#09090f'}, content:{padding:16,paddingBottom:110}, loadingContainer:{flex:1,backgroundColor:'#09090f',alignItems:'center',justifyContent:'center'}, logoText:{color:'#fff',fontSize:42,fontWeight:'900',letterSpacing:4}, loadingText:{color:'#a78bfa',fontSize:18,marginTop:4,fontWeight:'700'}, header:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingTop:8}, brand:{color:'#fff',fontSize:28,fontWeight:'900',letterSpacing:2}, brandSubtitle:{color:'#a78bfa',fontSize:14,fontWeight:'700',marginTop:-2}, aboutButton:{width:42,height:42,borderRadius:21,backgroundColor:'#171722',alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#29293a'}, aboutButtonText:{color:'#fff',fontSize:20,fontWeight:'800'}, balanceCard:{backgroundColor:'#151522',borderRadius:24,padding:22,alignItems:'center',borderWidth:1,borderColor:'#27273a'}, walletBalanceCard:{backgroundColor:'#151522',borderRadius:24,padding:24,alignItems:'center',borderWidth:1,borderColor:'#27273a',marginBottom:24}, balanceLabel:{color:'#9b9bab',fontSize:14,fontWeight:'600'}, balance:{color:'#fff',fontSize:44,fontWeight:'900',marginTop:6}, coinsLabel:{color:'#a78bfa',fontSize:12,fontWeight:'900',letterSpacing:2}, tapButton:{marginTop:18,width:'100%',backgroundColor:'#7c3aed',borderRadius:18,paddingVertical:16,alignItems:'center'}, tapButtonTitle:{color:'#fff',fontSize:17,fontWeight:'900'}, tapButtonSub:{color:'#e9ddff',fontSize:12,marginTop:3,fontWeight:'700'}, statsRow:{flexDirection:'row',gap:10,marginTop:14}, statCard:{flex:1,backgroundColor:'#151522',borderRadius:18,paddingVertical:14,alignItems:'center',borderWidth:1,borderColor:'#27273a'}, statIcon:{fontSize:18,marginBottom:4}, statValue:{color:'#fff',fontSize:17,fontWeight:'900'}, statTitle:{color:'#858595',fontSize:11,marginTop:2}, watchCard:{marginTop:18,backgroundColor:'#171725',borderRadius:20,padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderWidth:1,borderColor:'#29293d'}, watchTextBox:{flex:1,paddingRight:12}, watchTitle:{color:'#fff',fontSize:17,fontWeight:'900'}, watchSubtitle:{color:'#8f8fa0',fontSize:12,marginTop:4,lineHeight:17}, watchButton:{backgroundColor:'#22c55e',borderRadius:14,paddingHorizontal:18,paddingVertical:12}, watchButtonText:{color:'#fff',fontWeight:'900',fontSize:15}, sectionHeader:{marginTop:24,marginBottom:12}, sectionTitle:{color:'#fff',fontSize:20,fontWeight:'900'}, sectionSubtitle:{color:'#858595',fontSize:12,marginTop:4}, taskCard:{backgroundColor:'#151522',borderRadius:18,padding:14,marginBottom:10,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#27273a'}, taskCompleted:{opacity:0.65}, taskIcon:{width:44,height:44,borderRadius:14,backgroundColor:'#241b3a',alignItems:'center',justifyContent:'center',marginRight:12}, taskIconText:{color:'#a78bfa',fontSize:22,fontWeight:'900'}, taskInfo:{flex:1}, taskTitle:{color:'#fff',fontSize:14,fontWeight:'800'}, taskReward:{color:'#22c55e',fontSize:12,fontWeight:'800',marginTop:4}, taskCode:{color:'#77778a',fontSize:10,marginTop:3}, taskArrow:{color:'#8d8da0',fontSize:25,fontWeight:'500',paddingLeft:8}, shareButton:{marginTop:18,backgroundColor:'#242433',borderRadius:16,paddingVertical:15,alignItems:'center',borderWidth:1,borderColor:'#343447'}, shareButtonText:{color:'#fff',fontSize:14,fontWeight:'800'}, resetButton:{marginTop:10,alignItems:'center',paddingVertical:12}, resetButtonText:{color:'#77778a',fontSize:12,fontWeight:'700'}, versionText:{color:'#555565',textAlign:'center',fontSize:10,marginTop:6}, methodRow:{flexDirection:'row',gap:8,marginBottom:20}, methodButton:{flex:1,backgroundColor:'#151522',borderRadius:14,paddingVertical:13,alignItems:'center',borderWidth:1,borderColor:'#29293a'}, methodButtonActive:{backgroundColor:'#7c3aed',borderColor:'#7c3aed'}, methodText:{color:'#888899',fontSize:12,fontWeight:'800'}, methodTextActive:{color:'#fff'}, inputLabel:{color:'#bbbbca',fontSize:12,fontWeight:'700',marginBottom:8}, input:{backgroundColor:'#151522',borderRadius:15,borderWidth:1,borderColor:'#29293a',color:'#fff',paddingHorizontal:15,paddingVertical:14,fontSize:14,marginBottom:14}, withdrawButton:{backgroundColor:'#7c3aed',borderRadius:16,paddingVertical:16,alignItems:'center'}, withdrawButtonText:{color:'#fff',fontSize:14,fontWeight:'900'}, infoCard:{backgroundColor:'#151522',borderRadius:18,padding:18,marginTop:16,borderWidth:1,borderColor:'#27273a'}, infoTitle:{color:'#fff',fontSize:16,fontWeight:'900',marginBottom:10}, infoText:{color:'#9999aa',fontSize:13,marginBottom:7,lineHeight:19}, taskCoinsValue:{color:'#22c55e',fontSize:25,fontWeight:'900'}, bottomNav:{position:'absolute',left:12,right:12,bottom:12,height:66,backgroundColor:'#151522',borderRadius:20,borderWidth:1,borderColor:'#29293a',flexDirection:'row',alignItems:'center',justifyContent:'space-around'}, navButton:{flex:1,alignItems:'center',justifyContent:'center'}, navIcon:{fontSize:20,opacity:0.6}, navText:{color:'#77778a',fontSize:10,fontWeight:'700',marginTop:3}, navActive:{color:'#a78bfa',opacity:1}
});
