import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';
const root = path.resolve('apps/mobile');
const files = [
  'App.tsx',
  'src/services/feature-i18n.ts',
  'src/components/ActivityHistoryPanel.tsx',
  'src/components/WithdrawalCenterPanel.tsx',
  'src/components/DailyCheckinPanel.tsx',
  'src/services/daily-checkin.service.ts',
];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${file}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
}
const langs = ['en','ar','fr','es','pt','de','tr','hi','zh'];
const translations = fs.readFileSync(path.join(root, 'src/services/feature-i18n.ts'), 'utf8');
for (const lang of langs) assert.match(translations, new RegExp(`^  ${lang}: \\{`, 'm'));
assert.doesNotMatch(translations, /\bha\s*:/);
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
assert.match(app, /<DailyCheckinPanel language=\{language\}/);
assert.match(app, /<ActivityHistoryPanel userId=\{session\.user\.id\} language=\{language\}/);
assert.match(app, /<WithdrawalCenterPanel userId=\{session\.user\.id\} language=\{language\}/);
const daily = fs.readFileSync(path.join(root, 'src/components/DailyCheckinPanel.tsx'), 'utf8');
assert.doesNotMatch(daily, /Karɓi|ɗ|ƙ|Babu check-in|An tabbatar/);
const service = fs.readFileSync(path.join(root, 'src/services/daily-checkin.service.ts'), 'utf8');
assert.doesNotMatch(service, /karɓi|ɗinku|ƙare|Kun riga|Ba a kunna/);
assert.match(service, /already claimed today’s reward/i);
console.log('Step52 feature localization checks: 12/12 passed');
