from pathlib import Path

root = Path(__file__).resolve().parents[1]
feature = (root / 'apps/admin/src/features/rewards/AdminLevelPlay.tsx').read_text()
main = (root / 'apps/admin/src/main.tsx').read_text()
sql = (root / 'supabase/migrations/028_levelplay_interstitial_banner.sql').read_text()
checks = {
    'Admin page calls the exact read RPC': "rpc('admin_get_levelplay_reward_config')" in feature,
    'Admin page calls the exact write RPC': "rpc('admin_update_levelplay_reward_config'" in feature,
    'Write RPC argument names match Migration 028 for all formats': all(x in feature for x in ['p_is_enabled:', 'p_app_key:', 'p_ad_unit_id:', 'p_placement_name:', 'p_expected_reward_amount:', 'p_coins_per_reward:', 'p_interstitial_enabled:', 'p_interstitial_ad_unit_id:', 'p_interstitial_placement_name:', 'p_banner_enabled:', 'p_banner_ad_unit_id:', 'p_banner_placement_name:']),
    'Admin UI validates each enabled format': all(x in feature for x in ['!config.app_key?.trim()', '!config.ad_unit_id?.trim()', '!config.placement_name?.trim()', '!config.interstitial_ad_unit_id?.trim()', '!config.interstitial_placement_name?.trim()', '!config.banner_ad_unit_id?.trim()', '!config.banner_placement_name?.trim()', 'expected<=0', 'coins<=0']),
    'Enable action warns about S2S verification': 'Cloudflare S2S verification have been tested' in feature,
    'No private S2S key input is present': 'LEVELPLAY_S2S_PRIVATE_KEY' not in feature and 'private_key' not in feature.lower(),
    'Page is imported and routed': "from './features/rewards/AdminLevelPlay'" in main and "activeView === 'levelplay'" in main,
    'Admin access gate remains fail-closed': "rpc('is_active_admin')" in main and "setAdminGate(!error && data === true ? 'allowed' : 'denied')" in main,
    'Database RPC independently checks configuration-admin role': 'not public.is_configuration_admin()' in sql,
    'Database RPC enforces required fields for all formats': all(x in sql for x in ['p_is_enabled','v_app_key is null','v_rewarded_unit is null','v_rewarded_place is null','v_interstitial_unit is null','v_interstitial_place is null','v_banner_unit is null','v_banner_place is null']),
    'Database update records audit log': "'levelplay_reward_config_update'" in sql and 'public.admin_audit_logs' in sql,
    'Anonymous/public execute is revoked': 'from public,anon' in sql and 'grant execute' in sql,
    'Interstitial and Banner remain independent non-reward formats': 'interstitial_enabled' in sql and 'banner_enabled' in sql and "'coins_per_reward'" not in sql.split('create or replace function public.get_levelplay_mobile_config()',1)[1],
}
for label, ok in checks.items():
    print(('PASS' if ok else 'FAIL') + ' - ' + label)
failed = [k for k,v in checks.items() if not v]
print(f"\n{len(checks)-len(failed)}/{len(checks)} LevelPlay Admin source checks passed")
raise SystemExit(bool(failed))
