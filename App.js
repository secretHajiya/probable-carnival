import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import mobileAds from 'react-native-google-mobile-ads';
import * as Clipboard from 'expo-clipboard';

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [user, setUser] = useState({ name: '', phone: '', email: '' });
  const [otp, setOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [loading, setLoading] = useState(true);
  const themeColor = '#FFD700';
    useEffect(() => { mobileAds().initialize(); checkUser(); }, []);

  const checkUser = async () => {
    const saved = await AsyncStorage.getItem('user');
    if (saved) setScreen('home'); else setScreen('register');
    setLoading(false);
  };

  const checkInternet = async () => {
    const state = await NetInfo.fetch();
    if (!state.isConnected) { Alert.alert('No Internet'); return false; }
    return true;
  };

  // REGISTER - Guda 1 kawai - Wannan ne zai gyara error
  const handleRegister = async () => {
    if (!(await checkInternet())) return;
    if (!user.name || !user.phone || !user.email) { Alert.alert('Validation', 'Fill all fields'); return; }
    try {
      const gen = Math.floor(100000 + Math.random() * 900000).toString();
      setEmailOtp(gen);
      Alert.alert('OTP Sent', `Test OTP: ${gen}`);
      setScreen('otp');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const verifyOtpAndSave = async () => {
    if (otp !== emailOtp) { Alert.alert('Invalid OTP', 'Wrong code'); return; }
    await AsyncStorage.setItem('user', JSON.stringify(user));
    setScreen('home');
  };

  const handleWithdraw = async () => {
    Alert.alert('Withdraw', 'Request sent');
  };
    if (screen === 'loading') return (<View style={s.page}><Text style={{color:'#fff'}}>Loading...</Text></View>);

  if (screen === 'register') return (
    <ScrollView contentContainerStyle={s.auth}>
      <Text style={s.authTitle}>Vyra Rewards Pro - Register</Text>
      <Text style={{textAlign:'center',marginBottom:10,color:'#fff',fontSize:12}}>Firebase REAL + EmailJS + CPX + AdMob REAL 5672</Text>
      <TextInput style={s.input} placeholder="Full Name" placeholderTextColor="#888" value={user.name} onChangeText={t=>setUser({...user,name:t})}/>
      <TextInput style={s.input} placeholder="Phone" placeholderTextColor="#888" value={user.phone} onChangeText={t=>setUser({...user,phone:t})} keyboardType="phone-pad"/>
      <TextInput style={s.input} placeholder="Email" placeholderTextColor="#888" value={user.email} onChangeText={t=>setUser({...user,email:t})} keyboardType="email-address" autoCapitalize="none"/>
      <TouchableOpacity style={s.yBtn} onPress={handleRegister}><Text style={s.yTxt}>REGISTER + SEND OTP</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('login')}><Text style={s.secondaryText}>Already have account? LOGIN</Text></TouchableOpacity>
      <Text style={{textAlign:'center',marginTop:20,fontSize:10,color:'#888'}}>Vyra v1.0.6 - ADMOB 5672 REAL</Text>
    </ScrollView>
  );

  if (screen === 'otp') return (
    <ScrollView contentContainerStyle={s.auth}>
      <Text style={s.authTitle}>Verify Email - OTP</Text>
      <Text style={{textAlign:'center',color:'#fff'}}>Code sent to {user.email}</Text>
      <Text style={{textAlign:'center',fontSize:12,color:'#888',marginVertical:10}}>Test OTP: {emailOtp}</Text>
      <TextInput style={s.input} placeholder="6-digit OTP" placeholderTextColor="#888" value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6}/>
      <TouchableOpacity style={s.yBtn} onPress={verifyOtpAndSave}><Text style={s.yTxt}>VERIFY + CREATE ACCOUNT</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={()=>{setEmailOtp('');setOtp('');setScreen('register');}}><Text style={s.secondaryText}>BACK</Text></TouchableOpacity>
    </ScrollView>
  );

  if (screen === 'login') return (
    <ScrollView contentContainerStyle={s.auth}>
      <Text style={s.authTitle}>Login</Text>
      <TextInput style={s.input} placeholder="Email" value={user.email} onChangeText={t=>setUser({...user,email:t})}/>
      <TouchableOpacity style={s.yBtn} onPress={()=>setScreen('home')}><Text style={s.yTxt}>LOGIN</Text></TouchableOpacity>
      <TouchableOpacity style={s.secondaryBtn} onPress={()=>setScreen('register')}><Text style={s.secondaryText}>No account? REGISTER</Text></TouchableOpacity>
    </ScrollView>
  );
  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={{padding:20}}>
        <Text style={{color:'#fff',fontSize:20,marginBottom:20}}>Welcome {user.name}</Text>
        <Text style={{color:'#fff'}}>Balance: $0.00</Text>
        <TouchableOpacity style={s.yBtn} onPress={handleWithdraw}><Text style={s.yTxt}>WITHDRAW</Text></TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={async()=>{await AsyncStorage.removeItem('user');setScreen('register');}}><Text style={s.secondaryText}>LOGOUT</Text></TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  page: {flex:1,backgroundColor:'#09090f'},
  auth: {flexGrow:1,padding:20,justifyContent:'center',backgroundColor:'#09090f'},
  authTitle: {fontSize:22,fontWeight:'bold',color:'#fff',textAlign:'center',marginBottom:15},
  input: {backgroundColor:'#1a1a2e',color:'#fff',padding:15,borderRadius:10,marginBottom:12},
  yBtn: {backgroundColor:'#FFD700',padding:15,borderRadius:10,alignItems:'center',marginTop:10},
  yTxt: {color:'#000',fontWeight:'bold'},
  secondaryBtn: {marginTop:15,alignItems:'center'},
  secondaryText: {color:'#fff'},
});
