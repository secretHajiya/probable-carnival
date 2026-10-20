import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function CpxOfferwall({ user }) {
  const APP_ID = 37222;
  const HASH = 'zq6KgHGIgOujXyncpghe4Nb1sIdDf0ph';
  
  // ANTI-FRAUD: UID kawai - ba phone ba
  const userId = user?.uid;
  
  // Idan user bai shigo ba - kada a load CPX
  if (!userId) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6a00f4" />
        <Text style={{marginTop:10, color:'#6a00f4', fontWeight:'bold'}}>Please login to view surveys...</Text>
      </View>
    );
  }

  // CORRECT CPX URL - daidai da dashboard
  const url = `https://offers.cpx-research.com/index.php?app_id=${APP_ID}&ext_user_id=${userId}&hash=${HASH}&subid_1=vyra&subid_2=${userId}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>CPX Surveys - Earn up to 2000 VYR</Text>
      </View>
      <WebView 
        source={{ uri: url }} 
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        thirdPartyCookiesEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36"
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#6a00f4" />
            <Text style={{marginTop:10, color:'#6a00f4', fontWeight:'bold'}}>Loading CPX Surveys...</Text>
          </View>
        )}
        onError={(e)=>console.log('CPX Error:', e.nativeEvent)}
        onHttpError={(e)=>console.log('CPX HTTP Error:', e.nativeEvent)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: 600, backgroundColor: '#fff', borderRadius:12, overflow:'hidden', borderWidth:1, borderColor:'#e0d0ff' },
  header: { backgroundColor:'#6a00f4', padding:12, alignItems:'center' },
  headerText: { color:'#fff', fontWeight:'bold', fontSize:14 },
  webview: { flex: 1 },
  loading: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff' }
});