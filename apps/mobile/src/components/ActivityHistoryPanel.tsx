import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text } from './DirectionProvider';
import { activityService, type WalletLedgerEntry } from '../services/activity.service';
import { ft } from '../services/feature-i18n';

const PAGE_SIZE = 25;

function labelFor(entry: WalletLedgerEntry) {
  return entry.description?.trim() || entry.entry_type.replace(/_/g, ' ');
}
function signFor(type: string) {
  if (['reward_reversed', 'withdrawal_reserved', 'withdrawal_paid'].includes(type)) return '−';
  if (['reward_pending', 'reward_confirmed', 'withdrawal_released', 'referral_reward', 'bonus'].includes(type)) return '+';
  return '';
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
}

export function ActivityHistoryPanel({ userId, language = 'en' }: { userId: string; language?: import('../services/profile-settings.service').MemberLanguage }) {
  const [items, setItems] = useState<WalletLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const loadFirst = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const rows = await activityService.listForMember(userId, 0);
      setItems(rows);
      setPage(0);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your wallet activity.');
      if (!pull) setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { void loadFirst(); }, [loadFirst]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true); setError('');
    try {
      const nextPage = page + 1;
      const rows = await activityService.listForMember(userId, nextPage);
      setItems(current => [...current, ...rows]);
      setPage(nextPage);
      setHasMore(rows.length === PAGE_SIZE);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load more activity.');
    } finally { setLoadingMore(false); }
  }

  return <View style={styles.wrap}>
    <View style={styles.headingRow}>
      <View style={{ flex: 1 }}><Text style={styles.heading}>{ft(language, 'activityTitle')}</Text><Text style={styles.subheading}>{ft(language, 'activitySubtitle')}</Text></View>
      <TouchableOpacity onPress={() => void loadFirst(true)} disabled={refreshing || loading} style={styles.refresh}><Text style={styles.refreshText}>{ft(language, 'refresh')}</Text></TouchableOpacity>
    </View>
    {loading ? <View style={styles.state}><ActivityIndicator color="#5558E8"/><Text style={styles.stateText}>{ft(language, 'loadingTransactions')}</Text></View> : <ScrollView style={styles.list} nestedScrollEnabled refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadFirst(true)} tintColor="#5558E8"/>}>
      {!!error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text><TouchableOpacity onPress={() => void loadFirst()}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View>}
      {items.length === 0 && !error ? <View style={styles.state}><Text style={styles.emptyIcon}>◷</Text><Text style={styles.emptyTitle}>{ft(language, 'noActivity')}</Text><Text style={styles.stateText}>{ft(language, 'activityEmptyHelp')}</Text></View> : items.map(item => {
        const sign = signFor(item.entry_type);
        const negative = sign === '−';
        return <View key={item.id} style={styles.item}>
          <View style={[styles.icon, negative ? styles.iconNegative : styles.iconPositive]}><Text style={styles.iconText}>{sign || '•'}</Text></View>
          <View style={styles.itemMain}><Text style={styles.itemTitle}>{labelFor(item)}</Text><Text style={styles.date}>{dateLabel(item.created_at)}</Text><Text style={styles.type}>{item.entry_type.replace(/_/g, ' ')}</Text></View>
          <Text style={[styles.amount, negative ? styles.amountNegative : styles.amountPositive]}>{sign}{Number(item.amount_coins || 0).toLocaleString()}<Text style={styles.coinUnit}> coins</Text></Text>
        </View>;
      })}
      {hasMore && <TouchableOpacity style={styles.more} onPress={() => void loadMore()} disabled={loadingMore}>{loadingMore ? <ActivityIndicator color="#5558E8"/> : <Text style={styles.moreText}>{ft(language, 'loadMore')}</Text>}</TouchableOpacity>}
      {!hasMore && items.length > 0 && <Text style={styles.endNote}>{ft(language, 'caughtUp')}</Text>}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: '#FFF', borderRadius: 17, padding: 15, borderWidth: 1, borderColor: '#E8EAF3', gap: 13 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, heading: { color: '#191C38', fontSize: 17, fontWeight: '900' }, subheading: { color: '#858BA0', fontSize: 11, marginTop: 4, lineHeight: 16 },
  refresh: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 9, backgroundColor: '#EEF0FF' }, refreshText: { color: '#4548C5', fontSize: 11, fontWeight: '800' },
  list: { maxHeight: 560 }, state: { minHeight: 190, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 9 }, stateText: { color: '#858BA0', fontSize: 12, lineHeight: 18, textAlign: 'center' }, emptyIcon: { color: '#777AE8', fontSize: 34 }, emptyTitle: { color: '#242743', fontSize: 15, fontWeight: '900' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, borderTopWidth: 1, borderTopColor: '#EFF0F5' }, icon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, iconPositive: { backgroundColor: '#E7F7EF' }, iconNegative: { backgroundColor: '#FCEBEC' }, iconText: { color: '#313750', fontWeight: '900', fontSize: 18 }, itemMain: { flex: 1, minWidth: 0, gap: 3 }, itemTitle: { color: '#272A45', fontSize: 12, fontWeight: '800' }, date: { color: '#858BA0', fontSize: 10 }, type: { color: '#A0A5B5', fontSize: 9, textTransform: 'capitalize' }, amount: { fontSize: 12, fontWeight: '900', textAlign: 'right' }, amountPositive: { color: '#188454' }, amountNegative: { color: '#B42318' }, coinUnit: { color: '#858BA0', fontSize: 9, fontWeight: '600' },
  error: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, gap: 7 }, errorText: { color: '#A32929', fontSize: 12 }, retry: { color: '#5558E8', fontWeight: '800', fontSize: 12 }, more: { alignItems: 'center', padding: 13, backgroundColor: '#F3F4FF', borderRadius: 10 }, moreText: { color: '#4548C5', fontWeight: '800', fontSize: 12 }, endNote: { color: '#A0A5B5', textAlign: 'center', fontSize: 10, paddingVertical: 12 },
});
