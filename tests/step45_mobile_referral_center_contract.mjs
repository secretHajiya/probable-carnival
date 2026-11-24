import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const app = readFileSync(resolve(root, 'apps/mobile/App.tsx'), 'utf8');
const panel = readFileSync(resolve(root, 'apps/mobile/src/components/ReferralCenterPanel.tsx'), 'utf8');
const migration = readFileSync(resolve(root, 'supabase/migrations/003_referral_system.sql'), 'utf8');
const checks = [
  ['Referral Center is a mobile navigation tab', /type Tab = .*'Referrals'/.test(app) && /'Home','Earn','Activity','Referrals'[\s\S]*'Profile'/.test(app)],
  ['Home dashboard links to Invite friends', /title=\{tr\('inviteFriends'\)\}[^>]*onPress=\{\(\) => setTab\('Referrals'\)\}/.test(app)],
  ['Referral panel is rendered for signed-in member', /tab === 'Referrals' && <ReferralCenterPanel userId=\{session\.user\.id\}/.test(app)],
  ['Invite code is read from own profile', /from\('profiles'\)\.select\('referral_code,referred_by'\)\.eq\('id', userId\)/.test(panel)],
  ['Referral history is limited to current member and bounded', /from\('referrals'\)\.select\('id,status,created_at,qualified_at'\)\.eq\('referrer_user_id', userId\).*\.limit\(100\)/.test(panel)],
  ['Applying a code uses the existing server RPC', /rpc\('apply_referral_code',\s*\{\s*p_code: applyCode\.trim\(\)\.toUpperCase\(\)/.test(panel)],
  ['Native share sheet is used for invite code', /Share\.share\(\{ message: t\('shareMessage', \{ code \}\) \}\)/.test(panel)],
  ['Referral reward qualification remains service-role only', /grant execute on function public\.qualify_referral\(uuid\) to service_role/.test(migration)],
  ['Referral reward config defaults disabled', /is_enabled boolean not null default false/.test(migration)],
  ['No client-side wallet credit is introduced', !/wallet_accounts|wallet_ledger|qualify_referral/.test(panel)],
];
for (const [name, pass] of checks) { console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`); assert.ok(pass, name); }
console.log(`Step45 mobile referral checks: ${checks.length}/${checks.length} passed`);
