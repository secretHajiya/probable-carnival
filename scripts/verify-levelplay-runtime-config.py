from pathlib import Path
root = Path(__file__).resolve().parents[1]
sql = (root / 'supabase/migrations/028_levelplay_interstitial_banner.sql').read_text()
admin = (root / 'apps/admin/src/features/rewards/AdminLevelPlay.tsx').read_text()
mobile = (root / 'apps/mobile/src/services/levelplay-rewarded.service.ts').read_text()
panel = (root / 'apps/mobile/src/components/RewardedAdsPanel.tsx').read_text()
checks = {
    'Migration 027 adds rewarded ad unit id': 'add column if not exists ad_unit_id text' in (root / 'supabase/migrations/027_levelplay_mobile_runtime_config.sql').read_text(),
    'member RPC requires authentication': "if auth.uid() is null" in sql,
    'member RPC only returns public identifiers for all formats': all(x in sql for x in ["'app_key'", "'rewarded_ad_unit_id'", "'rewarded_placement_name'", "'interstitial_ad_unit_id'", "'interstitial_placement_name'", "'banner_ad_unit_id'", "'banner_placement_name'"]),
    'member RPC does not return reward conversion': "'coins_per_reward'" not in sql.split('create or replace function public.get_levelplay_mobile_config()',1)[1],
    'member RPC excludes anon': 'revoke all on function public.get_levelplay_mobile_config() from public,anon' in sql,
    'admin UI sends ad unit ID': 'p_ad_unit_id:' in admin,
    'admin UI requires ad unit before enable': "!config.ad_unit_id?.trim()" in admin,
    'mobile fetches runtime RPC': "rpc('get_levelplay_mobile_config')" in mobile,
    'mobile does not use build-time LevelPlay config': 'EXPO_PUBLIC_LEVELPLAY_APP_KEY' not in mobile and 'EXPO_PUBLIC_LEVELPLAY_S2S_READY' not in mobile,
    'mobile client never credits wallet': 'process_levelplay_reward' not in mobile and 'wallet_ledger' not in mobile,
    'panel loads runtime config and initializes configured formats': 'getRuntimeConfig(true)' in panel and 'ensureInitialized(userId)' in panel,
    'interstitial service uses placement cap and five-minute cooldown': 'isPlacementCapped(placement)' in mobile and 'INTERSTITIAL_COOLDOWN_MS' in mobile,
    'banner component initializes before rendering and loads on layout': (root / 'apps/mobile/src/components/LevelPlayBannerPanel.tsx').exists() and 'ensureInitialized(userId)' in (root / 'apps/mobile/src/components/LevelPlayBannerPanel.tsx').read_text() and 'onLayout' in (root / 'apps/mobile/src/components/LevelPlayBannerPanel.tsx').read_text(),
    'mobile interstitial and banner paths never credit coins': 'process_levelplay_reward' not in mobile and 'wallet_ledger' not in mobile,
}
for name, ok in checks.items(): print(('PASS' if ok else 'FAIL') + ' ' + name)
if not all(checks.values()): raise SystemExit(1)
print(f'PASS {len(checks)}/{len(checks)} LevelPlay runtime configuration checks')
