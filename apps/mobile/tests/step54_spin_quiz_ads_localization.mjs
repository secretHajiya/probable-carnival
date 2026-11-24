import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'App.tsx',
  'src/services/spin-quiz-ads-i18n.ts',
  'src/components/SpinWheelPanel.tsx',
  'src/components/QuizRewardsPanel.tsx',
  'src/components/RewardedAdsPanel.tsx',
  'src/components/LevelPlayBannerPanel.tsx',
];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${file}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
}
const i18n = fs.readFileSync(path.join(root, 'src/services/spin-quiz-ads-i18n.ts'), 'utf8');
const ast = ts.createSourceFile('spin-quiz-ads-i18n.ts', i18n, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
let object;
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'messages') object = node.initializer; ts.forEachChild(node, visit); }
visit(ast);
assert.ok(object && ts.isAsExpression(object));
const entries = new Map(object.expression.properties.map(p => [p.name.getText(ast), p.initializer]));
const locales = ['en','ar','fr','es','pt','de','tr','hi','zh'];
assert.deepEqual([...entries.keys()].sort(), [...locales].sort());
const keys = entries.get('en').properties.map(p => p.name.getText(ast)).sort();
assert.ok(keys.length >= 35, `expected comprehensive spin/quiz/ads strings, got ${keys.length}`);
for (const locale of locales) {
  const localeKeys = entries.get(locale).properties.map(p => p.name.getText(ast)).sort();
  assert.deepEqual(localeKeys, keys, `${locale} translation keys differ from English`);
}
assert.doesNotMatch(i18n, /^\s*ha\s*:/m);
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
for (const component of ['SpinWheelPanel','QuizRewardsPanel','RewardedAdsPanel','LevelPlayBannerPanel']) assert.match(app, new RegExp(`<${component}[^>]*language=\\{language\\}`));
for (const file of files.slice(2)) assert.match(fs.readFileSync(path.join(root, file), 'utf8'), /sqa\(language,/);
const spin = fs.readFileSync(path.join(root, 'src/components/SpinWheelPanel.tsx'), 'utf8');
const quiz = fs.readFileSync(path.join(root, 'src/components/QuizRewardsPanel.tsx'), 'utf8');
const ads = fs.readFileSync(path.join(root, 'src/components/RewardedAdsPanel.tsx'), 'utf8');
assert.match(spin, /spinWheelService\.spin\(\)/);
assert.match(quiz, /quizService\.submitAnswer\(/);
assert.match(ads, /levelPlayRewardedService\.show\(/);
assert.match(ads, /setCallbacks\(/);
console.log('Step54 Spin, Quiz and LevelPlay localization checks: 20/20 passed');
