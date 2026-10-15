import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';

// YOUR REAL EMAILJS CREDENTIALS - 100% REAL NOW!
const EMAILJS_SERVICE_ID = 'service_eo4mafe';
const EMAILJS_TEMPLATE_ID = 'template_47u9xy8';
const EMAILJS_PUBLIC_KEY = 'Ee45Iolv3ZCjO5WUy';

export default function App() {
  const [screen, setScreen] = useState('register');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedUser = await AsyncStorage.getItem('vyra_user');
      const savedUsers = await AsyncStorage.getItem('vyra_users');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
        setScreen('dashboard');
      }
      if (savedUsers) setUsers(JSON.parse(savedUsers));
    } catch (e) {}
  };

  const sendRealEmail = async (toEmail, code) => {
    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            email: toEmail,
            passcode: code,
            time: '15 minutes'
          }
        })
      });
      return response.ok;
    } catch (err) {
      console.log('Email error:', err);
      return false;
    }
  };

  const handleRegister = async () => {
    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter valid email');
      return;
    }
    setLoading(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    
    const sent = await sendRealEmail(email, code);
    setLoading(false);
    
    if (sent) {
      Alert.alert('Success', `Verification code sent to ${email} - Check your inbox!`);
      setScreen('verify');
    } else {
      // Fallback - still allow testing
      Alert.alert('Code Generated', `Your code is: ${code} (Email sending failed, use this)`);
      setScreen('verify');
    }
  };
    const handleVerify = async () => {
    if (otp !== generatedOtp) {
      Alert.alert('Error', 'Invalid code, try again');
      return;
    }
    
    const newUser = {
      email: email,
      balance: 0,
      referralCode: 'VYRA' + Math.floor(1000 + Math.random() * 9000),
      referredBy: referredBy,
      joinedAt: new Date().toISOString()
    };
    
    let updatedUsers = [...users, newUser];
    
    // Referral bonus - $50 for referrer
    if (referredBy) {
      updatedUsers = updatedUsers.map(u => {
        if (u.referralCode === referredBy) {
          return { ...u, balance: (u.balance || 0) + 50 };
        }
        return u;
      });
      newUser.balance = 10; // Bonus for new user with referral
    }
    
    await AsyncStorage.setItem('vyra_user', JSON.stringify(newUser));
    await AsyncStorage.setItem('vyra_users', JSON.stringify(updatedUsers));
    setUser(newUser);
    setUsers(updatedUsers);
    setBalance(newUser.balance);
    setReferralCode(newUser.referralCode);
    setScreen('dashboard');
    Alert.alert('Welcome!', 'Account verified successfully - Start earning!');
  };

  const handleTask = async (amount) => {
    const newBalance = (user.balance || 0) + amount;
    const updatedUser = { ...user, balance: newBalance };
    const updatedUsers = users.map(u => u.email === user.email ? updatedUser : u);
    
    await AsyncStorage.setItem('vyra_user', JSON.stringify(updatedUser));
    await AsyncStorage.setItem('vyra_users', JSON.stringify(updatedUsers));
    setUser(updatedUser);
    setUsers(updatedUsers);
    setBalance(newBalance);
    Alert.alert('Earned!', `You earned $${amount}`);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('vyra_user');
    setUser(null);
    setEmail('');
    setOtp('');
    setScreen('register');
  };

  if (screen === 'register') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.title}>Vyra Rewards Pro</Text>
        <Text style={styles.subtitle}>Earn $1000+ Daily</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Referral Code (Optional)"
          value={referredBy}
          onChangeText={setReferredBy}
          autoCapitalize="characters"
        />
        
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Verification Code</Text>}
        </TouchableOpacity>
        <Text style={styles.note}>Real email will be sent from abdullahiwaziri9004@gmail.com</Text>
      </View>
    );
  }

  if (screen === 'verify') {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <Text style={styles.title}>Verify Email</Text>
        <Text style={styles.subtitle}>Code sent to {email}</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter 6-digit code"
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
        />
        
        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          <Text style={styles.buttonText}>Verify & Start Earning</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => setScreen('register')}>
          <Text style={styles.link}>Change email</Text>
        </TouchableOpacity>
      </View>
    );
            }
  return (
    <ScrollView style={styles.dashboardContainer}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Vyra Rewards Pro</Text>
        <TouchableOpacity onPress={handleLogout}><Text style={styles.logout}>Logout</Text></TouchableOpacity>
      </View>
      
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your Balance</Text>
        <Text style={styles.balanceValue}>${user?.balance || 0}</Text>
        <Text style={styles.balanceSub}>Keep completing tasks!</Text>
      </View>

      <View style={styles.referralCard}>
        <Text style={styles.cardTitle}>Your Referral Code</Text>
        <Text style={styles.referralCodeText}>{user?.referralCode}</Text>
        <TouchableOpacity style={styles.copyButton} onPress={() => {
          Clipboard.setStringAsync(user?.referralCode);
          Alert.alert('Copied', 'Referral code copied!');
        }}>
          <Text style={styles.copyText}>Copy Code</Text>
        </TouchableOpacity>
        <Text style={styles.referralNote}>Invite friends - You get $50 per referral!</Text>
      </View>

      <Text style={styles.sectionTitle}>Daily Tasks - Earn Money</Text>
      
      <TouchableOpacity style={styles.taskCard} onPress={() => handleTask(25)}>
        <Text style={styles.taskTitle}>🎬 Watch Video Ad</Text>
        <Text style={styles.taskReward}>Earn $25</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.taskCard} onPress={() => handleTask(50)}>
        <Text style={styles.taskTitle}>📱 Install App</Text>
        <Text style={styles.taskReward}>Earn $50</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.taskCard} onPress={() => handleTask(100)}>
        <Text style={styles.taskTitle}>📝 Complete Survey</Text>
        <Text style={styles.taskReward}>Earn $100</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.taskCard} onPress={() => handleTask(250)}>
        <Text style={styles.taskTitle}>💎 Premium Offer</Text>
        <Text style={styles.taskReward}>Earn $250</Text>
      </TouchableOpacity>

      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Stats</Text>
        <Text style={styles.statText}>Total Users: {users.length}</Text>
        <Text style={styles.statText}>Email: {user?.email}</Text>
        <Text style={styles.statText}>Status: REAL EMAIL ACTIVE ✅</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, justifyContent: 'center' },
  dashboardContainer: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 30, marginTop: 5 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 15 },
  button: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  link: { color: '#3b82f6', textAlign: 'center', marginTop: 20 },
  note: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 15 },
  logout: { color: '#ef4444', fontWeight: 'bold' },
  balanceCard: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  balanceLabel: { color: '#dbeafe', fontSize: 14 },
  balanceValue: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginVertical: 5 },
  balanceSub: { color: '#dbeafe', fontSize: 12 },
  referralCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  referralCodeText: { fontSize: 22, fontWeight: 'bold', color: '#3b82f6', textAlign: 'center', letterSpacing: 2, marginBottom: 15 },
  copyButton: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, alignItems: 'center' },
  copyText: { color: '#3b82f6', fontWeight: 'bold' },
  referralNote: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15, marginTop: 10 },
  taskCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#334155' },
  taskReward: { fontSize: 15, fontWeight: 'bold', color: '#10b981' },
  statsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 40, borderWidth: 1, borderColor: '#e2e8f0' },
  statText: { fontSize: 13, color: '#64748b', marginBottom: 4 }
});
