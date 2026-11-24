from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
sql=(root/'supabase/migrations/028_levelplay_interstitial_banner.sql').read_text()
admin=(root/'apps/admin/src/features/rewards/AdminLevelPlay.tsx').read_text()
service=(root/'apps/mobile/src/services/levelplay-rewarded.service.ts').read_text()
banner=(root/'apps/mobile/src/components/LevelPlayBannerPanel.tsx').read_text()
app=(root/'apps/mobile/App.tsx').read_text()
checks={
 'migration extends all formats': all(x in sql for x in ['interstitial_enabled','interstitial_ad_unit_id','interstitial_placement_name','banner_enabled','banner_ad_unit_id','banner_placement_name']),
 'migration seeds exact owner-provided ad units and placements': all(x in sql for x in ['q18qwpr5ofs8gi84','BP_Rewarded_Android','t59334kmc1nzmzuv','BP_Interstitial_Android','q7hv6pyis1rd4v9x','BP_Banner_Android']),
 'all formats default disabled': 'boolean not null default false' in sql,
 'member RPC excludes private reward conversion and secrets': "'coins_per_reward'" not in sql.split('create or replace function public.get_levelplay_mobile_config()',1)[1] and 'LEVELPLAY_S2S_PRIVATE_KEY' not in sql,
 'admin writer audit logs changes': "'levelplay_reward_config_update'" in sql and 'public.admin_audit_logs' in sql,
 'rewarded client callback does not credit coins': 'process_levelplay_reward' not in service and 'wallet_ledger' not in service,
 'interstitial respects cooldown and placement cap': 'INTERSTITIAL_COOLDOWN_MS' in service and 'isPlacementCapped(placement)' in service,
 'banner is initialized and destroyed through SDK lifecycle': 'ensureInitialized(userId)' in banner and 'onLayout' in banner and 'destroy()' in banner,
 'banner is mounted in Earn view': 'LevelPlayBannerPanel userId={session.user.id}' in app,
 'interstitial is only checked on Earn tab exit': "tab === 'Earn' && item !== 'Earn'" in app,
 'all three formats are managed in admin UI': all(x in admin for x in ['interstitial_enabled','banner_enabled','Rewarded Video','Interstitial','Banner']),
}
for name,ok in checks.items(): print(('PASS' if ok else 'FAIL')+' - '+name)
print(f'\n{sum(checks.values())}/{len(checks)} all-format checks passed')
if not all(checks.values()): raise SystemExit(1)
