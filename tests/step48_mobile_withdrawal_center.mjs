import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../apps/mobile/App.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../apps/mobile/src/services/withdrawal.service.ts', import.meta.url), 'utf8');
const panel = readFileSync(new URL('../apps/mobile/src/components/WithdrawalCenterPanel.tsx', import.meta.url), 'utf8');
const web = readFileSync(new URL('../apps/web/src/withdrawals/WithdrawalHistory.tsx', import.meta.url), 'utf8');
const checks = [
  ['Withdrawal tab is registered', /'Withdrawals'/.test(app)],
  ['Withdrawal panel is rendered for its tab', /tab === 'Withdrawals' && <WithdrawalCenterPanel/.test(app)],
  ['Home dashboard links to Withdrawal Center', /title=\{tr\('withdrawals'\)\}/.test(app)],
  ['Panel uses the mobile withdrawal service', /withdrawalService\.getMemberOverview/.test(panel)],
  ['Service validates authenticated member identity', /auth\.user\.id !== expectedUserId/.test(service)],
  ['History query is scoped to authenticated user', /\.eq\('user_id', auth\.user\.id\)/.test(service)],
  ['History query is newest-first and bounded', /\.order\('requested_at', \{ ascending: false \}\)[\s\S]*?\.limit\(50\)/.test(service)],
  ['Only safe history columns are selected', /rejection_reason/.test(service) && !/account_number|paypal_email|recipient_token/.test(service)],
  ['Withdrawal config is read-only', /from\('withdrawal_config'\)[\s\S]*?\.select\('min_coins,max_coins,fee_bps,is_enabled'\)/.test(service)],
  ['No create-withdrawal RPC exists in mobile service', !/\.rpc\(['"]create_(?:us_paypal_)?withdrawal_request/.test(service)],
  ['No payout Worker submission exists in panel', !/fetch\(|create_withdrawal_request|create_us_paypal_withdrawal_request/.test(panel)],
  ['Panel explicitly keeps new requests disabled', /ft\(language, 'withdrawLockedBody'\)/.test(panel) && /withdrawLockedBody:/.test(readFileSync(new URL('../apps/mobile/src/services/feature-i18n.ts', import.meta.url), 'utf8'))],
  ['Panel displays withdrawal status and amount', /item\.status/.test(panel) && /item\.amount_coins/.test(panel)],
  ['Panel offers refresh and error recovery', /Refresh/.test(panel) && /Try again/.test(panel)],
  ['Existing Web workflow remains unchanged', /create_withdrawal_request/.test(web) && /create_us_paypal_withdrawal_request/.test(web)],
];
for (const [name, ok] of checks) { assert.equal(ok, true, name); console.log(`PASS ${name}`); }
console.log(`Step48 mobile withdrawal center: ${checks.length}/${checks.length} passed`);
