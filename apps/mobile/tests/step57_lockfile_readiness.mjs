import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const mobile = JSON.parse(readFileSync(resolve(root, 'apps/mobile/package.json'), 'utf8'));
const workspace = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const ci = readFileSync(resolve(root, 'codemagic.yaml'), 'utf8');

test('workspace declares all three application workspaces', () => {
  assert.deepEqual(workspace.workspaces, ['apps/web', 'apps/admin', 'apps/mobile']);
});
test('mobile workspace identity and scripts are present', () => {
  assert.equal(mobile.name, '@vyra/mobile');
  assert.match(mobile.scripts['preflight:android'], /^node tests\/step56_android_build_preflight\.mjs && node tests\/step59_expo_android_config_audit\.mjs$/);
  assert.equal(mobile.scripts['build:android:debug'].includes('gradlew assembleDebug'), true);
});
test('mobile runtime dependencies are pinned by declared ranges/versions', () => {
  assert.equal(mobile.dependencies.expo, '~58.0.0');
  assert.equal(mobile.dependencies.react, '19.3.0');
  assert.equal(mobile.dependencies['react-native'], '0.88.0');
  assert.equal(mobile.dependencies['unity-levelplay-mediation'], '9.5.0');
});
test('repository currently has no npm lockfile (known reproducibility blocker)', () => {
  assert.equal(existsSync(resolve(root, 'package-lock.json')), false);
});
test('Codemagic remains on npm install until a verified lockfile exists', () => {
  assert.match(ci, /npm install/);
  assert.doesNotMatch(ci, /npm ci/);
});
test('CI environment remains explicitly versioned', () => {
  assert.match(ci, /node: 22\.13\.0/);
  assert.match(ci, /java: 17/);
});
console.log('Step57 lockfile readiness: 6 checks passed; lockfile creation remains blocked by registry access in this environment.');
