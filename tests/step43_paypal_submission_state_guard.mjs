import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('../supabase/migrations/033_paypal_submission_state_guard.sql', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../cloudflare/paypal-payout/src/index.ts', import.meta.url), 'utf8');
const checks = [
  ['locks the payout attempt before transition', /where withdrawal_id = p_withdrawal_id\s+for update/i.test(sql)],
  ['rejects conflicting provider batch or item references', /paypal_provider_reference_conflict/.test(sql)],
  ['prevents submitted state regression', /paypal_submission_state_regression/.test(sql)],
  ['requires provider references as a pair', /provider_reference_pair_required/.test(sql)],
  ['requires provider references for confirmed submission', /provider_reference_required_for_submission/.test(sql)],
  ['rejects terminal payout attempts', /payout_attempt_terminal/.test(sql)],
  ['only service_role can execute the function', /revoke all on function public\.paypal_record_submission[\s\S]*?from public, anon, authenticated;[\s\S]*?grant execute[\s\S]*?to service_role;/i.test(sql)],
  ['worker records confirmed provider batch and stable item ID', /p_provider_batch_id: providerBatch, p_provider_item_id: claim\.withdrawal_id/.test(worker)],
  ['worker marks ambiguous provider response for reconciliation', /p_ambiguous: true, p_rejected: false/.test(worker)],
  ['worker quarantines definitive 4xx rejection', /p_ambiguous: ambiguous, p_rejected: rejected/.test(worker)],
];
for (const [name, ok] of checks) {
  assert.equal(ok, true, name);
  console.log(`PASS ${name}`);
}
console.log(`\n${checks.length}/${checks.length} Step43 SQL/Worker contract checks passed.`);
