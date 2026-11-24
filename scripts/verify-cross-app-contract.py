from pathlib import Path

root = Path(__file__).resolve().parents[1]
mobile = root / 'apps/mobile'
admin = root / 'apps/admin'
checks = []
def check(label, ok):
    checks.append((label, bool(ok)))
    print(('PASS' if ok else 'FAIL') + ' ' + label)

app = (mobile / 'App.tsx').read_text()
member = (mobile / 'src/services/member.service.ts').read_text()
mobile_sb = (mobile / 'src/lib/supabase.ts').read_text()
admin_main = (admin / 'src/main.tsx').read_text()
levelplay_mobile = (mobile / 'src/services/levelplay-rewarded.service.ts').read_text()
levelplay_admin = (admin / 'src/features/rewards/AdminLevelPlay.tsx').read_text()
migration = (root / 'supabase/migrations/026_levelplay_rewarded_s2s.sql').read_text()
runtime_migration = (root / 'supabase/migrations/027_levelplay_mobile_runtime_config.sql').read_text()

check('member app uses Supabase public URL + anon key', 'EXPO_PUBLIC_SUPABASE_URL' in mobile_sb and 'EXPO_PUBLIC_SUPABASE_ANON_KEY' in mobile_sb)
check('member auth persists with SecureStore', 'expo-secure-store' in mobile_sb and 'persistSession: true' in mobile_sb)
check('member dashboard reads profile and wallet through member service', 'memberService.getSnapshot' in app and 'wallet_accounts' in member)
check('member country selection calls set_member_country RPC', "rpc('set_member_country'" in member)
check('member reward panels are routed in Earn tab', all(x in app for x in ['<SpinWheelPanel', '<QuizRewardsPanel', '<DailyCheckinPanel', '<RewardedAdsPanel']))
check('admin entry gate calls is_active_admin and fails closed', "rpc('is_active_admin')" in admin_main and "setAdminGate('denied')" in admin_main)
check('LevelPlay admin uses audited config RPCs', "rpc('admin_get_levelplay_reward_config')" in levelplay_admin and "rpc('admin_update_levelplay_reward_config'" in levelplay_admin)
check('LevelPlay server RPC requires configuration admin', 'is_configuration_admin()' in migration)
check('LevelPlay client callback never credits wallet coins', 'process_levelplay_reward' not in levelplay_mobile and not any(token in levelplay_mobile for token in ['creditCoins(', 'addCoins(', 'incrementWallet(', 'wallet_accounts']) and 'onAdRewarded' in levelplay_mobile and 'server must verify it before coins appear' in levelplay_mobile)
check('LevelPlay mobile reads authenticated runtime config RPC', "rpc('get_levelplay_mobile_config')" in levelplay_mobile and 'refreshConfig' in levelplay_mobile)
check('LevelPlay Admin and member app share database runtime config', 'p_ad_unit_id:' in levelplay_admin and 'ad_unit_id' in runtime_migration and "rpc('get_levelplay_mobile_config')" in levelplay_mobile)

failed = [label for label, ok in checks if not ok]
print(f'\n{len(checks)-len(failed)}/{len(checks)} cross-app source contract checks passed.')
if failed:
    raise SystemExit('Failed: ' + '; '.join(failed))
