import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceFiles = [
  'App.tsx',
  'src/services/referral-inbox-i18n.ts',
  'src/components/ReferralCenterPanel.tsx',
  'src/components/MemberInboxPanel.tsx',
];
for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${file}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
}

const i18nPath = path.join(root, 'src/services/referral-inbox-i18n.ts');
const i18nText = fs.readFileSync(i18nPath, 'utf8');
const ast = ts.createSourceFile(i18nPath, i18nText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let messagesNode;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'messages') messagesNode = node.initializer;
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(messagesNode && ts.isAsExpression(messagesNode));
const localeObject = messagesNode.expression;
assert.ok(ts.isObjectLiteralExpression(localeObject));
const localeEntries = new Map(localeObject.properties.map(p => [p.name.getText(ast), p.initializer]));
const locales = ['en','ar','fr','es','pt','de','tr','hi','zh'];
assert.deepEqual([...localeEntries.keys()].sort(), [...locales].sort());
const keySet = (node) => new Set(node.properties.map(p => p.name.getText(ast)));
const englishKeys = keySet(localeEntries.get('en'));
assert.ok(englishKeys.size >= 70, `expected comprehensive labels, got ${englishKeys.size}`);
for (const locale of locales) assert.deepEqual([...keySet(localeEntries.get(locale))].sort(), [...englishKeys].sort(), `${locale} translation keys must match English`);
assert.doesNotMatch(i18nText, /^\s*ha\s*:/m);

const referral = fs.readFileSync(path.join(root, 'src/components/ReferralCenterPanel.tsx'), 'utf8');
const inbox = fs.readFileSync(path.join(root, 'src/components/MemberInboxPanel.tsx'), 'utf8');
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
assert.match(referral, /language: MemberLanguage/);
assert.match(referral, /rit\(language/);
assert.match(referral, /t\('shareMessage', \{ code \}\)/);
assert.match(referral, /t\('referralSafety'\)/);
assert.match(inbox, /language: MemberLanguage/);
assert.match(inbox, /t\('inboxTitle'\)/);
assert.match(inbox, /t\('createTicket'\)/);
assert.match(inbox, /t\('sendReply'\)/);
assert.match(app, /<ReferralCenterPanel userId=\{session\.user\.id\} language=\{language\}/);
assert.match(app, /<MemberInboxPanel userId=\{session\.user\.id\} language=\{language\}/);
assert.match(referral, /apply_referral_code/);
assert.match(inbox, /memberInboxService\.createTicket/);
assert.match(inbox, /memberInboxService\.replyTicket/);
console.log('Step53 referral and inbox localization checks: 20/20 passed');
