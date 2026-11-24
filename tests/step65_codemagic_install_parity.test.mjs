import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const yaml = readFileSync(new URL('../codemagic.yaml', import.meta.url), 'utf8');
const root = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test("Vyra Codemagic uses the install mode from the owner reference app", () => {
  assert.match(yaml, /npm install --legacy-peer-deps/);
});

test('Vyra keeps its current Node 22 and Java 17 build environment', () => {
  assert.match(yaml, /node:\s*22\.13\.0/);
  assert.match(yaml, /java:\s*17/);
});

test('Codemagic still builds the mobile Expo workspace and release APK with bundled JS', () => {
  assert.match(yaml, /cd apps\/mobile/);
  assert.match(yaml, /npx expo prebuild --platform android --non-interactive/);
  assert.match(yaml, /\.\/gradlew assembleRelease/);
  assert.match(yaml, /app-release\.apk/);
});

test('the project retains its three npm workspaces', () => {
  assert.deepEqual(root.workspaces, ['apps/web', 'apps/admin', 'apps/mobile']);
});

test('the workflow documents that legacy peer resolution does not repair DNS', () => {
  assert.match(yaml, /does not bypass DNS\/network failures/);
});
