import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(import.meta.dirname, '../../..');
const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
const rootPkg = read('package.json');
const web = read('apps/web/package.json');
const admin = read('apps/admin/package.json');
const mobile = read('apps/mobile/package.json');
const ci = readFileSync(resolve(root, 'codemagic.yaml'), 'utf8');

const expected = [
  ['apps/web', '@vyra-rewards/web', web],
  ['apps/admin', '@vyra-rewards/admin', admin],
  ['apps/mobile', '@vyra/mobile', mobile],
];

test('root package is private ESM workspace', () => {
  assert.equal(rootPkg.private, true);
  assert.equal(rootPkg.type, 'module');
  assert.deepEqual(rootPkg.workspaces, expected.map(([path]) => path));
});
test('workspace package identities match root workspace paths', () => {
  for (const [, name, pkg] of expected) assert.equal(pkg.name, name);
});
test('all workspace packages are private', () => {
  for (const [, , pkg] of expected) assert.equal(pkg.private, true);
});
test('Web/Admin explicitly use ESM and Mobile has its TypeScript Expo entry', () => {
  assert.equal(web.type, 'module');
  assert.equal(admin.type, 'module');
  assert.equal(mobile.main, 'index.ts');
});
test('root Node engine is compatible with CI Node 22', () => {
  assert.match(rootPkg.engines.node, />=22/);
  assert.match(ci, /node:\s*22\.13\.0/);
});
test('web and admin share the same React runtime versions', () => {
  assert.equal(web.dependencies.react, admin.dependencies.react);
  assert.equal(web.dependencies['react-dom'], admin.dependencies['react-dom']);
});
test('web and admin share Supabase client version range', () => {
  assert.equal(web.dependencies['@supabase/supabase-js'], admin.dependencies['@supabase/supabase-js']);
});
test('web and admin share TypeScript and Vite toolchain ranges', () => {
  for (const key of ['typescript', 'vite', '@vitejs/plugin-react']) {
    assert.equal(web.devDependencies[key], admin.devDependencies[key]);
  }
});
test('web and admin expose production build scripts', () => {
  assert.match(web.scripts.build, /tsc -b && vite build/);
  assert.match(admin.scripts.build, /tsc -b && vite build/);
});
test('mobile Expo, React and React Native declarations are present', () => {
  assert.equal(mobile.dependencies.expo, '~58.0.0');
  assert.equal(mobile.dependencies.react, '19.3.0');
  assert.equal(mobile.dependencies['react-native'], '0.88.0');
});
test('mobile native SDK integrations remain declared', () => {
  assert.ok(mobile.dependencies['expo-secure-store']);
  assert.ok(mobile.dependencies['unity-levelplay-mediation']);
});
test('mobile package exposes typecheck and Android build scripts', () => {
  assert.equal(mobile.scripts.typecheck, 'tsc --noEmit');
  assert.match(mobile.scripts['build:android:debug'], /gradlew assembleDebug/);
});
test('root scripts target the declared workspace names', () => {
  assert.match(rootPkg.scripts['dev:web'], /@vyra-rewards\/web/);
  assert.match(rootPkg.scripts['dev:admin'], /@vyra-rewards\/admin/);
  assert.match(rootPkg.scripts['dev:mobile'], /@vyra\/mobile/);
});
test('Codemagic installs from root workspace and pins Java 17', () => {
  assert.match(ci, /npm install/);
  assert.match(ci, /java:\s*17/);
});
test('Codemagic has not switched to npm ci without a lockfile', () => {
  assert.equal(existsSync(resolve(root, 'package-lock.json')), false);
  assert.doesNotMatch(ci, /npm ci/);
});
test('no package manager lockfile is falsely assumed in workspace', () => {
  for (const file of ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock']) {
    assert.equal(existsSync(resolve(root, file)), false, `${file} unexpectedly exists; review Step58 assumptions`);
  }
});
test('mobile Android preflight script remains wired', () => {
  assert.match(mobile.scripts['preflight:android'], /^node tests\/step56_android_build_preflight\.mjs && node tests\/step59_expo_android_config_audit\.mjs$/);
  assert.equal(rootPkg.scripts['preflight:mobile:android'], 'npm --workspace @vyra/mobile run preflight:android');
});
console.log('Step58 workspace manifest preflight: 17/17 checks passed.');
console.log('This is a static manifest/CI contract test, not a dependency install or native build.');
