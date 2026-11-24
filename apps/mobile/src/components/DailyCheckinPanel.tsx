import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text } from './DirectionProvider';
import { dailyCheckinService, type DailyCheckin, type DailyCheckinClaim } from '../services/daily-checkin.service';
import { ft } from '../services/feature-i18n';

type Props = { onWalletRefresh: () => void; language?: import('../services/profile-settings.service').MemberLanguage };
const number = (value: number) => new Intl.NumberFormat().format(Number(value || 0));

export function DailyCheckinPanel({ onWalletRefresh, language = 'en' }: Props) {
  const [history, setHistory] = useState<DailyCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastClaim, setLastClaim] = useState<DailyCheckinClaim | null>(null);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try { setHistory(await dailyCheckinService.getHistory()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load check-in history.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const claim = async () => {
    setClaiming(true); setError(''); setNotice(''); setLastClaim(null);
    try {
      const result = await dailyCheckinService.claim();
      setLastClaim(result);
      setNotice(`Confirmed! ${number(result.reward_coins)} coins were added to your wallet.`);
      await load();
      onWalletRefresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to claim today’s reward.'); }
    finally { setClaiming(false); }
  };

  const latest = history[0];
  return <View style={styles.card}>
    <View style={styles.header}><View style={styles.icon}><Text style={styles.iconText}>🔥</Text></View><View style={{ flex: 1 }}><Text style={styles.title}>{ft(language, 'dailyTitle')}</Text><Text style={styles.subtitle}>{ft(language, 'dailySubtitle')}</Text></View></View>
    <View style={styles.streak}><Text style={styles.kicker}>{ft(language, 'currentStreak')}</Text><Text style={styles.streakValue}>{loading ? '—' : `${latest?.streak_day || 0} ${latest?.streak_day === 1 ? ft(language, 'day') : ft(language, 'days')}`}</Text><Text style={styles.meta}>{latest ? `${ft(language, 'lastCheckin')}: ${latest.checkin_date}` : ft(language, 'noCheckins')}</Text></View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!notice && <Text accessibilityRole="status" style={styles.success}>{notice}</Text>}
    {lastClaim && <View style={styles.result}><Text style={styles.resultLabel}>{ft(language, 'todayReward')}</Text><Text style={styles.resultValue}>+{number(lastClaim.reward_coins)} coins</Text><Text style={styles.meta}>Streak day {lastClaim.streak_day} · {lastClaim.checkin_date}</Text></View>}
    <TouchableOpacity accessibilityRole="button" onPress={() => void claim()} disabled={claiming || loading} style={[styles.button, (claiming || loading) && styles.disabled]}>
      {claiming ? <ActivityIndicator color="#FFF"/> : <Text style={styles.buttonText}>{ft(language, 'claimDaily')}</Text>}
    </TouchableOpacity>
    <View style={styles.historyHeader}><Text style={styles.historyTitle}>{ft(language, 'checkinHistory')}</Text><TouchableOpacity onPress={() => void load(true)} disabled={refreshing}><Text style={styles.refresh}>{ft(language, 'refresh')}</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color="#5558E8"/> : history.length === 0 ? <Text style={styles.empty}>{ft(language, 'noCheckins')}</Text> : <ScrollView style={styles.historyList} nestedScrollEnabled refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)}/>}>{history.map((item) => <View key={item.checkin_date} style={styles.historyRow}><View style={{ flex: 1 }}><Text style={styles.date}>{item.checkin_date}</Text><Text style={styles.meta}>Streak day {item.streak_day}</Text></View><Text style={styles.reward}>+{number(item.reward_coins)}</Text></View>)}</ScrollView>}
    <Text style={styles.note}>{ft(language, 'dailySafety')}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#FFF',borderRadius:18,padding:16,gap:13,borderWidth:1,borderColor:'#E7E9F3'},
  header:{flexDirection:'row',alignItems:'center',gap:12},icon:{width:44,height:44,borderRadius:14,backgroundColor:'#FCE8EF',alignItems:'center',justifyContent:'center'},iconText:{fontSize:23},title:{fontSize:16,fontWeight:'900',color:'#222641'},subtitle:{fontSize:11,color:'#858BA0',marginTop:3},
  streak:{backgroundColor:'#F7F7FF',borderRadius:14,padding:14,gap:3},kicker:{fontSize:9,fontWeight:'900',letterSpacing:1.2,color:'#777AE8'},streakValue:{fontSize:27,fontWeight:'900',color:'#22245D'},meta:{fontSize:10,color:'#858BA0'},
  button:{backgroundColor:'#5558E8',padding:15,borderRadius:12,alignItems:'center'},disabled:{opacity:.55},buttonText:{color:'#FFF',fontSize:13,fontWeight:'900'},error:{color:'#B42318',fontSize:12},success:{color:'#18794E',fontSize:12,backgroundColor:'#EAF7EF',padding:10,borderRadius:10},
  result:{backgroundColor:'#EEF0FF',padding:12,borderRadius:12,gap:3},resultLabel:{fontSize:10,color:'#5558E8',fontWeight:'800'},resultValue:{fontSize:22,color:'#292C9A',fontWeight:'900'},historyHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},historyTitle:{fontSize:14,fontWeight:'900',color:'#242743'},refresh:{fontSize:11,color:'#5558E8',fontWeight:'800'},historyList:{maxHeight:220},historyRow:{flexDirection:'row',alignItems:'center',paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#F0F1F6'},date:{fontSize:12,fontWeight:'800',color:'#30334D'},reward:{fontSize:12,fontWeight:'900',color:'#18794E'},empty:{fontSize:11,color:'#858BA0',lineHeight:17},note:{fontSize:9,color:'#9298AC',lineHeight:14}
});
