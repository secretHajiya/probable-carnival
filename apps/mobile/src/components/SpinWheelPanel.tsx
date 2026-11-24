import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text } from './DirectionProvider';
import { spinWheelService, type SpinHistoryItem, type SpinSegment, type SpinWheelSnapshot } from '../services/spin-wheel.service';
import { sqa } from '../services/spin-quiz-ads-i18n';
import type { MemberLanguage } from '../services/profile-settings.service';

const PALETTE = ['#5B55D9', '#F1A83B', '#168B78', '#E66B83', '#3978CF', '#9460B5', '#C47A32', '#278FA6'];

export function SpinWheelPanel({ onWalletRefresh, language }: { onWalletRefresh: () => void; language: MemberLanguage }) {
  const [snapshot, setSnapshot] = useState<SpinWheelSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const rotation = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setSnapshot(await spinWheelService.getSnapshot()); }
    catch (e) { setError(e instanceof Error ? e.message : sqa(language, 'spinLoadFailed')); }
    finally { setLoading(false); }
  }, [language]);
  useEffect(() => { void load(); }, [load]);

  const segments = snapshot?.segments ?? [];
  const spin = async () => {
    if (busy || !snapshot?.enabled || segments.length < 2) return;
    setBusy(true); setError(''); setNotice('');
    try {
      // The database chooses and credits the outcome. Animation only presents that server result.
      const result = await spinWheelService.spin();
      const index = Math.max(0, segments.findIndex(s => s.key === result.reward_key));
      const turns = 5 + ((segments.length - index) / segments.length);
      rotation.setValue(0);
      await new Promise<void>(resolve => Animated.timing(rotation, {
        toValue: turns, duration: 4200, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }).start(() => resolve()));
      setNotice(sqa(language, 'spinWon', { label: result.reward_label, coins: Number(result.reward_coins).toLocaleString() }));
      onWalletRefresh();
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : sqa(language, 'spinFailed')); await load(); }
    finally { setBusy(false); }
  };

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const history = snapshot?.history ?? [];

  return <View style={st.card}>
    <View style={st.headingRow}><View style={{ flex: 1 }}><Text style={st.title}>{sqa(language, 'spinTitle')}</Text><Text style={st.sub}>{sqa(language, 'spinSubtitle')}</Text></View><TouchableOpacity onPress={() => void load()} disabled={loading || busy}><Text style={st.refresh}>{sqa(language, 'refresh')}</Text></TouchableOpacity></View>
    {loading ? <ActivityIndicator color="#5558E8" /> : !snapshot?.enabled ? <View style={st.off}><Text style={st.offTitle}>{sqa(language, 'spinUnavailable')}</Text><Text style={st.sub}>{sqa(language, 'adminDisabled')}</Text></View> : <>
      <View style={st.wheelArea}>
        <View style={st.pointer}><Text style={st.pointerText}>▼</Text></View>
        <Animated.View style={[st.wheel, { transform: [{ rotate }] }]}>
          {segments.map((segment, index) => <SegmentChip key={segment.key} segment={segment} index={index} total={segments.length} />)}
          <View style={st.hub}><Text style={st.hubText}>VYRA</Text></View>
        </Animated.View>
      </View>
      <Text style={st.subCenter}>{snapshot.dailyFreeSpins} {sqa(language, 'freeSpins')}</Text>
      <TouchableOpacity style={[st.button, busy && st.buttonDisabled]} onPress={() => void spin()} disabled={busy || segments.length < 2}>
        <Text style={st.buttonText}>{busy ? sqa(language, 'spinning') : sqa(language, 'spinNow')}</Text>
      </TouchableOpacity>
    </>}
    {!!notice && <Text style={st.success}>{notice}</Text>}
    {!!error && <Text style={st.error}>{error}</Text>}
    {history.length > 0 && <View style={st.history}><Text style={st.historyTitle}>{sqa(language, 'recentSpins')}</Text>{history.slice(0, 5).map(item => <HistoryRow key={item.id} item={item} />)}</View>}
  </View>;
}

function SegmentChip({ segment, index, total }: { segment: SpinSegment; index: number; total: number }) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  const radius = 78;
  return <View style={[st.segment, { backgroundColor: PALETTE[index % PALETTE.length], left: 120 + Math.cos(angle) * radius - 32, top: 120 + Math.sin(angle) * radius - 19 }]}>
    <Text numberOfLines={2} style={st.segmentText}>{segment.label}</Text>
  </View>;
}
function HistoryRow({ item }: { item: SpinHistoryItem }) {
  return <View style={st.historyRow}><Text style={st.historyLabel}>{item.reward_label}</Text><Text style={st.historyCoins}>+{Number(item.reward_coins).toLocaleString()}</Text></View>;
}

const st = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E6E8F3' },
  headingRow: { flexDirection: 'row', alignItems: 'center' }, title: { color: '#222641', fontSize: 17, fontWeight: '900' },
  sub: { color: '#858BA0', fontSize: 11, lineHeight: 16 }, refresh: { color: '#5558E8', fontWeight: '800', fontSize: 12, padding: 8 },
  off: { backgroundColor: '#F6F6FC', borderRadius: 13, padding: 14, gap: 5 }, offTitle: { color: '#292C4A', fontWeight: '900', fontSize: 13 },
  wheelArea: { alignItems: 'center', justifyContent: 'center', height: 254, marginTop: 4 }, wheel: { width: 240, height: 240, borderRadius: 120, backgroundColor: '#ECECFA', borderWidth: 8, borderColor: '#D8D9F2', position: 'relative', overflow: 'hidden' },
  pointer: { position: 'absolute', zIndex: 3, top: 0, alignItems: 'center' }, pointerText: { color: '#D34E63', fontSize: 27, fontWeight: '900' },
  segment: { position: 'absolute', width: 64, minHeight: 38, borderRadius: 10, padding: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF88' }, segmentText: { color: '#FFF', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  hub: { position: 'absolute', left: 85, top: 85, width: 54, height: 54, borderRadius: 27, backgroundColor: '#FFF', borderWidth: 4, borderColor: '#5558E8', alignItems: 'center', justifyContent: 'center' }, hubText: { color: '#5558E8', fontSize: 10, fontWeight: '900' },
  subCenter: { color: '#858BA0', fontSize: 10, textAlign: 'center' }, button: { backgroundColor: '#5558E8', borderRadius: 13, padding: 15, alignItems: 'center' }, buttonDisabled: { opacity: .6 }, buttonText: { color: '#FFF', fontWeight: '900', letterSpacing: 1 },
  success: { color: '#16734B', fontSize: 12, fontWeight: '800' }, error: { color: '#B42318', fontSize: 12 }, history: { borderTopWidth: 1, borderTopColor: '#EFF0F5', paddingTop: 10, gap: 8 }, historyTitle: { color: '#292C4A', fontWeight: '900', fontSize: 12 }, historyRow: { flexDirection: 'row', justifyContent: 'space-between' }, historyLabel: { color: '#747B91', fontSize: 11 }, historyCoins: { color: '#16734B', fontWeight: '900', fontSize: 11 },
});
