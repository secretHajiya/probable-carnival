import React, { useEffect, useState } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { DirectionalText as Text } from './DirectionProvider';
import { levelPlayRewardedService } from '../services/levelplay-rewarded.service';
import { localizedAdsStatus, sqa } from '../services/spin-quiz-ads-i18n';
import type { MemberLanguage } from '../services/profile-settings.service';

type Props = { userId: string; onWalletRefresh: () => void; language: MemberLanguage };

export function RewardedAdsPanel({ userId, onWalletRefresh, language }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(sqa(language, 'adsNotEnabled'));
  const [completed, setCompleted] = useState(false);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    let mounted = true;
    void levelPlayRewardedService.getRuntimeConfig(true).then(async config => { if (mounted) { setConfigured(config.rewarded_enabled); setStatus(config.rewarded_enabled ? sqa(language, 'adsReady') : sqa(language, 'adsDisabled')); } if (config.app_key && (config.rewarded_enabled || config.interstitial_enabled || config.banner_enabled)) await levelPlayRewardedService.ensureInitialized(userId); }).catch(() => { if (mounted) setStatus(sqa(language, 'adsUnavailable')); });
    levelPlayRewardedService.setCallbacks({
      onStatus: (message) => setStatus(localizedAdsStatus(language, message)),
      onRewardedClientEvent: () => setCompleted(true),
      onClosed: () => undefined,
    });
    return () => { mounted = false; levelPlayRewardedService.setCallbacks({}); };
  }, [userId, language]);

  async function watchAd() {
    setBusy(true);
    setCompleted(false);
    try {
      await levelPlayRewardedService.show(userId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : sqa(language, 'adStartFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E6E8F3' }}>
      <Text style={{ color: '#242743', fontSize: 15, fontWeight: '900' }}>{sqa(language, 'adsTitle')}</Text>
      <Text style={{ color: '#858BA0', fontSize: 12, lineHeight: 18 }}>
        {sqa(language, 'adsSafety')}
      </Text>
      <TouchableOpacity
        onPress={watchAd}
        disabled={busy || !configured}
        style={{ backgroundColor: '#5558E8', borderRadius: 12, padding: 14, alignItems: 'center', opacity: busy || !configured ? 0.55 : 1 }}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{configured ? sqa(language, 'watchAd') : sqa(language, 'adsNotConfigured')}</Text>}
      </TouchableOpacity>
      <Text accessibilityLiveRegion="polite" style={{ color: '#626982', fontSize: 11, lineHeight: 17 }}>{status}</Text>
      {completed && <TouchableOpacity onPress={onWalletRefresh} style={{ paddingVertical: 8 }}><Text style={{ color: '#4447C8', fontWeight: '800', fontSize: 12 }}>{sqa(language, 'refreshWallet')}</Text></TouchableOpacity>}
    </View>
  );
}
