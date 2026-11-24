import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const components = [
  'SpinWheelPanel.tsx','QuizRewardsPanel.tsx','DailyCheckinPanel.tsx','RewardedAdsPanel.tsx',
  'LevelPlayBannerPanel.tsx','ReferralCenterPanel.tsx','ActivityHistoryPanel.tsx',
  'MemberInboxPanel.tsx','WithdrawalCenterPanel.tsx','ProfileSettingsPanel.tsx',
];
const sourceFiles = ['App.tsx','src/components/DirectionProvider.tsx', ...components.map(x => `src/components/${x}`)];
for (const file of sourceFiles) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const result = ts.transpileModule(source, { fileName: file, reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, `${file}: ${errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; ')}`);
}
const direction = fs.readFileSync(path.join(root, 'src/components/DirectionProvider.tsx'), 'utf8');
assert.match(direction, /return language === 'ar'/);
assert.match(direction, /direction: rtl \? 'rtl' : 'ltr'/);
assert.match(direction, /writingDirection: 'rtl'/);
assert.match(direction, /textAlign: 'right'/);
assert.match(direction, /NativeTextInput/);
assert.match(direction, /DirectionContext\.Provider/);
const app = fs.readFileSync(path.join(root, 'App.tsx'), 'utf8');
assert.match(app, /DirectionProvider rtl=\{isRTL\(language\)\}/);
assert.match(app, /<Shell rtl=\{isRTL\(language\)\}>/);
assert.match(app, /function Shell\(\{children,rtl=false\}/);
assert.doesNotMatch(app, /I18nManager\.forceRTL/);
assert.doesNotMatch(app, /I18nManager\.allowRTL/);
for (const file of components) {
  const source = fs.readFileSync(path.join(root, 'src/components', file), 'utf8');
  assert.match(source, /DirectionalText as Text/, `${file} uses direction-aware Text`);
  assert.doesNotMatch(source, /import \{[^}]*[,\{]\s*Text\s*[,\}][^}]*\} from 'react-native'/, `${file} must not bypass direction-aware Text`);
}
for (const file of ['MemberInboxPanel.tsx','ProfileSettingsPanel.tsx','ReferralCenterPanel.tsx']) {
  const source = fs.readFileSync(path.join(root, 'src/components', file), 'utf8');
  assert.match(source, /DirectionalTextInput as TextInput/);
}
console.log('Step55 Arabic RTL checks: 28/28 passed');
