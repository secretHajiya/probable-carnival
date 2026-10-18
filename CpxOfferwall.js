import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

export default function CpxOfferwall({ user }) {
  const APP_ID = 37222;
  const phone = user?.phone ? user.phone.replace(/[^0-9]/g, '') : "08000000000";
  // Simple hash - Ba MD5 mai nauyi ba - CPX zai karba!
  const url = `https://offers.cpx-research.com/index.php?app_id=${APP_ID}&ext_user_id=${phone}&subid_1=vyra`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>CPX Surveys - APP_ID {APP_ID}</Text>
      </View>
      <WebView 
        source={{ uri: url }} 
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#6a00f4" />
            <Text style={{marginTop:10, color:'#6a00f4'}}>Loading CPX...</Text>
          </View>
        )}
        onError={(e)=>console.log(e)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, height: 600, backgroundColor: '#fff', borderRadius:12, overflow:'hidden' },
  header: { backgroundColor:'#6a00f4', padding:10, alignItems:'center' },
  headerText: { color:'#fff', fontWeight:'bold' },
  webview: { flex: 1 },
  loading: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#fff', position:'absolute', top:0, left:0, right:0, bottom:0 }
});
