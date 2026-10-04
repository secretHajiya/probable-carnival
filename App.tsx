import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function App() {
  const [coins, setCoins] = useState(0);
  return (
    <View style={styles.root}>
      <Text style={styles.title}>VYRA REWARDS PRO</Text>
      <Text style={styles.score}>{coins} Coins</Text>
      <TouchableOpacity style={styles.btn} onPress={() => setCoins(coins + 1)}>
        <Text style={styles.btnText}>TAP TO EARN +1</Text>
      </TouchableOpacity>
      <Text style={styles.sub}>APK is Working!</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A14', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#00FF88', fontSize: 22, fontWeight: '900' },
  score: { color: '#fff', fontSize: 40, fontWeight: '900', marginVertical: 20 },
  btn: { backgroundColor: '#00FF88', padding: 18, borderRadius: 12, width: 220, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  sub: { color: '#9B9BAF', marginTop: 20 }
});
