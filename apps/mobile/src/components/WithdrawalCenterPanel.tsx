import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text } from './DirectionProvider';
import { withdrawalService, type MemberWithdrawal, type WithdrawalReadModel } from '../services/withdrawal.service';
import { ft } from '../services/feature-i18n';

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}
function money(minor: number, currency: string) {
  return `${currency} ${(Number(minor || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function statusLabel(status: string) { return status.replace(/_/g, ' '); }

export function WithdrawalCenterPanel({ userId, language = 'en' }: { userId: string; language?: import('../services/profile-settings.service').MemberLanguage }) {
  const [overview, setOverview] = useState<WithdrawalReadModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try { setOverview(await withdrawalService.getMemberOverview(userId)); }
    catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load withdrawal information.');
      if (!pull) setOverview(null);
    } finally { setLoading(false); setRefreshing(false); }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  return <View style={st.wrap}>
    <View style={st.headingRow}>
      <View style={{ flex: 1 }}><Text style={st.title}>{ft(language, 'withdrawTitle')}</Text><Text style={st.sub}>{ft(language, 'withdrawSubtitle')}</Text></View>
      <TouchableOpacity onPress={() => void load(true)} disabled={refreshing || loading} style={st.refresh}><Text style={st.refreshText}>{ft(language, 'refresh')}</Text></TouchableOpacity>
    </View>
    {loading ? <View style={st.state}><ActivityIndicator color="#5558E8"/><Text style={st.muted}>{ft(language, 'checkingWithdrawals')}</Text></View> : <ScrollView style={st.list} nestedScrollEnabled refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor="#5558E8"/>}>
      {!!error && <View style={st.error}><Text style={st.errorText}>{error}</Text><TouchableOpacity onPress={() => void load()}><Text style={st.retry}>Try again</Text></TouchableOpacity></View>}
      {overview && <>
        <View style={st.lockCard}>
          <Text style={st.lockTitle}>{ft(language, 'withdrawLockedTitle')}</Text>
          <Text style={st.lockBody}>{ft(language, 'withdrawLockedBody')}</Text>
          <View style={st.countryLine}><Text style={st.countryLabel}>{ft(language, 'accountCountry')}</Text><Text style={st.countryValue}>{overview.countryCode || 'Not selected'}{overview.currencyCode ? ` · ${overview.currencyCode}` : ''}</Text></View>
          <Text style={st.lockFoot}>{overview.configuredEnabled ? 'A country configuration is visible, but mobile withdrawal submission remains locked.' : 'No enabled withdrawal configuration is visible for this account.'}</Text>
        </View>
        <Text style={st.historyTitle}>{ft(language, 'withdrawHistory')}</Text>
        {overview.items.length === 0 ? <View style={st.state}><Text style={st.emptyTitle}>{ft(language, 'noWithdrawals')}</Text><Text style={st.muted}>{ft(language, 'withdrawEmptyHelp')}</Text></View> : overview.items.map((item: MemberWithdrawal) => <View key={item.id} style={st.item}>
          <View style={st.itemTop}><Text style={st.amount}>{Number(item.amount_coins || 0).toLocaleString()} coins</Text><Text style={st.status}>{statusLabel(item.status)}</Text></View>
          <Text style={st.money}>{money(item.amount_minor, item.currency_code)} · Fee {money(item.fee_minor, item.currency_code)}</Text>
          <Text style={st.meta}>{item.country_code} · {item.payout_method.replace(/_/g, ' ')} · {dateLabel(item.requested_at)}</Text>
          {!!item.reviewed_at && <Text style={st.meta}>Reviewed: {dateLabel(item.reviewed_at)}</Text>}
          {!!item.rejection_reason && <Text style={st.reason}>Reason: {item.rejection_reason}</Text>}
        </View>)}
        <Text style={st.safety}>Your bank or PayPal recipient details are not displayed here. The app reads only your own withdrawal records under the existing database access policy.</Text>
      </>}
    </ScrollView>}
  </View>;
}

const st = StyleSheet.create({
  wrap:{backgroundColor:'#FFF',borderRadius:17,padding:15,borderWidth:1,borderColor:'#E8EAF3',gap:13},
  headingRow:{flexDirection:'row',alignItems:'center',gap:10},title:{color:'#191C38',fontSize:17,fontWeight:'900'},sub:{color:'#858BA0',fontSize:11,marginTop:4,lineHeight:16},
  refresh:{paddingHorizontal:11,paddingVertical:8,borderRadius:9,backgroundColor:'#EEF0FF'},refreshText:{color:'#4548C5',fontSize:11,fontWeight:'800'},list:{maxHeight:650},
  lockCard:{backgroundColor:'#FFF8E8',borderColor:'#F1DCA8',borderWidth:1,borderRadius:13,padding:13,gap:8},lockTitle:{color:'#78520B',fontSize:13,fontWeight:'900'},lockBody:{color:'#765F32',fontSize:11,lineHeight:17},countryLine:{flexDirection:'row',justifyContent:'space-between',gap:8,borderTopWidth:1,borderTopColor:'#F1E4C7',paddingTop:9},countryLabel:{color:'#8B7449',fontSize:10},countryValue:{color:'#5F4B25',fontSize:10,fontWeight:'900'},lockFoot:{color:'#8B7449',fontSize:9,lineHeight:14},
  historyTitle:{color:'#222641',fontSize:14,fontWeight:'900',marginTop:4},state:{minHeight:130,alignItems:'center',justifyContent:'center',padding:20,gap:8},muted:{color:'#858BA0',fontSize:11,lineHeight:17,textAlign:'center'},emptyTitle:{color:'#242743',fontSize:14,fontWeight:'900'},
  item:{paddingVertical:13,borderTopWidth:1,borderTopColor:'#EFF0F5',gap:5},itemTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},amount:{color:'#272A45',fontSize:13,fontWeight:'900'},status:{color:'#5558E8',fontSize:10,fontWeight:'900',textTransform:'capitalize'},money:{color:'#5558E8',fontSize:11,fontWeight:'800'},meta:{color:'#858BA0',fontSize:9,lineHeight:14},reason:{color:'#A32929',fontSize:10,lineHeight:15},safety:{color:'#9298AC',fontSize:9,lineHeight:14,marginTop:8},error:{backgroundColor:'#FFF0F0',borderRadius:10,padding:12,gap:7},errorText:{color:'#A32929',fontSize:11},retry:{color:'#5558E8',fontSize:11,fontWeight:'900'},
});
