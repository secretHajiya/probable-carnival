import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text, DirectionalTextInput as TextInput } from './DirectionProvider';
import { requireSupabase } from '../lib/supabase';
import { rit } from '../services/referral-inbox-i18n';
import type { MemberLanguage } from '../services/profile-settings.service';

type ReferralStatus = 'pending' | 'qualified' | 'rewarded' | 'rejected';
type ReferralItem = { id: string; status: ReferralStatus; created_at: string; qualified_at: string | null };

type Props = { userId: string; language: MemberLanguage };

export function ReferralCenterPanel({ userId, language }: Props) {
  const t = (key: Parameters<typeof rit>[1], vars?: Record<string, string>) => rit(language, key, vars);
  const [code, setCode] = useState('');
  const [hasAppliedCode, setHasAppliedCode] = useState(false);
  const [items, setItems] = useState<ReferralItem[]>([]);
  const [applyCode, setApplyCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const db = requireSupabase();
      const [profileResult, referralResult] = await Promise.all([
        db.from('profiles').select('referral_code,referred_by').eq('id', userId).single(),
        db.from('referrals').select('id,status,created_at,qualified_at').eq('referrer_user_id', userId).order('created_at', { ascending: false }).limit(100),
      ]);
      if (profileResult.error) throw profileResult.error;
      if (referralResult.error) throw referralResult.error;
      setCode(profileResult.data?.referral_code || '');
      setHasAppliedCode(Boolean(profileResult.data?.referred_by));
      setItems((referralResult.data || []) as ReferralItem[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('referralLoadError'));
    } finally {
      setLoading(false);
    }
  }, [userId, language]);

  useEffect(() => { void load(); }, [load]);

  async function shareCode() {
    if (!code) return;
    try {
      await Share.share({ message: t('shareMessage', { code }) });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('referralShareError'));
    }
  }

  async function applyCodeNow() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data, error: rpcError } = await requireSupabase().rpc('apply_referral_code', {
        p_code: applyCode.trim().toUpperCase(),
      });
      if (rpcError) throw rpcError;
      if (!data?.ok) throw new Error(data?.reason || t('referralInvalid'));
      setMessage(t('referralApplied'));
      setApplyCode('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('referralApplyError'));
    } finally {
      setBusy(false);
    }
  }

  const count = (status: ReferralStatus) => items.filter(item => item.status === status).length;
  const statusLabel: Record<ReferralStatus, string> = {
    pending: t('pending'), qualified: t('qualified'), rewarded: t('rewarded'), rejected: t('rejected'),
  };

  return <View style={{ gap: 14 }}>
    <Text style={{ color: '#191C38', fontSize: 25, fontWeight: '900' }}>{t('referralTitle')}</Text>
    <Text style={{ color: '#737A91', fontSize: 13, lineHeight: 20 }}>{t('referralIntro')}</Text>
    {!!error && <Text accessibilityRole="alert" style={{ color: '#B42318', fontSize: 12 }}>{error}</Text>}
    {!!message && <Text accessibilityRole="status" style={{ color: '#16734B', fontSize: 12 }}>{message}</Text>}

    <View style={{ backgroundColor: '#191B59', borderRadius: 18, padding: 18, gap: 10 }}>
      <Text style={{ color: '#C9CAFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 }}>{t('inviteCode')}</Text>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text selectable style={{ color: '#FFFFFF', fontSize: 23, fontWeight: '900', letterSpacing: 1 }}>{code || t('notAssigned')}</Text>}
      <Text style={{ color: '#C5C7F5', fontSize: 11, lineHeight: 17 }}>{t('inviteHelp')}</Text>
      <TouchableOpacity disabled={!code || loading} onPress={() => void shareCode()} style={{ backgroundColor: '#5558E8', borderRadius: 12, padding: 13, alignItems: 'center', opacity: !code || loading ? 0.55 : 1 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{t('shareCode')}</Text>
      </TouchableOpacity>
    </View>

    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, gap: 10, borderWidth: 1, borderColor: '#EAECF4' }}>
      <Text style={{ color: '#222641', fontSize: 15, fontWeight: '900' }}>{t('activity')}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[
          [t('total'), String(items.length)], [t('pending'), String(count('pending'))],
          [t('qualified'), String(count('qualified'))], [t('rewarded'), String(count('rewarded'))],
        ].map(([label, value]) => <View key={label} style={{ alignItems: 'center', gap: 4 }}><Text style={{ color: '#858BA0', fontSize: 10 }}>{label}</Text><Text style={{ color: '#242743', fontSize: 17, fontWeight: '900' }}>{loading ? '—' : value}</Text></View>)}
      </View>
    </View>

    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, gap: 10, borderWidth: 1, borderColor: '#EAECF4' }}>
      <Text style={{ color: '#222641', fontSize: 15, fontWeight: '900' }}>{t('haveCode')}</Text>
      <Text style={{ color: '#858BA0', fontSize: 11, lineHeight: 17 }}>{t('oneCode')}</Text>
      {hasAppliedCode ? <Text style={{ color: '#16734B', fontWeight: '700', fontSize: 12 }}>{t('alreadyApplied')}</Text> : <>
        <TextInput value={applyCode} onChangeText={value => setApplyCode(value.toUpperCase())} maxLength={32} autoCapitalize="characters" autoCorrect={false} placeholder={t('enterCode')} placeholderTextColor="#9298AC" style={{ backgroundColor: '#F8F9FC', borderColor: '#DDE1EF', borderWidth: 1, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 12, color: '#171A31' }} />
        <TouchableOpacity disabled={busy || applyCode.trim().length < 4} onPress={() => void applyCodeNow()} style={{ backgroundColor: '#5558E8', borderRadius: 12, padding: 13, alignItems: 'center', opacity: busy || applyCode.trim().length < 4 ? 0.55 : 1 }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{busy ? t('applying') : t('applyCode')}</Text>
        </TouchableOpacity>
      </>}
    </View>

    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, gap: 10, borderWidth: 1, borderColor: '#EAECF4' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: '#222641', fontSize: 15, fontWeight: '900' }}>{t('invitedMembers')}</Text>
        <TouchableOpacity onPress={() => void load()} disabled={loading}><Text style={{ color: '#5558E8', fontWeight: '800', fontSize: 11 }}>{t('refresh')}</Text></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator color="#5558E8" /> : items.length === 0 ? <Text style={{ color: '#858BA0', fontSize: 12 }}>{t('noReferrals')}</Text> : items.map(item => <View key={item.id} style={{ paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#EFF0F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View><Text style={{ color: '#272A45', fontWeight: '800', fontSize: 12 }}>{t('referral')}</Text><Text style={{ color: '#858BA0', fontSize: 10 }}>{new Date(item.created_at).toLocaleDateString()}</Text></View>
        <Text style={{ color: item.status === 'rewarded' ? '#16734B' : '#5558E8', fontSize: 10, fontWeight: '900' }}>{statusLabel[item.status]}</Text>
      </View>)}
    </View>
    <Text style={{ color: '#9298AC', fontSize: 10, lineHeight: 15 }}>{t('referralSafety')}</Text>
  </View>;
}
