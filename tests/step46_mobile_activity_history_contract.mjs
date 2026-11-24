import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const app = fs.readFileSync(path.join(root, 'apps/mobile/App.tsx'), 'utf8');
const panel = fs.readFileSync(path.join(root, 'apps/mobile/src/components/ActivityHistoryPanel.tsx'), 'utf8');
const service = fs.readFileSync(path.join(root, 'apps/mobile/src/services/activity.service.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/001_initial_schema.sql'), 'utf8');
const safety = fs.readFileSync(path.join(root, 'supabase/migrations/004_wallet_read_safety.sql'), 'utf8');
const checks = [
  ['Activity panel is imported by the native app', app.includes("import { ActivityHistoryPanel } from './src/components/ActivityHistoryPanel';")],
  ['Activity tab renders the signed-in member panel', /tab === 'Activity' && <ActivityHistoryPanel userId=\{session\.user\.id\} language=\{language\}/.test(app)],
  ['Reads the existing wallet_ledger table', service.includes(".from('wallet_ledger')")],
  ['Selects only known ledger display fields', service.includes("select('id,entry_type,amount_coins,description,created_at')")],
  ['Scopes query to the signed-in user ID', service.includes('.eq(\'user_id\', userId)')],
  ['Uses newest-first stable ordering', service.includes(".order('created_at', { ascending: false })") && service.includes(".order('id', { ascending: false })")],
  ['Uses bounded pagination', service.includes('const PAGE_SIZE = 25;') && service.includes('.range(from, to)') && panel.includes("ft(language, 'loadMore')")],
  ['Supports refresh and load-more actions', panel.includes('Refresh') && panel.includes("ft(language, 'loadMore')") && panel.includes('Try again') && panel.includes('RefreshControl')],
  ['Does not add direct wallet writes', !/\.(insert|update|upsert|delete)\(/.test(service)],
  ['Base schema has own-ledger RLS policy', migration.includes('create policy "Users read own ledger"') && safety.includes('wallet_ledger')],
];
for (const [name, passed] of checks) {
  assert.equal(passed, true, name);
  process.stdout.write(`PASS ${name}\n`);
}
process.stdout.write(`\n${checks.length}/${checks.length} Step46 contract checks passed.\n`);
